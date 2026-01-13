import { getDb } from "./db";
import { formandos, eventos, briefingFormando } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ==================== BECAS ====================

/**
 * Lista formandos do evento "Foto Oficial" com dados de becas
 * Retorna: dados do formando, beca do estúdio (tamanhoBeca), beca do evento (becaEvento),
 * peso e altura do briefing
 */
export async function getFormandosComBecasByTurma(turmaId: number) {
  const db = await getDb();
  if (!db) return [];

  // Buscar evento "Foto Oficial" da turma
  const eventosFotoOficial = await db
    .select()
    .from(eventos)
    .where(and(
      eq(eventos.turmaId, turmaId),
      eq(eventos.tipoEvento, "foto_oficial")
    ));

  if (eventosFotoOficial.length === 0) {
    return []; // Não há evento Foto Oficial para esta turma
  }

  const eventoId = eventosFotoOficial[0].id;

  // Buscar formandos da turma com dados de becas e briefing
  const result = await db
    .select({
      // Dados do formando
      formandoId: formandos.id,
      formandoNome: formandos.nome,
      formandoCpf: formandos.cpf,
      formandoStatus: formandos.status,
      // Becas
      becaEstudio: formandos.tamanhoBeca,
      becaEvento: formandos.becaEvento,
      // Dados do briefing (peso e altura)
      peso: briefingFormando.peso,
      altura: briefingFormando.altura,
      briefingId: briefingFormando.id,
    })
    .from(formandos)
    .leftJoin(
      briefingFormando,
      and(
        eq(briefingFormando.formandoId, formandos.id),
        eq(briefingFormando.eventoId, eventoId)
      )
    )
    .where(eq(formandos.turmaId, turmaId))
    .orderBy(formandos.nome);

  return result;
}

/**
 * Atualiza o campo becaEvento de um formando
 */
export async function updateBecaEvento(formandoId: number, becaEvento: string | null) {
  const db = await getDb();
  if (!db) return false;
  
  await db
    .update(formandos)
    .set({ becaEvento })
    .where(eq(formandos.id, formandoId));
  
  return true;
}
