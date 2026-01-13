import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { usePermissoes, type Secao } from "@/hooks/usePermissoes";
import { 
  LayoutDashboard, 
  LogOut, 
  PanelLeft, 
  Users, 
  Calendar, 
  Camera,
  ClipboardList,
  PlayCircle,
  ShoppingCart,
  Settings,
  DollarSign,
  Scissors,
  Receipt,
  BarChart3,
  Shirt,
  FileSearch,
  History,
  CalendarCheck
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { NotificationBell } from './NotificationBell';

const menuItems = [
  { icon: LayoutDashboard, label: "Home", path: "/", secao: "home" as Secao },
  { icon: Users, label: "Turmas", path: "/turmas", secao: "turmas" as Secao },
  { icon: Calendar, label: "Eventos", path: "/eventos", secao: "eventos" as Secao },
  { icon: ClipboardList, label: "Abordagem", path: "/abordagem", secao: "abordagem" as Secao },
  { icon: PlayCircle, label: "Execução", path: "/execucao", secao: "execucao" as Secao },
  { icon: ShoppingCart, label: "Vendas", path: "/vendas", secao: "vendas" as Secao },
  { icon: Users, label: "Reuniões", path: "/reunioes", secao: "reunioes" as Secao },
  { icon: Scissors, label: "Serviços", path: "/servicos", secao: "servicos" as Secao },
  { icon: Receipt, label: "Despesas", path: "/despesas", secao: "despesas" as Secao },
  { 
    icon: DollarSign, 
    label: "Financeiro", 
    path: "/financeiro", 
    secao: "financeiro" as Secao,
    subItems: [
      { icon: CalendarCheck, label: "Fechamento Diário", path: "/financeiro/fechamento-diario" },
      { icon: History, label: "Histórico", path: "/financeiro/historico-fechamentos" },
      { icon: FileSearch, label: "Auditoria", path: "/financeiro/auditoria" },
    ]
  },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios", secao: "relatorios" as Secao },
  { icon: ClipboardList, label: "Briefing", path: "/briefing", secao: "briefing" as Secao },
  { icon: Shirt, label: "Becas", path: "/becas", secao: "becas" as Secao },
  { icon: Settings, label: "Configurações", path: "/configuracoes", secao: "configuracoes" as Secao },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full bg-white rounded-2xl shadow-xl">
          <div className="flex flex-col items-center gap-4">
<img src="/logo-estudio-supera.png" alt="Estúdio Super A" className="h-16 object-contain" />
            <h1 className="text-2xl font-bold tracking-tight text-center text-slate-900">
              Estúdio - Super A
            </h1>
            <p className="text-sm text-slate-500 text-center max-w-sm">
              Sistema de gestão de eventos fotográficos de formatura. Faça login para continuar.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all"
          >
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { podeAcessar, temAlgumaAbaRelatorio, temAlgumaAbaConfiguracao, isLoading: loadingPermissoes } = usePermissoes();

  // Filtrar itens do menu baseado nas permissões do usuário
  const visibleMenuItems = menuItems.filter(item => {
    // Para a seção Home (Dashboard), verificar se é Administrador ou Gestor
    if (item.secao === 'home') {
      return user?.role === 'administrador' || user?.role === 'gestor';
    }
    // Para a seção Relatórios, verificar se tem acesso a pelo menos uma aba
    if (item.secao === 'relatorios') {
      return podeAcessar(item.secao) && temAlgumaAbaRelatorio();
    }
    // Para a seção Configurações, verificar se tem acesso a pelo menos uma aba
    if (item.secao === 'configuracoes') {
      return podeAcessar(item.secao) && temAlgumaAbaConfiguracao();
    }
    return podeAcessar(item.secao);
  });
  const activeMenuItem = visibleMenuItems.find(item => item.path === location);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-slate-900"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-slate-800">
            <div className="flex items-center justify-between gap-3 px-2 transition-all w-full">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={toggleSidebar}
                  className="h-8 w-8 flex items-center justify-center hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shrink-0"
                  aria-label="Toggle navigation"
                >
                  <PanelLeft className="h-4 w-4 text-slate-400" />
                </button>
                {!isCollapsed ? (
                  <div className="flex items-center gap-2 min-w-0">
<img src="/logo-estudio-supera.png" alt="Estúdio Super A" className="h-8 object-contain" />
                    <span className="font-semibold tracking-tight truncate text-white">
                      Estúdio
                    </span>
                  </div>
                ) : null}
              </div>
              {!isCollapsed && <NotificationBell />}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 bg-slate-900">
            <SidebarMenu className="px-2 py-3">
              {visibleMenuItems.map(item => {
                const isActive = location === item.path;
                const hasSubItems = 'subItems' in item && item.subItems && item.subItems.length > 0;
                const isSubItemActive = hasSubItems && item.subItems?.some(sub => location === sub.path);
                
                return (
                  <div key={item.path}>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isActive || isSubItemActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className={`h-10 transition-all font-normal text-slate-300 hover:text-white hover:bg-slate-800 ${
                          isActive || isSubItemActive ? "bg-gradient-to-r from-amber-500/20 to-orange-600/20 text-amber-400 border-l-2 border-amber-500" : ""
                        }`}
                      >
                        <item.icon
                          className={`h-4 w-4 ${isActive || isSubItemActive ? "text-amber-400" : "text-slate-400"}`}
                        />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    {hasSubItems && !isCollapsed && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.subItems?.map(subItem => {
                          const isSubActive = location === subItem.path;
                          return (
                            <SidebarMenuItem key={subItem.path}>
                              <SidebarMenuButton
                                isActive={isSubActive}
                                onClick={() => setLocation(subItem.path)}
                                tooltip={subItem.label}
                                className={`h-9 text-sm transition-all font-normal text-slate-400 hover:text-white hover:bg-slate-800 ${
                                  isSubActive ? "bg-slate-800 text-amber-400" : ""
                                }`}
                              >
                                <subItem.icon className={`h-3.5 w-3.5 ${isSubActive ? "text-amber-400" : "text-slate-500"}`} />
                                <span>{subItem.label}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 bg-slate-900 border-t border-slate-800">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-slate-800 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                  <Avatar className="h-9 w-9 border border-slate-700 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-white">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-amber-500/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-slate-50">
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-white px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-white" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-slate-900 font-medium">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
            <NotificationBell />
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
