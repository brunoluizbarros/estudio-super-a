import { getDb } from "./db";
import { turmas, eventos, execucaoFormando, fotosFormando, users } from "../drizzle/schema";
import { eq, and, gte, lte, like, or, sql } from "drizzle-orm";

/**
 * Interface para representar uma entrada de observação consolidada
 */
export interface ObservacaoAuditoria {
  id: string; // Formato: "tipo-id-timestamp"
  tipo: "turma" | "evento" | "abordagem" | "execucao";
  origemId: number;
  origemNome: string; // Nome da turma, evento, etc.
  timestamp: string; // Data/hora da observação
  usuario: string; // Nome do usuário que fez a observação
  texto: string; // Texto da observação
  createdAt: Date; // Data de criação do registro
}

/**
 * Parse de observações no formato: [DD/MM/YYYY HH:MM - Nome do Usuário] Texto
 */
function parseObservacoes(texto: string | null, tipo: string, origemId: number, origemNome: string, createdAt: Date): ObservacaoAuditoria[] {
  if (!texto || texto.trim() === "") return [];
  
  const entries: ObservacaoAuditoria[] = [];
  const regex = /\[(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}) - ([^\]]+)\] ([\s\S]+?)(?=\n\[|$)/gm;
  let match;
  let index = 0;
  
  while ((match = regex.exec(texto)) !== null) {
    entries.push({
      id: `${tipo}-${origemId}-${index}`,
      tipo: tipo as any,
      origemId,
      origemNome,
      timestamp: match[1],
      usuario: match[2],
      texto: match[3].trim(),
      createdAt,
    });
    index++;
  }
  
  return entries;
}

/**
 * Lista todas as observações do sistema de forma consolidada
 */
export async function listObservacoesConsolidadas(params: {
  dataInicio?: Date;
  dataFim?: Date;
  usuario?: string;
  tipo?: "turma" | "evento" | "abordagem" | "execucao";
  busca?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const observacoes: ObservacaoAuditoria[] = [];

  // 1. Observações de Turmas
  if (!params.tipo || params.tipo === "turma") {
    const turmasComObs = await db
      .select({
        id: turmas.id,
        codigo: turmas.codigo,
        cursos: turmas.cursos,
        instituicoes: turmas.instituicoes,
        observacao: turmas.observacao,
        createdAt: turmas.createdAt,
      })
      .from(turmas)
      .where(sql`${turmas.observacao} IS NOT NULL AND ${turmas.observacao} != ''`);

    for (const turma of turmasComObs) {
      const cursosArray = JSON.parse(turma.cursos as string);
      const instituicoesArray = JSON.parse(turma.instituicoes as string);
      const origemNome = `Turma ${turma.codigo} - ${cursosArray[0]} ${instituicoesArray[0]}`;
      
      const obs = parseObservacoes(turma.observacao, "turma", turma.id, origemNome, turma.createdAt);
      observacoes.push(...obs);
    }
  }

  // 2. Observações de Eventos
  if (!params.tipo || params.tipo === "evento") {
    const eventosComObs = await db
      .select({
        id: eventos.id,
        turmaId: eventos.turmaId,
        tipoEvento: eventos.tipoEvento,
        dataEvento: eventos.dataEvento,
        observacao: eventos.observacao,
        createdAt: eventos.createdAt,
      })
      .from(eventos)
      .where(sql`${eventos.observacao} IS NOT NULL AND ${eventos.observacao} != ''`);

    for (const evento of eventosComObs) {
      const origemNome = `Evento ${evento.tipoEvento} - Turma ${evento.turmaId}`;
      
      const obs = parseObservacoes(evento.observacao, "evento", evento.id, origemNome, evento.createdAt);
      observacoes.push(...obs);
    }
  }

  // 3. Observações de Abordagem (fotos_formando)
  if (!params.tipo || params.tipo === "abordagem") {
    const fotosComObs = await db
      .select({
        id: fotosFormando.id,
        briefingFormandoId: fotosFormando.briefingFormandoId,
        cenarioId: fotosFormando.cenarioId,
        observacao: fotosFormando.observacao,
        createdAt: fotosFormando.createdAt,
      })
      .from(fotosFormando)
      .where(sql`${fotosFormando.observacao} IS NOT NULL AND ${fotosFormando.observacao} != ''`);

    for (const foto of fotosComObs) {
      const origemNome = `Abordagem - Briefing ${foto.briefingFormandoId} - Cenário ${foto.cenarioId}`;
      
      const obs = parseObservacoes(foto.observacao, "abordagem", foto.id, origemNome, foto.createdAt);
      observacoes.push(...obs);
    }
  }

  // 4. Observações de Execução
  if (!params.tipo || params.tipo === "execucao") {
    const execucoesComObs = await db
      .select({
        id: execucaoFormando.id,
        eventoId: execucaoFormando.eventoId,
        formandoId: execucaoFormando.formandoId,
        observacoes: execucaoFormando.observacoes,
        createdAt: execucaoFormando.createdAt,
      })
      .from(execucaoFormando)
      .where(sql`${execucaoFormando.observacoes} IS NOT NULL AND ${execucaoFormando.observacoes} != ''`);

    for (const execucao of execucoesComObs) {
      const origemNome = `Execução - Evento ${execucao.eventoId} - Formando ${execucao.formandoId}`;
      
      const obs = parseObservacoes(execucao.observacoes, "execucao", execucao.id, origemNome, execucao.createdAt);
      observacoes.push(...obs);
    }
  }

  // Filtrar por usuário
  let filtered = observacoes;
  if (params.usuario) {
    filtered = filtered.filter(obs => 
      obs.usuario.toLowerCase().includes(params.usuario!.toLowerCase())
    );
  }

  // Filtrar por busca (texto)
  if (params.busca) {
    const busca = params.busca.toLowerCase();
    filtered = filtered.filter(obs => 
      obs.texto.toLowerCase().includes(busca) ||
      obs.origemNome.toLowerCase().includes(busca)
    );
  }

  // Filtrar por data (parse timestamp DD/MM/YYYY HH:MM)
  if (params.dataInicio || params.dataFim) {
    filtered = filtered.filter(obs => {
      // Parse timestamp: DD/MM/YYYY HH:MM
      const [datePart, timePart] = obs.timestamp.split(' ');
      const [day, month, year] = datePart.split('/');
      const [hour, minute] = timePart.split(':');
      const obsDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      if (params.dataInicio && obsDate < params.dataInicio) return false;
      if (params.dataFim && obsDate > params.dataFim) return false;
      return true;
    });
  }

  // Ordenar por timestamp (mais recente primeiro)
  filtered.sort((a, b) => {
    const parseTimestamp = (ts: string) => {
      const [datePart, timePart] = ts.split(' ');
      const [day, month, year] = datePart.split('/');
      const [hour, minute] = timePart.split(':');
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      ).getTime();
    };

    return parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp);
  });

  return filtered;
}
