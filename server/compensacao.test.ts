import { describe, expect, it } from "vitest";
import { 
  calcularDataCompensacao, 
  formatarData, 
  formatarMoeda,
  ehFeriado,
  ehDiaUtil
} from "./compensacao-helper";

describe("Compensação Bancária", () => {
  describe("ehFeriado", () => {
    it("deve identificar Ano Novo como feriado", () => {
      const anoNovo = new Date(2025, 0, 1); // 1 de janeiro
      expect(ehFeriado(anoNovo)).toBe(true);
    });

    it("deve identificar Natal como feriado", () => {
      const natal = new Date(2025, 11, 25); // 25 de dezembro
      expect(ehFeriado(natal)).toBe(true);
    });

    it("deve identificar dia comum como não feriado", () => {
      const diaComum = new Date(2025, 5, 10); // 10 de junho
      expect(ehFeriado(diaComum)).toBe(false);
    });

    it("deve identificar Tiradentes como feriado", () => {
      const tiradentes = new Date(2025, 3, 21); // 21 de abril
      expect(ehFeriado(tiradentes)).toBe(true);
    });
  });

  describe("ehDiaUtil", () => {
    it("deve identificar segunda-feira como dia útil", () => {
      const segunda = new Date(2025, 5, 9); // Segunda-feira
      expect(ehDiaUtil(segunda)).toBe(true);
    });

    it("deve identificar sábado como não dia útil", () => {
      const sabado = new Date(2025, 5, 7); // Sábado
      expect(ehDiaUtil(sabado)).toBe(false);
    });

    it("deve identificar domingo como não dia útil", () => {
      const domingo = new Date(2025, 5, 8); // Domingo
      expect(ehDiaUtil(domingo)).toBe(false);
    });

    it("deve identificar feriado em dia de semana como não dia útil", () => {
      const anoNovo = new Date(2025, 0, 1); // Quarta-feira, feriado
      expect(ehDiaUtil(anoNovo)).toBe(false);
    });
  });

  describe("calcularDataCompensacao", () => {
    it("deve calcular 1 dia útil a partir de segunda-feira", () => {
      const segunda = new Date(2025, 5, 9); // Segunda-feira
      const resultado = calcularDataCompensacao(segunda, 1);
      expect(resultado.getDate()).toBe(10); // Terça-feira
    });

    it("deve pular fim de semana ao calcular dias úteis", () => {
      const sexta = new Date(2025, 5, 6); // Sexta-feira
      const resultado = calcularDataCompensacao(sexta, 1);
      expect(resultado.getDate()).toBe(9); // Segunda-feira
    });

    it("deve pular feriados ao calcular dias úteis", () => {
      const diaAntes = new Date(2024, 11, 24); // Véspera de Natal (terça)
      const resultado = calcularDataCompensacao(diaAntes, 1);
      // 25 é feriado (Natal), então deve ser 26
      expect(resultado.getDate()).toBe(26);
    });
  });

  describe("formatarData", () => {
    it("deve formatar data no padrão brasileiro", () => {
      const data = new Date(2025, 5, 15);
      const resultado = formatarData(data);
      expect(resultado).toBe("15/06/2025");
    });
  });

  describe("formatarMoeda", () => {
    it("deve formatar centavos em reais", () => {
      const resultado = formatarMoeda(1500);
      expect(resultado).toContain("15,00");
      expect(resultado).toContain("R$");
    });

    it("deve formatar valores com centavos", () => {
      const resultado = formatarMoeda(1815);
      expect(resultado).toContain("18,15");
      expect(resultado).toContain("R$");
    });

    it("deve formatar zero corretamente", () => {
      const resultado = formatarMoeda(0);
      expect(resultado).toContain("0,00");
      expect(resultado).toContain("R$");
    });
  });
});
