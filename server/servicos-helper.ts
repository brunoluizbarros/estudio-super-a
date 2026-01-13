/**
 * Helper para cálculo de serviços de maquiagem e cabelo
 * Gerencia valores a pagar/receber para maquiadoras e cabeleireiras
 */

import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { configMaquiagem } from "../drizzle/schema";

// Valores padrão para Recife RMR (em centavos)
export const VALORES_PADRAO_RECIFE = {
  maquiagemMasculino: 1815, // R$ 18,15
  maquiagemFeminino: 3080,  // R$ 30,80
  comissaoMaquiagemFamilia: 3000, // R$ 30,00
};

// Valores de cabelo (em centavos)
export const VALORES_CABELO = {
  simples: 4000,    // R$ 40,00
  combinado: 8000,  // R$ 80,00
  comissaoPercentual: 20, // 20%
};

export interface ConfiguracaoMaquiagem {
  cidade: string;
  valorMasculino: number;
  valorFeminino: number;
  valorComissaoFamilia: number;
}

/**
 * Busca configuração de maquiagem por cidade
 */
export async function buscarConfigMaquiagem(cidade: string): Promise<ConfiguracaoMaquiagem | null> {
  const db = await getDb();
  if (!db) return null;

  const resultado = await db
    .select()
    .from(configMaquiagem)
    .where(eq(configMaquiagem.cidade, cidade))
    .limit(1);

  if (resultado.length === 0) {
    // Retorna valores padrão de Recife se cidade não encontrada
    return {
      cidade: cidade,
      valorMasculino: VALORES_PADRAO_RECIFE.maquiagemMasculino,
      valorFeminino: VALORES_PADRAO_RECIFE.maquiagemFeminino,
      valorComissaoFamilia: VALORES_PADRAO_RECIFE.comissaoMaquiagemFamilia,
    };
  }

  return {
    cidade: resultado[0].cidade,
    valorMasculino: resultado[0].valorMasculino,
    valorFeminino: resultado[0].valorFeminino,
    valorComissaoFamilia: resultado[0].valorComissaoFamilia ?? VALORES_PADRAO_RECIFE.comissaoMaquiagemFamilia,
  };
}

/**
 * Calcula valor a pagar para maquiagem do formando
 * @param genero - 'masculino' ou 'feminino'
 * @param cidade - Cidade do evento
 * @returns Valor em centavos
 */
export async function calcularMaquiagemFormando(
  genero: "masculino" | "feminino",
  cidade: string
): Promise<number> {
  const config = await buscarConfigMaquiagem(cidade);
  if (!config) {
    return genero === "masculino"
      ? VALORES_PADRAO_RECIFE.maquiagemMasculino
      : VALORES_PADRAO_RECIFE.maquiagemFeminino;
  }
  return genero === "masculino" ? config.valorMasculino : config.valorFeminino;
}

/**
 * Calcula comissão a receber por maquiagem de família
 * @param cidade - Cidade do evento
 * @returns Valor em centavos
 */
export async function calcularComissaoMaquiagemFamilia(cidade: string): Promise<number> {
  const config = await buscarConfigMaquiagem(cidade);
  return config?.valorComissaoFamilia ?? VALORES_PADRAO_RECIFE.comissaoMaquiagemFamilia;
}

/**
 * Calcula comissão a receber por serviço de cabelo
 * @param tipoServico - 'simples' ou 'combinado'
 * @returns Objeto com valor do serviço e comissão
 */
export function calcularComissaoCabelo(tipoServico: "simples" | "combinado"): {
  valorServico: number;
  comissao: number;
} {
  const valorServico = tipoServico === "simples" 
    ? VALORES_CABELO.simples 
    : VALORES_CABELO.combinado;
  
  const comissao = Math.round(valorServico * (VALORES_CABELO.comissaoPercentual / 100));

  return {
    valorServico,
    comissao,
  };
}

/**
 * Calcula o balanço de uma maquiadora
 * @param maquiagensFormandoRealizadas - Número de maquiagens de formando
 * @param maquiagensFamiliaRealizadas - Número de maquiagens de família
 * @param generos - Array com gêneros dos formandos
 * @param cidade - Cidade do evento
 * @returns Objeto com valores a pagar e receber
 */
export async function calcularBalancoMaquiadora(
  maquiagensFormandoRealizadas: { genero: "masculino" | "feminino" }[],
  maquiagensFamiliaRealizadas: number,
  cidade: string
): Promise<{
  totalAPagar: number;
  totalAReceber: number;
  saldo: number; // positivo = empresa deve pagar, negativo = maquiadora deve
}> {
  const config = await buscarConfigMaquiagem(cidade);
  
  let totalAPagar = 0;
  for (const maq of maquiagensFormandoRealizadas) {
    if (maq.genero === "masculino") {
      totalAPagar += config?.valorMasculino ?? VALORES_PADRAO_RECIFE.maquiagemMasculino;
    } else {
      totalAPagar += config?.valorFeminino ?? VALORES_PADRAO_RECIFE.maquiagemFeminino;
    }
  }

  const totalAReceber = maquiagensFamiliaRealizadas * 
    (config?.valorComissaoFamilia ?? VALORES_PADRAO_RECIFE.comissaoMaquiagemFamilia);

  return {
    totalAPagar,
    totalAReceber,
    saldo: totalAPagar - totalAReceber,
  };
}

/**
 * Calcula comissão total de cabelo
 * @param servicosRealizados - Array com tipos de serviço
 * @returns Total de comissão a receber em centavos
 */
export function calcularTotalComissaoCabelo(
  servicosRealizados: ("simples" | "combinado")[]
): number {
  return servicosRealizados.reduce((total, tipo) => {
    return total + calcularComissaoCabelo(tipo).comissao;
  }, 0);
}
