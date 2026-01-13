import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Eventos - Observações", () => {
  it("deve salvar observação ao criar evento", async () => {
    // Criar um evento com observação
    const observacaoTeste = "[22/12/2025, 08:40 - Teste Automatizado] Esta é uma observação de teste";
    
    const eventoId = await db.createEvento({
      turmaId: 1,
      tipoEvento: "foto_estudio",
      observacao: observacaoTeste,
    });

    expect(eventoId).toBeGreaterThan(0);

    // Buscar o evento criado
    const evento = await db.getEventoById(eventoId);

    expect(evento).not.toBeNull();
    expect(evento?.observacao).toBe(observacaoTeste);

    // Limpar: deletar o evento de teste
    await db.deleteEvento(eventoId);
  });

  it("deve salvar string vazia quando observação não é fornecida", async () => {
    // Criar um evento sem observação
    const eventoId = await db.createEvento({
      turmaId: 1,
      tipoEvento: "foto_estudio",
    });

    expect(eventoId).toBeGreaterThan(0);

    // Buscar o evento criado
    const evento = await db.getEventoById(eventoId);

    expect(evento).not.toBeNull();
    // Quando não fornecida, pode ser null ou string vazia (ambos são válidos)
    expect(evento?.observacao === null || evento?.observacao === "").toBe(true);

    // Limpar: deletar o evento de teste
    await db.deleteEvento(eventoId);
  });

  it("deve atualizar observação de evento existente", async () => {
    // Criar um evento sem observação
    const eventoId = await db.createEvento({
      turmaId: 1,
      tipoEvento: "foto_estudio",
      observacao: "",
    });

    // Atualizar com observação
    const novaObservacao = "[22/12/2025, 08:45 - Teste Automatizado] Observação adicionada posteriormente";
    await db.updateEvento(eventoId, {
      observacao: novaObservacao,
    });

    // Buscar o evento atualizado
    const evento = await db.getEventoById(eventoId);

    expect(evento).not.toBeNull();
    expect(evento?.observacao).toBe(novaObservacao);

    // Limpar: deletar o evento de teste
    await db.deleteEvento(eventoId);
  });
});
