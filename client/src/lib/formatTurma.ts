/**
 * Utilitário para formatação consistente de dados de turmas em todo o sistema
 * 
 * FORMATO PADRÃO (SEM SEPARADORES "-"):
 * Código Curso Instituição Nº Ano.Período
 * 
 * Exemplo: 820 MEDICINA UNINASSAU 20 2028.2
 */

/**
 * Parse de arrays JSON armazenados como strings
 */
export function parseJsonArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Parse de arrays de números JSON armazenados como strings
 */
export function parseJsonNumberArray(value: any): number[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Formata dados completos da turma no formato padrão do sistema
 * 
 * @param turma - Objeto turma com campos: codigo, cursos, instituicoes, turmaNumero, anos, periodos
 * @returns String formatada: "Código Curso Instituição Nº Ano.Período"
 * 
 * Exemplo: formatTurmaCompleta(turma) => "820 MEDICINA UNINASSAU 20 2028.2"
 */
export function formatTurmaCompleta(turma: any): string {
  if (!turma) return "";

  const cursos = parseJsonArray(turma.cursos);
  const instituicoes = parseJsonArray(turma.instituicoes);
  const anos = parseJsonNumberArray(turma.anos);
  const periodos = parseJsonNumberArray(turma.periodos);

  const cursosStr = cursos.length > 0 ? cursos[0] : "";
  const instituicoesStr = instituicoes.length > 0 ? instituicoes[0] : "";
  const anosStr = anos.length > 0 ? anos[0].toString() : "";
  const periodosStr = periodos.length > 0 ? periodos[0].toString() : "";

  // Montar label: Código Curso Instituição Nº Ano.Período (SEM SEPARADORES "-")
  const partes = [];
  
  if (turma.codigo) partes.push(turma.codigo);
  if (cursosStr) partes.push(cursosStr);
  if (instituicoesStr) partes.push(instituicoesStr);
  // Aceitar tanto numeroTurma (schema correto) quanto turmaNumero (legado)
  const numeroTurmaValue = turma.numeroTurma || turma.turmaNumero;
  if (numeroTurmaValue) partes.push(numeroTurmaValue);
  // Adicionar Ano.Período independentemente de numeroTurma existir
  if (anosStr && periodosStr) partes.push(`${anosStr}.${periodosStr}`);

  return partes.join(" ");
}

/**
 * Formata dados de turma para vendas (campos diferentes)
 * 
 * @param venda - Objeto venda com campos: turmaCodigo, turmaCursos, turmaInstituicoes, turmaNumero, turmaAnos, turmaPeriodos
 * @returns String formatada: "Código Curso Instituição Nº Ano.Período"
 */
export function formatTurmaVenda(venda: any): string {
  if (!venda || !venda.turmaCodigo) return "";

  const cursos = parseJsonArray(venda.turmaCursos);
  const instituicoes = parseJsonArray(venda.turmaInstituicoes);
  // Aceitar tanto singular (turmaAno) quanto plural (turmaAnos)
  const anos = parseJsonNumberArray(venda.turmaAnos || venda.turmaAno);
  const periodos = parseJsonNumberArray(venda.turmaPeriodos || venda.turmaPeriodo);

  const cursosStr = cursos.length > 0 ? cursos[0] : "";
  const instituicoesStr = instituicoes.length > 0 ? instituicoes[0] : "";
  const anosStr = anos.length > 0 ? anos[0].toString() : "";
  const periodosStr = periodos.length > 0 ? periodos[0].toString() : "";

  // Montar label: Código Curso Instituição Nº Ano.Período (SEM SEPARADORES "-")
  const partes = [];
  
  if (venda.turmaCodigo) partes.push(venda.turmaCodigo);
  if (cursosStr) partes.push(cursosStr);
  if (instituicoesStr) partes.push(instituicoesStr);
  if (venda.turmaNumero) partes.push(venda.turmaNumero);
  if (anosStr && periodosStr) partes.push(`${anosStr}.${periodosStr}`);

  return partes.join(" ");
}

/**
 * Formata dados de turma para serviços (campos diferentes)
 * 
 * @param servico - Objeto servico com campos: turmaCodigo, turmaCursos, turmaInstituicoes, turmaNumero, turmaAnos, turmaPeriodos
 * @returns String formatada: "Código Curso Instituição Nº Ano.Período"
 */
export function formatTurmaServico(servico: any): string {
  if (!servico || !servico.turmaCodigo) return "";

  const cursos = parseJsonArray(servico.turmaCursos);
  const instituicoes = parseJsonArray(servico.turmaInstituicoes);
  // Aceitar tanto singular (turmaAno) quanto plural (turmaAnos)
  const anos = parseJsonNumberArray(servico.turmaAno || servico.turmaAnos);
  const periodos = parseJsonArray(servico.turmaPeriodo || servico.turmaPeriodos);

  const cursosStr = cursos.length > 0 ? cursos[0] : "";
  const instituicoesStr = instituicoes.length > 0 ? instituicoes[0] : "";
  const anosStr = anos.length > 0 ? anos[0].toString() : "";
  const periodosStr = periodos.length > 0 ? periodos[0].toString() : "";

  // Montar label: Código Curso Instituição Nº Ano.Período (SEM SEPARADORES "-")
  const partes = [];
  
  if (servico.turmaCodigo) partes.push(servico.turmaCodigo);
  if (cursosStr) partes.push(cursosStr);
  if (instituicoesStr) partes.push(instituicoesStr);
  if (servico.turmaNumero) partes.push(servico.turmaNumero);
  if (anosStr && periodosStr) partes.push(`${anosStr}.${periodosStr}`);

  return partes.join(" ");
}
