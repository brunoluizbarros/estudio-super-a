/**
 * Script de Processamento Mensal de Despesas de Maquiadoras
 * 
 * Execução: Todo dia 1º de cada mês às 07:00 (Recife/PE - UTC-3)
 * 
 * Funcionalidade:
 * - Busca todos os serviços de maquiagem do mês anterior
 * - Agrupa por maquiadora e turma
 * - Calcula valor: (Total a Pagar Make Formando) - (Total a Receber Make Família)
 * - Cria uma despesa para cada combinação maquiadora + turma
 * - Envia notificações in-app e e-mail para Logística, Gestor e Administrador
 */

import { 
  getServicosMaquiagemMesAnterior,
  createDespesaMaquiadora,
  getUsuariosByRoles
} from './db.js';
import { createNotificacao } from './db-notificacoes.js';
import { sendEmail } from './_core/email.js';

interface ServicoMaquiagem {
  maquiadoraId: number | null;
  maquiadoraNome: string | null;
  turmaId: number;
  turmaCodigo: string;
  tipoServico: 'make_formando' | 'make_familia' | 'cabelo_simples' | 'cabelo_combinado';
  valor: number | null;
  quantidade: number;
}

interface DespesaMaquiadora {
  maquiadoraId: number;
  maquiadoraNome: string;
  turmaId: number;
  turmaCodigo: string;
  totalAPagar: number;
  totalAReceber: number;
  valorFinal: number;
}

/**
 * Agrupa serviços por maquiadora e turma
 */
function agruparServicosPorMaquiadoraTurma(servicos: ServicoMaquiagem[]): DespesaMaquiadora[] {
  const grupos = new Map<string, DespesaMaquiadora>();

  for (const servico of servicos) {
    // Pular serviços sem maquiadora ou sem valor
    if (!servico.maquiadoraId || !servico.maquiadoraNome || servico.valor === null) {
      continue;
    }

    const chave = `${servico.maquiadoraId}-${servico.turmaId}`;
    
    if (!grupos.has(chave)) {
      grupos.set(chave, {
        maquiadoraId: servico.maquiadoraId,
        maquiadoraNome: servico.maquiadoraNome,
        turmaId: servico.turmaId,
        turmaCodigo: servico.turmaCodigo,
        totalAPagar: 0,
        totalAReceber: 0,
        valorFinal: 0,
      });
    }

    const grupo = grupos.get(chave)!;

    if (servico.tipoServico === 'make_formando') {
      grupo.totalAPagar += servico.valor * servico.quantidade;
    } else if (servico.tipoServico === 'make_familia') {
      grupo.totalAReceber += servico.valor * servico.quantidade;
    }
  }

  // Calcular valor final e converter para array
  const despesasArray = Array.from(grupos.values());
  for (const grupo of despesasArray) {
    grupo.valorFinal = grupo.totalAPagar - grupo.totalAReceber;
  }

  return despesasArray;
}

/**
 * Formata nome do mês em português
 */
function getNomeMes(mes: number): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return meses[mes - 1];
}

/**
 * Envia notificações in-app e e-mail
 */
async function enviarNotificacoes(despesasCriadas: number, mesReferencia: string) {
  try {
    // Buscar usuários Logística, Gestor e Administrador
    const usuarios = await getUsuariosByRoles(['logistica', 'gestor', 'administrador']);

    const titulo = `Despesas de Maquiadoras - ${mesReferencia}`;
    const mensagem = `${despesasCriadas} despesa(s) de maquiagem foram criadas automaticamente referente ao mês de ${mesReferencia}. Acesse a seção Despesas para revisar.`;

    // Criar notificações in-app
    for (const usuario of usuarios) {
      await createNotificacao({
        userId: usuario.id,
        tipo: 'despesa_criada',
        titulo,
        mensagem,
      });
    }

    // Enviar e-mails
    const emailsDestinatarios = usuarios.map(u => u.email).filter((email): email is string => Boolean(email));
    
    if (emailsDestinatarios.length > 0) {
      await sendEmail({
        to: emailsDestinatarios.join(', '), // Concatenar e-mails separados por vírgula
        subject: titulo,
        html: `
          <h2>${titulo}</h2>
          <p>${mensagem}</p>
          <p><strong>Total de despesas criadas:</strong> ${despesasCriadas}</p>
          <p>As despesas foram criadas com status "Aguardando Aprovação do Gestor" e aguardam revisão.</p>
          <br>
          <p>Atenciosamente,<br>Sistema Estúdio Super A</p>
        `,
      });
    }

    console.log(`[CRON] Notificações enviadas para ${usuarios.length} usuários`);
  } catch (error) {
    console.error('[CRON] Erro ao enviar notificações:', error);
  }
}

/**
 * Função principal de processamento
 */
export async function processarDespesasMaquiadoras() {
  console.log('[CRON] Iniciando processamento de despesas de maquiadoras...');

  try {
    // Calcular mês anterior
    const hoje = new Date();
    const mesAnterior = hoje.getMonth(); // 0-11 (Janeiro = 0)
    const anoAnterior = mesAnterior === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
    const mesReferencia = mesAnterior === 0 ? 12 : mesAnterior;

    const nomeMes = getNomeMes(mesReferencia);
    console.log(`[CRON] Processando serviços de ${nomeMes}/${anoAnterior}`);

    // Buscar serviços do mês anterior
    const servicos = await getServicosMaquiagemMesAnterior(mesReferencia, anoAnterior);
    console.log(`[CRON] ${servicos.length} serviços encontrados`);

    if (servicos.length === 0) {
      console.log('[CRON] Nenhum serviço de maquiagem encontrado no mês anterior');
      return;
    }

    // Agrupar por maquiadora e turma
    const despesas = agruparServicosPorMaquiadoraTurma(servicos);
    console.log(`[CRON] ${despesas.length} despesas serão criadas`);

    // Criar despesas
    let despesasCriadas = 0;
    for (const despesa of despesas) {
      // Só criar despesa se valor final for positivo (há valor a pagar)
      if (despesa.valorFinal > 0) {
        await createDespesaMaquiadora({
          fornecedorId: despesa.maquiadoraId,
          turmaId: despesa.turmaId,
          mesServico: mesReferencia, // 1-12
          detalhamento: `Serviço de Maquiagem referente ao mês de ${nomeMes}`,
          valor: despesa.valorFinal,
        });
        despesasCriadas++;
        console.log(`[CRON] Despesa criada: ${despesa.maquiadoraNome} - Turma ${despesa.turmaCodigo} - R$ ${despesa.valorFinal.toFixed(2)}`);
      }
    }

    console.log(`[CRON] ${despesasCriadas} despesas criadas com sucesso`);

    // Enviar notificações
    if (despesasCriadas > 0) {
      await enviarNotificacoes(despesasCriadas, nomeMes);
    }

    console.log('[CRON] Processamento concluído com sucesso');
  } catch (error) {
    console.error('[CRON] Erro ao processar despesas de maquiadoras:', error);
    throw error;
  }
}

// Permitir execução direta via node
if (import.meta.url === `file://${process.argv[1]}`) {
  processarDespesasMaquiadoras()
    .then(() => {
      console.log('[CRON] Script finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[CRON] Script falhou:', error);
      process.exit(1);
    });
}
