import { useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export type Secao =
  | "home"
  | "turmas"
  | "eventos"
  | "abordagem"
  | "execucao"
  | "vendas"
  | "reunioes"
  | "servicos"
  | "financeiro"
  | "despesas"
  | "relatorios"
  | "briefing"
  | "becas"
  | "configuracoes"
  | "auditoria";

export type AbaRelatorio =
  | "despesas"
  | "emissao_nf"
  | "servicos_make_cabelo"
  | "execucao"
  | "compensacao_bancaria"
  | "observacoes"
  | "fechamentos_mensais";

export type AbaConfiguracao =
  | "instituicoes"
  | "cursos"
  | "cidades"
  | "locais"
  | "tipos_evento"
  | "tipos_servico"
  | "fornecedores"
  | "tabela_preco"
  | "taxas_cartao"
  | "produtos"
  | "maquiagem";

export type TipoPermissao = "visualizar" | "inserir" | "excluir";

interface UsePermissoesReturn {
  // Verificar permissão em uma seção
  temPermissao: (secao: Secao, tipo: TipoPermissao) => boolean;

  // Verificar permissão em uma aba de relatório
  temPermissaoRelatorio: (aba: AbaRelatorio, tipo: TipoPermissao) => boolean;

  // Verificar se pode acessar uma seção (tem pelo menos visualizar)
  podeAcessar: (secao: Secao) => boolean;

  // Verificar se pode acessar uma aba de relatório
  podeAcessarRelatorio: (aba: AbaRelatorio) => boolean;

  // Verificar se tem acesso a pelo menos uma aba de relatório
  temAlgumaAbaRelatorio: () => boolean;

  // Verificar se pode acessar uma aba de configuração
  podeAcessarConfiguracao: (aba: AbaConfiguracao) => boolean;

  // Verificar se tem acesso a pelo menos uma aba de configuração
  temAlgumaAbaConfiguracao: () => boolean;

  // Verificar se é administrador
  isAdmin: boolean;

  // Loading states
  isLoading: boolean;
}

export function usePermissoes(): UsePermissoesReturn {
  const { user } = useAuth();
  
  // Debug temporário
  if (typeof window !== 'undefined' && user) {
    (window as any).DEBUG_USER = user;
    console.log('[DEBUG] user.role:', user.role);
    console.log('[DEBUG] user.tipoUsuarioId:', user.tipoUsuarioId);
  }

  // Buscar permissões gerais
  const { data: permissoes, isLoading: loadingPermissoes } =
    trpc.permissoes.list.useQuery();

  // Buscar permissões de relatórios
  const { data: permissoesRelatorios, isLoading: loadingPermissoesRelatorios } =
    trpc.permissoesRelatorios.list.useQuery();

  // Buscar permissões de configurações
  const { data: permissoesConfiguracoes, isLoading: loadingPermissoesConfiguracoes } =
    trpc.permissoesConfiguracoes.list.useQuery();

  const isAdmin = user?.role === "administrador";
  const isLoading = loadingPermissoes || loadingPermissoesRelatorios || loadingPermissoesConfiguracoes;

  // Debug: log das permissões carregadas
  console.log('[usePermissoes] user:', user);
  console.log('[usePermissoes] isAdmin:', isAdmin);
  console.log('[usePermissoes] permissoes:', permissoes);
  console.log('[usePermissoes] isLoading:', isLoading);

  // Memoizar funções de verificação
  const temPermissao = useMemo(() => {
    return (secao: Secao, tipo: TipoPermissao): boolean => {
      // Administrador tem todas as permissões
      if (isAdmin) return true;

      // Se não tem usuário logado, não tem permissão
      if (!user) return false;

      // Buscar permissão específica
      // Nota: o backend já filtra as permissões pelo role do usuário,
      // então não precisamos filtrar por role novamente
      const permissao = permissoes?.find(
        (p: any) => p.secao === secao
      );

      if (!permissao) return false;

      return permissao[tipo] === true;
    };
  }, [user, permissoes, isAdmin]);

  const temPermissaoRelatorio = useMemo(() => {
    return (aba: AbaRelatorio, tipo: TipoPermissao): boolean => {
      // Administrador tem todas as permissões
      if (isAdmin) return true;

      // Se não tem usuário logado, não tem permissão
      if (!user) return false;

      // Buscar permissão específica da aba de relatório
      // Nota: o backend já filtra as permissões pelo role do usuário,
      // então não precisamos filtrar por role novamente
      const permissao = permissoesRelatorios?.find(
        (p: any) => p.aba === aba
      );

      if (!permissao) return false;

      return permissao[tipo] === true;
    };
  }, [user, permissoesRelatorios, isAdmin]);

  const podeAcessar = useMemo(() => {
    return (secao: Secao): boolean => {
      return temPermissao(secao, "visualizar");
    };
  }, [temPermissao]);

  const podeAcessarRelatorio = useMemo(() => {
    return (aba: AbaRelatorio): boolean => {
      return temPermissaoRelatorio(aba, "visualizar");
    };
  }, [temPermissaoRelatorio]);

  const temAlgumaAbaRelatorio = useMemo(() => {
    return (): boolean => {
      // Administrador tem acesso a todas as abas
      if (isAdmin) return true;

      // Se não tem usuário logado, não tem permissão
      if (!user) return false;

      // Verificar se tem pelo menos uma aba com visualizar = true
      const temAba = permissoesRelatorios?.some(
        (p: any) => p.visualizar === true
      );

      return temAba || false;
    };
  }, [user, permissoesRelatorios, isAdmin]);

  const podeAcessarConfiguracao = useMemo(() => {
    return (aba: AbaConfiguracao): boolean => {
      // Administrador tem todas as permissões
      if (isAdmin) return true;

      // Se não tem usuário logado, não tem permissão
      if (!user) return false;

      // Buscar permissão específica da aba de configuração
      const permissao = permissoesConfiguracoes?.find(
        (p: any) => p.aba === aba
      );

      if (!permissao) return false;

      return permissao.visualizar === true;
    };
  }, [user, permissoesConfiguracoes, isAdmin]);

  const temAlgumaAbaConfiguracao = useMemo(() => {
    return (): boolean => {
      // Administrador tem acesso a todas as abas
      if (isAdmin) return true;

      // Se não tem usuário logado, não tem permissão
      if (!user) return false;

      // Verificar se tem pelo menos uma aba com visualizar = true
      const temAba = permissoesConfiguracoes?.some(
        (p: any) => p.visualizar === true
      );

      return temAba || false;
    };
  }, [user, permissoesConfiguracoes, isAdmin]);

  return {
    temPermissao,
    temPermissaoRelatorio,
    podeAcessar,
    podeAcessarRelatorio,
    temAlgumaAbaRelatorio,
    podeAcessarConfiguracao,
    temAlgumaAbaConfiguracao,
    isAdmin,
    isLoading,
  };
}
