import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Sincronização de Beca entre Abordagem e Execução", () => {
  let testTurmaId: number;
  let testFormandoId: number;
  let testEventoId: number;
  let testGrupoId: number;
  let testBriefingFormandoId: number;

  const caller = appRouter.createCaller({ user: { id: 1, openId: "test", name: "Test User", role: "administrador" } });

  beforeAll(async () => {
    // Criar turma de teste
    const turma = await caller.turmas.create({
      codigo: "TEST-BECA-001",
      cursos: ["Medicina"],
      instituicoes: ["Universidade Teste"],
      numeroTurma: "1",
      anos: [2025],
      periodos: ["1"],
      cidade: "Recife",
      estado: "PE",
    });
    testTurmaId = turma.id;

    // Criar formando de teste
    const formando = await caller.formandos.create({
      turmaId: testTurmaId,
      codigoFormando: "F001",
      nome: "Formando Teste Beca",
      status: "apto",
    });
    testFormandoId = formando.id;

    // Criar evento de teste
    const evento = await caller.eventos.create({
      turmaId: testTurmaId,
      tipoEvento: "foto_estudio",
      dataEvento: new Date("2025-06-01"),
      status: "agendado",
    });
    testEventoId = evento.id;

    // Criar grupo de briefing
    const grupo = await caller.briefing.createGrupo({
      eventoId: testEventoId,
      numero: 1,
      limiteFormandos: 10,
    });
    testGrupoId = grupo.id;

    // Adicionar formando ao grupo de briefing
    const briefingFormando = await caller.briefing.addFormando({
      grupoId: testGrupoId,
      eventoId: testEventoId,
      formandoId: testFormandoId,
    });
    testBriefingFormandoId = briefingFormando.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (testBriefingFormandoId) {
      await caller.briefing.removeFormando({ id: testBriefingFormandoId }).catch(() => {});
    }
    if (testGrupoId) {
      await caller.briefing.deleteGrupo({ id: testGrupoId }).catch(() => {});
    }
    if (testEventoId) {
      await caller.eventos.delete({ id: testEventoId }).catch(() => {});
    }
    if (testFormandoId) {
      await caller.formandos.delete({ id: testFormandoId }).catch(() => {});
    }
    if (testTurmaId) {
      await caller.turmas.delete({ id: testTurmaId }).catch(() => {});
    }
  });

  it("deve sincronizar tamanhoBeca de Execução para Abordagem", async () => {
    // Atualizar beca na página de Execução (formandos)
    await caller.formandos.update({
      id: testFormandoId,
      tamanhoBeca: "M",
    });

    // Verificar se foi sincronizado no briefing_formando
    const formandosBriefing = await caller.briefing.listFormandosByEvento({
      eventoId: testEventoId,
    });

    const briefingFormando = formandosBriefing.find(
      (f: any) => f.formandoId === testFormandoId
    );

    expect(briefingFormando).toBeDefined();
    expect(briefingFormando?.tamanhoBeca).toBe("M");
  });

  it("deve sincronizar tamanhoBeca de Abordagem para Execução", async () => {
    // Atualizar beca na página de Abordagem (briefing)
    await caller.briefing.updateFormando({
      id: testBriefingFormandoId,
      tamanhoBeca: "G",
    });

    // Verificar se foi sincronizado no formando
    const formando = await caller.formandos.getById({
      id: testFormandoId,
    });

    expect(formando).toBeDefined();
    expect(formando?.tamanhoBeca).toBe("G");
  });

  it("deve permitir limpar o campo tamanhoBeca", async () => {
    // Limpar beca na Execução
    await caller.formandos.update({
      id: testFormandoId,
      tamanhoBeca: null,
    });

    // Verificar se foi sincronizado
    const formandosBriefing = await caller.briefing.listFormandosByEvento({
      eventoId: testEventoId,
    });

    const briefingFormando = formandosBriefing.find(
      (f: any) => f.formandoId === testFormandoId
    );

    expect(briefingFormando?.tamanhoBeca).toBeNull();

    // Verificar no formando
    const formando = await caller.formandos.getById({
      id: testFormandoId,
    });

    expect(formando?.tamanhoBeca).toBeNull();
  });

  it("deve aceitar todos os tamanhos de beca válidos", async () => {
    const tamanhos = ["PPP", "PP", "P", "M", "G", "GG", "GGG"];

    for (const tamanho of tamanhos) {
      // Atualizar na Abordagem
      await caller.briefing.updateFormando({
        id: testBriefingFormandoId,
        tamanhoBeca: tamanho,
      });

      // Verificar sincronização
      const formando = await caller.formandos.getById({
        id: testFormandoId,
      });

      expect(formando?.tamanhoBeca).toBe(tamanho);
    }
  });
});
