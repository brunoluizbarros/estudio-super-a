/**
 * Helper para cálculo de taxas de cartão
 * Calcula valor líquido após aplicação de taxas por bandeira e parcelas
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { taxasCartao } from "../drizzle/schema";

export interface TaxaInfo {
  tipoPagamento: string;
  bandeira: string;
  parcelas: number;
  taxaPercentual: number; // valor * 10000
  taxaReal: number; // percentual real (ex: 3.03)
}

/**
 * Busca a taxa de cartão por tipo, bandeira e parcelas
 */
export async function buscarTaxa(
  tipoPagamento: "debito" | "credito",
  bandeira: string,
  parcelas: number = 1
): Promise<TaxaInfo | null> {
  const db = await getDb();
  if (!db) return null;

  const resultado = await db
    .select()
    .from(taxasCartao)
    .where(
      and(
        eq(taxasCartao.tipoPagamento, tipoPagamento),
        eq(taxasCartao.bandeira, bandeira.toUpperCase()),
        eq(taxasCartao.parcelas, parcelas)
      )
    )
    .limit(1);

  if (resultado.length === 0) return null;

  const taxa = resultado[0];
  return {
    tipoPagamento: taxa.tipoPagamento,
    bandeira: taxa.bandeira,
    parcelas: taxa.parcelas,
    taxaPercentual: taxa.taxaPercentual,
    taxaReal: taxa.taxaPercentual / 100, // Converte para percentual (303 -> 3.03)
  };
}

/**
 * Calcula o valor líquido após aplicação da taxa
 * @param valorBruto - Valor em centavos
 * @param taxaPercentual - Taxa armazenada (valor * 10000)
 * @returns Valor líquido em centavos
 */
export function calcularValorLiquido(valorBruto: number, taxaPercentual: number): number {
  // taxaPercentual está multiplicada por 100 (ex: 3.03% = 303)
  // Para calcular: valorBruto * (1 - taxa/10000)
  const taxaDecimal = taxaPercentual / 10000;
  const valorLiquido = Math.round(valorBruto * (1 - taxaDecimal));
  return valorLiquido;
}

/**
 * Calcula o valor líquido de um pagamento com cartão
 * @param valorBruto - Valor em centavos
 * @param tipoPagamento - 'debito' ou 'credito'
 * @param bandeira - Bandeira do cartão
 * @param parcelas - Número de parcelas (padrão: 1)
 * @returns Objeto com valor líquido e taxa aplicada
 */
export async function calcularPagamentoCartao(
  valorBruto: number,
  tipoPagamento: "debito" | "credito",
  bandeira: string,
  parcelas: number = 1
): Promise<{ valorLiquido: number; taxaAplicada: number; taxaPercentual: number } | null> {
  const taxa = await buscarTaxa(tipoPagamento, bandeira, parcelas);
  
  if (!taxa) {
    // Se não encontrar taxa, retorna valor bruto sem desconto
    return {
      valorLiquido: valorBruto,
      taxaAplicada: 0,
      taxaPercentual: 0,
    };
  }

  const valorLiquido = calcularValorLiquido(valorBruto, taxa.taxaPercentual);
  const taxaAplicada = valorBruto - valorLiquido;

  return {
    valorLiquido,
    taxaAplicada,
    taxaPercentual: taxa.taxaReal,
  };
}

/**
 * Calcula valores para pagamentos sem taxa (Pix e Dinheiro)
 */
export function calcularPagamentoSemTaxa(valorBruto: number): { valorLiquido: number; taxaAplicada: number } {
  return {
    valorLiquido: valorBruto,
    taxaAplicada: 0,
  };
}

/**
 * Lista de bandeiras disponíveis
 */
export const BANDEIRAS = [
  "VISA",
  "MASTER",
  "ELO",
  "HIPERCARD",
  "AMERICAN EXPRESS",
  "DINERS",
] as const;

export type Bandeira = typeof BANDEIRAS[number];
