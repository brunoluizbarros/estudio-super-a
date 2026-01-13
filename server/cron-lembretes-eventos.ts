/**
 * Script de lembretes automáticos de eventos
 * 
 * Envia notificações para o setor Financeiro:
 * - 5 dias antes do primeiro dia do evento
 * - 2 dias antes do primeiro dia do evento
 * 
 * Deve rodar diariamente às 07:00 (horário de Recife/PE - UTC-3)
 */

import { getDb } from "./db";
import { eventos } from "../drizzle/schema";
import { gte, lte, and, sql } from "drizzle-orm";
import { notificarFinanceiro } from "./db-notificacoes-helper";
import { getTurmaById } from "./db";

async function enviarLembretesEventos() {
  console.log(`[Lembretes] Iniciando verificação de eventos - ${new Date().toISOString()}`);
  
  const db = await getDb();
  if (!db) {
    console.error("[Lembretes] Database não disponível");
    return;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Calcular datas alvo
  const em5Dias = new Date(hoje);
  em5Dias.setDate(hoje.getDate() + 5);
  em5Dias.setHours(23, 59, 59, 999);

  const em2Dias = new Date(hoje);
  em2Dias.setDate(hoje.getDate() + 2);
  em2Dias.setHours(23, 59, 59, 999);

  try {
    // Buscar eventos que acontecerão em 5 dias
    const eventosEm5Dias = await db
      .select()
      .from(eventos)
      .where(
        and(
          gte(eventos.dataEvento, hoje),
          lte(eventos.dataEvento, em5Dias),
          sql`DATEDIFF(${eventos.dataEvento}, CURDATE()) = 5`
        )
      );

    console.log(`[Lembretes] Eventos em 5 dias: ${eventosEm5Dias.length}`);

    for (const evento of eventosEm5Dias) {
      if (!evento.dataEvento) continue;

      const turma = await getTurmaById(evento.turmaId);
      const tipoEventoLabel = evento.tipoEvento.replace('foto_', '').replace('_', ' ').toUpperCase();
      const dataFormatada = new Date(evento.dataEvento).toLocaleDateString('pt-BR');

      await notificarFinanceiro({
        tipo: 'lembrete_evento_5dias',
        titulo: 'Lembrete: Evento em 5 dias',
        mensagem: `${tipoEventoLabel} - Turma ${turma?.codigo || evento.turmaId} - Data: ${dataFormatada}`,
        eventoId: evento.id,
      }).catch(err => console.error('[Lembretes] Erro ao notificar (5 dias):', err));

      console.log(`[Lembretes] Notificação enviada (5 dias): Evento ${evento.id}`);
    }

    // Buscar eventos que acontecerão em 2 dias
    const eventosEm2Dias = await db
      .select()
      .from(eventos)
      .where(
        and(
          gte(eventos.dataEvento, hoje),
          lte(eventos.dataEvento, em2Dias),
          sql`DATEDIFF(${eventos.dataEvento}, CURDATE()) = 2`
        )
      );

    console.log(`[Lembretes] Eventos em 2 dias: ${eventosEm2Dias.length}`);

    for (const evento of eventosEm2Dias) {
      if (!evento.dataEvento) continue;

      const turma = await getTurmaById(evento.turmaId);
      const tipoEventoLabel = evento.tipoEvento.replace('foto_', '').replace('_', ' ').toUpperCase();
      const dataFormatada = new Date(evento.dataEvento).toLocaleDateString('pt-BR');

      await notificarFinanceiro({
        tipo: 'lembrete_evento_2dias',
        titulo: 'Lembrete: Evento em 2 dias',
        mensagem: `${tipoEventoLabel} - Turma ${turma?.codigo || evento.turmaId} - Data: ${dataFormatada}`,
        eventoId: evento.id,
      }).catch(err => console.error('[Lembretes] Erro ao notificar (2 dias):', err));

      console.log(`[Lembretes] Notificação enviada (2 dias): Evento ${evento.id}`);
    }

    console.log(`[Lembretes] Verificação concluída com sucesso`);
  } catch (error) {
    console.error('[Lembretes] Erro ao processar lembretes:', error);
  }
}

// Executar imediatamente se chamado diretamente
if (require.main === module) {
  enviarLembretesEventos()
    .then(() => {
      console.log('[Lembretes] Script finalizado');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Lembretes] Erro fatal:', err);
      process.exit(1);
    });
}

export { enviarLembretesEventos };
