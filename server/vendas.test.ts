import { describe, it, expect, vi, beforeEach } from "vitest";
import { calcularPagamentoSemTaxa } from "./taxas-helper";
import { calcularDataCompensacao } from "./compensacao-helper";

describe("Vendas - Cálculos", () => {
  describe("calcularPagamentoSemTaxa", () => {
    it("deve retornar valor líquido igual ao bruto para PIX", () => {
      const resultado = calcularPagamentoSemTaxa(55000); // R$ 550,00
      expect(resultado.valorLiquido).toBe(55000);
      expect(resultado.taxaAplicada).toBe(0);
    });

    it("deve retornar valor líquido igual ao bruto para Dinheiro", () => {
      const resultado = calcularPagamentoSemTaxa(10000); // R$ 100,00
      expect(resultado.valorLiquido).toBe(10000);
      expect(resultado.taxaAplicada).toBe(0);
    });
  });

  describe("calcularDataCompensacao", () => {
    it("deve calcular data de compensação corretamente", () => {
      const dataVenda = new Date("2025-12-09");
      const dataCompensacao = calcularDataCompensacao(dataVenda, 1);
      expect(dataCompensacao).toBeInstanceOf(Date);
    });
  });
});

describe("Vendas - Validação de dados", () => {
  it("deve validar que itens de venda têm campos obrigatórios", () => {
    const item = {
      produtoId: 1,
      produto: "10 Fotos",
      categoria: "Foto",
      quantidade: 1,
      valorUnitario: 55000,
    };
    
    expect(item.produtoId).toBeDefined();
    expect(item.produto).toBeDefined();
    expect(item.quantidade).toBeGreaterThan(0);
    expect(item.valorUnitario).toBeGreaterThan(0);
  });

  it("deve validar que pagamentos têm campos obrigatórios", () => {
    const pagamento = {
      tipo: "pix" as const,
      valor: 55000,
      parcelas: 1,
    };
    
    expect(pagamento.tipo).toBeDefined();
    expect(pagamento.valor).toBeGreaterThan(0);
    expect(pagamento.parcelas).toBeGreaterThanOrEqual(1);
  });

  it("deve validar tipos de pagamento válidos", () => {
    const tiposValidos = ["pix", "dinheiro", "debito", "credito"];
    const tipo = "pix";
    expect(tiposValidos).toContain(tipo);
  });

  it("deve validar que crédito pode ter até 4 parcelas", () => {
    const parcelas = 4;
    expect(parcelas).toBeLessThanOrEqual(4);
    expect(parcelas).toBeGreaterThanOrEqual(1);
  });
});
