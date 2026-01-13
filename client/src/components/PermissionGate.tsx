import { usePermissoes, type Secao, type TipoPermissao } from "@/hooks/usePermissoes";

interface PermissionGateProps {
  children: React.ReactNode;
  secao: Secao;
  permission: TipoPermissao;
  fallback?: React.ReactNode;
}

/**
 * Componente para controlar a visibilidade de elementos baseado em permissões
 * 
 * @example
 * // Ocultar botão se não tiver permissão de inserir
 * <PermissionGate secao="turmas" permission="inserir">
 *   <Button>Nova Turma</Button>
 * </PermissionGate>
 * 
 * @example
 * // Mostrar mensagem alternativa se não tiver permissão
 * <PermissionGate 
 *   secao="despesas" 
 *   permission="excluir"
 *   fallback={<span className="text-muted-foreground">Sem permissão</span>}
 * >
 *   <Button variant="destructive">Excluir</Button>
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  secao,
  permission,
  fallback = null,
}: PermissionGateProps) {
  const { temPermissao, isLoading } = usePermissoes();

  // Não mostrar nada enquanto carrega
  if (isLoading) {
    return null;
  }

  // Se não tem permissão, mostrar fallback ou nada
  if (!temPermissao(secao, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
