import { createNotificacao } from "./db-notificacoes";
import { getAllUsers, getAdministradores, getGestores } from "./db-users-helper";

// Notificar todos os usuários
export async function notificarTodosUsuarios(data: {
  tipo: "turma_criada" | "evento_criado" | "evento_editado" | "evento_excluido";
  titulo: string;
  mensagem: string;
  turmaId?: number;
  eventoId?: number;
}) {
  const usuarios = await getAllUsers();
  
  for (const usuario of usuarios) {
    await createNotificacao({
      userId: usuario.id,
      ...data,
    }).catch(err => console.error('Erro ao criar notificação:', err));
  }
}

// Notificar Administradores e Gestores
export async function notificarAdminEGestores(data: {
  tipo: "venda_editada" | "venda_excluida";
  titulo: string;
  mensagem: string;
  vendaId?: number;
}) {
  const administradores = await getAdministradores();
  const gestores = await getGestores();
  const usuarios = [...administradores, ...gestores];
  
  for (const usuario of usuarios) {
    await createNotificacao({
      userId: usuario.id,
      ...data,
    }).catch(err => console.error('Erro ao criar notificação:', err));
  }
}

// Notificar usuários do setor Financeiro
// Nota: No sistema atual, o role "financeiro" pode não existir.
// Por enquanto, notifica apenas administradores até que o role seja criado.
export async function notificarFinanceiro(data: {
  tipo: "lembrete_evento_5dias" | "lembrete_evento_2dias";
  titulo: string;
  mensagem: string;
  eventoId: number;
}) {
  const usuarios = await getAllUsers();
  // Filtrar por role "financeiro" se existir, senão usa administradores
  const financeiros = usuarios.filter(u => u.role === 'financeiro' || u.role === 'administrador');
  
  for (const usuario of financeiros) {
    await createNotificacao({
      userId: usuario.id,
      ...data,
    }).catch(err => console.error('Erro ao criar notificação:', err));
  }
}
