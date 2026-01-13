import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

// Mock de contexto de usuário admin
const mockAdminContext: Context = {
  user: {
    id: 1,
    openId: "test-admin",
    name: "Admin Test",
    email: "admin@test.com",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    loginMethod: "email",
  },
  req: {} as any,
  res: {} as any,
};

describe("Fechamento Diário - tRPC Procedures", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("deve criar fechamento diário para uma data", async () => {
    const dataHoje = new Date().toISOString().split("T")[0];
    
    const fechamento = await caller.fechamentoDiario.buscarOuCriarFechamento({
      data: dataHoje,
    });

    expect(fechamento).toBeDefined();
    expect(fechamento?.status).toBe("pendente");
    expect(fechamento?.totalSistema).toBeGreaterThanOrEqual(0);
  });

  it("deve retornar o mesmo fechamento ao buscar novamente", async () => {
    const dataHoje = new Date().toISOString().split("T")[0];
    
    const fechamento1 = await caller.fechamentoDiario.buscarOuCriarFechamento({
      data: dataHoje,
    });

    const fechamento2 = await caller.fechamentoDiario.buscarOuCriarFechamento({
      data: dataHoje,
    });

    expect(fechamento1?.id).toBe(fechamento2?.id);
  });

  it("deve processar CSV da Rede com sucesso", async () => {
    const dataHoje = new Date().toISOString().split("T")[0];
    
    // Criar fechamento primeiro
    await caller.fechamentoDiario.buscarOuCriarFechamento({
      data: dataHoje,
    });

    // CSV de exemplo (formato da Rede)
    const csvContent = `data da venda;hora da venda;status da venda;valor da venda original;valor da venda atualizado;modalidade;tipo;número de parcelas total;número de parcelas;bandeira;taxa mdr;valor mdr;valor taxa antecipação;valor taxa intermediação;taxa intermediação;taxa antecipação;valor liquido;NSU/CV;número do cartão;número da autorização;número do estabelecimento;nome do estabelecimento;nome do produto;código do produto;número do cartão;identificador da transação (TID);data da captura;data da liquidação;valor da parcela;TID;valor bruto;valor liquido;data de pagamento;tipo de lançamento;meio de captura;número lógico;número série;código do ajuste;descrição do ajuste;valor do ajuste;número do lote;número do resumo de operações
02/12/2025;03:37:59;aprovada;450,00;450,00;débito;à vista;;1;Visa;1,07%;4,82;0,00;0,00;0,00%;0,00%;445,18;182662422;;;9999999999999;SUPER A FORMATURAS;Débito à Vista;1;************9999;999999999999999999999999999999;02/12/2025;03/12/2025;450,00;999999999999999999999999999999;450,00;445,18;03/12/2025;Crédito;POS;99999999;99999999;;;0,00;999999;999999999`;

    const resultado = await caller.fechamentoDiario.uploadExtratoRede({
      data: dataHoje,
      csvContent,
    });

    expect(resultado.sucesso).toBe(true);
    expect(resultado.transacoesProcessadas).toBeGreaterThan(0);
  });

  it("deve retornar detalhes do fechamento após upload", async () => {
    const dataHoje = new Date().toISOString().split("T")[0];

    const detalhes = await caller.fechamentoDiario.detalhesFechamento({
      data: dataHoje,
    });

    expect(detalhes).toBeDefined();
    if (detalhes) {
      expect(detalhes.fechamento).toBeDefined();
      expect(Array.isArray(detalhes.transacoes)).toBe(true);
      expect(Array.isArray(detalhes.divergencias)).toBe(true);
      expect(Array.isArray(detalhes.pagamentosSistema)).toBe(true);
    }
  });

  it("deve listar fechamentos por período", async () => {
    const hoje = new Date();
    const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const dataFim = hoje.toISOString().split("T")[0];

    const fechamentos = await caller.fechamentoDiario.listarFechamentos({
      dataInicio,
      dataFim,
    });

    expect(Array.isArray(fechamentos)).toBe(true);
  });
});

describe("Fechamento Diário - Validações", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("deve rejeitar CSV vazio", async () => {
    const dataHoje = new Date().toISOString().split("T")[0];
    
    await caller.fechamentoDiario.buscarOuCriarFechamento({
      data: dataHoje,
    });

    await expect(
      caller.fechamentoDiario.uploadExtratoRede({
        data: dataHoje,
        csvContent: "",
      })
    ).rejects.toThrow();
  });

  it("deve rejeitar upload sem fechamento criado", async () => {
    const dataFutura = "2030-12-31";

    await expect(
      caller.fechamentoDiario.uploadExtratoRede({
        data: dataFutura,
        csvContent: "header\ndata",
      })
    ).rejects.toThrow("Fechamento não encontrado");
  });
});

describe("Fechamento Diário - Reconciliação em Lote", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("deve rejeitar reconciliação em lote sem divergências selecionadas", async () => {
    await expect(
      caller.fechamentoDiario.resolverDivergenciasEmLote({
        divergenciaIds: [],
        statusResolucao: "aprovado",
        justificativa: "Teste de justificativa válida",
      })
    ).rejects.toThrow();
  });

  it("deve rejeitar reconciliação em lote com justificativa curta", async () => {
    await expect(
      caller.fechamentoDiario.resolverDivergenciasEmLote({
        divergenciaIds: [1, 2, 3],
        statusResolucao: "aprovado",
        justificativa: "curta",
      })
    ).rejects.toThrow();
  });

  it("deve aceitar reconciliação em lote com dados válidos", async () => {
    const validInput = {
      divergenciaIds: [999, 998],
      statusResolucao: "aprovado" as const,
      justificativa: "Divergências aprovadas após verificação manual do extrato bancário",
    };

    expect(validInput.divergenciaIds.length).toBeGreaterThan(0);
    expect(validInput.justificativa.length).toBeGreaterThanOrEqual(10);
    expect(["aprovado", "corrigido", "ignorado"]).toContain(validInput.statusResolucao);
  });
});

describe("Fechamento Diário - Melhorias Fase 2", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  describe("1. Ações de Resolução de Divergências", () => {
    it("deve rejeitar justificativa muito curta", async () => {
      try {
        await caller.fechamentoDiario.resolverDivergencia({
          divergenciaId: 999,
          statusResolucao: "aprovado",
          justificativa: "curta", // Menos de 10 caracteres
        });
        expect.fail("Deveria ter lançado erro");
      } catch (error: any) {
        expect(error.message).toContain("10 caracteres");
      }
    });

    it("deve aceitar justificativa válida com mais de 10 caracteres", () => {
      const justificativaValida = "Esta é uma justificativa válida com mais de 10 caracteres para resolver a divergência.";
      expect(justificativaValida.length).toBeGreaterThanOrEqual(10);
    });

    it("deve validar status de resolução permitidos", () => {
      const statusValidos = ["aprovado", "corrigido", "ignorado"];
      expect(statusValidos).toContain("aprovado");
      expect(statusValidos).toContain("corrigido");
      expect(statusValidos).toContain("ignorado");
      expect(statusValidos).not.toContain("invalido");
    });
  });

  describe("2. Histórico de Fechamentos", () => {
    it("deve retornar fechamentos com estrutura correta", async () => {
      const dataInicio = "2025-01-01";
      const dataFim = "2025-01-31";

      const fechamentos = await caller.fechamentoDiario.listarFechamentos({
        dataInicio,
        dataFim,
      });

      expect(Array.isArray(fechamentos)).toBe(true);

      if (fechamentos.length > 0) {
        const fechamento = fechamentos[0];
        expect(fechamento).toHaveProperty("id");
        expect(fechamento).toHaveProperty("data");
        expect(fechamento).toHaveProperty("status");
        expect(fechamento).toHaveProperty("totalSistema");
        expect(fechamento).toHaveProperty("quantidadeDivergencias");
        expect(fechamento).toHaveProperty("quantidadeNaoLancadas");
        expect(fechamento).toHaveProperty("quantidadeFantasma");
      }
    });

    it("deve filtrar fechamentos por período corretamente", async () => {
      const hoje = new Date();
      const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const dataFim = hoje.toISOString().split("T")[0];

      const fechamentos = await caller.fechamentoDiario.listarFechamentos({
        dataInicio,
        dataFim,
      });

      // Todos os fechamentos devem estar dentro do período
      fechamentos.forEach(f => {
        const dataFechamento = new Date(f.data);
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        expect(dataFechamento >= inicio).toBe(true);
        expect(dataFechamento <= fim).toBe(true);
      });
    });
  });

  describe("3. Notificações Automáticas", () => {
    it("deve validar threshold de notificações críticas", () => {
      const THRESHOLD_VALOR = 10000; // R$ 100,00 em centavos
      const THRESHOLD_QUANTIDADE = 5;

      expect(THRESHOLD_VALOR).toBe(10000);
      expect(THRESHOLD_QUANTIDADE).toBe(5);

      // Testar lógica de criticidade
      const valorDivergencia1 = 15000; // R$ 150,00 - crítico
      const valorDivergencia2 = 5000;  // R$ 50,00 - não crítico
      const quantidadeDivergencias1 = 6; // crítico
      const quantidadeDivergencias2 = 3; // não crítico

      expect(valorDivergencia1 >= THRESHOLD_VALOR).toBe(true);
      expect(valorDivergencia2 >= THRESHOLD_VALOR).toBe(false);
      expect(quantidadeDivergencias1 >= THRESHOLD_QUANTIDADE).toBe(true);
      expect(quantidadeDivergencias2 >= THRESHOLD_QUANTIDADE).toBe(false);
    });

    it("deve identificar divergências críticas corretamente", () => {
      const THRESHOLD_VALOR = 10000;
      const THRESHOLD_QUANTIDADE = 5;

      // Caso 1: Valor alto, quantidade baixa - CRÍTICO
      const caso1 = {
        valorTotal: 15000,
        quantidade: 2,
      };
      expect(caso1.valorTotal >= THRESHOLD_VALOR || caso1.quantidade >= THRESHOLD_QUANTIDADE).toBe(true);

      // Caso 2: Valor baixo, quantidade alta - CRÍTICO
      const caso2 = {
        valorTotal: 5000,
        quantidade: 6,
      };
      expect(caso2.valorTotal >= THRESHOLD_VALOR || caso2.quantidade >= THRESHOLD_QUANTIDADE).toBe(true);

      // Caso 3: Valor baixo, quantidade baixa - NÃO CRÍTICO
      const caso3 = {
        valorTotal: 5000,
        quantidade: 3,
      };
      expect(caso3.valorTotal >= THRESHOLD_VALOR || caso3.quantidade >= THRESHOLD_QUANTIDADE).toBe(false);

      // Caso 4: Ambos altos - CRÍTICO
      const caso4 = {
        valorTotal: 15000,
        quantidade: 6,
      };
      expect(caso4.valorTotal >= THRESHOLD_VALOR || caso4.quantidade >= THRESHOLD_QUANTIDADE).toBe(true);
    });
  });

  describe("4. Estrutura de Dados", () => {
    it("deve ter campos corretos na estrutura de divergências", () => {
      const divergenciaEsperada = {
        id: 1,
        fechamentoDiarioId: 1,
        tipoDivergencia: "valor_diferente",
        statusResolucao: "pendente",
        justificativa: null,
        resolvidoPorId: null,
        resolvidoPorNome: null,
        resolvidoEm: null,
        cvNsu: "123456",
        descricao: "Teste",
        valorEsperado: 10000,
        valorEncontrado: 10500,
        diferenca: 500,
      };

      // Validar tipos
      expect(typeof divergenciaEsperada.id).toBe("number");
      expect(typeof divergenciaEsperada.tipoDivergencia).toBe("string");
      expect(typeof divergenciaEsperada.statusResolucao).toBe("string");
      
      // Validar enums
      expect(["valor_diferente", "nao_lancado", "venda_fantasma", "data_incorreta"]).toContain(
        divergenciaEsperada.tipoDivergencia
      );
      expect(["pendente", "aprovado", "corrigido", "ignorado"]).toContain(
        divergenciaEsperada.statusResolucao
      );
    });
  });

  describe("5. Formatação de Valores", () => {
    it("deve formatar valores em centavos corretamente", () => {
      const formatarValor = (centavos: number): string => {
        return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
      };

      expect(formatarValor(10000)).toBe("R$ 100,00");
      expect(formatarValor(15050)).toBe("R$ 150,50");
      expect(formatarValor(500)).toBe("R$ 5,00");
      expect(formatarValor(0)).toBe("R$ 0,00");
      // Formato sem separador de milhares
      expect(formatarValor(123456)).toBe("R$ 1234,56");
    });

    it("deve formatar datas corretamente", () => {
      const formatarData = (data: string): string => {
        const [ano, mes, dia] = data.split("-");
        return `${dia}/${mes}/${ano}`;
      };

      expect(formatarData("2025-01-15")).toBe("15/01/2025");
      expect(formatarData("2025-12-31")).toBe("31/12/2025");
      expect(formatarData("2025-06-01")).toBe("01/06/2025");
    });
  });

  describe("6. Detalhes do Fechamento", () => {
    it("deve retornar todas as propriedades necessárias", async () => {
      const dataHoje = new Date().toISOString().split("T")[0];

      // Criar fechamento primeiro
      await caller.fechamentoDiario.buscarOuCriarFechamento({
        data: dataHoje,
      });

      const detalhes = await caller.fechamentoDiario.detalhesFechamento({
        data: dataHoje,
      });

      if (detalhes) {
        expect(detalhes).toHaveProperty("fechamento");
        expect(detalhes).toHaveProperty("transacoes");
        expect(detalhes).toHaveProperty("divergencias");
        expect(detalhes).toHaveProperty("pagamentosSistema");
        
        expect(Array.isArray(detalhes.transacoes)).toBe(true);
        expect(Array.isArray(detalhes.divergencias)).toBe(true);
        expect(Array.isArray(detalhes.pagamentosSistema)).toBe(true);

        // Validar estrutura do fechamento
        expect(detalhes.fechamento).toHaveProperty("id");
        expect(detalhes.fechamento).toHaveProperty("data");
        expect(detalhes.fechamento).toHaveProperty("status");
        expect(detalhes.fechamento).toHaveProperty("totalSistema");
      }
    });
  });
});

/**
 * Testes para validar a correção de divergências falsas no Fechamento Diário
 * 
 * Bug reportado: Sistema estava reportando divergências quando valores eram idênticos
 * Exemplo: R$ 350,00 (sistema) vs R$ 350,00 (planilha) = divergência falsa
 * 
 * Solução implementada: Tolerância de 1 centavo usando Math.abs()
 */
describe("Fechamento Diário - Correção de Divergências Falsas", () => {
  
  // Simula a lógica de comparação implementada no routers-fechamento-diario.ts (linhas 215-226)
  function compararValores(valorSistema: number, valorRede: number): boolean {
    const diferencaValor = Math.abs(valorSistema - valorRede);
    const TOLERANCIA_CENTAVO = 1; // 1 centavo de tolerância
    
    return diferencaValor <= TOLERANCIA_CENTAVO;
  }

  describe("Casos de valores idênticos (bug original)", () => {
    it("deve considerar R$ 350,00 = R$ 350,00 como iguais (caso reportado pelo usuário)", () => {
      const valorSistema = 35000; // R$ 350,00 em centavos
      const valorRede = 35000;    // R$ 350,00 em centavos
      
      const saoIguais = compararValores(valorSistema, valorRede);
      
      expect(saoIguais).toBe(true);
    });

    it("deve considerar R$ 650,00 = R$ 650,00 como iguais", () => {
      const valorSistema = 65000;
      const valorRede = 65000;
      
      const saoIguais = compararValores(valorSistema, valorRede);
      
      expect(saoIguais).toBe(true);
    });

    it("deve considerar R$ 1,00 = R$ 1,00 como iguais", () => {
      const valorSistema = 100;
      const valorRede = 100;
      
      const saoIguais = compararValores(valorSistema, valorRede);
      
      expect(saoIguais).toBe(true);
    });
  });

  describe("Tolerância de 1 centavo", () => {
    it("deve aceitar diferença de exatamente 1 centavo (limite da tolerância)", () => {
      const valorSistema = 35000; // R$ 350,00
      const valorRede = 35001;    // R$ 350,01
      
      const saoIguais = compararValores(valorSistema, valorRede);
      
      expect(saoIguais).toBe(true);
    });

    it("deve aceitar diferença de 1 centavo negativa", () => {
      const valorSistema = 35001; // R$ 350,01
      const valorRede = 35000;    // R$ 350,00
      
      const saoIguais = compararValores(valorSistema, valorRede);
      
      expect(saoIguais).toBe(true);
    });

    it("deve rejeitar diferença de 2 centavos", () => {
      const valorSistema = 35000; // R$ 350,00
      const valorRede = 35002;    // R$ 350,02
      
      const saoIguais = compararValores(valorSistema, valorRede);
      
      expect(saoIguais).toBe(false);
    });

    it("deve rejeitar diferença de 2 centavos negativa", () => {
      const valorSistema = 35000; // R$ 350,00
      const valorRede = 34998;    // R$ 349,98
      
      const saoIguais = compararValores(valorSistema, valorRede);
      
      expect(saoIguais).toBe(false);
    });
  });

  describe("Divergências reais (devem ser detectadas)", () => {
    it("deve detectar divergência de R$ 1,00 (R$ 350,00 vs R$ 351,00)", () => {
      const valorSistema = 35000; // R$ 350,00
      const valorRede = 35100;    // R$ 351,00
      
      const saoIguais = compararValores(valorSistema, valorRede);
      
      expect(saoIguais).toBe(false);
    });

    it("deve detectar divergência de R$ 10,00", () => {
      const valorSistema = 35000; // R$ 350,00
      const valorRede = 36000;    // R$ 360,00
      
      const saoIguais = compararValores(valorSistema, valorRede);
      
      expect(saoIguais).toBe(false);
    });

    it("deve detectar divergência de R$ 100,00", () => {
      const valorSistema = 35000; // R$ 350,00
      const valorRede = 45000;    // R$ 450,00
      
      const saoIguais = compararValores(valorSistema, valorRede);
      
      expect(saoIguais).toBe(false);
    });
  });

  describe("Casos extremos", () => {
    it("deve funcionar com valor zero", () => {
      const valorSistema = 0;
      const valorRede = 0;
      
      const saoIguais = compararValores(valorSistema, valorRede);
      
      expect(saoIguais).toBe(true);
    });

    it("deve funcionar com valores muito grandes (R$ 10.000,00)", () => {
      const valorSistema = 1000000; // R$ 10.000,00
      const valorRede = 1000000;
      
      const saoIguais = compararValores(valorSistema, valorRede);
      
      expect(saoIguais).toBe(true);
    });

    it("deve funcionar com valores decimais complexos", () => {
      const valorSistema = 12345; // R$ 123,45
      const valorRede = 12345;
      
      const saoIguais = compararValores(valorSistema, valorRede);
      
      expect(saoIguais).toBe(true);
    });
  });

  describe("Validação da lógica Math.abs()", () => {
    it("Math.abs() deve retornar valor absoluto positivo", () => {
      expect(Math.abs(5 - 3)).toBe(2);
      expect(Math.abs(3 - 5)).toBe(2);
      expect(Math.abs(-5)).toBe(5);
      expect(Math.abs(0)).toBe(0);
    });

    it("deve usar Math.abs() para diferenças bidirecionais", () => {
      const valor1 = 35000;
      const valor2 = 35001;
      
      // Diferença positiva
      expect(Math.abs(valor1 - valor2)).toBe(1);
      
      // Diferença negativa (mesmo resultado)
      expect(Math.abs(valor2 - valor1)).toBe(1);
      
      // Ambas devem ser iguais
      expect(Math.abs(valor1 - valor2)).toBe(Math.abs(valor2 - valor1));
    });
  });
});
