import * as XLSX from 'xlsx';

/**
 * Interface para representar um formando na planilha de briefing
 */
export interface BriefingFormandoPlanilha {
  numeroGrupo: number;
  dataGrupo: Date;
  limiteFormandos: number;
  nomeFormando: string;
  horarioFormandos: string;
  horarioFamiliaSemServico: string;
  maquiagemFormando: boolean;
  maquiagemFamilia: number;
  cabeloSimples: number;
  cabeloCombinado: number;
  horarioFamiliaComServico: string;
  qtdFamilia: number;
  qtdPets: number;
  somenteGrupo: boolean;
}

/**
 * Interface para representar um grupo processado
 */
export interface GrupoProcessado {
  numero: number;
  dataGrupo: Date;
  horarioFormandos: string;
  limiteFormandos: number;
  formandos: BriefingFormandoPlanilha[];
}

/**
 * Converte valor de célula para boolean
 * Aceita: "Sim", "sim", "SIM", "S", "s", true, 1
 */
function converterParaBoolean(valor: any): boolean {
  if (valor === null || valor === undefined || valor === '') return false;
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor === 1;
  if (typeof valor === 'string') {
    const normalizado = valor.trim().toLowerCase();
    return normalizado === 'sim' || normalizado === 's' || normalizado === 'x' || normalizado === '1';
  }
  return false;
}

/**
 * Converte valor de célula para número
 */
function converterParaNumero(valor: any): number {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string') {
    const numero = parseFloat(valor.replace(',', '.'));
    return isNaN(numero) ? 0 : numero;
  }
  return 0;
}

/**
 * Formata horário para string HH:MM
 */
function formatarHorario(valor: any): string {
  if (!valor) return '';
  
  // Se for um objeto Date (Excel às vezes retorna horários como Date)
  if (valor instanceof Date) {
    const horas = valor.getHours().toString().padStart(2, '0');
    const minutos = valor.getMinutes().toString().padStart(2, '0');
    return `${horas}:${minutos}`;
  }
  
  // Se for string, retornar como está
  if (typeof valor === 'string') {
    return valor.trim();
  }
  
  return '';
}

/**
 * Processa dados JSON da planilha de briefing e retorna grupos organizados
 */
export function processarDadosBriefing(dados: any[]): GrupoProcessado[] {
  console.log('[BRIEFING HELPER] Processando dados da planilha:', {
    totalLinhas: dados.length,
    primeiraLinha: dados[0]
  });
  
  // Mapear dados da planilha
  const formandos: BriefingFormandoPlanilha[] = dados.map((row) => ({
    numeroGrupo: converterParaNumero(row['Número do Grupo']),
    dataGrupo: row['Data do Grupo'] instanceof Date ? row['Data do Grupo'] : new Date(row['Data do Grupo']),
    limiteFormandos: converterParaNumero(row['Limite de Formandos']),
    nomeFormando: (row['Formando'] || '').toString().trim(),
    horarioFormandos: formatarHorario(row['Horário dos Formandos']),
    horarioFamiliaSemServico: formatarHorario(row['Horário Família Sem Serviço']),
    maquiagemFormando: converterParaBoolean(row['Maquiagem Formando']),
    maquiagemFamilia: converterParaNumero(row['Maquiagem Família/Convidados']),
    cabeloSimples: converterParaNumero(row['Cabelo Simples\t'] || row['Cabelo Simples']),
    cabeloCombinado: converterParaNumero(row['Cabelo Combinado']),
    horarioFamiliaComServico: formatarHorario(row['Horário Família com Serviço']),
    qtdFamilia: converterParaNumero(row['Quantidade de Família/Convidados\t'] || row['Quantidade de Família/Convidados']),
    qtdPets: converterParaNumero(row['Quantidade de Pets']),
    somenteGrupo: converterParaBoolean(row['Só Grupo']),
  }));
  
  // Agrupar formandos por número de grupo
  const gruposMap = new Map<number, GrupoProcessado>();
  
  for (const formando of formandos) {
    if (!formando.nomeFormando) continue; // Pular linhas vazias
    
    if (!gruposMap.has(formando.numeroGrupo)) {
      gruposMap.set(formando.numeroGrupo, {
        numero: formando.numeroGrupo,
        dataGrupo: formando.dataGrupo,
        horarioFormandos: formando.horarioFormandos,
        limiteFormandos: formando.limiteFormandos, // Será ajustado depois
        formandos: [],
      });
    }
    
    gruposMap.get(formando.numeroGrupo)!.formandos.push(formando);
  }
  
  // Ajustar limite de formandos para cada grupo baseado na quantidade real
  // Isso corrige planilhas com limites incorretos
  for (const grupo of Array.from(gruposMap.values())) {
    const quantidadeReal = grupo.formandos.length;
    // Usar o maior valor entre o limite da planilha e a quantidade real + margem de 2
    grupo.limiteFormandos = Math.max(grupo.limiteFormandos, quantidadeReal + 2);
    console.log(`[BRIEFING HELPER] Grupo ${grupo.numero}: ajustando limite de ${grupo.formandos.length} formandos para ${grupo.limiteFormandos}`);
  }
  
  // Converter Map para array e ordenar por número de grupo
  const grupos = Array.from(gruposMap.values()).sort((a, b) => a.numero - b.numero);
  console.log('[BRIEFING HELPER] Grupos processados:', {
    totalGrupos: grupos.length,
    grupos: grupos.map(g => ({ numero: g.numero, totalFormandos: g.formandos.length }))
  });
  return grupos;
}

/**
 * Processa arquivo Excel de briefing e retorna grupos organizados
 * @deprecated Use processarDadosBriefing para processar dados JSON diretamente
 */
export function processarPlanilhaBriefing(buffer: Buffer): GrupoProcessado[] {
  // Ler arquivo Excel
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Converter para JSON
  const dados: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });
  
  // Mapear dados da planilha
  const formandos: BriefingFormandoPlanilha[] = dados.map((row) => ({
    numeroGrupo: converterParaNumero(row['Número do Grupo']),
    dataGrupo: row['Data do Grupo'] instanceof Date ? row['Data do Grupo'] : new Date(row['Data do Grupo']),
    limiteFormandos: converterParaNumero(row['Limite de Formandos']),
    nomeFormando: (row['Formando'] || '').toString().trim(),
    horarioFormandos: formatarHorario(row['Horário dos Formandos']),
    horarioFamiliaSemServico: formatarHorario(row['Horário Família Sem Serviço']),
    maquiagemFormando: converterParaBoolean(row['Maquiagem Formando']),
    maquiagemFamilia: converterParaNumero(row['Maquiagem Família/Convidados']),
    cabeloSimples: converterParaNumero(row['Cabelo Simples\t'] || row['Cabelo Simples']),
    cabeloCombinado: converterParaNumero(row['Cabelo Combinado']),
    horarioFamiliaComServico: formatarHorario(row['Horário Família com Serviço']),
    qtdFamilia: converterParaNumero(row['Quantidade de Família/Convidados\t'] || row['Quantidade de Família/Convidados']),
    qtdPets: converterParaNumero(row['Quantidade de Pets']),
    somenteGrupo: converterParaBoolean(row['Só Grupo']),
  }));
  
  // Agrupar formandos por número de grupo
  const gruposMap = new Map<number, GrupoProcessado>();
  
  for (const formando of formandos) {
    if (!formando.nomeFormando) continue; // Pular linhas vazias
    
    if (!gruposMap.has(formando.numeroGrupo)) {
      gruposMap.set(formando.numeroGrupo, {
        numero: formando.numeroGrupo,
        dataGrupo: formando.dataGrupo,
        horarioFormandos: formando.horarioFormandos,
        limiteFormandos: formando.limiteFormandos, // Será ajustado depois
        formandos: [],
      });
    }
    
    gruposMap.get(formando.numeroGrupo)!.formandos.push(formando);
  }
  
  // Ajustar limite de formandos para cada grupo baseado na quantidade real
  // Isso corrige planilhas com limites incorretos
  for (const grupo of Array.from(gruposMap.values())) {
    const quantidadeReal = grupo.formandos.length;
    // Usar o maior valor entre o limite da planilha e a quantidade real + margem de 2
    grupo.limiteFormandos = Math.max(grupo.limiteFormandos, quantidadeReal + 2);
    console.log(`[BRIEFING HELPER] Grupo ${grupo.numero}: ajustando limite de ${grupo.formandos.length} formandos para ${grupo.limiteFormandos}`);
  }
  
  // Converter Map para array e ordenar por número de grupo
  const grupos = Array.from(gruposMap.values()).sort((a, b) => a.numero - b.numero);
  console.log('[BRIEFING HELPER] Grupos processados:', {
    totalGrupos: grupos.length,
    grupos: grupos.map(g => ({ numero: g.numero, totalFormandos: g.formandos.length }))
  });
  return grupos;
}

/**
 * Valida dados processados antes de importar
 */
export function validarDadosBriefing(grupos: GrupoProcessado[]): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  
  if (grupos.length === 0) {
    erros.push('Nenhum grupo encontrado na planilha');
  }
  
  for (const grupo of grupos) {
    if (!grupo.numero || grupo.numero <= 0) {
      erros.push(`Grupo com número inválido: ${grupo.numero}`);
    }
    
    if (!grupo.dataGrupo || isNaN(grupo.dataGrupo.getTime())) {
      erros.push(`Grupo ${grupo.numero}: data inválida`);
    }
    
    if (!grupo.horarioFormandos) {
      erros.push(`Grupo ${grupo.numero}: horário dos formandos não informado`);
    }
    
    if (grupo.formandos.length === 0) {
      erros.push(`Grupo ${grupo.numero}: nenhum formando encontrado`);
    }
    
    // REMOVIDO: Validação de limite excedido - agora o limite é calculado automaticamente
    // if (grupo.formandos.length > grupo.limiteFormandos) {
    //   erros.push(`Grupo ${grupo.numero}: ${grupo.formandos.length} formandos excedem o limite de ${grupo.limiteFormandos}`);
    // }
    
    for (const formando of grupo.formandos) {
      if (!formando.nomeFormando) {
        erros.push(`Grupo ${grupo.numero}: formando sem nome`);
      }
    }
  }
  
  return {
    valido: erros.length === 0,
    erros,
  };
}
