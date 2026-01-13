import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Shield, Settings, Plus, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ROLE_LABELS e ROLES agora são dinâmicos, baseados nos tipos de usuário do banco
// Mantidos como fallback para compatibilidade
const ROLE_LABELS_FALLBACK: Record<string, string> = {
  administrador: "Administrador",
  gestor: "Gestor",
  coordenador: "Coordenador",
  cerimonial: "Cerimonial",
  beca: "Beca",
  logistica: "Logística",
  armazenamento: "Armazenamento",
  financeiro: "Financeiro",
  controle: "Controle",
};

const SECOES = [
  { id: "home", nome: "Home" },
  { id: "turmas", nome: "Turmas" },
  { id: "eventos", nome: "Eventos" },
  { id: "abordagem", nome: "Abordagem" },
  { id: "execucao", nome: "Execução" },
  { id: "vendas", nome: "Vendas" },
  { id: "reunioes", nome: "Reuniões" },
  { id: "servicos", nome: "Serviços" },
  { id: "financeiro", nome: "Financeiro" },
  { id: "despesas", nome: "Despesas" },
  { id: "relatorios", nome: "Relatórios" },
  { id: "briefing", nome: "Briefing" },
  { id: "becas", nome: "Becas" },
  { id: "permissoes_cerimoniais", nome: "Permissão Cerimonial" },
  { id: "configuracoes", nome: "Configurações" },
];

const ROLES_FALLBACK = [
  "administrador",
  "gestor",
  "coordenador",
  "cerimonial",
  "beca",
  "logistica",
  "armazenamento",
  "financeiro",
];

const ABAS_RELATORIOS = [
  { id: "despesas", nome: "Despesas" },
  { id: "emissao_nf", nome: "Emissão de Nota Fiscal" },
  { id: "servicos_make_cabelo", nome: "Serviços Make/Cabelo" },
  { id: "execucao", nome: "Execução" },
  { id: "compensacao_bancaria", nome: "Compensação Bancária" },
];

const ABAS_CONFIGURACOES = [
  { id: "instituicoes", nome: "Instituições" },
  { id: "cursos", nome: "Cursos" },
  { id: "cidades", nome: "Cidades" },
  { id: "locais", nome: "Locais" },
  { id: "tipos_evento", nome: "Tipos de Evento" },
  { id: "tipos_servico", nome: "Tipos de Serviço" },
  { id: "fornecedores", nome: "Fornecedores" },
  { id: "tabela_preco", nome: "Tabela de Preço" },
  { id: "taxas_cartao", nome: "Taxas de Cartão" },
  { id: "produtos", nome: "Produtos" },
  { id: "maquiagem", nome: "Maquiagem" },
];

// Componente interno para modal de permissões cerimoniais
function PermissoesCerimoniaisModal({ role }: { role: string }) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedTurmaIds, setSelectedTurmaIds] = useState<number[]>([]);

  // Queries
  const { data: usuariosCerimoniais, isLoading: loadingUsuarios } = trpc.usuariosPermissoes.list.useQuery();
  const { data: todasTurmas, isLoading: loadingTurmas } = trpc.turmas.list.useQuery();
  const { data: turmasUsuario, isLoading: loadingTurmasUsuario } = trpc.permissoesCerimoniais.listTurmasUsuario.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId }
  );

  // Mutation
  const vincularTurmasMutation = trpc.permissoesCerimoniais.vincularTurmas.useMutation({
    onSuccess: () => {
      toast.success("Permissões salvas com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao salvar permissões: ${error.message}`);
    },
  });

  // Filtrar apenas usuários cerimoniais
  const usuariosCerimoniaisFiltrados = useMemo(() => {
    return usuariosCerimoniais?.filter(u => u.role === "cerimonial") || [];
  }, [usuariosCerimoniais]);

  // Atualizar checkboxes quando carregar turmas do usuário
  useEffect(() => {
    if (turmasUsuario) {
      setSelectedTurmaIds(turmasUsuario.map(t => t.turmaId));
    }
  }, [turmasUsuario]);

  // Handler para selecionar usuário
  const handleSelectUsuario = (userId: string) => {
    const id = parseInt(userId);
    setSelectedUserId(id);
    setSelectedTurmaIds([]);
  };

  // Handler para toggle checkbox de turma
  const handleToggleTurma = (turmaId: number, checked: boolean) => {
    if (checked) {
      setSelectedTurmaIds(prev => [...prev, turmaId]);
    } else {
      setSelectedTurmaIds(prev => prev.filter(id => id !== turmaId));
    }
  };

  // Handler para salvar permissões
  const handleSalvar = () => {
    if (!selectedUserId) {
      toast.error("Selecione um usuário primeiro");
      return;
    }

    vincularTurmasMutation.mutate({
      userId: selectedUserId,
      turmaIds: selectedTurmaIds,
    });
  };

  // Formatar exibição da turma
  const formatarTurma = (turma: any) => {
    const cursos = JSON.parse(turma.cursos || "[]");
    const instituicoes = JSON.parse(turma.instituicoes || "[]");
    const anos = JSON.parse(turma.anos || "[]");
    const periodos = JSON.parse(turma.periodos || "[]");
    
    const curso = cursos[0] || "";
    const instituicao = instituicoes[0] || "";
    const ano = anos[0] || "";
    const periodo = periodos[0] || "";
    
    return `${turma.codigo} - ${curso} ${instituicao} ${turma.numeroTurma || ""} ${ano}.${periodo}`.trim();
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Seleção de Usuário */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Usuário Cerimonial
        </Label>
        {loadingUsuarios ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={selectedUserId?.toString() || ""} onValueChange={handleSelectUsuario}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um usuário cerimonial" />
            </SelectTrigger>
            <SelectContent>
              {usuariosCerimoniaisFiltrados.map((usuario) => (
                <SelectItem key={usuario.id} value={usuario.id.toString()}>
                  {usuario.name || usuario.email || `Usuário #${usuario.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Lista de Turmas */}
      {selectedUserId && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">Turmas Autorizadas</Label>
          <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-2">
            {loadingTurmas || loadingTurmasUsuario ? (
              <>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </>
            ) : todasTurmas && todasTurmas.length > 0 ? (
              todasTurmas.map((turma) => (
                <div key={turma.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded">
                  <Checkbox
                    id={`modal-turma-${turma.id}`}
                    checked={selectedTurmaIds.includes(turma.id)}
                    onCheckedChange={(checked) => handleToggleTurma(turma.id, checked as boolean)}
                  />
                  <label
                    htmlFor={`modal-turma-${turma.id}`}
                    className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {formatarTurma(turma)}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                Nenhuma turma cadastrada no sistema
              </p>
            )}
          </div>

          {/* Contador de turmas selecionadas */}
          <p className="text-sm text-slate-600">
            {selectedTurmaIds.length} turma(s) selecionada(s)
          </p>

          {/* Botão Salvar */}
          <Button
            onClick={handleSalvar}
            disabled={vincularTurmasMutation.isPending}
            className="w-full"
          >
            {vincularTurmasMutation.isPending ? "Salvando..." : "Salvar Permissões"}
          </Button>
        </div>
      )}

      {/* Mensagem quando nenhum usuário selecionado */}
      {!selectedUserId && !loadingUsuarios && (
        <div className="text-center py-8 text-slate-500">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Selecione um usuário cerimonial para gerenciar suas permissões</p>
        </div>
      )}
    </div>
  );
}

export default function ConfiguracoesUsuarios() {
  const [activeTab, setActiveTab] = useState<"usuarios" | "permissoes">("usuarios");
  const [modalRelatoriosOpen, setModalRelatoriosOpen] = useState(false);
  const [modalConfiguracoesOpen, setModalConfiguracoesOpen] = useState(false);
  const [modalPermissoesCerimoniaisOpen, setModalPermissoesCerimoniaisOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserTipoUsuarioId, setNewUserTipoUsuarioId] = useState<string>("");

  // Queries
  const { data: tiposUsuario, isLoading: loadingTiposUsuario } = trpc.tiposUsuario.list.useQuery();
  const { data: usuarios, isLoading: loadingUsuarios, refetch: refetchUsuarios } = trpc.usuariosPermissoes.list.useQuery();
  const { data: permissoes, isLoading: loadingPermissoes, refetch: refetchPermissoes } = trpc.permissoes.listAll.useQuery();
  
  // Função para normalizar string removendo acentos
  const normalizeSlug = (str: string) => {
    return str
      .normalize('NFD') // Decompor caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover marcas diacríticas
      .toLowerCase()
      .replace(/\s+/g, '_');
  };

  // Criar ROLES dinâmicos baseados nos tipos de usuário cadastrados
  const ROLES = useMemo(() => {
    if (!tiposUsuario || tiposUsuario.length === 0) return ROLES_FALLBACK;
    // Usar os slugs (lowercase com underscores, sem acentos) dos tipos de usuário ativos como roles
    return tiposUsuario
      .filter((tipo: any) => tipo.ativo)
      .map((tipo: any) => normalizeSlug(tipo.nome))
      .sort();
  }, [tiposUsuario]);
  
  const ROLE_LABELS = useMemo(() => {
    if (!ROLES || ROLES.length === 0) return ROLE_LABELS_FALLBACK;
    const labels: Record<string, string> = {};
    
    ROLES.forEach((role: string) => {
      // Tentar encontrar o tipo de usuário correspondente
      const tipoEncontrado = tiposUsuario?.find((tipo: any) => {
        const tipoSlug = normalizeSlug(tipo.nome);
        return role === tipoSlug || role.startsWith(tipoSlug + '_');
      });
      
      if (tipoEncontrado) {
        // Se encontrou o tipo, usar o nome do tipo
        const baseNome = tipoEncontrado.nome;
        // Se o role tem sufixo numérico (ex: beca_1), adicionar ao label
        const match = role.match(/_([0-9]+)$/);
        labels[role] = match ? `${baseNome} ${match[1]}` : baseNome;
      } else {
        // Fallback: capitalizar o role
        labels[role] = role.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
    });
    
    return labels;
  }, [ROLES, tiposUsuario]);
  const { data: permissoesRelatorios, isLoading: loadingPermissoesRelatorios, refetch: refetchPermissoesRelatorios } = trpc.permissoesRelatorios.list.useQuery();
  const { data: permissoesConfiguracoes, isLoading: loadingPermissoesConfiguracoes, refetch: refetchPermissoesConfiguracoes } = trpc.permissoesConfiguracoes.list.useQuery();

  // Utils for cache invalidation
  const utils = trpc.useUtils();

  // Mutations
  const updateRoleMutation = trpc.usuariosPermissoes.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Tipo de usuário atualizado!");
      refetchUsuarios();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const updateTipoUsuarioMutation = trpc.usuarios.updateTipoUsuario.useMutation({
    onSuccess: () => {
      toast.success("Tipo de usuário atualizado!");
      refetchUsuarios();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const updateStatusMutation = trpc.usuariosPermissoes.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status do usuário atualizado!");
      refetchUsuarios();
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const createUserMutation = trpc.usuariosPermissoes.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário adicionado com sucesso!");
      refetchUsuarios();
      setAddUserModalOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserTipoUsuarioId("");
    },
    onError: (e) => toast.error(`Erro ao adicionar usuário: ${e.message}`),
  });

  const createPermissaoMutation = trpc.permissoes.create.useMutation({
    onSuccess: () => {
      refetchPermissoes();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const updatePermissaoMutation = trpc.permissoes.update.useMutation({
    onSuccess: () => {
      toast.success("Permissão atualizada!");
      refetchPermissoes();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const createPermissaoRelatorioMutation = trpc.permissoesRelatorios.create.useMutation({
    onSuccess: () => {
      refetchPermissoesRelatorios();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const updatePermissaoRelatorioMutation = trpc.permissoesRelatorios.update.useMutation({
    onSuccess: () => {
      toast.success("Permissão de relatório atualizada!");
      refetchPermissoesRelatorios();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const upsertPermissaoConfiguracaoMutation = trpc.permissoesConfiguracoes.upsert.useMutation({
    onSuccess: () => {
      toast.success("Permissão de configuração atualizada!");
      utils.permissoesConfiguracoes.list.invalidate();
      utils.permissoesConfiguracoes.listByRole.invalidate();
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const deleteUserMutation = trpc.usuariosPermissoes.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário excluído com sucesso!");
      refetchUsuarios();
    },
    onError: (e: any) => toast.error(`Erro ao excluir usuário: ${e.message}`),
  });

  const createTipoUsuarioMutation = trpc.tiposUsuario.create.useMutation({
    onSuccess: () => {
      toast.success("Tipo de usuário criado com sucesso!");
      utils.tiposUsuario.list.invalidate();
    },
    onError: (e: any) => toast.error(`Erro ao criar tipo de usuário: ${e.message}`),
  });

  // Funções auxiliares
  const getPermissao = (roleSlug: string, secao: string) => {
    // Buscar permissão diretamente pelo role (slug) e secao
    // A constraint do banco é UNIQUE(role, secao), então devemos buscar por role
    return permissoes?.find((p: any) => p.role === roleSlug && p.secao === secao);
  };

  const handlePermissaoChange = async (
    roleSlug: string,
    secao: string,
    campo: "visualizar" | "inserir" | "excluir",
    valor: boolean
  ) => {
    try {
      const permissao = getPermissao(roleSlug, secao);

      if (permissao) {
        // Atualizar permissão existente
        await updatePermissaoMutation.mutateAsync({
          id: permissao.id,
          [campo]: valor,
        });
      } else {
        // Buscar o tipoUsuarioId correto baseado no role slug
        const tipoUsuario = tiposUsuario?.find((t: any) => {
          const tipoSlug = normalizeSlug(t.nome);
          return tipoSlug === roleSlug;
        });

        if (!tipoUsuario) {
          toast.error(`Tipo de usuário não encontrado para ${roleSlug}`);
          return;
        }

        // Criar nova permissão usando o slug e o tipoUsuarioId correto
        await createPermissaoMutation.mutateAsync({
          role: roleSlug as any,
          secao,
          visualizar: campo === "visualizar" ? valor : false,
          inserir: campo === "inserir" ? valor : false,
          excluir: campo === "excluir" ? valor : false,
          tipoUsuarioId: tipoUsuario.id,
        });
      }
    } catch (error: any) {
      console.error('[handlePermissaoChange] Erro:', error);
      toast.error(`Erro ao salvar permissão: ${error.message}`);
    }
  };

  const handleRoleChange = (userId: number, newRole: string) => {
    updateRoleMutation.mutate({
      userId,
      role: newRole as any,
    });
  };

  const handleStatusChange = (userId: number, newStatus: string) => {
    updateStatusMutation.mutate({
      userId,
      status: newStatus as any,
    });
  };

  const handleAddUser = () => {
    if (!newUserName || !newUserEmail) {
      toast.error("Preencha nome e email");
      return;
    }
    if (!newUserTipoUsuarioId) {
      toast.error("Selecione o tipo de usuário");
      return;
    }
    // Gerar openId temporário baseado no email
    const openId = `temp_${newUserEmail.replace("@", "_").replace(".", "_")}_${Date.now()}`;
    createUserMutation.mutate({
      openId,
      name: newUserName,
      email: newUserEmail,
      tipoUsuarioId: parseInt(newUserTipoUsuarioId),
    });
  };

  const getPermissaoRelatorio = (role: string, aba: string) => {
    return permissoesRelatorios?.find((p: any) => p.role === role && p.aba === aba);
  };

  const handlePermissaoRelatorioChange = async (
    role: string,
    aba: string,
    campo: "visualizar" | "inserir" | "excluir",
    valor: boolean
  ) => {
    const permissao = getPermissaoRelatorio(role, aba);

    if (permissao) {
      // Atualizar permissão existente
      await updatePermissaoRelatorioMutation.mutateAsync({
        id: permissao.id,
        [campo]: valor,
      });
    } else {
      // Criar nova permissão
      await createPermissaoRelatorioMutation.mutateAsync({
        role: role as any,
        aba: aba as any,
        visualizar: campo === "visualizar" ? valor : false,
        inserir: campo === "inserir" ? valor : false,
        excluir: campo === "excluir" ? valor : false,
      });
    }
  };

  const getPermissaoConfiguracao = (role: string, aba: string) => {
    // Buscar o tipoUsuarioId correspondente ao role (slug normalizado)
    const tipoUsuario = tiposUsuario?.find((t: any) => normalizeSlug(t.nome) === role);
    if (!tipoUsuario) return undefined;
    
    // Buscar permissão pelo tipoUsuarioId e aba
    return permissoesConfiguracoes?.find((p: any) => p.tipoUsuarioId === tipoUsuario.id && p.aba === aba);
  };

  const handlePermissaoConfiguracaoChange = async (
    role: string,
    aba: string,
    campo: "visualizar" | "inserir" | "excluir",
    valor: boolean
  ) => {
    const permissao = getPermissaoConfiguracao(role, aba);
    const currentValues = permissao || { visualizar: false, inserir: false, excluir: false };

    // Sempre usar upsert (cria ou atualiza)
    await upsertPermissaoConfiguracaoMutation.mutateAsync({
      role: role as any,
      aba: aba as any,
      visualizar: campo === "visualizar" ? valor : currentValues.visualizar,
      inserir: campo === "inserir" ? valor : currentValues.inserir,
      excluir: campo === "excluir" ? valor : currentValues.excluir,
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gerenciamento de Usuários e Permissões</h1>
        <p className="text-muted-foreground mt-2">
          Configure os tipos de usuários e suas permissões de acesso ao sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("usuarios")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "usuarios"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Users className="inline-block w-4 h-4 mr-2" />
          Usuários
        </button>
        <button
          onClick={() => setActiveTab("permissoes")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "permissoes"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Shield className="inline-block w-4 h-4 mr-2" />
          Permissões
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      {activeTab === "usuarios" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Gerenciar Usuários</CardTitle>
                <CardDescription>
                  Altere o tipo/função de cada usuário cadastrado no sistema
                </CardDescription>
              </div>
              <Dialog open={addUserModalOpen} onOpenChange={setAddUserModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Adicionar Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                    <DialogDescription>
                      Preencha os dados do colaborador que terá acesso ao sistema
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input
                        id="name"
                        placeholder="Ex: João Silva"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Ex: joao@email.com"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        O colaborador deverá usar este email para fazer login no sistema
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="role">Tipo de Usuário</Label>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs">
                              <Plus className="w-3 h-3 mr-1" />
                              Novo Tipo
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Novo Tipo de Usuário</DialogTitle>
                              <DialogDescription>
                                Crie um novo tipo de usuário para o sistema
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              const nome = (formData.get("nome") as string).trim();
                              if (!nome) {
                                toast.error("Digite um nome para o tipo de usuário");
                                return;
                              }
                              // Verificar duplicado
                              const duplicado = tiposUsuario?.some((t: any) => 
                                t.nome.toLowerCase() === nome.toLowerCase()
                              );
                              if (duplicado) {
                                toast.error("Já existe um tipo de usuário com este nome!");
                                return;
                              }
                              // Criar tipo de usuário
                              createTipoUsuarioMutation.mutate({ nome });
                            }} className="space-y-4">
                              <div className="space-y-2">
                                <Label>Nome do Tipo *</Label>
                                <Input 
                                  name="nome" 
                                  required 
                                  placeholder="Ex: Vendedor" 
                                />
                              </div>
                              <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={(e) => {
                                  const dialog = (e.target as HTMLElement).closest('[role="dialog"]');
                                  if (dialog) {
                                    const closeButton = dialog.querySelector('[data-state]');
                                    if (closeButton) (closeButton as HTMLElement).click();
                                  }
                                }}>Cancelar</Button>
                                <Button type="submit" className="bg-gradient-to-r from-indigo-500 to-purple-600">
                                  Cadastrar
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <Select value={newUserTipoUsuarioId} onValueChange={setNewUserTipoUsuarioId}>
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposUsuario?.filter((t: any) => t.nome !== "Administrador").map((tipo: any) => (
                            <SelectItem key={tipo.id} value={tipo.id.toString()}>
                              {tipo.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddUserModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddUser} disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? "Adicionando..." : "Adicionar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsuarios ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tipo de Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios?.map((usuario: any) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.name || "Sem nome"}</TableCell>
                      <TableCell>{usuario.email || "-"}</TableCell>
                      <TableCell>
                        <Select
                          value={usuario.tipoUsuarioId?.toString() || ""}
                          onValueChange={(value) => updateTipoUsuarioMutation.mutate({
                            userId: usuario.id,
                            tipoUsuarioId: value ? parseInt(value) : null,
                          })}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposUsuario?.map((tipo: any) => (
                              <SelectItem key={tipo.id} value={tipo.id.toString()}>
                                {tipo.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={usuario.status}
                          onValueChange={(value) => handleStatusChange(usuario.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aprovado">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Aprovado
                              </span>
                            </SelectItem>
                            <SelectItem value="pendente">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                Pendente
                              </span>
                            </SelectItem>
                            <SelectItem value="rejeitado">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                Rejeitado
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {usuario.lastSignedIn
                          ? new Date(usuario.lastSignedIn).toLocaleString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja excluir o usuário ${usuario.name || usuario.email}?`)) {
                              deleteUserMutation.mutate({ id: usuario.id });
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "permissoes" && (
        <Card>
          <CardHeader>
            <CardTitle>Matriz de Permissões</CardTitle>
            <CardDescription>
              Configure as permissões de cada tipo de usuário por seção do sistema. V = Visualizar | I = Inserir | E = Excluir
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPermissoes ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Tipo de Usuário</TableHead>
                      {SECOES.map((secao) => (
                        <TableHead key={secao.id} className="text-center min-w-[120px]">
                          {secao.nome}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ROLES.map((role) => (
                      <TableRow key={role}>
                        <TableCell className="font-medium">{ROLE_LABELS[role]}</TableCell>
                        {SECOES.map((secao) => {
                          const permissao = getPermissao(role, secao.id);
                          const isAdmin = role === "administrador";

                          // Se for a seção de relatórios, mostrar botão de detalhes
                          if (secao.id === "relatorios") {
                            return (
                              <TableCell key={secao.id} className="text-center">
                                <Dialog open={modalRelatoriosOpen && selectedRole === role} onOpenChange={(open) => {
                                  setModalRelatoriosOpen(open);
                                  if (!open) setSelectedRole(null);
                                }}>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedRole(role);
                                        setModalRelatoriosOpen(true);
                                      }}
                                    >
                                      <Settings className="h-4 w-4 mr-2" />
                                      Detalhes
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Permissões de Relatórios - {ROLE_LABELS[role]}</DialogTitle>
                                      <DialogDescription>
                                        Configure as permissões para cada aba de relatórios
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                      {ABAS_RELATORIOS.map((aba) => {
                                        const permissaoAba = getPermissaoRelatorio(role, aba.id);
                                        const isAdmin = role === "administrador";

                                        return (
                                          <div key={aba.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <span className="font-medium">{aba.nome}</span>
                                            <div className="flex items-center gap-4">
                                              {/* Visualizar */}
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={isAdmin || permissaoAba?.visualizar || false}
                                                  disabled={isAdmin}
                                                  onCheckedChange={(checked) =>
                                                    handlePermissaoRelatorioChange(role, aba.id, "visualizar", checked as boolean)
                                                  }
                                                />
                                                <span className="text-sm text-muted-foreground">Visualizar</span>
                                              </div>

                                              {/* Inserir */}
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={isAdmin || permissaoAba?.inserir || false}
                                                  disabled={isAdmin}
                                                  onCheckedChange={(checked) =>
                                                    handlePermissaoRelatorioChange(role, aba.id, "inserir", checked as boolean)
                                                  }
                                                />
                                                <span className="text-sm text-muted-foreground">Inserir</span>
                                              </div>

                                              {/* Excluir */}
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={isAdmin || permissaoAba?.excluir || false}
                                                  disabled={isAdmin}
                                                  onCheckedChange={(checked) =>
                                                    handlePermissaoRelatorioChange(role, aba.id, "excluir", checked as boolean)
                                                  }
                                                />
                                                <span className="text-sm text-muted-foreground">Excluir</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            );
                          }

                          // Botão Detalhes para Permissões Cerimoniais
                          if (secao.id === "permissoes_cerimoniais") {
                            return (
                              <TableCell key={secao.id} className="text-center">
                                <div className="flex flex-col items-center gap-2 relative z-10">
                                  {/* Checkboxes V/I/E */}
                                  <div className="flex items-center justify-center gap-3 pointer-events-auto">
                                    {/* Visualizar */}
                                    <div className="flex items-center gap-1">
                                      <Checkbox
                                        checked={isAdmin || permissao?.visualizar || false}
                                        disabled={isAdmin}
                                        onCheckedChange={(checked) =>
                                          handlePermissaoChange(role, secao.id, "visualizar", checked as boolean)
                                        }
                                      />
                                      <span className="text-xs text-muted-foreground">V</span>
                                    </div>

                                    {/* Inserir */}
                                    <div className="flex items-center gap-1">
                                      <Checkbox
                                        checked={isAdmin || permissao?.inserir || false}
                                        disabled={isAdmin}
                                        onCheckedChange={(checked) =>
                                          handlePermissaoChange(role, secao.id, "inserir", checked as boolean)
                                        }
                                      />
                                      <span className="text-xs text-muted-foreground">I</span>
                                    </div>

                                    {/* Excluir */}
                                    <div className="flex items-center gap-1">
                                      <Checkbox
                                        checked={isAdmin || permissao?.excluir || false}
                                        disabled={isAdmin}
                                        onCheckedChange={(checked) =>
                                          handlePermissaoChange(role, secao.id, "excluir", checked as boolean)
                                        }
                                      />
                                      <span className="text-xs text-muted-foreground">E</span>
                                    </div>
                                  </div>

                                  {/* Botão Detalhes */}
                                  <Dialog open={modalPermissoesCerimoniaisOpen && selectedRole === role} onOpenChange={(open) => {
                                    setModalPermissoesCerimoniaisOpen(open);
                                    if (!open) setSelectedRole(null);
                                  }}>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedRole(role);
                                          setModalPermissoesCerimoniaisOpen(true);
                                        }}
                                      >
                                        <Settings className="h-4 w-4 mr-2" />
                                        Detalhes
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle>Gerenciar Permissões Cerimoniais - {ROLE_LABELS[role]}</DialogTitle>
                                        <DialogDescription>
                                          Configure quais turmas cada usuário Cerimonial pode acessar
                                        </DialogDescription>
                                      </DialogHeader>
                                      <PermissoesCerimoniaisModal role={role} />
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </TableCell>
                            );
                          }

                          // Botão Detalhes para Configurações
                          if (secao.id === "configuracoes") {
                            return (
                              <TableCell key={secao.id} className="text-center">
                                <Dialog open={modalConfiguracoesOpen && selectedRole === role} onOpenChange={(open) => {
                                  setModalConfiguracoesOpen(open);
                                  if (!open) setSelectedRole(null);
                                }}>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedRole(role);
                                        setModalConfiguracoesOpen(true);
                                      }}
                                    >
                                      <Settings className="h-4 w-4 mr-2" />
                                      Detalhes
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Permissões de Configurações - {ROLE_LABELS[role]}</DialogTitle>
                                      <DialogDescription>
                                        Configure as permissões para cada aba de configurações
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4 max-h-[500px] overflow-y-auto">
                                      {ABAS_CONFIGURACOES.map((aba) => {
                                        const permissaoAba = getPermissaoConfiguracao(role, aba.id);
                                        const isAdmin = role === "administrador";
                                        
                                        // Garantir valores booleanos explícitos
                                        const visualizarChecked = isAdmin ? true : (permissaoAba?.visualizar === true);
                                        const inserirChecked = isAdmin ? true : (permissaoAba?.inserir === true);
                                        const excluirChecked = isAdmin ? true : (permissaoAba?.excluir === true);

                                        return (
                                          <div key={aba.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <span className="font-medium">{aba.nome}</span>
                                            <div className="flex items-center gap-4">
                                              {/* Visualizar */}
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={visualizarChecked}
                                                  disabled={isAdmin}
                                                  onCheckedChange={(checked) =>
                                                    handlePermissaoConfiguracaoChange(role, aba.id, "visualizar", checked as boolean)
                                                  }
                                                />
                                                <span className="text-sm text-muted-foreground">Visualizar</span>
                                              </div>

                                              {/* Inserir */}
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={inserirChecked}
                                                  disabled={isAdmin}
                                                  onCheckedChange={(checked) =>
                                                    handlePermissaoConfiguracaoChange(role, aba.id, "inserir", checked as boolean)
                                                  }
                                                />
                                                <span className="text-sm text-muted-foreground">Inserir</span>
                                              </div>

                                              {/* Excluir */}
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={excluirChecked}
                                                  disabled={isAdmin}
                                                  onCheckedChange={(checked) =>
                                                    handlePermissaoConfiguracaoChange(role, aba.id, "excluir", checked as boolean)
                                                  }
                                                />
                                                <span className="text-sm text-muted-foreground">Excluir</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            );
                          }

                          return (
                            <TableCell key={secao.id} className="text-center">
                              <div className="flex items-center justify-center gap-3">
                                {/* Visualizar */}
                                <div className="flex items-center gap-1">
                                  <Checkbox
                                    checked={isAdmin || permissao?.visualizar || false}
                                    disabled={isAdmin}
                                    onCheckedChange={(checked) =>
                                      handlePermissaoChange(role, secao.id, "visualizar", checked as boolean)
                                    }
                                  />
                                  <span className="text-xs text-muted-foreground">V</span>
                                </div>

                                {/* Inserir */}
                                <div className="flex items-center gap-1">
                                  <Checkbox
                                    checked={isAdmin || permissao?.inserir || false}
                                    disabled={isAdmin}
                                    onCheckedChange={(checked) =>
                                      handlePermissaoChange(role, secao.id, "inserir", checked as boolean)
                                    }
                                  />
                                  <span className="text-xs text-muted-foreground">I</span>
                                </div>

                                {/* Excluir */}
                                <div className="flex items-center gap-1">
                                  <Checkbox
                                    checked={isAdmin || permissao?.excluir || false}
                                    disabled={isAdmin}
                                    onCheckedChange={(checked) =>
                                      handlePermissaoChange(role, secao.id, "excluir", checked as boolean)
                                    }
                                  />
                                  <span className="text-xs text-muted-foreground">E</span>
                                </div>
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
