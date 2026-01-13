import { useEffect } from "react";
import { useLocation } from "wouter";
import { usePermissoes, type Secao } from "@/hooks/usePermissoes";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  secao: Secao;
  requiredPermission?: "visualizar" | "inserir" | "excluir";
  requireGranularAccess?: boolean; // Para seções que precisam de acesso a pelo menos uma aba
}

export function ProtectedRoute({
  children,
  secao,
  requiredPermission = "visualizar",
  requireGranularAccess = false,
}: ProtectedRouteProps) {
  const { temPermissao, temAlgumaAbaRelatorio, temAlgumaAbaConfiguracao, isLoading } = usePermissoes();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    // Debug: log das permissões
    console.log('[ProtectedRoute] secao:', secao);
    console.log('[ProtectedRoute] requiredPermission:', requiredPermission);
    console.log('[ProtectedRoute] temPermissao:', temPermissao(secao, requiredPermission));

    // Verificar permissão básica
    if (!temPermissao(secao, requiredPermission)) {
      console.error('[ProtectedRoute] ACESSO NEGADO - sem permissão para', secao);
      toast.error("Você não tem permissão para acessar esta página");
      setLocation("/");
      return;
    }

    // Verificar acesso granular se necessário
    if (requireGranularAccess) {
      if (secao === "relatorios" && !temAlgumaAbaRelatorio()) {
        toast.error("Você não tem permissão para acessar nenhuma aba de Relatórios");
        setLocation("/");
        return;
      }
      if (secao === "configuracoes" && !temAlgumaAbaConfiguracao()) {
        toast.error("Você não tem permissão para acessar nenhuma aba de Configurações");
        setLocation("/");
        return;
      }
    }
  }, [isLoading, temPermissao, temAlgumaAbaRelatorio, temAlgumaAbaConfiguracao, secao, requiredPermission, requireGranularAccess, setLocation]);

  // Mostrar loading enquanto verifica permissões
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Se não tem permissão, não renderizar nada (será redirecionado)
  if (!temPermissao(secao, requiredPermission)) {
    return null;
  }

  // Verificar acesso granular se necessário
  if (requireGranularAccess) {
    if (secao === "relatorios" && !temAlgumaAbaRelatorio()) {
      return null;
    }
    if (secao === "configuracoes" && !temAlgumaAbaConfiguracao()) {
      return null;
    }
  }

  return <>{children}</>;
}
