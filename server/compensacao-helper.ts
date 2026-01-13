/**
 * Helper para cálculo de compensação bancária
 * Calcula datas de compensação considerando dias úteis e feriados nacionais
 */

// Feriados fixos (mês, dia)
const FERIADOS_FIXOS: [number, number][] = [
  [1, 1],   // Ano Novo
  [4, 21],  // Tiradentes
  [5, 1],   // Dia do Trabalho
  [9, 7],   // Independência
  [10, 12], // Nossa Senhora Aparecida
  [11, 2],  // Finados
  [11, 15], // Proclamação da República
  [12, 25], // Natal
];

// Feriados móveis (Carnaval, Sexta-feira Santa, Corpus Christi) - 2024 a 2030
const FERIADOS_MOVEIS: { [ano: number]: string[] } = {
  2024: ["2024-02-13", "2024-03-29", "2024-05-30"], // Carnaval, Sexta Santa, Corpus
  2025: ["2025-03-04", "2025-04-18", "2025-06-19"],
  2026: ["2026-02-17", "2026-04-03", "2026-06-04"],
  2027: ["2027-02-09", "2027-03-26", "2027-05-27"],
  2028: ["2028-02-29", "2028-04-14", "2028-06-15"],
  2029: ["2029-02-13", "2029-03-30", "2029-05-31"],
  2030: ["2030-03-05", "2030-04-19", "2030-06-20"],
};

/**
 * Verifica se uma data é feriado nacional
 */
export function ehFeriado(data: Date): boolean {
  const mes = data.getMonth() + 1;
  const dia = data.getDate();
  const ano = data.getFullYear();

  // Verifica feriados fixos
  for (const [mesFeriado, diaFeriado] of FERIADOS_FIXOS) {
    if (mes === mesFeriado && dia === diaFeriado) {
      return true;
    }
  }

  // Verifica feriados móveis
  const feriadosAno = FERIADOS_MOVEIS[ano];
  if (feriadosAno) {
    const dataStr = data.toISOString().split("T")[0];
    if (feriadosAno.includes(dataStr)) {
      return true;
    }
  }

  return false;
}

/**
 * Verifica se uma data é dia útil (segunda a sexta, excluindo feriados)
 */
export function ehDiaUtil(data: Date): boolean {
  const diaSemana = data.getDay();
  // 0 = Domingo, 6 = Sábado
  if (diaSemana === 0 || diaSemana === 6) {
    return false;
  }
  return !ehFeriado(data);
}

/**
 * Adiciona dias úteis a uma data
 */
export function adicionarDiasUteis(dataInicio: Date, diasUteis: number): Date {
  const resultado = new Date(dataInicio);
  let diasAdicionados = 0;

  while (diasAdicionados < diasUteis) {
    resultado.setDate(resultado.getDate() + 1);
    if (ehDiaUtil(resultado)) {
      diasAdicionados++;
    }
  }

  return resultado;
}

/**
 * Calcula a data de compensação bancária
 * @param dataVenda - Data da venda
 * @param diasUteis - Número de dias úteis para compensação (padrão: 1)
 * @returns Data de compensação
 */
export function calcularDataCompensacao(dataVenda: Date, diasUteis: number = 1): Date {
  return adicionarDiasUteis(dataVenda, diasUteis);
}

/**
 * Formata data para DD/MM/YYYY
 */
export function formatarData(data: Date): string {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata valor em centavos para moeda brasileira
 */
export function formatarMoeda(valorCentavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valorCentavos / 100);
}
