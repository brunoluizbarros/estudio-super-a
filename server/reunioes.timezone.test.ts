import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { reunioes } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";

describe("Reuniões - Correção de Timezone", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testTurmaId: number;
  let testReuniaoId: number;

  beforeAll(async () => {
    // Criar caller com contexto de teste (usuário admin)
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-open-id",
        name: "Test User",
        email: "test@example.com",
        role: "admin",
        tipoUsuarioId: null,
      },
      req: {} as any,
      res: {} as any,
    };
    caller = appRouter.createCaller(ctx);

    // Buscar uma turma existente para usar no teste
    const turmas = await caller.turmas.list();
    if (turmas.length === 0) {
      throw new Error("Nenhuma turma encontrada no banco para teste");
    }
    testTurmaId = turmas[0].id;
  });

  it("deve salvar data corretamente considerando timezone GMT-3 (Recife-PE)", async () => {
    // Arrange: Data que será enviada pelo frontend (formato YYYY-MM-DD)
    const dataEsperada = "2026-01-07"; // 07 de janeiro de 2026
    
    // Act: Criar reunião com a data
    const result = await caller.reunioes.create({
      turmaId: testTurmaId,
      data: dataEsperada,
      horario: "18:00",
      tiposEvento: [1], // Assumindo que existe pelo menos um tipo de evento com ID 1
      tipoReuniao: "Online",
    });

    testReuniaoId = result.id;

    // Assert: Buscar a reunião no banco e verificar se a data foi salva corretamente
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [reuniao] = await db
      .select()
      .from(reunioes)
      .where(eq(reunioes.id, testReuniaoId));

    expect(reuniao).toBeDefined();
    
    // Converter a data do banco para string no formato YYYY-MM-DD
    const dataSalva = reuniao.data instanceof Date 
      ? reuniao.data.toISOString().split('T')[0]
      : reuniao.data;

    // A data salva deve ser exatamente a data esperada (sem diferença de 1 dia)
    expect(dataSalva).toBe(dataEsperada);
  });

  it("deve salvar dataResumo corretamente considerando timezone GMT-3", async () => {
    // Arrange
    const dataResumoEsperada = "2026-01-10";

    // Act: Atualizar reunião com dataResumo
    await caller.reunioes.update({
      id: testReuniaoId,
      dataResumo: dataResumoEsperada,
    });

    // Assert
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [reuniao] = await db
      .select()
      .from(reunioes)
      .where(eq(reunioes.id, testReuniaoId));

    expect(reuniao.dataResumo).toBeDefined();
    
    const dataResumoSalva = reuniao.dataResumo instanceof Date
      ? reuniao.dataResumo.toISOString().split('T')[0]
      : reuniao.dataResumo;

    expect(dataResumoSalva).toBe(dataResumoEsperada);
  });

  it("deve salvar dataBriefing corretamente considerando timezone GMT-3", async () => {
    // Arrange
    const dataBriefingEsperada = "2026-01-15";

    // Act: Atualizar reunião com dataBriefing
    await caller.reunioes.update({
      id: testReuniaoId,
      dataBriefing: dataBriefingEsperada,
    });

    // Assert
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [reuniao] = await db
      .select()
      .from(reunioes)
      .where(eq(reunioes.id, testReuniaoId));

    expect(reuniao.dataBriefing).toBeDefined();
    
    const dataBriefingSalva = reuniao.dataBriefing instanceof Date
      ? reuniao.dataBriefing.toISOString().split('T')[0]
      : reuniao.dataBriefing;

    expect(dataBriefingSalva).toBe(dataBriefingEsperada);
  });

  it("deve listar reuniões com datas no formato correto", async () => {
    // Act: Listar todas as reuniões
    const reunioesList = await caller.reunioes.list();

    // Assert: Verificar se a reunião de teste está na lista com a data correta
    const reuniaoTeste = reunioesList.find(r => r.id === testReuniaoId);
    
    expect(reuniaoTeste).toBeDefined();
    expect(reuniaoTeste?.data).toBe("2026-01-07");
    expect(reuniaoTeste?.dataResumo).toBe("2026-01-10");
    expect(reuniaoTeste?.dataBriefing).toBe("2026-01-15");
  });
});
