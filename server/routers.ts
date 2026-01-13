import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, adminOrGestorProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { calcularDataCompensacao, formatarData, formatarMoeda } from "./compensacao-helper";
import { calcularPagamentoCartao, calcularPagamentoSemTaxa, BANDEIRAS } from "./taxas-helper";
import { 
  calcularMaquiagemFormando, 
  calcularComissaoMaquiagemFamilia, 
  calcularComissaoCabelo,
  calcularBalancoMaquiadora,
  VALORES_CABELO
} from "./servicos-helper";
import { fechamentoDiarioRouter } from "./routers-fechamento-diario";
import { gerarBackup } from "./backup";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== DASHBOARD ====================
  dashboard: router({
    stats: adminOrGestorProcedure.query(async () => {
      return db.getDashboardStats();
    }),
    
    vendasMensais: adminOrGestorProcedure
      .input(z.object({ ano: z.number().min(2000).max(2100) }))
      .query(async ({ input }) => {
        return db.getDadosVendasMensais(input.ano);
      }),
    
    despesasMensais: adminOrGestorProcedure
      .input(z.object({ ano: z.number().min(2000).max(2100) }))
      .query(async ({ input }) => {
        return db.getDadosDespesasMensais(input.ano);
      }),
  }),

  // ==================== TURMAS ====================
  turmas: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Se é Cerimonial, filtrar apenas turmas autorizadas
      if (ctx.user.role === 'cerimonial') {
        const turmaIds = await db.getTurmaIdsUsuario(ctx.user.id);
        if (turmaIds.length === 0) {
          return []; // Nenhuma turma autorizada
        }
        const todasTurmas = await db.getAllTurmas();
        return todasTurmas.filter(t => turmaIds.includes(t.id));
      }
      // Admin, Gestor e outros roles veem todas as turmas
      return db.getAllTurmas();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getTurmaById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        codigo: z.string().min(1),
        cursos: z.array(z.string()).min(1),
        instituicoes: z.array(z.string()).min(1),
        numeroTurma: z.string().optional(),
        anos: z.array(z.number().min(2000).max(2100)).min(1),
        periodos: z.array(z.enum(["1", "2"])).min(1),
        cidade: z.string().min(1),
        estado: z.string().length(2),
        fotosInclusas: z.enum(["todas", "30", "20", "10"]).optional(),
        observacao: z.string().optional(),
        // Valores de serviços de Make e Cabelo (em centavos)
        valorMakeFormandoMasc: z.number().optional(),
        valorMakeFormandoFem: z.number().optional(),
        valorMakeFamilia: z.number().optional(),
        valorCabeloSimples: z.number().optional(),
        valorCabeloCombinado: z.number().optional(),
        valorRetoque: z.number().optional(),
        pacotesConfig: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const dbInput: any = {
          ...input,
          cursos: JSON.stringify(input.cursos),
          instituicoes: JSON.stringify(input.instituicoes),
          anos: JSON.stringify(input.anos),
          periodos: JSON.stringify(input.periodos),
        };
        // Remover campos undefined e id (auto-increment)
        Object.keys(dbInput).forEach(key => {
          if (dbInput[key] === undefined || key === 'id') {
            delete dbInput[key];
          }
        });
        const id = await db.createTurma(dbInput);
        
        // Sincronizar valores de maquiagem para configMaquiagemTurma se foram preenchidos
        if (input.valorMakeFormandoMasc && input.valorMakeFormandoFem && input.valorMakeFamilia) {
          await db.createConfigMaquiagemTurma({
            turmaId: id,
            valorMasculino: input.valorMakeFormandoMasc,
            valorFeminino: input.valorMakeFormandoFem,
            valorFamilia: input.valorMakeFamilia,
            semServicoFormando: false,
            semServicoFamilia: false,
          });
        }
        
        // Notificar todos os usuários sobre nova turma
        const { notificarTodosUsuarios } = await import('./db-notificacoes-helper');
        await notificarTodosUsuarios({
          tipo: 'turma_criada',
          titulo: 'Nova Turma Cadastrada',
          mensagem: `Turma ${input.codigo} - ${input.cursos.join(', ')} - ${input.instituicoes.join(', ')}`,
          turmaId: id,
        }).catch(err => console.error('Erro ao notificar criação de turma:', err));
        
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        codigo: z.string().min(1).optional(),
        cursos: z.array(z.string()).optional(),
        instituicoes: z.array(z.string()).optional(),
        numeroTurma: z.string().optional(),
        anos: z.array(z.number().min(2000).max(2100)).optional(),
        periodos: z.array(z.enum(["1", "2"])).optional(),
        cidade: z.string().min(1).optional(),
        estado: z.string().length(2).optional(),
        fotosInclusas: z.enum(["todas", "30", "20", "10"]).optional().nullable(),
        observacao: z.string().optional().nullable(),
        // Valores de serviços de Make e Cabelo (em centavos)
        valorMakeFormandoMasc: z.number().optional().nullable(),
        valorMakeFormandoFem: z.number().optional().nullable(),
        valorMakeFamilia: z.number().optional().nullable(),
        valorCabeloSimples: z.number().optional().nullable(),
        valorCabeloCombinado: z.number().optional().nullable(),
        valorRetoque: z.number().optional().nullable(),
        pacotesConfig: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { id, cursos, instituicoes, anos, periodos, ...rest } = input;
        const data: Record<string, any> = { ...rest };
        if (cursos) data.cursos = JSON.stringify(cursos);
        if (instituicoes) data.instituicoes = JSON.stringify(instituicoes);
        if (anos) data.anos = JSON.stringify(anos);
        if (periodos) data.periodos = JSON.stringify(periodos);
        await db.updateTurma(id, data);
        
        // Sincronizar valores de maquiagem para configMaquiagemTurma se foram preenchidos
        if (input.valorMakeFormandoMasc && input.valorMakeFormandoFem && input.valorMakeFamilia) {
          // Verificar se já existe configuração para esta turma
          const configExistente = await db.getConfigMaquiagemByTurma(id);
          if (configExistente) {
            // Atualizar configuração existente
            await db.updateConfigMaquiagemTurma(configExistente.id, {
              valorMasculino: input.valorMakeFormandoMasc,
              valorFeminino: input.valorMakeFormandoFem,
              valorFamilia: input.valorMakeFamilia,
            });
          } else {
            // Criar nova configuração
            await db.createConfigMaquiagemTurma({
              turmaId: id,
              valorMasculino: input.valorMakeFormandoMasc,
              valorFeminino: input.valorMakeFormandoFem,
              valorFamilia: input.valorMakeFamilia,
              semServicoFormando: false,
              semServicoFamilia: false,
            });
          }
        }
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTurma(input.id);
        return { success: true };
      }),
  }),

  // ==================== FORMANDOS ====================
  formandos: router({
    listByTurma: protectedProcedure
      .input(z.object({ turmaId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Se é Cerimonial, verificar se tem acesso à turma
        if (ctx.user.role === 'cerimonial') {
          const temAcesso = await db.usuarioTemAcessoTurma(ctx.user.id, input.turmaId);
          if (!temAcesso) {
            return []; // Sem acesso
          }
        }
        return db.getFormandosByTurma(input.turmaId);
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getFormandoById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        turmaId: z.number(),
        codigoFormando: z.string().min(1),
        nome: z.string().min(1),
        cpf: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        genero: z.enum(["masculino", "feminino"]).optional(),
        pacote: z.string().optional(),
        eComissao: z.boolean().optional(),
        status: z.enum(["apto", "inapto", "migracao", "sem_status"]).optional(),
      }))
      .mutation(async ({ input }) => {
        // Tratar "sem_status" como undefined
        const formandoData = {
          ...input,
          status: input.status === "sem_status" ? undefined : input.status
        };
        const id = await db.createFormando(formandoData);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        codigoFormando: z.string().min(1).optional(),
        nome: z.string().min(1).optional(),
        cpf: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        genero: z.enum(["masculino", "feminino"]).optional(),
        pacote: z.string().optional(),
        eComissao: z.boolean().optional(),
        status: z.enum(["apto", "inapto", "migracao", "sem_status"]).optional(),
        tamanhoBeca: z.string().nullable().optional(),
        maquiagem: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        // Tratar "sem_status" como null
        const formandoData = {
          ...data,
          status: data.status === "sem_status" ? null : data.status
        };
        await db.updateFormando(id, formandoData);
        
        // Sincronizar tamanhoBeca com briefing_formando se existir
        if (data.tamanhoBeca !== undefined) {
          try {
            await db.syncBecaToBriefing(id, data.tamanhoBeca);
          } catch (error) {
            console.error('Erro ao sincronizar beca com briefing:', error);
          }
        }
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFormando(input.id);
        return { success: true };
      }),
  }),

  // ==================== EVENTOS ====================
  eventos: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Se é Cerimonial, filtrar apenas eventos das turmas autorizadas
      if (ctx.user.role === 'cerimonial') {
        const turmaIds = await db.getTurmaIdsUsuario(ctx.user.id);
        if (turmaIds.length === 0) {
          return []; // Nenhuma turma autorizada
        }
        const todosEventos = await db.getAllEventos();
        return todosEventos.filter(e => turmaIds.includes(e.turmaId));
      }
      // Admin, Gestor e outros roles veem todos os eventos
      return db.getAllEventos();
    }),
    
    listByTurma: protectedProcedure
      .input(z.object({ turmaId: z.number() }))
      .query(async ({ input }) => {
        return db.getEventosByTurma(input.turmaId);
      }),
    
    listByData: protectedProcedure
      .input(z.object({ data: z.date() }))
      .query(async ({ input }) => {
        return db.getEventosByData(input.data);
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getEventoById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        turmaId: z.number(),
        tipoEvento: z.enum([
          "foto_estudio", "foto_50", "foto_descontrada", 
          "foto_oficial", "foto_samu", "foto_bloco", "foto_consultorio",
          "foto_estrela", "foto_internato", "family_day"
        ]),
        dataEvento: z.date().optional(),
        dataEventoFim: z.date().optional(),
        local: z.string().optional(),
        cenarios: z.string().optional(),
        fotografos: z.string().optional(),
        cerimoniais: z.string().optional(),
        coordenadores: z.string().optional(),
        producao: z.string().optional(),
        maquiadoras: z.string().optional(),
        horariosInicio: z.string().optional(),
        observacao: z.string().optional(),
        status: z.enum(["agendado", "em_andamento", "concluido", "cancelado"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verificar permissão de inserir
        const { verificarPermissao } = await import('./db_permissoes');
        const podeInserir = await verificarPermissao(ctx.user.role, 'eventos', 'inserir');
        if (!podeInserir) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para criar eventos' });
        }
        // Garantir que observacao seja sempre string (nunca undefined ou null)
        const data = {
          ...input,
          observacao: input.observacao ?? "",  // Usa ?? para pegar undefined e null
        };
        const id = await db.createEvento(data);
        
        // Salvar histórico de observação se houver conteúdo
        if (data.observacao && data.observacao.trim() !== "") {
          await db.createHistoricoObservacao({
            eventoId: id,
            userId: ctx.user.id,
            observacao: data.observacao,
          });
        }
        
        // Notificar todos os usuários sobre novo evento
        const turma = await db.getTurmaById(input.turmaId);
        const { notificarTodosUsuarios } = await import('./db-notificacoes-helper');
        const tipoEventoLabel = input.tipoEvento.replace('foto_', '').replace('_', ' ').toUpperCase();
        
        // Formatar período do evento
        let periodoTexto = '';
        if (data.dataEvento && data.dataEventoFim) {
          const dataInicio = new Date(data.dataEvento);
          const dataFim = new Date(data.dataEventoFim);
          // Comparar apenas as datas (ignorar horário)
          const mesmaData = dataInicio.toDateString() === dataFim.toDateString();
          
          if (mesmaData) {
            periodoTexto = ` - ${dataInicio.toLocaleDateString('pt-BR')}`;
          } else {
            periodoTexto = ` - ${dataInicio.toLocaleDateString('pt-BR')} a ${dataFim.toLocaleDateString('pt-BR')}`;
          }
        } else if (data.dataEvento) {
          periodoTexto = ` - ${new Date(data.dataEvento).toLocaleDateString('pt-BR')}`;
        }
        
        await notificarTodosUsuarios({
          tipo: 'evento_criado',
          titulo: 'Novo Evento Cadastrado',
          mensagem: `${tipoEventoLabel} - Turma ${turma?.codigo || input.turmaId}${periodoTexto}`,
          eventoId: id,
        }).catch(err => console.error('Erro ao notificar criação de evento:', err));
        
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        tipoEvento: z.enum([
          "foto_estudio", "foto_50", "foto_descontrada", 
          "foto_oficial", "foto_samu", "foto_bloco", "foto_consultorio",
          "foto_estrela", "foto_internato", "family_day"
        ]).optional(),
        dataEvento: z.date().optional().nullable(),
        dataEventoFim: z.date().optional().nullable(),
        local: z.string().optional(),
        cenarios: z.string().optional(),
        fotografos: z.string().optional(),
        cerimoniais: z.string().optional(),
        coordenadores: z.string().optional(),
        producao: z.string().optional(),
        maquiadoras: z.string().optional(),
        horariosInicio: z.string().optional(),
        observacao: z.string().optional(),
        status: z.enum(["agendado", "em_andamento", "concluido", "cancelado"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...rest } = input;
        
        // Buscar observação anterior para comparar
        const eventoAnterior = await db.getEventoById(id);
        
        // Garantir que observacao seja sempre string (nunca undefined)
        const data = {
          ...rest,
          observacao: rest.observacao !== undefined ? (rest.observacao || "") : undefined,
        };
        await db.updateEvento(id, data);
        
        // Salvar histórico se observação foi alterada e não está vazia
        if (data.observacao !== undefined && 
            data.observacao.trim() !== "" && 
            data.observacao !== eventoAnterior?.observacao) {
          await db.createHistoricoObservacao({
            eventoId: id,
            userId: ctx.user.id,
            observacao: data.observacao,
          });
        }
        
        // Notificar todos os usuários se a DATA do evento foi alterada
        const dataEventoMudou = (data.dataEvento !== undefined && 
          eventoAnterior?.dataEvento?.getTime() !== data.dataEvento?.getTime()) ||
          (data.dataEventoFim !== undefined && 
          eventoAnterior?.dataEventoFim?.getTime() !== data.dataEventoFim?.getTime());
        
        if (dataEventoMudou) {
          const turma = await db.getTurmaById(eventoAnterior!.turmaId);
          const { notificarTodosUsuarios } = await import('./db-notificacoes-helper');
          const tipoEventoLabel = eventoAnterior!.tipoEvento.replace('foto_', '').replace('_', ' ').toUpperCase();
          const novaData = data.dataEvento || eventoAnterior!.dataEvento;
          await notificarTodosUsuarios({
            tipo: 'evento_editado',
            titulo: 'Data de Evento Alterada',
            mensagem: `${tipoEventoLabel} - Turma ${turma?.codigo || eventoAnterior!.turmaId}${novaData ? ` - Nova data: ${new Date(novaData).toLocaleDateString('pt-BR')}` : ''}`,
            eventoId: id,
          }).catch(err => console.error('Erro ao notificar edição de evento:', err));
        }
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verificar permissão de excluir
        const { verificarPermissao } = await import('./db_permissoes');
        const podeExcluir = await verificarPermissao(ctx.user.role, 'eventos', 'excluir');
        if (!podeExcluir) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para excluir eventos' });
        }
        
        // Buscar dados do evento antes de deletar
        const evento = await db.getEventoById(input.id);
        
        await db.deleteEvento(input.id);
        
        // Notificar todos os usuários sobre exclusão de evento
        if (evento) {
          const turma = await db.getTurmaById(evento.turmaId);
          const { notificarTodosUsuarios } = await import('./db-notificacoes-helper');
          const tipoEventoLabel = evento.tipoEvento.replace('foto_', '').replace('_', ' ').toUpperCase();
          await notificarTodosUsuarios({
            tipo: 'evento_excluido',
            titulo: 'Evento Excluído',
            mensagem: `${tipoEventoLabel} - Turma ${turma?.codigo || evento.turmaId}${evento.dataEvento ? ` - ${new Date(evento.dataEvento).toLocaleDateString('pt-BR')}` : ''}`,
            eventoId: input.id,
          }).catch(err => console.error('Erro ao notificar exclusão de evento:', err));
        }
        
        return { success: true };
      }),
    
    // DEBUG: Endpoint temporário para verificar último evento
    debugUltimoEvento: publicProcedure
      .query(async () => {
        const eventos = await db.getAllEventos();
        if (eventos.length === 0) return null;
        return eventos[eventos.length - 1];
      }),

    debugObservacoes: publicProcedure
      .query(async () => {
        const eventos = await db.getAllEventos();
      return eventos.slice(0, 5).map(e => ({
        id: e.id,
        turmaId: e.turmaId,
        tipoEvento: e.tipoEvento,
        observacao: e.observacao,
        createdAt: e.createdAt
      }));
    }),
  }),

  // ==================== AGENDAMENTOS ====================
  agendamentos: router({
    listByEvento: protectedProcedure
      .input(z.object({ eventoId: z.number() }))
      .query(async ({ input }) => {
        return db.getAgendamentosByEvento(input.eventoId);
      }),
    
    listByTurma: protectedProcedure
      .input(z.object({ turmaId: z.number() }))
      .query(async ({ input }) => {
        return db.getAgendamentosByTurma(input.turmaId);
      }),
    
    listComDetalhes: protectedProcedure
      .input(z.object({ eventoId: z.number() }))
      .query(async ({ input }) => {
        return db.getAgendamentosComDetalhes(input.eventoId);
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getAgendamentoById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        eventoId: z.number(),
        formandoId: z.number(),
        grupo: z.string().optional(),
        dataAgendamento: z.date(),
        horaFormando: z.string().optional(),
        horaChegadaFormando: z.string().optional(),
        horaFamilia: z.string().optional(),
        horaChegadaFamilia: z.string().optional(),
        tamanhoBeca: z.enum(["PPP", "PP", "P", "M", "G", "GG", "GGG"]).optional(),
        situacao: z.enum(["aguardando", "em_atendimento", "concluido", "ausente"]).optional(),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createAgendamento(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        grupo: z.string().optional(),
        horaFormando: z.string().optional(),
        horaChegadaFormando: z.string().optional(),
        horaFamilia: z.string().optional(),
        horaChegadaFamilia: z.string().optional(),
        tamanhoBeca: z.enum(["PPP", "PP", "P", "M", "G", "GG", "GGG"]).optional(),
        situacao: z.enum(["aguardando", "em_atendimento", "concluido", "ausente"]).optional(),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateAgendamento(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAgendamento(input.id);
        return { success: true };
      }),
  }),

  // ==================== SERVIÇOS AGENDADOS ====================
  servicosAgendados: router({
    listByAgendamento: protectedProcedure
      .input(z.object({ agendamentoId: z.number() }))
      .query(async ({ input }) => {
        return db.getServicosByAgendamento(input.agendamentoId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        agendamentoId: z.number(),
        tipoServico: z.enum(["maquiagem_formando", "maquiagem_familia", "cabelo_simples", "cabelo_combinado"]),
        realizado: z.boolean().optional(),
        valorPago: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createServicoAgendado(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        realizado: z.boolean().optional(),
        valorPago: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateServicoAgendado(id, data);
        return { success: true };
      }),
  }),

  // ==================== CENÁRIOS ====================
  cenarios: router({
    listByAgendamento: protectedProcedure
      .input(z.object({ agendamentoId: z.number() }))
      .query(async ({ input }) => {
        return db.getCenariosByAgendamento(input.agendamentoId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        agendamentoId: z.number(),
        nomeCenario: z.string().min(1),
        nomeFotografo: z.string().optional(),
        numeroArquivos: z.number().optional(),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCenario(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nomeCenario: z.string().min(1).optional(),
        nomeFotografo: z.string().optional(),
        numeroArquivos: z.number().optional(),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCenario(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCenario(input.id);
        return { success: true };
      }),
  }),

  // ==================== VENDAS ====================
  vendas: router({
    list: protectedProcedure.query(async () => {
      const vendasList = await db.getAllVendas();
      // Buscar itens e pagamentos de cada venda
      const vendasCompletas = await Promise.all(
        vendasList.map(async (venda) => {
          const itens = await db.getItensByVenda(venda.id);
          const pagamentos = await db.getPagamentosByVenda(venda.id);
          return { ...venda, itens, pagamentos };
        })
      );
      return vendasCompletas;
    }),
    
    listByAgendamento: protectedProcedure
      .input(z.object({ agendamentoId: z.number() }))
      .query(async ({ input }) => {
        return db.getVendasByAgendamento(input.agendamentoId);
      }),
    
    listByFormando: protectedProcedure
      .input(z.object({ formandoId: z.number() }))
      .query(async ({ input }) => {
        const vendasList = await db.getVendasByFormando(input.formandoId);
        // Buscar itens e pagamentos de cada venda para exibir no histórico
        const vendasCompletas = await Promise.all(
          vendasList.map(async (venda) => {
            const itens = await db.getItensByVenda(venda.id);
            const pagamentos = await db.getPagamentosByVenda(venda.id);
            return { ...venda, itens, pagamentos };
          })
        );
        return vendasCompletas;
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const venda = await db.getVendaById(input.id);
        if (!venda) return null;
        
        const itens = await db.getItensByVenda(input.id);
        const pagamentos = await db.getPagamentosByVenda(input.id);
        
        return { ...venda, itens, pagamentos };
      }),
    
    create: protectedProcedure
      .input(z.object({
        eventoId: z.number(),
        agendamentoId: z.number().optional(),
        formandoId: z.number(),
        dataVenda: z.date(),
        itens: z.array(z.object({
          produtoId: z.number(),
          produto: z.string(),
          categoria: z.string().optional(),
          quantidade: z.number().default(1),
          valorUnitario: z.number(),
          ajusteValor: z.number().default(0),
          justificativa: z.string().optional(),
        })),
        pagamentos: z.array(z.object({
          tipo: z.enum(["pix", "dinheiro", "debito", "credito", "incluso_pacote"]),
          valor: z.number(),
          bandeira: z.string().optional(),
          parcelas: z.number().default(1),
          cvNsu: z.string().optional(),
        })),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          console.log("[Vendas] Criando venda:", JSON.stringify(input, null, 2));
          
          // Calcular valor total (incluindo ajustes)
          const valorTotal = input.itens.reduce((sum, item) => 
            sum + (item.valorUnitario * item.quantidade) + (item.ajusteValor || 0), 0);
          
          console.log("[Vendas] Valor total calculado:", valorTotal);
        
        // Calcular valor líquido de cada pagamento
        let valorLiquidoTotal = 0;
        const pagamentosProcessados = await Promise.all(
          input.pagamentos.map(async (pag) => {
            let valorLiquido = pag.valor;
            let dataCompensacao: Date | null = null;
            
            if (pag.tipo === "credito" || pag.tipo === "debito") {
              const resultado = await calcularPagamentoCartao(
                pag.valor,
                pag.tipo,
                pag.bandeira || "VISA",
                pag.parcelas
              );
              if (resultado) {
                valorLiquido = resultado.valorLiquido;
              }
              dataCompensacao = calcularDataCompensacao(input.dataVenda, 1);
            } else {
              const resultado = calcularPagamentoSemTaxa(pag.valor);
              valorLiquido = resultado.valorLiquido;
            }
            
            valorLiquidoTotal += valorLiquido;
            
            return {
              ...pag,
              valorLiquido,
              dataCompensacao,
            };
          })
        );
        
        // Criar venda
        const vendaId = await db.createVenda({
          eventoId: input.eventoId,
          agendamentoId: input.agendamentoId,
          formandoId: input.formandoId,
          dataVenda: input.dataVenda,
          valorTotal,
          valorLiquido: valorLiquidoTotal,
          status: "pago",
          fase: "Execução", // Fase padrão para vendas antigas
          observacao: input.observacao,
          createdBy: ctx.user.id, // Registrar quem criou a venda
        });
        
        // Criar itens
        for (const item of input.itens) {
          await db.createItemVenda({
            vendaId,
            produtoId: item.produtoId,
            produto: item.produto,
            categoria: item.categoria,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
            ajusteValor: item.ajusteValor || 0,
            justificativa: item.justificativa || null,
            valorTotal: (item.valorUnitario * item.quantidade) + (item.ajusteValor || 0),
          });
        }
        
        // Criar pagamentos
        for (const pag of pagamentosProcessados) {
          await db.createPagamento({
            vendaId,
            tipo: pag.tipo,
            valor: pag.valor,
            valorLiquido: pag.valorLiquido,
            bandeira: pag.bandeira,
            parcelas: pag.parcelas,
            cvNsu: pag.cvNsu,
            dataCompensacao: pag.dataCompensacao,
          });
        }
        
        console.log("[Vendas] Venda criada com sucesso, ID:", vendaId);
          return { success: true, id: vendaId };
        } catch (error) {
          console.error("[Vendas] Erro ao criar venda:", error);
          throw error;
        }
      }),
    
    cancelar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateVenda(input.id, { status: "cancelada" });
        return { success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        dataVenda: z.date().optional(),
        itens: z.array(z.object({
          produtoId: z.number(),
          produto: z.string(),
          categoria: z.string().optional(),
          quantidade: z.number().default(1),
          valorUnitario: z.number(),
          ajusteValor: z.number().default(0),
          justificativa: z.string().optional(),
        })),
        pagamentos: z.array(z.object({
          tipo: z.enum(["pix", "dinheiro", "debito", "credito", "incluso_pacote"]),
          valor: z.number(),
          bandeira: z.string().optional(),
          parcelas: z.number().default(1),
          cvNsu: z.string().optional(),
        })),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Buscar venda original para comparar
        const vendaOriginal = await db.getVendaById(input.id);
        if (!vendaOriginal) throw new Error("Venda não encontrada");
        
        const itensOriginais = await db.getItensByVenda(input.id);
        const pagamentosOriginais = await db.getPagamentosByVenda(input.id);
        
        // Calcular novo valor total
        const valorTotal = input.itens.reduce((sum, item) => 
          sum + (item.valorUnitario * item.quantidade) + (item.ajusteValor || 0), 0);
        
        // Detectar campos alterados
        const camposAlterados: Record<string, { antes: any; depois: any }> = {};
        
        // Verificar mudança de data
        if (input.dataVenda && input.dataVenda.getTime() !== vendaOriginal.dataVenda.getTime()) {
          camposAlterados["Data da Venda"] = {
            antes: vendaOriginal.dataVenda.toLocaleDateString('pt-BR'),
            depois: input.dataVenda.toLocaleDateString('pt-BR'),
          };
        }
        
        // Verificar mudança de valor
        if (valorTotal !== vendaOriginal.valorTotal) {
          camposAlterados["Valor Total"] = {
            antes: `R$ ${(vendaOriginal.valorTotal / 100).toFixed(2)}`,
            depois: `R$ ${(valorTotal / 100).toFixed(2)}`,
          };
        }
        
        // Verificar mudança de produtos
        const produtosOriginais = itensOriginais.map(i => i.produto).sort().join(", ");
        const produtosNovos = input.itens.map(i => i.produto).sort().join(", ");
        if (produtosOriginais !== produtosNovos) {
          camposAlterados["Produtos"] = {
            antes: produtosOriginais,
            depois: produtosNovos,
          };
        }
        
        // Verificar mudança de tipos de pagamento
        const tiposPagOriginais = pagamentosOriginais.map(p => p.tipo).sort().join(", ");
        const tiposPagNovos = input.pagamentos.map(p => p.tipo).sort().join(", ");
        if (tiposPagOriginais !== tiposPagNovos) {
          camposAlterados["Tipo de Pagamento"] = {
            antes: tiposPagOriginais,
            depois: tiposPagNovos,
          };
        }
        
        // Verificar mudança de observação
        if (input.observacao !== vendaOriginal.observacao) {
          camposAlterados["Observação"] = {
            antes: vendaOriginal.observacao || "(vazio)",
            depois: input.observacao || "(vazio)",
          };
        }
        
        // Verificar mudanças em ajustes de valor e justificativas
        const ajustesOriginais = itensOriginais.filter(i => i.ajusteValor && i.ajusteValor !== 0);
        const ajustesNovos = input.itens.filter(i => i.ajusteValor && i.ajusteValor !== 0);
        if (ajustesOriginais.length > 0 || ajustesNovos.length > 0) {
          const ajustesOriginaisTexto = ajustesOriginais.map(i => `${i.produto}: R$ ${(i.ajusteValor! / 100).toFixed(2)}`).join(", ");
          const ajustesNovosTexto = ajustesNovos.map(i => `${i.produto}: R$ ${(i.ajusteValor! / 100).toFixed(2)}`).join(", ");
          if (ajustesOriginaisTexto !== ajustesNovosTexto) {
            camposAlterados["Ajustes de Valor"] = {
              antes: ajustesOriginaisTexto || "(nenhum)",
              depois: ajustesNovosTexto || "(nenhum)",
            };
          }
        }
        
        // Verificar mudanças em CV/NSU
        const cvNsuOriginais = pagamentosOriginais.filter(p => p.cvNsu).map(p => p.cvNsu).join(", ");
        const cvNsuNovos = input.pagamentos.filter(p => p.cvNsu).map(p => p.cvNsu).join(", ");
        if (cvNsuOriginais !== cvNsuNovos) {
          camposAlterados["CV/NSU"] = {
            antes: cvNsuOriginais || "(nenhum)",
            depois: cvNsuNovos || "(nenhum)",
          };
        }
        
        // Deletar itens e pagamentos antigos
        await db.deleteItensByVenda(input.id);
        await db.deletePagamentosByVenda(input.id);
        
        // Atualizar venda (incluindo data se fornecida)
        const updateData: any = { valorTotal, observacao: input.observacao };
        if (input.dataVenda) {
          updateData.dataVenda = input.dataVenda;
        }
        await db.updateVenda(input.id, updateData);
        
        // Criar novos itens
        for (const item of input.itens) {
          await db.createItemVenda({
            vendaId: input.id,
            produtoId: item.produtoId,
            produto: item.produto,
            categoria: item.categoria,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
            ajusteValor: item.ajusteValor || 0,
            justificativa: item.justificativa || null,
            valorTotal: (item.valorUnitario * item.quantidade) + (item.ajusteValor || 0),
          });
        }
        
        // Criar novos pagamentos com cálculo de valorLiquido e dataCompensacao
        for (const pag of input.pagamentos) {
          let valorLiquido = pag.valor;
          let dataCompensacao: Date | null = null;
          
          // Calcular valor líquido e data de compensação baseado no tipo de pagamento
          if (pag.tipo === "credito" || pag.tipo === "debito") {
            // Buscar taxa e calcular valor líquido
            if (pag.bandeira) {
              const resultado = await calcularPagamentoCartao(
                pag.valor,
                pag.tipo,
                pag.bandeira,
                pag.parcelas
              );
              if (resultado) {
                valorLiquido = resultado.valorLiquido;
              }
            }
            // Calcular data de compensação (D+1 dia útil)
            dataCompensacao = calcularDataCompensacao(input.dataVenda || new Date(), 1);
          } else if (pag.tipo === "pix") {
            // PIX: sem taxa, D+1 dia útil
            valorLiquido = pag.valor;
            dataCompensacao = calcularDataCompensacao(input.dataVenda || new Date(), 1);
          } else if (pag.tipo === "dinheiro") {
            // Dinheiro: sem taxa, D+0 (mesmo dia)
            valorLiquido = pag.valor;
            dataCompensacao = input.dataVenda || new Date();
          } else if (pag.tipo === "incluso_pacote") {
            // Incluso no pacote: sem taxa, sem data de compensação
            valorLiquido = pag.valor;
            dataCompensacao = null;
          }
          
          await db.createPagamento({
            vendaId: input.id,
            tipo: pag.tipo,
            valor: pag.valor,
            valorLiquido,
            bandeira: pag.bandeira,
            parcelas: pag.parcelas,
            cvNsu: pag.cvNsu || null,
            dataCompensacao,
          });
        }
        
        // SEMPRE registrar histórico de edição (mesmo que campos específicos não tenham mudado)
        // Isso garante auditoria completa de todas as edições
        await db.registrarEdicaoVenda(
          input.id,
          ctx.user.id,
          input.observacao || "Venda editada",
          Object.keys(camposAlterados).length > 0 ? camposAlterados : { "Edição": { antes: "Venda original", depois: "Venda editada" } }
        );
        
        // Notificar Administradores e Gestores sobre edição de venda
        const venda = await db.getVendaById(input.id);
        if (venda) {
          const formando = await db.getFormandoById(venda.formandoId);
          const { notificarAdminEGestores } = await import('./db-notificacoes-helper');
          const valorFormatado = (valorTotal / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          await notificarAdminEGestores({
            tipo: 'venda_editada',
            titulo: 'Venda Editada',
            mensagem: `${formando?.nome || 'Formando'} - ${valorFormatado}`,
            vendaId: input.id,
          }).catch(err => console.error('Erro ao notificar edição de venda:', err));
        }
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        motivoExclusao: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Buscar dados da venda antes de deletar
        const venda = await db.getVendaById(input.id);
        
        // Soft delete: marcar como excluído e registrar quem excluiu e o motivo
        await db.softDeleteVenda(input.id, ctx.user.id, input.motivoExclusao);
        
        // Registrar histórico de exclusão
        await db.registrarExclusaoVenda(
          input.id,
          ctx.user.id,
          input.motivoExclusao || "Venda excluída"
        );
        
        // Notificar Administradores e Gestores sobre exclusão de venda
        if (venda) {
          const formando = await db.getFormandoById(venda.formandoId);
          const { notificarAdminEGestores } = await import('./db-notificacoes-helper');
          const valorFormatado = (venda.valorTotal / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          await notificarAdminEGestores({
            tipo: 'venda_excluida',
            titulo: 'Venda Excluída',
            mensagem: `${formando?.nome || 'Formando'} - ${valorFormatado}`,
            vendaId: input.id,
          }).catch(err => console.error('Erro ao notificar exclusão de venda:', err));
        }
        
        return { success: true };
      }),
    
    // Relatório de Vendas Excluídas
    vendasExcluidas: protectedProcedure.query(async () => {
      return db.getVendasExcluidas();
    }),
    
    // Relatório de Compensação Bancária
    compensacaoBancaria: protectedProcedure.query(async () => {
      const dados = await db.getCompensacaoBancaria();
      
      // Calcular data de compensação para cada pagamento
      return dados.map((item) => {
        let dataCompensacao: Date;
        
        if (item.pagamentoTipo === "credito") {
          // Crédito: D+1 dia útil
          dataCompensacao = calcularDataCompensacao(item.dataVenda, 1);
        } else if (item.pagamentoTipo === "debito") {
          // Débito: D+1 dia útil
          dataCompensacao = calcularDataCompensacao(item.dataVenda, 1);
        } else if (item.pagamentoTipo === "pix") {
          // PIX: D+1 dia útil
          dataCompensacao = calcularDataCompensacao(item.dataVenda, 1);
        } else {
          // Dinheiro: D+0 (mesmo dia)
          dataCompensacao = item.dataVenda;
        }
        
        return {
          ...item,
          dataCompensacao,
        };
      });
    }),
  }),

  // ==================== PRODUTOS ====================
  produtos: router({
    list: protectedProcedure.query(async () => {
      return db.getAllProdutos();
    }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        descricao: z.string().optional(),
        preco: z.number(),
        ativo: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createProduto(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        descricao: z.string().optional(),
        preco: z.number().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProduto(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProduto(input.id);
        return { success: true };
      }),
  }),

  // ==================== TAXAS CARTÃO ====================
  taxasCartao: router({
    list: protectedProcedure.query(async () => {
      return db.getAllTaxasCartao();
    }),
    
    getBandeiras: protectedProcedure.query(() => {
      return BANDEIRAS;
    }),
    
    create: protectedProcedure
      .input(z.object({
        tipoPagamento: z.string(),
        bandeira: z.string(),
        parcelas: z.number().default(1),
        taxaPercentual: z.number(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTaxaCartao(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        tipoPagamento: z.string().optional(),
        bandeira: z.string().optional(),
        parcelas: z.number().optional(),
        taxaPercentual: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTaxaCartao(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTaxaCartao(input.id);
        return { success: true };
      }),
  }),

  // ==================== CONFIG MAQUIAGEM ====================
  configMaquiagem: router({
    list: protectedProcedure.query(async () => {
      return db.getAllConfigMaquiagem();
    }),
    
    create: protectedProcedure
      .input(z.object({
        cidade: z.string().min(1),
        valorMasculino: z.number(),
        valorFeminino: z.number(),
        valorComissaoFamilia: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createConfigMaquiagem(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        valorMasculino: z.number().optional(),
        valorFeminino: z.number().optional(),
        valorComissaoFamilia: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateConfigMaquiagem(id, data);
        return { success: true };
      }),
  }),

  // ==================== CONFIG MAQUIAGEM POR TURMA ====================
  configMaquiagemTurma: router({
    list: protectedProcedure.query(async () => {
      return db.getAllConfigMaquiagemTurma();
    }),
    
    getByTurma: protectedProcedure
      .input(z.object({ turmaId: z.number() }))
      .query(async ({ input }) => {
        return db.getConfigMaquiagemByTurma(input.turmaId);
      }),
    
    // Buscar valores de maquiagem com fallback (turma -> cidade -> padrão)
    getValoresByTurma: protectedProcedure
      .input(z.object({ turmaId: z.number() }))
      .query(async ({ input }) => {
        return db.getValoresMaquiagemByTurma(input.turmaId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        turmaId: z.number(),
        valorMasculino: z.number(),
        valorFeminino: z.number(),
        valorFamilia: z.number(),
        semServicoFormando: z.boolean().optional(),
        semServicoFamilia: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        // Verificar se já existe configuração para esta turma
        const existente = await db.getConfigMaquiagemByTurma(input.turmaId);
        if (existente) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Já existe uma configuração de maquiagem cadastrada para esta turma',
          });
        }
        
        const id = await db.createConfigMaquiagemTurma(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        valorMasculino: z.number(),
        valorFeminino: z.number(),
        valorFamilia: z.number(),
        semServicoFormando: z.boolean().optional(),
        semServicoFamilia: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateConfigMaquiagemTurma(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteConfigMaquiagemTurma(input.id);
        return { success: true };
      }),
    
    // Edição em massa
    updateMultiple: protectedProcedure
      .input(z.object({
        ids: z.array(z.number()),
        valorMasculino: z.number().optional(),
        valorFeminino: z.number().optional(),
        valorFamilia: z.number().optional(),
        semServicoFormando: z.boolean().optional(),
        semServicoFamilia: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { ids, ...data } = input;
        await db.updateMultipleConfigMaquiagemTurma(ids, data);
        return { success: true, count: ids.length };
      }),
  }),

  // ==================== CÁLCULOS ====================
  calculos: router({
    maquiagemFormando: protectedProcedure
      .input(z.object({
        genero: z.enum(["masculino", "feminino"]),
        cidade: z.string(),
      }))
      .query(async ({ input }) => {
        const valor = await calcularMaquiagemFormando(input.genero, input.cidade);
        return { valor, valorFormatado: formatarMoeda(valor) };
      }),
    
    comissaoMaquiagemFamilia: protectedProcedure
      .input(z.object({ cidade: z.string() }))
      .query(async ({ input }) => {
        const valor = await calcularComissaoMaquiagemFamilia(input.cidade);
        return { valor, valorFormatado: formatarMoeda(valor) };
      }),
    
    comissaoCabelo: protectedProcedure
      .input(z.object({
        tipoServico: z.enum(["simples", "combinado"]),
      }))
      .query(({ input }) => {
        const resultado = calcularComissaoCabelo(input.tipoServico);
        return {
          valorServico: resultado.valorServico,
          valorServicoFormatado: formatarMoeda(resultado.valorServico),
          comissao: resultado.comissao,
          comissaoFormatada: formatarMoeda(resultado.comissao),
        };
      }),
    
    compensacaoBancaria: protectedProcedure
      .input(z.object({
        dataVenda: z.date(),
        diasUteis: z.number().default(1),
      }))
      .query(({ input }) => {
        const dataCompensacao = calcularDataCompensacao(input.dataVenda, input.diasUteis);
        return {
          dataCompensacao,
          dataFormatada: formatarData(dataCompensacao),
        };
      }),
    
    taxaCartao: protectedProcedure
      .input(z.object({
        valor: z.number(),
        tipoPagamento: z.enum(["debito", "credito"]),
        bandeira: z.string(),
        parcelas: z.number().default(1),
      }))
      .query(async ({ input }) => {
        const resultado = await calcularPagamentoCartao(
          input.valor,
          input.tipoPagamento,
          input.bandeira,
          input.parcelas
        );
        if (!resultado) {
          return {
            valorBruto: input.valor,
            valorLiquido: input.valor,
            taxaAplicada: 0,
            taxaPercentual: 0,
          };
        }
        return {
          valorBruto: input.valor,
          valorBrutoFormatado: formatarMoeda(input.valor),
          valorLiquido: resultado.valorLiquido,
          valorLiquidoFormatado: formatarMoeda(resultado.valorLiquido),
          taxaAplicada: resultado.taxaAplicada,
          taxaAplicadaFormatada: formatarMoeda(resultado.taxaAplicada),
          taxaPercentual: resultado.taxaPercentual,
        };
      }),
  }),

  // ==================== USUÁRIOS ====================
  usuarios: router({
    list: protectedProcedure.query(async () => {
      return db.getAllUsers();
    }),
    
    updateStatus: protectedProcedure
      .input(z.object({
        userId: z.number(),
        status: z.enum(["pendente", "aprovado", "rejeitado"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserStatus(input.userId, input.status);
        return { success: true };
      }),
    
    updateTipoUsuario: protectedProcedure
      .input(z.object({
        userId: z.number(),
        tipoUsuarioId: z.number().nullable(),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserTipoUsuario(input.userId, input.tipoUsuarioId);
        return { success: true };
      }),
  }),

  // ==================== TIPOS DE USUÁRIO ====================
  tiposUsuario: router({
    list: protectedProcedure.query(async () => {
      return db.listTiposUsuario();
    }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTipoUsuario(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTipoUsuario(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTipoUsuario(input.id);
        return { success: true };
      }),
  }),

  // ==================== INSTITUIÇÕES ====================
  instituicoes: router({
    list: protectedProcedure.query(async () => {
      return db.listInstituicoes();
    }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        sigla: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createInstituicao(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        sigla: z.string().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateInstituicao(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteInstituicao(input.id);
        return { success: true };
      }),
  }),

  // ==================== CURSOS ====================
  cursosCadastro: router({
    list: protectedProcedure.query(async () => {
      return db.listCursos();
    }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCurso(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCurso(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCurso(input.id);
        return { success: true };
      }),
  }),

  // ==================== CIDADES ====================
  cidades: router({
    list: protectedProcedure.query(async () => {
      return db.listCidades();
    }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        estado: z.string().length(2),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCidade(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        estado: z.string().length(2).optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCidade(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCidade(input.id);
        return { success: true };
      }),
  }),

  // ==================== LOCAIS ====================
  locais: router({
    list: protectedProcedure.query(async () => {
      return db.listLocais();
    }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createLocal(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateLocal(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLocal(input.id);
        return { success: true };
      }),
  }),

  // ==================== TIPOS DE EVENTO ====================
  tiposEvento: router({
    list: protectedProcedure.query(async () => {
      return db.listTiposEvento();
    }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        codigo: z.string().min(1),
        cor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTipoEvento(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        codigo: z.string().min(1).optional(),
        cor: z.string().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTipoEvento(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTipoEvento(input.id);
        return { success: true };
      }),
  }),

  // ==================== TIPOS DE SERVIÇO ====================
  tiposServico: router({
    list: protectedProcedure.query(async () => {
      return db.listTiposServico();
    }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTipoServico(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTipoServico(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTipoServico(input.id);
        return { success: true };
      }),
  }),

  // ==================== FORNECEDORES ====================
  fornecedores: router({
    list: protectedProcedure.query(async () => {
      return db.listFornecedores();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getFornecedorById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        tipoPessoa: z.enum(["PF", "PJ"]).optional(), // Opcional
        cpfCnpj: z.string().optional(), // Opcional
        nome: z.string().min(1), // Obrigatório
        email: z.string().optional(),
        telefone: z.string().optional(),
        tiposServico: z.string().optional(), // JSON array
        cep: z.string().optional(),
        logradouro: z.string().optional(),
        bairro: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().optional(),
        banco: z.string().optional(),
        agencia: z.string().optional(),
        conta: z.string().optional(),
        pix: z.string().optional(),
        chavesPix: z.string().optional(), // JSON array de chaves Pix
      }))
      .mutation(async ({ input }) => {
        const id = await db.createFornecedor(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        tipoPessoa: z.enum(["PF", "PJ"]).optional(),
        cpfCnpj: z.string().optional(),
        nome: z.string().optional(),
        email: z.string().optional(),
        telefone: z.string().optional(),
        tiposServico: z.string().optional(),
        cep: z.string().optional(),
        logradouro: z.string().optional(),
        bairro: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().optional(),
        banco: z.string().optional(),
        agencia: z.string().optional(),
        conta: z.string().optional(),
        pix: z.string().optional(),
        chavesPix: z.string().optional(), // JSON array de chaves Pix
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateFornecedor(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFornecedor(input.id);
        return { success: true };
      }),
  }),

  // ==================== TABELA DE PREÇO FORNECEDORES ====================
  tabelaPrecoFornecedores: router({
    list: protectedProcedure.query(async () => {
      return db.listTabelaPrecoFornecedores();
    }),
    
    getByFornecedor: protectedProcedure
      .input(z.object({ fornecedorId: z.number() }))
      .query(async ({ input }) => {
        return db.getTabelaPrecoByFornecedor(input.fornecedorId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        fornecedorId: z.number(),
        tipoServicoId: z.number(),
        tipoEventoId: z.number(),
        valor: z.number(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTabelaPrecoFornecedor(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        fornecedorId: z.number().optional(),
        tipoServicoId: z.number().optional(),
        tipoEventoId: z.number().optional(),
        valor: z.number().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTabelaPrecoFornecedor(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTabelaPrecoFornecedor(input.id);
        return { success: true };
      }),
  }),

  // ==================== DESPESAS ====================
  despesas: router({
    list: protectedProcedure.query(async () => {
      return db.listDespesas();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getDespesaById(input.id);
      }),
    
    getNextNumeroCi: protectedProcedure.query(async () => {
      return db.getNextNumeroCi();
    }),
    
    create: protectedProcedure
      .input(z.object({
        numeroCi: z.string(),
        tipoDespesa: z.enum(["operacional", "administrativo"]),
        turmaId: z.number().optional(),
        eventoId: z.number().optional(),
        mesServico: z.string().optional(),
        setorSolicitante: z.enum(["estudio", "fotografia", "becas"]),
        fornecedorId: z.number(),
        tipoServicoId: z.number().optional(),
        detalhamento: z.string().optional(),
        eReembolso: z.boolean().optional(),
        valorTotal: z.number(),
        tipoPagamento: z.enum(["pix", "transferencia", "boleto", "dinheiro", "cartao"]).optional(),
        dadosPagamento: z.string().optional(),
        tipoComprovante: z.enum(["nota_fiscal", "recibo", "cupom", "outros"]).optional(),
        dataLimitePagamento: z.date().optional(),
        status: z.enum(["pendente", "apto", "pendente_nf", "cancelado"]).optional(),
        // Campos para Alimentação
        horarioSaida: z.string().optional(),
        horarioRetorno: z.string().optional(),
        cafeDaManhaIncluso: z.boolean().optional(),
        fornecedoresAlimentacao: z.string().optional(), // JSON array
        refeicoesCalculadas: z.string().optional(), // JSON
        // Campos para Hospedagem
        fornecedorHospedagem: z.number().optional(),
        quartosHospedagem: z.string().optional(), // JSON
        valoresDiarias: z.string().optional(), // JSON
        diasAntes: z.number().optional(),
        diasDepois: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createDespesa(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        tipoDespesa: z.enum(["operacional", "administrativo"]).optional(),
        turmaId: z.number().optional(),
        eventoId: z.number().optional(),
        mesServico: z.string().optional(),
        setorSolicitante: z.enum(["estudio", "fotografia", "becas"]).optional(),
        fornecedorId: z.number().optional(),
        tipoServicoId: z.number().optional(),
        detalhamento: z.string().optional(),
        eReembolso: z.boolean().optional(),
        valorTotal: z.number().optional(),
        tipoPagamento: z.enum(["pix", "transferencia", "boleto", "dinheiro", "cartao"]).optional(),
        dadosPagamento: z.string().optional(),
        tipoComprovante: z.enum(["nota_fiscal", "recibo", "cupom", "outros"]).optional(),
        dataLimitePagamento: z.date().optional(),
        status: z.enum(["pendente", "apto", "pendente_nf", "cancelado"]).optional(),
        pago: z.boolean().optional(),
        dataPagamento: z.date().optional(),
        // Campos para Alimentação
        horarioSaida: z.string().optional(),
        horarioRetorno: z.string().optional(),
        cafeDaManhaIncluso: z.boolean().optional(),
        fornecedoresAlimentacao: z.string().optional(),
        refeicoesCalculadas: z.string().optional(),
        // Campos para Hospedagem
        fornecedorHospedagem: z.number().optional(),
        quartosHospedagem: z.string().optional(),
        valoresDiarias: z.string().optional(),
        diasAntes: z.number().optional(),
        diasDepois: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDespesa(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDespesa(input.id);
        return { success: true };
      }),
    
    // Anexos
    listAnexos: protectedProcedure
      .input(z.object({ despesaId: z.number() }))
      .query(async ({ input }) => {
        return db.listAnexosByDespesa(input.despesaId);
      }),
    
    createAnexo: protectedProcedure
      .input(z.object({
        despesaId: z.number(),
        tipoAnexo: z.enum(["comprovante_fiscal", "documento"]),
        nomeArquivo: z.string(),
        urlArquivo: z.string(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createAnexoDespesa(input);
        return { success: true, id };
      }),
    
    deleteAnexo: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAnexoDespesa(input.id);
        return { success: true };
      }),
  }),

  // ==================== TIPOS DE CENÁRIO ====================
  tiposCenario: router({
    list: protectedProcedure.query(async () => {
      return db.listTiposCenario();
    }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTipoCenario(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTipoCenario(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTipoCenario(input.id);
        return { success: true };
      }),
  }),

  // ==================== EXECUÇÃO FORMANDO ====================
  execucaoFormando: router({
    get: protectedProcedure
      .input(z.object({ eventoId: z.number(), formandoId: z.number() }))
      .query(async ({ input }) => {
        return db.getExecucaoFormando(input.eventoId, input.formandoId);
      }),
    
    listByEvento: protectedProcedure
      .input(z.object({ eventoId: z.number() }))
      .query(async ({ input }) => {
        return db.listExecucaoFormandosByEvento(input.eventoId);
      }),
    
    upsert: protectedProcedure
      .input(z.object({
        eventoId: z.number(),
        formandoId: z.number(),
        status: z.enum(["apto", "inapto", "migracao"]).optional(),
        arquivoEntregue: z.boolean().optional(),
        dataExecucao: z.date().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        // CORREÇÃO 09/01/2026: Removida sincronização automática que causava erro 503 em produção
        // A sincronização para Briefing pode ser feita manualmente via briefing.syncFromExecucao
        const id = await db.upsertExecucaoFormando(input);
        return { success: true, id };
      }),
  }),

  // ==================== FOTOS FORMANDO ====================
  fotosFormando: router({
    list: protectedProcedure
      .input(z.object({ execucaoFormandoId: z.number() }))
      .query(async ({ input }) => {
        return db.listFotosFormando(input.execucaoFormandoId);
      }),
    
    listByBriefingFormando: protectedProcedure
      .input(z.object({ briefingFormandoId: z.number() }))
      .query(async ({ input }) => {
        return db.listFotosFormandoByBriefing(input.briefingFormandoId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        execucaoFormandoId: z.number().optional(),
        briefingFormandoId: z.number().optional(),
        cenarioId: z.number(),
        fotografoId: z.number().optional(),
        horarioInicio: z.string().optional(),
        horarioTermino: z.string().optional(),
        numeroArquivos: z.number().optional(),
        observacao: z.string().optional(),
        dataExecucao: z.date().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createFotoFormando(input);
        
        // Se foi criado via execução, sincronizar para Briefing
        if (input.execucaoFormandoId) {
          const execucao = await db.getExecucaoFormando(0, 0); // Buscar pela função helper
          // Na verdade, precisamos buscar pelo ID da execução, vamos simplificar
          // A sincronização automática já acontece no upsert de execução
          // Então não precisamos sincronizar aqui novamente
        }
        
        return { success: true, id };
      }),
    
    upsertByBriefing: protectedProcedure
      .input(z.object({
        briefingFormandoId: z.number(),
        cenarioId: z.number(),
        horarioInicio: z.string().optional(),
        horarioTermino: z.string().optional(),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.upsertFotoFormandoByBriefing(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        cenarioId: z.number().optional(),
        fotografoId: z.number().optional(),
        horarioInicio: z.string().optional(),
        horarioTermino: z.string().optional(),
        numeroArquivos: z.number().optional(),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateFotoFormando(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFotoFormando(input.id);
        return { success: true };
      }),
    
    deleteAll: protectedProcedure
      .input(z.object({ execucaoFormandoId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAllFotosFormando(input.execucaoFormandoId);
        return { success: true };
      }),
  }),

  // ==================== SERVIÇOS EXECUÇÃO (Make e Cabelo) ====================
  servicosExecucao: router({
    // Criar serviço de Make Formando (Super A PAGA)
    createMakeFormando: protectedProcedure
      .input(z.object({
        eventoId: z.number(),
        formandoId: z.number(),
        fornecedorId: z.number(),
        valorUnitario: z.number(), // em centavos
        tipoMake: z.enum(['masc', 'fem']), // Tipo de make do formando (Masc ou Fem)
        dataRealizacao: z.date().optional(),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createServicoExecucao({
          ...input,
          tipoServico: 'make_formando',
          quantidade: 1,
          valorTotal: input.valorUnitario,
          fluxo: 'pagar',
        });
        return { success: true, id };
      }),

    // Criar serviço de Make Família (Super A RECEBE R$30 por serviço)
    createMakeFamilia: protectedProcedure
      .input(z.object({
        eventoId: z.number(),
        formandoId: z.number(),
        fornecedorId: z.number(),
        quantidade: z.number().min(1),
        dataRealizacao: z.date().optional(),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Buscar turmaId do evento
        const evento = await db.getEventoById(input.eventoId);
        if (!evento) {
          throw new Error('Evento não encontrado');
        }
        
        // Buscar valor configurado de Make Família por turma (fallback R$ 30,00)
        const valorUnitario = await db.getValorMakeFamilia(evento.turmaId);
        const id = await db.createServicoExecucao({
          ...input,
          tipoServico: 'make_familia',
          valorUnitario,
          valorTotal: valorUnitario * input.quantidade,
          fluxo: 'receber',
        });
        return { success: true, id };
      }),

    // Criar serviço de Cabelo (Super A RECEBE 20%)
    createCabelo: protectedProcedure
      .input(z.object({
        eventoId: z.number(),
        formandoId: z.number(),
        tipo: z.enum(['simples', 'combinado']),
        quantidade: z.number().min(1),
        dataRealizacao: z.date().optional(),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Buscar o evento para obter a turma
        const evento = await db.getEventoById(input.eventoId);
        if (!evento) throw new Error('Evento não encontrado');
        
        // Buscar a turma para obter o valor atualizado
        const turma = await db.getTurmaById(evento.turmaId);
        
        // Usar valor da turma ou valor padrão
        // Valores padrão: Simples R$40 (4000 centavos), Combinado R$70 (7000 centavos)
        let valorServico: number;
        if (input.tipo === 'simples') {
          valorServico = turma?.valorCabeloSimples || 4000;
        } else {
          valorServico = turma?.valorCabeloCombinado || 7000;
        }
        
        const tipoServico = input.tipo === 'simples' ? 'cabelo_simples' : 'cabelo_combinado';
        
        const id = await db.createServicoExecucao({
          eventoId: input.eventoId,
          formandoId: input.formandoId,
          tipoServico,
          fornecedorId: undefined, // Cabelo não tem fornecedor específico
          quantidade: input.quantidade,
          valorUnitario: valorServico,
          valorTotal: valorServico * input.quantidade,
          fluxo: 'receber',
          dataRealizacao: input.dataRealizacao,
          observacao: input.observacao,
        });
        return { success: true, id };
      }),

    // Listar serviços por evento
    listByEvento: protectedProcedure
      .input(z.object({ eventoId: z.number() }))
      .query(async ({ input }) => {
        return db.listServicosExecucaoByEvento(input.eventoId);
      }),

    // Listar serviços por formando
    listByFormando: protectedProcedure
      .input(z.object({ formandoId: z.number() }))
      .query(async ({ input }) => {
        return db.listServicosExecucaoByFormando(input.formandoId);
      }),

    // Listar serviços por evento e formando
    listByEventoFormando: protectedProcedure
      .input(z.object({ eventoId: z.number(), formandoId: z.number() }))
      .query(async ({ input }) => {
        return db.listServicosExecucaoByEventoFormando(input.eventoId, input.formandoId);
      }),

    // Relatório de Maquiagem (compensação por fornecedora)
    relatorioMaquiagem: protectedProcedure
      .input(z.object({
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
        turmaId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return db.getRelatorioMaquiagem(input);
      }),

    // Relatório de Cabelo (comissões a receber)
    relatorioCabelo: protectedProcedure
      .input(z.object({
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
        turmaId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return db.getRelatorioCabelo(input);
      }),

    // Deletar serviço
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteServicoExecucao(input.id);
        return { success: true };
      }),

    // Deletar todos os serviços de um evento/formando
    deleteByEventoFormando: protectedProcedure
      .input(z.object({ eventoId: z.number(), formandoId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteServicosExecucaoByEventoFormando(input.eventoId, input.formandoId);
        return { success: true };
      }),
  }),

  // ==================== BRIEFING DO EVENTO (GRUPOS) ====================
  briefing: router({
    // Listar todas as turmas que possuem briefing criado
    listTurmasComBriefing: protectedProcedure
      .query(async () => {
        return db.getTurmasComBriefingCriado();
      }),
    
    // Grupos
    // Listar briefings existentes por turma (eventos que já têm grupos)
    listBriefingsByTurma: protectedProcedure
      .input(z.object({ turmaId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Se é Cerimonial, verificar se tem acesso à turma
        if (ctx.user.role === 'cerimonial') {
          const temAcesso = await db.usuarioTemAcessoTurma(ctx.user.id, input.turmaId);
          if (!temAcesso) {
            return []; // Sem acesso
          }
        }
        return db.getBriefingsExistentesByTurma(input.turmaId);
      }),
    
    listGrupos: protectedProcedure
      .input(z.object({ eventoId: z.number() }))
      .query(async ({ input }) => {
        return db.getBriefingGruposByEvento(input.eventoId);
      }),
    
    listGruposByTurmaETipo: protectedProcedure
      .input(z.object({ turmaId: z.number(), tipoEvento: z.string() }))
      .query(async ({ input }) => {
        return db.getBriefingGruposByTurmaETipo(input.turmaId, input.tipoEvento);
      }),
    
    createGrupo: protectedProcedure
      .input(z.object({
        eventoId: z.number(),
        numero: z.number(),
        dataGrupo: z.date().optional(),
        horarioFormandos: z.string().optional(),
        limiteFormandos: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createBriefingGrupo(input);
        return { success: true, id };
      }),
    
    updateGrupo: protectedProcedure
      .input(z.object({
        id: z.number(),
        dataGrupo: z.date().optional().nullable(),
        horarioFormandos: z.string().optional().nullable(),
        limiteFormandos: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateBriefingGrupo(id, data);
        return { success: true };
      }),
    
    deleteGrupo: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteBriefingGrupo(input.id);
        return { success: true };
      }),
    
    // Formandos no grupo
    listFormandosByGrupo: protectedProcedure
      .input(z.object({ grupoId: z.number() }))
      .query(async ({ input }) => {
        return db.getBriefingFormandosByGrupo(input.grupoId);
      }),

    updateTurmaObservacoesBeca: protectedProcedure
      .input(
        z.object({
          turmaId: z.number(),
          observacoesBeca: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateTurmaObservacoesBeca(
          input.turmaId,
          input.observacoesBeca
        );
        return { success: true };
      }),

    listFormandosByEvento: protectedProcedure
      .input(z.object({ eventoId: z.number() }))
      .query(async ({ input }) => {
        return db.getBriefingFormandosByEvento(input.eventoId);
      }),
    
    listFormandosByTurmaETipo: protectedProcedure
      .input(z.object({ turmaId: z.number(), tipoEvento: z.string() }))
      .query(async ({ input }) => {
        return db.getBriefingFormandosByTurmaETipo(input.turmaId, input.tipoEvento);
      }),
    
    addFormando: protectedProcedure
      .input(z.object({
        grupoId: z.number(),
        eventoId: z.number(),
        formandoId: z.number(),
        makeFormando: z.boolean().optional(),
        cabeloFormando: z.boolean().optional(),
        makeFamilia: z.boolean().optional(),
        cabeloFamilia: z.boolean().optional(),
        qtdFamilia: z.number().optional(),
        qtdPets: z.number().optional(),
        somenteGrupo: z.boolean().optional(),
        observacao: z.string().optional(),
        preenchidoPor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Verificar limite do grupo
        const grupos = await db.getBriefingGruposByEvento(input.eventoId);
        const grupo = grupos.find(g => g.id === input.grupoId);
        if (!grupo) return { success: false, error: "Grupo não encontrado" };
        
        const count = await db.countFormandosInGrupo(input.grupoId);
        if (count >= (grupo.limiteFormandos || 10)) {
          return { success: false, error: "Limite de formandos atingido neste grupo" };
        }
        
        const ordem = await db.getNextOrdemInGrupo(input.grupoId);
        const id = await db.createBriefingFormando({ ...input, ordem, preenchidoEm: new Date() });
        return { success: true, id };
      }),
    
    updateFormando: protectedProcedure
      .input(z.object({
        id: z.number(),
        horarioFamiliaSemServico: z.string().optional().nullable(),
        horarioFamiliaComServico: z.string().optional().nullable(),
        makeFormando: z.boolean().optional(),
        cabeloFormando: z.boolean().optional(),
        makeFamilia: z.boolean().optional(),
        cabeloFamilia: z.boolean().optional(),
        qtdMakeFamilia: z.number().optional(),
        qtdCabeloSimples: z.number().optional(),
        qtdCabeloCombinado: z.number().optional(),
        qtdCabeloFamilia: z.number().optional(),
        qtdFamilia: z.number().optional(),
        qtdPets: z.number().optional(),
        peso: z.string().optional().nullable(),
        altura: z.string().optional().nullable(),
        somenteGrupo: z.boolean().optional(),
        tamanhoBeca: z.string().optional().nullable(),
        observacao: z.string().optional(),
        preenchidoPor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateBriefingFormando(id, { ...data, preenchidoEm: new Date() });
        
        // Sincronizar tamanhoBeca com formandos se existir
        if (data.tamanhoBeca !== undefined) {
          try {
            await db.syncBecaToFormando(id, data.tamanhoBeca);
          } catch (error) {
            console.error('Erro ao sincronizar beca com formando:', error);
          }
        }
        
        return { success: true };
      }),
    
    removeFormando: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteBriefingFormando(input.id);
        return { success: true };
      }),
    
    // Atualizar campos de abordagem (dados executados)
    updateAbordagem: protectedProcedure
      .input(z.object({
        id: z.number(), // ID do briefingFormando
        abordagemPacote: z.string().optional().nullable(),
        abordagemMakeFormando: z.boolean().optional().nullable(),
        abordagemCabeloFormando: z.boolean().optional().nullable(),
        abordagemQtdCabeloSimples: z.number().optional().nullable(),
        abordagemQtdCabeloCombinado: z.number().optional().nullable(),
        abordagemQtdMakeFamilia: z.number().optional().nullable(),
        abordagemQtdFamilia: z.number().optional().nullable(),
        abordagemQtdPets: z.number().optional().nullable(),
        abordagemPreenchidoPor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateBriefingFormandoAbordagem(id, { ...data, abordagemPreenchidoEm: new Date() });
        return { success: true };
      }),
    
    // Manter compatíveis para não quebrar código existente
    listByEvento: protectedProcedure
      .input(z.object({ eventoId: z.number() }))
      .query(async ({ input }) => {
        return db.listBriefingsByEvento(input.eventoId);
      }),
    
    getByFormando: protectedProcedure
      .input(z.object({ eventoId: z.number(), formandoId: z.number() }))
      .query(async ({ input }) => {
        return db.getBriefingByFormando(input.eventoId, input.formandoId);
      }),
    
    upsert: protectedProcedure
      .input(z.object({
        eventoId: z.number(),
        formandoId: z.number(),
        grupo: z.number().optional(),
        horarioFormando: z.string().optional(),
        horarioFamilia: z.string().optional(),
        makeFormando: z.boolean().optional(),
        cabeloFormando: z.boolean().optional(),
        makeFamilia: z.number().optional(),
        cabeloFamilia: z.number().optional(),
        qtdFamilia: z.number().optional(),
        qtdPets: z.number().optional(),
        somenteGrupo: z.boolean().optional(),
        observacao: z.string().optional(),
        preenchidoPor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.upsertBriefing(input);
        return { success: true, id };
      }),
    
    listHorarios: protectedProcedure
      .input(z.object({ eventoId: z.number() }))
      .query(async ({ input }) => {
        return db.listHorariosBriefing(input.eventoId);
      }),
    
    // Importar planilha de briefing
    importarPlanilha: protectedProcedure
      .input(z.object({
        eventoId: z.number(),
        turmaId: z.number(),
        dados: z.array(z.any()), // Dados JSON da planilha
      }))
      .mutation(async ({ input }) => {
        console.log('[BRIEFING ROUTER] Recebendo requisição de importação:', {
          eventoId: input.eventoId,
          turmaId: input.turmaId,
          totalDados: input.dados.length
        });
        
        try {
          // Importar helper
          const { processarDadosBriefing, validarDadosBriefing } = await import('./briefing-import-helper');
          
          // Processar dados JSON da planilha
          const grupos = processarDadosBriefing(input.dados);
          console.log('[BRIEFING ROUTER] Grupos processados:', grupos.length);
          
          // Validar dados
          const validacao = validarDadosBriefing(grupos);
          console.log('[BRIEFING ROUTER] Validação:', validacao);
          if (!validacao.valido) {
            console.error('[BRIEFING ROUTER] Validação falhou:', validacao.erros);
            return {
              success: false,
              erros: validacao.erros,
            };
          }
          
          // Importar para o banco de dados
          const resultado = await db.importarBriefingCompleto({
            eventoId: input.eventoId,
            turmaId: input.turmaId,
            grupos: grupos.map(g => ({
              numero: g.numero,
              dataGrupo: g.dataGrupo,
              horarioFormandos: g.horarioFormandos,
              limiteFormandos: g.limiteFormandos,
              formandos: g.formandos.map(f => ({
                nomeFormando: f.nomeFormando,
                horarioFamiliaSemServico: f.horarioFamiliaSemServico,
                maquiagemFormando: f.maquiagemFormando,
                maquiagemFamilia: f.maquiagemFamilia,
                cabeloSimples: f.cabeloSimples,
                cabeloCombinado: f.cabeloCombinado,
                horarioFamiliaComServico: f.horarioFamiliaComServico,
                qtdFamilia: f.qtdFamilia,
                qtdPets: f.qtdPets,
                somenteGrupo: f.somenteGrupo,
              })),
            })),
          });
          
          console.log('[BRIEFING ROUTER] Resultado da importação:', resultado);
          return resultado;
        } catch (error: any) {
          console.error('[BRIEFING ROUTER] Erro durante importação:', error);
          console.error('[BRIEFING ROUTER] Stack trace:', error.stack);
          return {
            success: false,
            erro: error.message || 'Erro ao processar planilha',
          };
        }
      }),
    
    // Excluir briefing completo (todos os grupos e formandos de um evento)
    excluirBriefingCompleto: protectedProcedure
      .input(z.object({
        eventoId: z.number(),
        turmaId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.excluirBriefingCompleto(input.eventoId, input.turmaId);
        return { success: true };
      }),
    
    // Sincronizar dados da Execução para o Briefing
    syncFromExecucao: protectedProcedure
      .input(z.object({
        eventoId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const resultado = await db.syncExecucaoToBriefing(input.eventoId);
        return resultado;
      }),
  }),

  // ==================== ÁREA DO CLIENTE ====================
  cliente: router({
    login: publicProcedure
      .input(z.object({
        cpf: z.string(),
        codigoTurma: z.string(),
      }))
      .mutation(async ({ input }) => {
        const formando = await db.loginCliente(input.cpf, input.codigoTurma);
        if (!formando) {
          return { success: false as const, error: "CPF ou código da turma inválido" };
        }
        return { success: true as const, formando };
      }),
    
    getEventos: publicProcedure
      .input(z.object({ turmaId: z.number() }))
      .query(async ({ input }) => {
        return db.getEventosByTurma(input.turmaId);
      }),
    
    getBriefing: publicProcedure
      .input(z.object({ eventoId: z.number(), formandoId: z.number() }))
      .query(async ({ input }) => {
        return db.getBriefingByFormando(input.eventoId, input.formandoId);
      }),
    
    saveBriefing: publicProcedure
      .input(z.object({
        eventoId: z.number(),
        formandoId: z.number(),
        grupo: z.number().optional(),
        horarioFormando: z.string().optional(),
        horarioFamilia: z.string().optional(),
        makeFormando: z.boolean().optional(),
        cabeloFormando: z.boolean().optional(),
        makeFamilia: z.number().optional(),
        cabeloFamilia: z.number().optional(),
        qtdFamilia: z.number().optional(),
        qtdPets: z.number().optional(),
        somenteGrupo: z.boolean().optional(),
        observacao: z.string().optional(),
        preenchidoPor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.upsertBriefing(input);
        return { success: true, id };
      }),
    
    getHorarios: publicProcedure
      .input(z.object({ eventoId: z.number() }))
      .query(async ({ input }) => {
        return db.listHorariosBriefing(input.eventoId);
      }),
  }),

  // ==================== DESPESAS V2 ====================
  despesasV2: router({
    // Gerar próximo número de CI
    getNextNumeroCi: protectedProcedure.query(async () => {
      return db.getNextNumeroCiV2();
    }),

    // Listar todas as despesas
    list: protectedProcedure.query(async ({ ctx }) => {
      const despesas = await db.listDespesasV2();
      
      // Se usuário é Beca, filtrar apenas despesas criadas por usuários Beca
      if (ctx.user.role === 'beca') {
        // Buscar todos os usuários com role Beca
        const usuariosBeca = await db.getAllUsers();
        const idsBeca = usuariosBeca
          .filter((u: any) => u.role === 'beca')
          .map((u: any) => u.id);
        
        // Filtrar despesas criadas por usuários Beca
        return despesas.filter((d: any) => idsBeca.includes(d.criadoPorId));
      }
      
      return despesas;
    }),

    // Listar com filtros
    listComFiltros: protectedProcedure
      .input(z.object({
        turmaId: z.number().optional(),
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
        status: z.string().optional(),
        tipoEvento: z.string().optional(),
        fornecedorId: z.number().optional(),
        tipoServicoCompra: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return db.listDespesasV2ComFiltros(input);
      }),

    // Buscar por ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getDespesaV2ById(input.id);
      }),

    // Criar despesa
    create: protectedProcedure
      .input(z.object({
        tipoDespesa: z.enum(['operacional', 'administrativa']),
        mesServico: z.enum(['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']),
        setorSolicitante: z.enum(['estudio', 'fotografia', 'becas']),
        fornecedorId: z.number(),
        tipoServicoCompra: z.string().optional(),
        detalhamento: z.string().min(1),
        eReembolso: z.boolean(),
        valorTotal: z.number(),
        tipoPagamento: z.enum(['pix', 'cartao', 'boleto', 'dinheiro']),
        dadosPagamento: z.string().min(1),
        tipoComprovanteFiscal: z.enum(['contrato', 'nota_fiscal', 'rpa']).optional(),
        dataLimitePagamento: z.date().optional(),
        local: z.string().optional(),
        turmas: z.array(z.object({
          turmaId: z.number(),
          tipoEvento: z.string().optional(),
        })).optional(),
        datasRealizacao: z.array(z.date()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const numeroCi = await db.getNextNumeroCiV2();
        const id = await db.createDespesaV2({
          ...input,
          numeroCi,
          criadoPorId: ctx.user?.id || 0,
          criadoPorNome: ctx.user?.name || 'Sistema',
        });
        
        // Enviar notificação para o gestor/owner
        const fornecedor = await db.getFornecedorById(input.fornecedorId);
        const valorFormatado = (input.valorTotal / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        // Notificar owner via Manus
        await notifyOwner({
          title: `Nova Despesa Criada - CI ${numeroCi}`,
          content: `Uma nova despesa foi criada e aguarda aprovação.\n\n` +
            `Número CI: ${numeroCi}\n` +
            `Tipo: ${input.tipoDespesa === 'operacional' ? 'Operacional' : 'Administrativa'}\n` +
            `Fornecedor: ${fornecedor?.nome || 'N/A'}\n` +
            `Valor: ${valorFormatado}\n` +
            `Criado por: ${ctx.user?.name || 'Sistema'}\n\n` +
            `Acesse o sistema para aprovar ou rejeitar esta despesa.`
        }).catch(err => console.error('Erro ao enviar notificação:', err));
        
        // Notificar gestor por e-mail e in-app
        const { getGestores } = await import('./db-users-helper');
        const { sendEmail, buildDespesaEmailTemplate } = await import('./_core/email');
        const { createNotificacao } = await import('./db-notificacoes');
        const gestores = await getGestores();
        
        for (const gestor of gestores) {
          // Notificação in-app
          await createNotificacao({
            userId: gestor.id,
            tipo: 'despesa_criada',
            titulo: 'Nova Despesa Aguardando Aprovação',
            mensagem: `CI ${numeroCi} - ${fornecedor?.nome || 'N/A'} - ${valorFormatado}`,
            despesaId: id || undefined,
          }).catch(err => console.error('Erro ao criar notificação in-app:', err));
          
          // E-mail
          if (gestor.email) {
            const emailHtml = buildDespesaEmailTemplate({
              titulo: 'Nova Despesa Aguardando Aprovação',
              mensagem: `Uma nova despesa foi criada e aguarda sua aprovação como Gestor.`,
              numeroCi,
              fornecedor: fornecedor?.nome || 'N/A',
              valor: valorFormatado,
              tipoDespesa: input.tipoDespesa === 'operacional' ? 'Operacional' : 'Administrativa',
              linkSistema: process.env.VITE_APP_URL || 'https://superaevents-axwmvybc.manus.space/despesas'
            });
            
            await sendEmail({
              to: gestor.email,
              subject: `Nova Despesa - CI ${numeroCi}`,
              html: emailHtml
            }).catch(err => console.error('Erro ao enviar e-mail para gestor:', err));
          }
        }
        
        return { success: true, id, numeroCi };
      }),

    // Atualizar despesa
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        tipoDespesa: z.enum(['operacional', 'administrativa']).optional(),
        mesServico: z.enum(['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']).optional(),
        setorSolicitante: z.enum(['estudio', 'fotografia', 'becas']).optional(),
        fornecedorId: z.number().optional(),
        tipoServicoCompra: z.string().optional(),
        detalhamento: z.string().optional(),
        eReembolso: z.boolean().optional(),
        valorTotal: z.number().optional(),
        tipoPagamento: z.enum(['pix', 'cartao', 'boleto', 'dinheiro']).optional(),
        dadosPagamento: z.string().optional(),
        tipoComprovanteFiscal: z.enum(['contrato', 'nota_fiscal', 'rpa']).optional().nullable(),
        dataLimitePagamento: z.date().optional().nullable(),
        local: z.string().optional().nullable(),
        turmas: z.array(z.object({
          turmaId: z.number(),
          tipoEvento: z.string().optional(),
        })).optional(),
        datasRealizacao: z.array(z.date()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // Registrar edição no histórico
        await db.updateDespesaV2(id, data);
        
        // Adicionar ao histórico
        const despesa = await db.getDespesaV2ById(id);
        if (despesa) {
          // Criar registro de edição no histórico via SQL direto
        }
        
        return { success: true };
      }),

    // Aprovar como Gestor
    aprovarGestor: protectedProcedure
      .input(z.object({ despesaId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const success = await db.aprovarDespesaGestor(
          input.despesaId,
          ctx.user?.id || 0,
          ctx.user?.name || 'Sistema'
        );
        
        if (success) {
          // Buscar dados da despesa
          const despesa = await db.getDespesaV2ById(input.despesaId);
          if (despesa) {
            const fornecedor = await db.getFornecedorById(despesa.fornecedorId);
            const valorFormatado = (despesa.valorTotal / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            // Notificar administrador por e-mail e in-app
            const { getAdministradores } = await import('./db-users-helper');
            const { sendEmail, buildDespesaEmailTemplate } = await import('./_core/email');
            const { createNotificacao } = await import('./db-notificacoes');
            const administradores = await getAdministradores();
            
            for (const admin of administradores) {
              // Notificação in-app
              await createNotificacao({
                userId: admin.id,
                tipo: 'despesa_aprovada_gestor',
                titulo: 'Despesa Aguardando Aprovação Final',
                mensagem: `CI ${despesa.numeroCi} - ${fornecedor?.nome || 'N/A'} - ${valorFormatado}`,
                despesaId: input.despesaId,
              }).catch(err => console.error('Erro ao criar notificação in-app:', err));
              
              // E-mail (somente se setor = "estudio")
              if (admin.email && despesa.setorSolicitante === 'estudio') {
                const emailHtml = buildDespesaEmailTemplate({
                  titulo: 'Despesa Aguardando Aprovação Final',
                  mensagem: `Uma despesa foi aprovada pelo Gestor e aguarda sua aprovação final como Gestor Geral.`,
                  numeroCi: despesa.numeroCi,
                  fornecedor: fornecedor?.nome || 'N/A',
                  valor: valorFormatado,
                  tipoDespesa: despesa.tipoDespesa === 'operacional' ? 'Operacional' : 'Administrativa',
                  linkSistema: process.env.VITE_APP_URL || 'https://superaevents-axwmvybc.manus.space/despesas'
                });
                
                await sendEmail({
                  to: admin.email,
                  subject: `Despesa Aguardando Aprovação Final - CI ${despesa.numeroCi}`,
                  html: emailHtml
                }).catch(err => console.error('Erro ao enviar e-mail para administrador:', err));
              }
            }
          }
        }
        
        return { success };
      }),

    // Aprovar como Gestor Geral
    aprovarGestorGeral: protectedProcedure
      .input(z.object({ despesaId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const success = await db.aprovarDespesaGestorGeral(
          input.despesaId,
          ctx.user?.id || 0,
          ctx.user?.name || 'Sistema'
        );
        return { success };
      }),

    // Rejeitar despesa
    rejeitar: protectedProcedure
      .input(z.object({
        despesaId: z.number(),
        tipo: z.enum(['gestor', 'gestor_geral']),
        justificativa: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const success = await db.rejeitarDespesa(
          input.despesaId,
          input.tipo,
          input.justificativa,
          ctx.user?.id || 0,
          ctx.user?.name || 'Sistema'
        );
        
        if (success) {
          // Buscar dados da despesa
          const despesa = await db.getDespesaV2ById(input.despesaId);
          if (despesa) {
            const fornecedor = await db.getFornecedorById(despesa.fornecedorId);
            const valorFormatado = (despesa.valorTotal / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const { sendEmail, buildDespesaEmailTemplate } = await import('./_core/email');
            
            const { createNotificacao } = await import('./db-notificacoes');
            
            if (input.tipo === 'gestor_geral') {
              // Notificação 3: Gestor Geral rejeitou -> notificar Gestor
              const { getGestores } = await import('./db-users-helper');
              const gestores = await getGestores();
              
              for (const gestor of gestores) {
                // Notificação in-app
                await createNotificacao({
                  userId: gestor.id,
                  tipo: 'despesa_rejeitada_gestor_geral',
                  titulo: 'Despesa Rejeitada pelo Gestor Geral',
                  mensagem: `CI ${despesa.numeroCi} - ${input.justificativa}`,
                  despesaId: input.despesaId,
                }).catch(err => console.error('Erro ao criar notificação in-app:', err));
                
                // E-mail
                if (gestor.email) {
                  const emailHtml = buildDespesaEmailTemplate({
                    titulo: 'Despesa Rejeitada pelo Gestor Geral',
                    mensagem: `A despesa CI ${despesa.numeroCi} foi rejeitada pelo Gestor Geral e retornou para sua revisão.`,
                    numeroCi: despesa.numeroCi,
                    fornecedor: fornecedor?.nome || 'N/A',
                    valor: valorFormatado,
                    tipoDespesa: despesa.tipoDespesa === 'operacional' ? 'Operacional' : 'Administrativa',
                    justificativa: input.justificativa,
                    linkSistema: process.env.VITE_APP_URL || 'https://superaevents-axwmvybc.manus.space/despesas'
                  });
                  
                  await sendEmail({
                    to: gestor.email,
                    subject: `Despesa Rejeitada - CI ${despesa.numeroCi}`,
                    html: emailHtml
                  }).catch(err => console.error('Erro ao enviar e-mail para gestor:', err));
                }
              }
            } else {
              // Notificação 4: Gestor rejeitou -> notificar criador da despesa
              const { getUserById } = await import('./db-users-helper');
              const criador = await getUserById(despesa.criadoPorId);
              
              if (criador) {
                // Notificação in-app
                await createNotificacao({
                  userId: criador.id,
                  tipo: 'despesa_rejeitada_gestor',
                  titulo: 'Despesa Rejeitada pelo Gestor',
                  mensagem: `CI ${despesa.numeroCi} - ${input.justificativa}`,
                  despesaId: input.despesaId,
                }).catch(err => console.error('Erro ao criar notificação in-app:', err));
              }
              
              if (criador && criador.email) {
                const emailHtml = buildDespesaEmailTemplate({
                  titulo: 'Despesa Rejeitada pelo Gestor',
                  mensagem: `Sua despesa CI ${despesa.numeroCi} foi rejeitada pelo Gestor. Por favor, revise e corrija conforme a justificativa.`,
                  numeroCi: despesa.numeroCi,
                  fornecedor: fornecedor?.nome || 'N/A',
                  valor: valorFormatado,
                  tipoDespesa: despesa.tipoDespesa === 'operacional' ? 'Operacional' : 'Administrativa',
                  justificativa: input.justificativa,
                  linkSistema: process.env.VITE_APP_URL || 'https://superaevents-axwmvybc.manus.space/despesas'
                });
                
                await sendEmail({
                  to: criador.email,
                  subject: `Despesa Rejeitada - CI ${despesa.numeroCi}`,
                  html: emailHtml
                }).catch(err => console.error('Erro ao enviar e-mail para criador:', err));
              }
            }
          }
        }
        
        return { success };
      }),

    // Liquidar despesa
    liquidar: protectedProcedure
      .input(z.object({
        despesaId: z.number(),
        dataLiquidacao: z.date(),
        comprovantes: z.array(z.object({
          nomeArquivo: z.string(),
          fileBase64: z.string(),
          contentType: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Upload de múltiplos comprovantes para S3
        const comprovantesUrls: string[] = [];
        
        if (input.comprovantes && input.comprovantes.length > 0) {
          for (const comprovante of input.comprovantes) {
            const buffer = Buffer.from(comprovante.fileBase64, 'base64');
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const extension = comprovante.nomeArquivo.split('.').pop() || 'file';
            const fileKey = `despesas/${input.despesaId}/liquidacao/${timestamp}-${randomSuffix}.${extension}`;
            
            const { url } = await storagePut(fileKey, buffer, comprovante.contentType);
            comprovantesUrls.push(url);
            
            // Salvar cada anexo no banco
            await db.createAnexoDespesaV2({
              despesaId: input.despesaId,
              tipoAnexo: 'comprovante_liquidacao',
              nomeArquivo: comprovante.nomeArquivo,
              urlArquivo: url,
            });
          }
        }
        
        const success = await db.liquidarDespesa(
          input.despesaId,
          input.dataLiquidacao,
          comprovantesUrls.length > 0 ? comprovantesUrls[0] : null, // Mantém compatibilidade com campo único
          ctx.user?.id || 0,
          ctx.user?.name || 'Sistema'
        );
        
        return { success, comprovantesUrls };
      }),

    // Upload de arquivo para S3 e salvar anexo
    uploadAnexo: protectedProcedure
      .input(z.object({
        despesaId: z.number(),
        tipoAnexo: z.enum(['comprovante_fiscal', 'documento', 'comprovante_liquidacao']),
        nomeArquivo: z.string(),
        fileBase64: z.string(),
        contentType: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Converter base64 para buffer
        const buffer = Buffer.from(input.fileBase64, 'base64');
        
        // Gerar nome único para o arquivo
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const extension = input.nomeArquivo.split('.').pop() || 'file';
        const fileKey = `despesas/${input.despesaId}/${input.tipoAnexo}/${timestamp}-${randomSuffix}.${extension}`;
        
        // Upload para S3
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        
        // Salvar referência no banco
        const id = await db.createAnexoDespesaV2({
          despesaId: input.despesaId,
          tipoAnexo: input.tipoAnexo,
          nomeArquivo: input.nomeArquivo,
          urlArquivo: url,
        });
        
        return { success: true, id, url };
      }),

    // Adicionar anexo (com URL já existente)
    addAnexo: protectedProcedure
      .input(z.object({
        despesaId: z.number(),
        tipoAnexo: z.enum(['comprovante_fiscal', 'documento', 'comprovante_liquidacao']),
        nomeArquivo: z.string(),
        urlArquivo: z.string(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createAnexoDespesaV2(input);
        return { success: true, id };
      }),

    // Listar anexos
    listAnexos: protectedProcedure
      .input(z.object({ despesaId: z.number() }))
      .query(async ({ input }) => {
        return db.listAnexosDespesaV2(input.despesaId);
      }),

    // Deletar anexo
    deleteAnexo: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAnexoDespesaV2(input.id);
        return { success: true };
      }),

    // Listar histórico
    listHistorico: protectedProcedure
      .input(z.object({ despesaId: z.number() }))
      .query(async ({ input }) => {
        return db.listHistoricoDespesaV2(input.despesaId);
      }),

    // Buscar turmas vinculadas
    getTurmas: protectedProcedure
      .input(z.object({ despesaId: z.number() }))
      .query(async ({ input }) => {
        return db.getTurmasDespesaV2(input.despesaId);
      }),

    // Buscar datas de realização
    getDatas: protectedProcedure
      .input(z.object({ despesaId: z.number() }))
      .query(async ({ input }) => {
        return db.getDatasDespesaV2(input.despesaId);
      }),

    // Deletar despesa
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteDespesaV2(input.id);
        return { success };
      }),
  }),

  // ==================== REUNIÕES ATENDIMENTO ====================
  reunioes: router({
    list: protectedProcedure.query(async () => {
      const reunioes = await db.getAllReunioes();
      return reunioes.map(r => ({
        ...r,
        data: r.data instanceof Date ? r.data.toISOString().split('T')[0] : r.data,
        dataResumo: r.dataResumo instanceof Date ? r.dataResumo.toISOString().split('T')[0] : r.dataResumo,
        dataBriefing: r.dataBriefing instanceof Date ? r.dataBriefing.toISOString().split('T')[0] : r.dataBriefing,
      }));
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getReuniaoById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        turmaId: z.number(),
        data: z.string(), // YYYY-MM-DD
        horario: z.string(), // HH:MM
        tiposEvento: z.array(z.number()), // IDs dos tipos de evento
        tipoReuniao: z.enum(["Presencial", "Online"]),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createReuniao(input);
        return { id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        quantidadeReunioes: z.number().optional(),
        dataResumo: z.string().optional(), // YYYY-MM-DD
        alinhamento: z.boolean().optional(),
        dataBriefing: z.string().optional(), // YYYY-MM-DD
      }))
      .mutation(async ({ input }) => {
        const success = await db.updateReuniao(input.id, input);
        return { success };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteReuniao(input.id);
        return { success };
      }),
  }),

  // ==================== BECAS ====================
  becas: router({
    listByTurma: protectedProcedure
      .input(z.object({ turmaId: z.number() }))
      .query(async ({ input }) => {
        const dbBecas = await import("./db_becas");
        return dbBecas.getFormandosComBecasByTurma(input.turmaId);
      }),
    
    updateBecaEvento: protectedProcedure
      .input(z.object({
        formandoId: z.number(),
        becaEvento: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        const dbBecas = await import("./db_becas");
        const success = await dbBecas.updateBecaEvento(input.formandoId, input.becaEvento);
        return { success };
      }),
  }),

  // ==================== PERMISSÕES ====================
  permissoes: router({
    listAll: adminProcedure.query(async () => {
      // Retorna TODAS as permissões de TODOS os tipos de usuário (para matriz de configurações)
      const dbPermissoes = await import("./db_permissoes");
      return dbPermissoes.listPermissoes();
    }),
    
    list: protectedProcedure.query(async ({ ctx }) => {
      const dbPermissoes = await import("./db_permissoes");
      
      // PRIORIDADE 1: Se o usuário tem tipoUsuarioId configurado, usar as permissões do tipo
      let roleToUse: string = ctx.user.role;
      if (ctx.user.tipoUsuarioId) {
        const tipoUsuario = await db.getTipoUsuarioById(ctx.user.tipoUsuarioId);
        if (tipoUsuario) {
          roleToUse = tipoUsuario.nome;
        }
      }
      
      // Retorna permissões do role ou tipo de usuário
      const permissoes = await dbPermissoes.listPermissoesByRole(roleToUse);
      return permissoes;
    }),
    
    listByRole: adminProcedure
      .input(z.object({ role: z.string() }))
      .query(async ({ input }) => {
        const dbPermissoes = await import("./db_permissoes");
        return dbPermissoes.listPermissoesByRole(input.role);
      }),
    
    create: adminProcedure
      .input(z.object({
        role: z.string().min(1),
        secao: z.string(),
        visualizar: z.boolean(),
        inserir: z.boolean(),
        excluir: z.boolean(),
        tipoUsuarioId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        console.log('[DEBUG] permissoes.create - input recebido:', JSON.stringify(input, null, 2));
        const dbPermissoes = await import("./db_permissoes");
        try {
          const result = await dbPermissoes.createPermissao(input);
          console.log('[DEBUG] permissoes.create - sucesso! ID:', result);
          return { success: true, id: result };
        } catch (error: any) {
          console.error('[DEBUG] permissoes.create - erro:', error.message);
          console.error('[DEBUG] permissoes.create - stack:', error.stack);
          throw error;
        }
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        visualizar: z.boolean().optional(),
        inserir: z.boolean().optional(),
        excluir: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbPermissoes = await import("./db_permissoes");
        await dbPermissoes.updatePermissao(input.id, input);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbPermissoes = await import("./db_permissoes");
        await dbPermissoes.deletePermissao(input.id);
        return { success: true };
      }),
  }),

  // ==================== USUÁRIOS - PERMISSÕES ====================
  usuariosPermissoes: router({
    list: adminProcedure.query(async () => {
      const dbPermissoes = await import("./db_permissoes");
      return dbPermissoes.listUsuarios();
    }),
    
    create: adminProcedure
      .input(z.object({
        openId: z.string(),
        name: z.string(),
        email: z.string().email(),
        tipoUsuarioId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbPermissoes = await import("./db_permissoes");
        const userId = await dbPermissoes.createUsuario(input);
        return { success: true, userId };
      }),
    
    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const dbPermissoes = await import("./db_permissoes");
        await dbPermissoes.updateUsuarioRole(input.userId, input.role);
        return { success: true };
      }),
    
    updateStatus: adminProcedure
      .input(z.object({
        userId: z.number(),
        status: z.enum(["aprovado", "pendente", "rejeitado"]),
      }))
      .mutation(async ({ input }) => {
        const dbPermissoes = await import("./db_permissoes");
        await dbPermissoes.updateUsuarioStatus(input.userId, input.status);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        const dbPermissoes = await import("./db_permissoes");
        await dbPermissoes.deleteUsuario(input.id);
        return { success: true };
      }),
  }),

  // ==================== PERMISSÕES RELATÓRIOS ====================
  permissoesRelatorios: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const dbPermissoesRelatorios = await import("./db_permissoes_relatorios");
      // Se é admin, retorna todas as permissões
      if (ctx.user.role === 'administrador') {
        return dbPermissoesRelatorios.listPermissoesRelatorios();
      }
      
      // Se o usuário tem tipoUsuarioId, buscar o nome do tipo de usuário
      let roleToUse: string = ctx.user.role;
      if (ctx.user.tipoUsuarioId) {
        const tipoUsuario = await db.getTipoUsuarioById(ctx.user.tipoUsuarioId);
        if (tipoUsuario) {
          roleToUse = tipoUsuario.nome;
        }
      }
      
      // Retorna permissões do role ou tipo de usuário
      return dbPermissoesRelatorios.listPermissoesRelatoriosByRole(roleToUse);
    }),
    
    listByRole: adminProcedure
      .input(z.object({ role: z.string() }))
      .query(async ({ input }) => {
        const dbPermissoesRelatorios = await import("./db_permissoes_relatorios");
        return dbPermissoesRelatorios.listPermissoesRelatoriosByRole(input.role);
      }),
    
    create: adminProcedure
      .input(z.object({
        role: z.string().min(1),
        aba: z.enum(["despesas", "emissao_nf", "servicos_make_cabelo", "execucao"]),
        visualizar: z.boolean(),
        inserir: z.boolean(),
        excluir: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const dbPermissoesRelatorios = await import("./db_permissoes_relatorios");
        const result = await dbPermissoesRelatorios.createPermissaoRelatorio(input);
        return { success: true, id: result };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        visualizar: z.boolean().optional(),
        inserir: z.boolean().optional(),
        excluir: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbPermissoesRelatorios = await import("./db_permissoes_relatorios");
        await dbPermissoesRelatorios.updatePermissaoRelatorio(input.id, input);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbPermissoesRelatorios = await import("./db_permissoes_relatorios");
        await dbPermissoesRelatorios.deletePermissaoRelatorio(input.id);
        return { success: true };
      }),
  }),

  // ==================== PERMISSÕES CONFIGURAÇÕES ====================
  permissoesConfiguracoes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Se é admin, retorna todas as permissões de todos os roles
      if (ctx.user.role === 'administrador') {
        return db.getAllPermissoesConfiguracoes();
      }
      
      // Se o usuário tem tipoUsuarioId, buscar o nome do tipo de usuário
      let roleToUse: string = ctx.user.role;
      if (ctx.user.tipoUsuarioId) {
        const tipoUsuario = await db.getTipoUsuarioById(ctx.user.tipoUsuarioId);
        if (tipoUsuario) {
          roleToUse = tipoUsuario.nome;
        }
      }
      
      // Retorna permissões do role ou tipo de usuário
      return db.getPermissoesConfiguracoesByRole(roleToUse);
    }),
    
    listByRole: adminProcedure
      .input(z.object({ role: z.string() }))
      .query(async ({ input }) => {
        return db.getPermissoesConfiguracoesByRole(input.role);
      }),
    
    upsert: adminProcedure
      .input(z.object({
        role: z.string().min(1),
        aba: z.enum(["instituicoes", "cursos", "cidades", "locais", "tipos_evento", "tipos_servico", "fornecedores", "tabela_preco", "taxas_cartao", "produtos", "maquiagem"]),
        visualizar: z.boolean(),
        inserir: z.boolean(),
        excluir: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        return db.upsertPermissaoConfiguracao(input);
      }),
  }),

  // ==================== HISTÓRICO DE OBSERVAÇÕES ====================
  historicoObservacoes: router({
    list: protectedProcedure
      .input(z.object({
        eventoId: z.number().optional(),
        userId: z.number().optional(),
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
      }))
      .query(async ({ input }) => {
        return db.listHistoricoObservacoes(input);
      }),
  }),

  // ==================== AUDITORIA ====================
  auditoria: router({
    list: protectedProcedure
      .input(z.object({
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
        usuario: z.string().optional(),
        tipo: z.enum(["turma", "evento", "abordagem", "execucao"]).optional(),
        busca: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const dbAuditoria = await import("./db_auditoria");
        return dbAuditoria.listObservacoesConsolidadas(input);
      }),
  }),

  // ==================== NOTIFICAÇÕES ====================
  notificacoes: router({
    // Listar notificações do usuário logado
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const dbNotificacoes = await import("./db-notificacoes");
        return dbNotificacoes.getNotificacoesByUserId(ctx.user.id, input.limit);
      }),
    
    // Contar notificações não lidas
    countNaoLidas: protectedProcedure
      .query(async ({ ctx }) => {
        const dbNotificacoes = await import("./db-notificacoes");
        return dbNotificacoes.countNotificacoesNaoLidas(ctx.user.id);
      }),
    
    // Marcar como lida
    marcarLida: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbNotificacoes = await import("./db-notificacoes");
        return dbNotificacoes.marcarComoLida(input.id);
      }),
    
    // Marcar todas como lidas
    marcarTodasLidas: protectedProcedure
      .mutation(async ({ ctx }) => {
        const dbNotificacoes = await import("./db-notificacoes");
        return dbNotificacoes.marcarTodasComoLidas(ctx.user.id);
      }),
    
    // Deletar notificação
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbNotificacoes = await import("./db-notificacoes");
        return dbNotificacoes.deleteNotificacao(input.id);
      }),
  }),

  // ==================== FECHAMENTO MENSAL ====================
  fechamentoMensal: router({
    // Buscar dados do sistema para preencher automaticamente
    getDadosSistema: protectedProcedure
      .input(z.object({
        mes: z.number().min(1).max(12),
        ano: z.number()
      }))
      .query(async ({ input }) => {
        const dados = await db.getDadosSistemaFechamento(input.mes, input.ano);
        const valorBruto = await db.getValorBrutoVendasMes(input.mes, input.ano);
        return { ...dados, valorBruto };
      }),

    // Processar extrato (upload e processamento)
    processarExtrato: protectedProcedure
      .input(z.object({
        tipo: z.enum(['itau_entrada_cartoes', 'itau_entrada_pix', 'itau_entrada_rendimento', 'itau_saida', 'rede']),
        mes: z.number().min(1).max(12),
        ano: z.number(),
        nomeArquivo: z.string(),
        base64: z.string() // Arquivo em base64
      }))
      .mutation(async ({ input }) => {
        console.log(`[ROUTER] Processando extrato tipo: ${input.tipo}, mês: ${input.mes}, ano: ${input.ano}`);
        
        const { processarExtratoItauEntrada, processarExtratoItauSaida, processarExtratoRede } = await import('./fechamento-extratos-helper');
        
        // Converter base64 para buffer
        const buffer = Buffer.from(input.base64, 'base64');
        console.log(`[ROUTER] Buffer criado com tamanho: ${buffer.length} bytes`);
        
        let resultado;
        
        if (input.tipo === 'itau_entrada_cartoes') {
          resultado = processarExtratoItauEntrada(buffer, 'cartoes', input.mes, input.ano);
        } else if (input.tipo === 'itau_entrada_pix') {
          resultado = processarExtratoItauEntrada(buffer, 'pix', input.mes, input.ano);
        } else if (input.tipo === 'itau_entrada_rendimento') {
          resultado = processarExtratoItauEntrada(buffer, 'rendimento', input.mes, input.ano);
        } else if (input.tipo === 'itau_saida') {
          resultado = processarExtratoItauSaida(buffer, input.mes, input.ano);
        } else if (input.tipo === 'rede') {
          resultado = processarExtratoRede(buffer, input.mes, input.ano);
        }
        
        if (!resultado || !resultado.sucesso) {
          console.error(`[ROUTER] Erro no processamento:`, resultado?.erro);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: resultado?.erro || 'Erro ao processar extrato'
          });
        }
        
        console.log(`[ROUTER] Processamento concluído com sucesso. Valor: R$ ${resultado.valor.toFixed(2)}, Detalhes: ${resultado.detalhes?.length || 0} lançamentos`);
        
        return resultado;
      }),

    // Salvar ou atualizar fechamento
    salvar: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        mes: z.number().min(1).max(12),
        ano: z.number(),
        tipo: z.enum(['vendas', 'conta_bancaria']),
        receita: z.object({
          cartoes: z.number(),
          pix: z.number(),
          dinheiro: z.number(),
          rendimento: z.number(),
          plataforma: z.number(),
          pagseguro: z.number(),
          santander: z.number()
        }),
        despesa: z.object({
          tarifaCartao: z.number(),
          outrasTarifas: z.number(),
          impostos: z.number(),
          maquiadora: z.number(),
          operacaoFora: z.number(),
          investimentos: z.number(),
          estorno: z.number(),
          transfSantander: z.number()
        }),
        impostos: z.object({
          iss: z.number(),
          pis: z.number(),
          cofins: z.number(),
          csll: z.number(),
          irpj: z.number()
        }),
        aliquotaIrpjEstimada: z.number(),
        aliquotaIrpjReal: z.number()
      }))
      .mutation(async ({ input, ctx }) => {
        const fechamentoId = await db.upsertFechamentoMensal({
          id: input.id,
          mes: input.mes,
          ano: input.ano,
          tipo: input.tipo,
          receitaCartoes: input.receita.cartoes.toString(),
          receitaPix: input.receita.pix.toString(),
          receitaDinheiro: input.receita.dinheiro.toString(),
          receitaRendimento: input.receita.rendimento.toString(),
          receitaPlataforma: input.receita.plataforma.toString(),
          receitaPagseguro: input.receita.pagseguro.toString(),
          receitaSantander: input.receita.santander.toString(),
          despesaTarifaCartao: input.despesa.tarifaCartao.toString(),
          despesaOutrasTarifas: input.despesa.outrasTarifas.toString(),
          despesaImpostos: input.despesa.impostos.toString(),
          despesaMaquiadora: input.despesa.maquiadora.toString(),
          despesaOperacaoFora: input.despesa.operacaoFora.toString(),
          despesaInvestimentos: input.despesa.investimentos.toString(),
          despesaEstorno: input.despesa.estorno.toString(),
          despesaTransfSantander: input.despesa.transfSantander.toString(),
          impostosIss: input.impostos.iss.toString(),
          impostosPis: input.impostos.pis.toString(),
          impostosCofins: input.impostos.cofins.toString(),
          impostosCsll: input.impostos.csll.toString(),
          impostosIrpj: input.impostos.irpj.toString(),
          aliquotaIrpjEstimada: input.aliquotaIrpjEstimada.toString(),
          aliquotaIrpjReal: input.aliquotaIrpjReal.toString(),
          criadoPorId: ctx.user.id,
          criadoPorNome: ctx.user.name || 'Usuário'
        });
        
        // Verificar se é final de trimestre e se há saldo IRPJ
        const isFimTrimestre = [3, 6, 9, 12].includes(input.mes);
        if (isFimTrimestre && input.aliquotaIrpjReal > 0) {
          const valorBruto = await db.getValorBrutoVendasMes(input.mes, input.ano);
          const irpjEstimado = valorBruto * (input.aliquotaIrpjEstimada / 100);
          const irpjReal = valorBruto * (input.aliquotaIrpjReal / 100);
          const saldo = irpjReal - irpjEstimado;
          
          if (saldo > 0) {
            // Criar despesa automática
            await db.criarDespesaSaldoIRPJ(
              input.mes,
              input.ano,
              saldo,
              ctx.user.id,
              ctx.user.name || 'Usuário'
            );
            
            return {
              id: fechamentoId,
              despesaIrpjCriada: true,
              valorDespesa: saldo
            };
          }
        }
        
        return { id: fechamentoId, despesaIrpjCriada: false };
      }),

    // Listar fechamentos
    list: protectedProcedure
      .query(async () => {
        return db.listFechamentosMensais();
      }),

    // Buscar fechamento específico
    get: protectedProcedure
      .input(z.object({
        mes: z.number().min(1).max(12),
        ano: z.number(),
        tipo: z.enum(['vendas', 'conta_bancaria'])
      }))
      .query(async ({ input }) => {
        return db.getFechamentoMensal(input.mes, input.ano, input.tipo);
      }),

    // Buscar fechamento por ID
    getById: protectedProcedure
      .input(z.object({
        id: z.number()
      }))
      .query(async ({ input }) => {
        return db.getFechamentoMensalById(input.id);
      }),

    // Excluir fechamento
    delete: protectedProcedure
      .input(z.object({
        id: z.number()
      }))
      .mutation(async ({ input }) => {
        return db.deleteFechamentoMensal(input.id);
      }),
  }),

  // ==================== PERMISSÕES CERIMONIAIS (ACESSO POR TURMA) ====================
  permissoesCerimoniais: router({
    // Listar usuários do tipo Cerimonial
    listUsuariosCerimoniais: protectedProcedure.query(async () => {
      return db.getUsuariosCerimoniais();
    }),

    // Listar turmas vinculadas a um usuário
    listTurmasUsuario: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getTurmasUsuario(input.userId);
      }),

    // Vincular usuário a turmas (substitui todos os vínculos anteriores)
    vincularTurmas: protectedProcedure
      .input(z.object({
        userId: z.number(),
        turmaIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        return db.vincularUsuarioTurmas(input.userId, input.turmaIds);
      }),

    // Remover vínculo de uma turma específica
    desvincularTurma: protectedProcedure
      .input(z.object({
        userId: z.number(),
        turmaId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return db.desvincularUsuarioTurma(input.userId, input.turmaId);
      }),
  }),

  // ==================== FECHAMENTO DIÁRIO ====================
  fechamentoDiario: fechamentoDiarioRouter,

  // ==================== AUDITORIA FINANCEIRA ====================
  auditoriaFinanceira: router({
    // Buscar dados de auditoria (lançamentos sistema vs banco)
    getLancamentos: protectedProcedure
      .input(z.object({
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
      }))
      .query(async ({ input }) => {
        const [sistema, banco] = await Promise.all([
          db.getLancamentosSistema(input.mes, input.ano),
          db.getLancamentosBanco(input.mes, input.ano),
        ]);

        // Calcular divergências
        const divergencias = {
          cartoes: sistema.cartoes - banco.cartoes,
          pix: sistema.pix - banco.pix,
          dinheiro: sistema.dinheiro - banco.dinheiro,
          total: sistema.total - banco.total,
        };

        return {
          sistema,
          banco,
          divergencias,
          mes: input.mes,
          ano: input.ano,
        };
      }),
  }),

  // ==================== BACKUP ====================
  backup: router({
    // Gerar backup manual
    gerarManual: adminProcedure.mutation(async () => {
      const resultado = await gerarBackup();
      return resultado;
    }),
    
    // Enviar backup de teste por e-mail
    enviarTeste: adminProcedure.mutation(async () => {
      const resultado = await gerarBackup();
      return resultado;
    }),
    
    // Listar logs de backup
    listarLogs: adminProcedure
      .input(z.object({ 
        limit: z.number().min(1).max(100).default(50) 
      }))
      .query(async ({ input }) => {
        return db.getBackupLogs(input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
