import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./_core/email";
import {
  getFechamentoDiarioPorData,
  createFechamentoDiario,
  updateFechamentoDiario,
  listarFechamentosPorPeriodo,
  getVendasDoDia,
  getPagamentosCartoesComCv,
  createTransacoesRedeEmLote,
  getTransacoesRedePorFechamento,
  updateTransacaoRedeMatching,
  createDivergenciasEmLote,
  getDivergenciasPorFechamento,
  resolverDivergencia,
  resolverDivergenciasEmLote,
} from "./db-fechamento-diario";

// Helper para converter valor em reais para centavos
function reaisParaCentavos(valor: string): number {
  // Remove "R$", espaços e converte vírgula para ponto
  const valorLimpo = valor.replace(/[R$\s]/g, "").replace(",", ".");
  return Math.round(parseFloat(valorLimpo) * 100);
}

// Helper para parsear CSV da Rede
function parseCSVRede(csvContent: string) {
  const linhas = csvContent.split("\n");
  const header = linhas[0].split(";");
  
  // DEBUG: Logar cabeçalho do CSV para verificar estrutura
  console.log("[CSV DEBUG] Cabeçalho do CSV:", header);
  console.log("[CSV DEBUG] Total de colunas no cabeçalho:", header.length);
  
  const transacoes = [];
  
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;
    
    const valores = linha.split(";");
    
    // Validar se a linha tem dados suficientes
    if (valores.length < 18) {
      console.warn(`Linha ${i} ignorada: apenas ${valores.length} colunas encontradas`);
      continue;
    }
    
    try {
      // Extrair dados conforme estrutura do CSV
      const dataVenda = valores[0]?.trim(); // "02/12/2025"
      const horaVenda = valores[1]?.trim(); // "03:37:59"
      const statusVenda = valores[2]?.trim(); // "aprovada"
      const valorOriginal = valores[3]?.trim(); // "450,00"
      const valorAtualizado = valores[4]?.trim(); // "450,00"
      const modalidade = valores[5]?.trim()?.toLowerCase(); // "débito" ou "crédito"
      const tipo = valores[6]?.trim(); // "à vista", "parcelado"
      const numeroParcelas = parseInt(valores[8]) || 1;
      const bandeira = valores[9]?.trim(); // "Visa", "Mastercard"
      const taxaMdr = valores[10]?.trim(); // "1,07%"
      const valorMdr = valores[11]?.trim(); // "4,82"
      const valorLiquido = valores[16]?.trim(); // "445,18"
      const nsuCv = valores[17]?.trim(); // "182662422"
      
      // DEBUG: Logar primeira linha processada para verificar mapeamento
      if (i === 1) {
        console.log("[CSV DEBUG] Primeira linha de dados:");
        console.log("  [0] dataVenda:", dataVenda);
        console.log("  [1] horaVenda:", horaVenda);
        console.log("  [2] statusVenda:", statusVenda);
        console.log("  [3] valorOriginal:", valorOriginal);
        console.log("  [4] valorAtualizado:", valorAtualizado);
        console.log("  [5] modalidade:", modalidade);
        console.log("  [6] tipo:", tipo);
        console.log("  [8] numeroParcelas:", valores[8]);
        console.log("  [9] bandeira:", bandeira);
        console.log("  [17] nsuCv:", nsuCv);
      }
      const numeroAutorizacao = valores[20]?.trim();
      const numeroEstabelecimento = valores[21]?.trim();
      const numeroCartao = valores[24]?.trim();
      const tid = valores[29]?.trim();
      
      // Validar campos obrigatórios
      if (!dataVenda || !horaVenda || !nsuCv || !valorOriginal) {
        console.warn(`Linha ${i} ignorada: campos obrigatórios vazios`);
        continue;
      }
      
      // Validar formato da data
      if (!dataVenda.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        console.warn(`Linha ${i} ignorada: formato de data inválido: ${dataVenda}`);
        continue;
      }
      
      // Converter data e hora para datetime
      const [dia, mes, ano] = dataVenda.split("/");
      const dataHora = new Date(`${ano}-${mes}-${dia}T${horaVenda}`);
      
      // Validar se a data é válida
      if (isNaN(dataHora.getTime())) {
        console.warn(`Linha ${i} ignorada: data/hora inválida: ${dataVenda} ${horaVenda}`);
        continue;
      }
      
      transacoes.push({
        dataVenda: dataHora,
        horaVenda,
        statusVenda,
        valorOriginal: reaisParaCentavos(valorOriginal),
        valorAtualizado: reaisParaCentavos(valorAtualizado),
        valorLiquido: reaisParaCentavos(valorLiquido),
        modalidade,
        tipo,
        numeroParcelas,
        bandeira,
        nsuCv,
        taxaMdr,
        valorMdr: valorMdr ? reaisParaCentavos(valorMdr) : null,
        numeroAutorizacao,
        numeroEstabelecimento,
        numeroCartao,
        tid,
      });
    } catch (error) {
      console.error(`Erro ao processar linha ${i}:`, error);
      console.error(`Conteúdo da linha: ${linha}`);
      continue;
    }
  }
  
  return transacoes;
}

// Helper para fazer matching entre vendas do sistema e transações da Rede
// Validação dos 7 campos obrigatórios:
// 1. Data da Venda (DD/MM/AAAA)
// 2. Status da Venda (apenas "aprovada")
// 3. Valor Original
// 4. Modalidade
// 5. Número de Parcelas
// 6. Bandeira
// 7. NSU/CV
function fazerMatching(
  pagamentosSistema: any[],
  transacoesRede: any[]
) {
  const matches: any[] = [];
  const divergencias: any[] = [];
  const naoLancadas: any[] = [];
  const fantasmas: any[] = [];
  
  // Filtrar apenas transações aprovadas da planilha
  const transacoesAprovadas = transacoesRede.filter(t => 
    t.statusVenda && t.statusVenda.toLowerCase() === "aprovada"
  );
  
  // Criar mapa de transações da Rede por CV
  const mapaRede = new Map();
  transacoesAprovadas.forEach(t => {
    if (t.nsuCv) {
      mapaRede.set(t.nsuCv, t);
    }
  });
  
  // Criar mapa de pagamentos do sistema por CV
  const mapaSistema = new Map();
  pagamentosSistema.forEach(p => {
    if (p.cvNsu) {
      mapaSistema.set(p.cvNsu, p);
    }
  });
  
  // Helper para formatar data do sistema para DD/MM/AAAA
  function formatarDataSistema(data: Date): string {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }
  
  // Helper para normalizar modalidade
  function normalizarModalidade(modalidade: string): string {
    return modalidade.toLowerCase().replace(/[\s\u00e1\u00e9\u00ed\u00f3\u00fa\u00e3\u00f5\u00e2\u00ea\u00ee\u00f4\u00fb\u00e7]/g, (char) => {
      const map: any = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'ã': 'a', 'õ': 'o', 'â': 'a', 'ê': 'e', 'î': 'i',
        'ô': 'o', 'û': 'u', 'ç': 'c', ' ': ''
      };
      return map[char] || char;
    });
  }
  
  // Helper para normalizar bandeira
  function normalizarBandeira(bandeira: string): string {
    return bandeira.toLowerCase().trim();
  }
  
  // Comparar pagamentos do sistema com transações da Rede
  pagamentosSistema.forEach(pagamento => {
    const cv = pagamento.cvNsu;
    if (!cv) return;
    
    const transacaoRede = mapaRede.get(cv);
    
    if (!transacaoRede) {
      // Venda fantasma: tem no sistema mas não tem na Rede (ou não está aprovada)
      fantasmas.push({
        tipo: "venda_fantasma",
        pagamento,
        cvNsu: cv,
        valorEsperado: pagamento.valor,
        descricao: "Venda encontrada no sistema mas não encontrada na planilha ou status diferente de 'aprovada'"
      });
    } else {
      // Validar os 7 campos obrigatórios
      const divergenciasEncontradas: string[] = [];
      
      // 1. Data da Venda
      // DEBUG: Logar dados brutos antes da comparação
      console.log(`[MATCHING DEBUG] CV ${cv}:`);
      console.log(`  pagamento.dataVenda:`, pagamento.dataVenda);
      console.log(`  transacaoRede.dataVenda:`, transacaoRede.dataVenda);
      
      const dataSistema = formatarDataSistema(new Date(pagamento.dataVenda));
      const dataRede = transacaoRede.dataVenda.toISOString().split('T')[0];
      const [anoRede, mesRede, diaRede] = dataRede.split('-');
      const dataRedeFormatada = `${diaRede}/${mesRede}/${anoRede}`;
      
      console.log(`  dataSistema formatada:`, dataSistema);
      console.log(`  dataRede formatada:`, dataRedeFormatada);
      
      if (dataSistema !== dataRedeFormatada) {
        divergenciasEncontradas.push(`Data: Sistema=${dataSistema}, Planilha=${dataRedeFormatada}`);
      }
      
      // 2. Status já validado (apenas "aprovada" foi considerada)
      
      // 3. Valor Original
      const valorSistema = pagamento.valor;
      const valorRede = transacaoRede.valorOriginal;
      
      // Implementar tolerância de 1 centavo para eliminar divergências causadas por arredondamentos
      const diferencaValor = Math.abs(valorSistema - valorRede);
      const TOLERANCIA_CENTAVO = 1; // 1 centavo de tolerância
      
      // Debug: logar comparação de valores
      console.log(`[MATCHING] CV ${cv}: Sistema=${valorSistema} (R$${(valorSistema/100).toFixed(2)}), Rede=${valorRede} (R$${(valorRede/100).toFixed(2)}), Diferença=${diferencaValor}`);
      
      if (diferencaValor > TOLERANCIA_CENTAVO) {
        divergenciasEncontradas.push(`Valor: Sistema=R$${(valorSistema/100).toFixed(2)}, Planilha=R$${(valorRede/100).toFixed(2)}`);
      }
      
      // 4. Modalidade
      console.log(`  pagamento.tipo (modalidade):`, pagamento.tipo);
      console.log(`  transacaoRede.modalidade:`, transacaoRede.modalidade);
      
      const modalidadeSistema = normalizarModalidade(pagamento.tipo || '');
      const modalidadeRede = normalizarModalidade(transacaoRede.modalidade || '');
      
      console.log(`  modalidadeSistema normalizada:`, modalidadeSistema);
      console.log(`  modalidadeRede normalizada:`, modalidadeRede);
      
      if (modalidadeSistema !== modalidadeRede) {
        divergenciasEncontradas.push(`Modalidade: Sistema=${pagamento.tipo}, Planilha=${transacaoRede.modalidade}`);
      }
      
      // 5. Número de Parcelas
      const parcelasSistema = pagamento.parcelas || 1;
      const parcelasRede = transacaoRede.numeroParcelas || 1;
      
      if (parcelasSistema !== parcelasRede) {
        divergenciasEncontradas.push(`Parcelas: Sistema=${parcelasSistema}x, Planilha=${parcelasRede}x`);
      }
      
      // 6. Bandeira
      const bandeiraSistema = normalizarBandeira(pagamento.bandeira || '');
      const bandeiraRede = normalizarBandeira(transacaoRede.bandeira || '');
      
      if (bandeiraSistema !== bandeiraRede) {
        divergenciasEncontradas.push(`Bandeira: Sistema=${pagamento.bandeira}, Planilha=${transacaoRede.bandeira}`);
      }
      
      // 7. NSU/CV já foi usado como chave de matching
      
      if (divergenciasEncontradas.length === 0) {
        // Match OK - todos os 7 campos conferem
        matches.push({
          pagamento,
          transacaoRede,
          status: "ok",
        });
      } else {
        // Divergência encontrada
        divergencias.push({
          tipo: "divergencia_dados",
          pagamento,
          transacaoRede,
          cvNsu: cv,
          valorEsperado: valorSistema,
          valorEncontrado: valorRede,
          diferenca: valorRede - valorSistema,
          divergenciasDetalhadas: divergenciasEncontradas,
          descricao: `Divergências encontradas: ${divergenciasEncontradas.join('; ')}`
        });
      }
    }
  });
  
  // Identificar transações não lançadas (tem na Rede com status aprovada mas não tem no sistema)
  transacoesAprovadas.forEach(transacao => {
    const cv = transacao.nsuCv;
    if (!cv) return;
    
    const pagamentoSistema = mapaSistema.get(cv);
    
    if (!pagamentoSistema) {
      naoLancadas.push({
        tipo: "nao_lancado",
        transacaoRede: transacao,
        cvNsu: cv,
        valorEncontrado: transacao.valorOriginal,
        descricao: "Transação aprovada encontrada na planilha mas não lançada no sistema"
      });
    }
  });
  
  return {
    matches,
    divergencias,
    naoLancadas,
    fantasmas,
  };
}

export const fechamentoDiarioRouter = router({
  // Buscar ou criar fechamento do dia
  buscarOuCriarFechamento: protectedProcedure
    .input(z.object({
      data: z.string(), // "YYYY-MM-DD"
    }))
    .query(async ({ input }) => {
      let fechamento = await getFechamentoDiarioPorData(input.data);
      
      if (!fechamento) {
        // Buscar vendas do dia
        const vendas = await getVendasDoDia(input.data);
        
        // Calcular totais por tipo de pagamento
        let totalDinheiro = 0;
        let totalPix = 0;
        let totalDebito = 0;
        let totalCreditoVista = 0;
        let totalCreditoParcelado = 0;
        
        vendas.forEach(venda => {
          venda.pagamentos.forEach((pag: any) => {
            if (pag.tipo === "dinheiro") totalDinheiro += pag.valor;
            else if (pag.tipo === "pix") totalPix += pag.valor;
            else if (pag.tipo === "debito") totalDebito += pag.valor;
            else if (pag.tipo === "credito") {
              if (pag.parcelas === 1) totalCreditoVista += pag.valor;
              else totalCreditoParcelado += pag.valor;
            }
          });
        });
        
        const totalSistema = totalDinheiro + totalPix + totalDebito + totalCreditoVista + totalCreditoParcelado;
        
        // Criar fechamento
        await createFechamentoDiario({
          data: new Date(input.data),
          status: "pendente",
          totalSistema,
          totalDinheiro,
          totalPix,
          totalDebito,
          totalCreditoVista,
          totalCreditoParcelado,
          totalRede: null,
          totalRedeDebito: null,
          totalRedeCredito: null,
          quantidadeVendasOk: 0,
          quantidadeDivergencias: 0,
          quantidadeNaoLancadas: 0,
          quantidadeFantasma: 0,
        });
        
        fechamento = await getFechamentoDiarioPorData(input.data);
      }
      
      return fechamento;
    }),
  
  // Upload e processar CSV da Rede
  uploadExtratoRede: protectedProcedure
    .input(z.object({
      data: z.string(), // "YYYY-MM-DD"
      csvContent: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const fechamento = await getFechamentoDiarioPorData(input.data);
      
      if (!fechamento) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fechamento não encontrado. Crie o fechamento primeiro.",
        });
      }
      
      // Parsear CSV
      const transacoesRede = parseCSVRede(input.csvContent);
      
      if (transacoesRede.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nenhuma transação encontrada no arquivo CSV.",
        });
      }
      
      // Salvar transações da Rede no banco
      const transacoesParaSalvar = transacoesRede.map(t => ({
        ...t,
        fechamentoDiarioId: fechamento.id,
        vendaId: null,
        pagamentoId: null,
        statusMatching: "nao_lancado" as const,
      }));
      
      await createTransacoesRedeEmLote(transacoesParaSalvar);
      
      // Buscar pagamentos do sistema com CV
      const pagamentosSistema = await getPagamentosCartoesComCv(input.data);
      
      // Fazer matching
      const resultado = fazerMatching(pagamentosSistema, transacoesRede);
      
      // Atualizar status das transações da Rede
      const transacoesSalvas = await getTransacoesRedePorFechamento(fechamento.id);
      
      for (const match of resultado.matches) {
        const transacao = transacoesSalvas.find(t => t.nsuCv === match.transacaoRede.nsuCv);
        if (transacao) {
          await updateTransacaoRedeMatching(
            transacao.id,
            match.pagamento.vendaId,
            match.pagamento.id,
            "ok"
          );
        }
      }
      
      for (const div of resultado.divergencias) {
        const transacao = transacoesSalvas.find(t => t.nsuCv === div.cvNsu);
        if (transacao) {
          await updateTransacaoRedeMatching(
            transacao.id,
            div.pagamento?.vendaId || null,
            div.pagamento?.id || null,
            "divergencia_valor"
          );
        }
      }
      
      // Salvar divergências
      const divergenciasParaSalvar = [
        ...resultado.divergencias.map(d => ({
          fechamentoDiarioId: fechamento.id,
          tipoDivergencia: "valor_diferente" as const,
          vendaId: d.pagamento?.vendaId || null,
          pagamentoId: d.pagamento?.id || null,
          transacaoRedeId: transacoesSalvas.find(t => t.nsuCv === d.cvNsu)?.id || null,
          valorEsperado: d.valorEsperado,
          valorEncontrado: d.valorEncontrado,
          diferenca: d.diferenca,
          cvNsu: d.cvNsu,
          descricao: d.descricao, // Usar descrição completa com todos os campos divergentes
        })),
        ...resultado.naoLancadas.map(n => ({
          fechamentoDiarioId: fechamento.id,
          tipoDivergencia: "nao_lancado" as const,
          vendaId: null,
          pagamentoId: null,
          transacaoRedeId: transacoesSalvas.find(t => t.nsuCv === n.cvNsu)?.id || null,
          valorEsperado: null,
          valorEncontrado: n.valorEncontrado,
          diferenca: null,
          cvNsu: n.cvNsu,
          descricao: `Transação não lançada no sistema: CV ${n.cvNsu}, valor R$ ${(n.valorEncontrado / 100).toFixed(2)}`,
        })),
        ...resultado.fantasmas.map(f => ({
          fechamentoDiarioId: fechamento.id,
          tipoDivergencia: "venda_fantasma" as const,
          vendaId: f.pagamento?.vendaId || null,
          pagamentoId: f.pagamento?.id || null,
          transacaoRedeId: null,
          valorEsperado: f.valorEsperado,
          valorEncontrado: null,
          diferenca: null,
          cvNsu: f.cvNsu,
          descricao: `Venda fantasma: existe no sistema mas não na Rede, CV ${f.cvNsu}, valor R$ ${(f.valorEsperado / 100).toFixed(2)}`,
        })),
      ];
      
      await createDivergenciasEmLote(divergenciasParaSalvar);
      
      // Calcular totais da Rede
      let totalRedeDebito = 0;
      let totalRedeCredito = 0;
      
      transacoesRede.forEach(t => {
        if (t.modalidade === "débito") totalRedeDebito += t.valorOriginal;
        else if (t.modalidade === "crédito") totalRedeCredito += t.valorOriginal;
      });
      
      const totalRede = totalRedeDebito + totalRedeCredito;
      
      // Calcular total de divergências
      const totalDivergenciasCalc = resultado.divergencias.length + resultado.naoLancadas.length + resultado.fantasmas.length;
      
      // Atualizar fechamento com totais da Rede e contadores
      await updateFechamentoDiario(fechamento.id, {
        totalRede,
        totalRedeDebito,
        totalRedeCredito,
        quantidadeVendasOk: resultado.matches.length,
        quantidadeDivergencias: resultado.divergencias.length,
        quantidadeNaoLancadas: resultado.naoLancadas.length,
        quantidadeFantasma: resultado.fantasmas.length,
        status: totalDivergenciasCalc > 0 ? "com_divergencia" : "conciliado",
      });
      
      // Se houver divergências críticas (valor > R$ 100 ou mais de 5 divergências), notificar
      const THRESHOLD_VALOR = 10000; // R$ 100,00 em centavos
      const THRESHOLD_QUANTIDADE = 5;
      
      const valorTotalDivergencias = [
        ...resultado.divergencias,
        ...resultado.naoLancadas,
        ...resultado.fantasmas
      ].reduce((acc, d) => {
        const valor = d.diferenca || d.valorEncontrado || d.valorEsperado || 0;
        return acc + Math.abs(valor);
      }, 0);
      
      const isCritico = valorTotalDivergencias >= THRESHOLD_VALOR || totalDivergenciasCalc >= THRESHOLD_QUANTIDADE;
      
      if (isCritico && totalDivergenciasCalc > 0) {
        // Preparar dados para notificação
        const divergenciasParaNotificar = [
          ...resultado.divergencias.map(d => ({
            tipo: "Divergência de Valor",
            descricao: `Valores não batem - CV/NSU: ${d.cvNsu}`,
            valorDiferenca: d.diferenca,
            cvNsu: d.cvNsu,
          })),
          ...resultado.naoLancadas.map(n => ({
            tipo: "Não Lançado",
            descricao: `Transação na Rede não lançada no sistema`,
            valorDiferenca: n.valorEncontrado,
            cvNsu: n.cvNsu,
          })),
          ...resultado.fantasmas.map(f => ({
            tipo: "Venda Fantasma",
            descricao: `Venda no sistema não encontrada na Rede`,
            valorDiferenca: f.valorEsperado,
            cvNsu: f.cvNsu,
          })),
        ];
        
        try {
          await notifyOwner({
            title: `⚠️ Divergências Críticas - Fechamento ${input.data.split("-").reverse().join("/")}`,
            content: `Foram detectadas ${totalDivergenciasCalc} divergência(s) críticas no fechamento diário.\n\nValor total: R$ ${(valorTotalDivergencias / 100).toFixed(2).replace(".", ",")}\n\nAcesse o sistema para revisar.`,
          });
        } catch (error) {
          console.error("Erro ao enviar notificação:", error);
        }
      }
      
      return {
        sucesso: true,
        transacoesProcessadas: transacoesRede.length,
        matches: resultado.matches.length,
        divergencias: resultado.divergencias.length,
        naoLancadas: resultado.naoLancadas.length,
        fantasmas: resultado.fantasmas.length,
      };}),
  
  // Listar transações e divergências de um fechamento
  detalhesFechamento: protectedProcedure
    .input(z.object({
      data: z.string(),
    }))
    .query(async ({ input }) => {
      const fechamento = await getFechamentoDiarioPorData(input.data);
      
      if (!fechamento) {
        return null;
      }
      
      const transacoes = await getTransacoesRedePorFechamento(fechamento.id);
      const divergencias = await getDivergenciasPorFechamento(fechamento.id);
      const pagamentosSistema = await getPagamentosCartoesComCv(input.data);
      
      return {
        fechamento,
        transacoes,
        divergencias,
        pagamentosSistema,
      };
    }),
  
  // Listar fechamentos por período
  listarFechamentos: protectedProcedure
    .input(z.object({
      dataInicio: z.string(),
      dataFim: z.string(),
    }))
    .query(async ({ input }) => {
      return await listarFechamentosPorPeriodo(input.dataInicio, input.dataFim);
    }),
  
  // Resolver divergência
  resolverDivergencia: protectedProcedure
    .input(z.object({
      divergenciaId: z.number(),
      statusResolucao: z.enum(["aprovado", "corrigido", "ignorado"]),
      justificativa: z.string().min(10, "Justificativa deve ter no mínimo 10 caracteres"),
    }))
    .mutation(async ({ input, ctx }) => {
      await resolverDivergencia(
        input.divergenciaId,
        input.statusResolucao,
        input.justificativa,
        ctx.user.id,
        ctx.user.name || "Usuário"
      );
      
      return { success: true };
    }),
  
  // Resolver múltiplas divergências em lote
  resolverDivergenciasEmLote: protectedProcedure
    .input(z.object({
      divergenciaIds: z.array(z.number()).min(1, "Selecione pelo menos uma divergência"),
      statusResolucao: z.enum(["aprovado", "corrigido", "ignorado"]),
      justificativa: z.string().min(10, "Justificativa deve ter no mínimo 10 caracteres"),
    }))
    .mutation(async ({ input, ctx }) => {
      const quantidadeResolvida = await resolverDivergenciasEmLote(
        input.divergenciaIds,
        input.statusResolucao,
        input.justificativa,
        ctx.user.id,
        ctx.user.name || "Usuário"
      );
      
      return { success: true, quantidadeResolvida };
    }),
  
  // Notificar divergências críticas
  notificarDivergenciasCriticas: protectedProcedure
    .input(z.object({
      data: z.string(),
      divergencias: z.array(z.object({
        tipo: z.string(),
        descricao: z.string(),
        valorDiferenca: z.number().optional(),
        cvNsu: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const totalDivergencias = input.divergencias.length;
      const valorTotalDivergencias = input.divergencias
        .filter(d => d.valorDiferenca)
        .reduce((acc, d) => acc + Math.abs(d.valorDiferenca || 0), 0);
      
      // Formatar data
      const [ano, mes, dia] = input.data.split("-");
      const dataFormatada = `${dia}/${mes}/${ano}`;
      
      // Formatar valor
      const valorFormatado = `R$ ${(valorTotalDivergencias / 100).toFixed(2).replace(".", ",")}`;
      
      // Criar lista de divergências
      const listaDivergencias = input.divergencias
        .slice(0, 5) // Primeiras 5 divergências
        .map(d => {
          let texto = `• ${d.descricao}`;
          if (d.valorDiferenca) {
            const valorDiv = `R$ ${(Math.abs(d.valorDiferenca) / 100).toFixed(2).replace(".", ",")}`;
            texto += ` (${valorDiv})`;
          }
          if (d.cvNsu) {
            texto += ` - CV/NSU: ${d.cvNsu}`;
          }
          return texto;
        })
        .join("\n");
      
      const maisItens = totalDivergencias > 5 ? `\n\n... e mais ${totalDivergencias - 5} divergência(s)` : "";
      
      // Enviar notificação para o owner
      await notifyOwner({
        title: `⚠️ Divergências Críticas - Fechamento ${dataFormatada}`,
        content: `Foram detectadas ${totalDivergencias} divergência(s) no fechamento diário de ${dataFormatada}.\n\nValor total das divergências: ${valorFormatado}\n\nPrincipais divergências:\n${listaDivergencias}${maisItens}\n\nAcesse o sistema para revisar e resolver as divergências.`,
      });
      
      return { success: true, notificacoesEnviadas: 1 };
    }),
  
  // Limpar dados do fechamento de um dia específico
  limparDadosDia: protectedProcedure
    .input(z.object({
      data: z.string(), // "YYYY-MM-DD"
    }))
    .mutation(async ({ input }) => {
      const fechamento = await getFechamentoDiarioPorData(input.data);
      
      if (!fechamento) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fechamento não encontrado para esta data",
        });
      }
      
      // Importar funções de deleção
      const { limparDadosFechamento } = await import("./db-fechamento-diario");
      
      // Limpar dados do fechamento
      await limparDadosFechamento(fechamento.id);
      
      return { success: true };
    }),
});
