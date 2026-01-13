/**
 * Sistema de Observações com Histórico Imutável
 * 
 * Cada observação é registrada com usuário, timestamp e texto.
 * Observações anteriores não podem ser excluídas, apenas novas podem ser adicionadas.
 */

export interface ObservacaoHistorico {
  usuario: string; // Nome do usuário que adicionou a observação
  usuarioId: number; // ID do usuário
  timestamp: Date; // Data e hora da observação
  texto: string; // Conteúdo da observação
}

export type ObservacoesJSON = ObservacaoHistorico[];

/**
 * Converte string JSON para array de observações
 */
export function parseObservacoes(json: string | null): ObservacoesJSON {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(obs => ({
      ...obs,
      timestamp: new Date(obs.timestamp)
    })) : [];
  } catch {
    return [];
  }
}

/**
 * Converte array de observações para string JSON
 */
export function stringifyObservacoes(observacoes: ObservacoesJSON): string {
  return JSON.stringify(observacoes);
}

/**
 * Adiciona nova observação ao histórico
 */
export function adicionarObservacao(
  observacoesAtuais: string | null,
  novaObservacao: { usuario: string; usuarioId: number; texto: string }
): string {
  const observacoes = parseObservacoes(observacoesAtuais);
  observacoes.push({
    ...novaObservacao,
    timestamp: new Date(),
  });
  return stringifyObservacoes(observacoes);
}

/**
 * Formata data/hora para exibição
 */
export function formatarTimestamp(timestamp: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}
