import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Suspense, lazy } from "react";

// Lazy load pages to prevent DOM conflicts during navigation
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Turmas = lazy(() => import("./pages/Turmas"));
const TurmaDetalhes = lazy(() => import("./pages/TurmaDetalhes"));
const Eventos = lazy(() => import("./pages/Eventos"));
const Abordagem = lazy(() => import("./pages/Abordagem"));
const Execucao = lazy(() => import("./pages/Execucao"));
const Vendas = lazy(() => import("./pages/Vendas"));
const Servicos = lazy(() => import("./pages/Servicos"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Despesas = lazy(() => import("./pages/Despesas"));
const DespesasV2 = lazy(() => import("./pages/DespesasV2"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Briefing = lazy(() => import("./pages/Briefing"));
const Becas = lazy(() => import("./pages/Becas"));
const Reunioes = lazy(() => import("./pages/Reunioes"));
const Auditoria = lazy(() => import("./pages/Auditoria"));
const RelatorioObservacoes = lazy(() => import("./pages/RelatorioObservacoes"));
const DebugObservacoes = lazy(() => import("./pages/DebugObservacoes"));
const ClienteLogin = lazy(() => import("./pages/ClienteLogin"));
const ClienteBriefing = lazy(() => import("./pages/ClienteBriefing"));
const Notificacoes = lazy(() => import("./pages/Notificacoes"));
const FechamentosMensais = lazy(() => import("./pages/FechamentosMensais"));
const FechamentoDiario = lazy(() => import("./pages/FechamentoDiario"));
const HistoricoFechamentos = lazy(() => import("./pages/HistoricoFechamentos"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  
  // Rotas do cliente (sem DashboardLayout)
  if (location.startsWith("/cliente")) {
    return (
      <ErrorBoundary resetKey={location}>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/cliente" component={ClienteLogin} />
            <Route path="/cliente/briefing" component={ClienteBriefing} />
          </Switch>
        </Suspense>
      </ErrorBoundary>
    );
  }
  
  // Rotas administrativas (com DashboardLayout)
  return (
    <DashboardLayout>
      <ErrorBoundary resetKey={location}>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/">
              <ProtectedRoute secao="home">
                <Dashboard />
              </ProtectedRoute>
            </Route>
            <Route path="/turmas">
              <ProtectedRoute secao="turmas">
                <Turmas />
              </ProtectedRoute>
            </Route>
            <Route path="/turmas/:id">
              <ProtectedRoute secao="turmas">
                <TurmaDetalhes />
              </ProtectedRoute>
            </Route>
            <Route path="/eventos">
              <ProtectedRoute secao="eventos">
                <Eventos />
              </ProtectedRoute>
            </Route>
            <Route path="/eventos/:id">
              <ProtectedRoute secao="eventos">
                <Eventos />
              </ProtectedRoute>
            </Route>
            <Route path="/abordagem">
              <ProtectedRoute secao="abordagem">
                <Abordagem />
              </ProtectedRoute>
            </Route>
            <Route path="/execucao">
              <ProtectedRoute secao="execucao">
                <Execucao />
              </ProtectedRoute>
            </Route>
            <Route path="/vendas">
              <ProtectedRoute secao="vendas">
                <Vendas />
              </ProtectedRoute>
            </Route>
            <Route path="/reunioes">
              <ProtectedRoute secao="reunioes">
                <Reunioes />
              </ProtectedRoute>
            </Route>
            <Route path="/servicos">
              <ProtectedRoute secao="servicos">
                <Servicos />
              </ProtectedRoute>
            </Route>
            <Route path="/financeiro">
              <ProtectedRoute secao="financeiro">
                <Financeiro />
              </ProtectedRoute>
            </Route>
            <Route path="/despesas">
              <ProtectedRoute secao="despesas">
                <DespesasV2 />
              </ProtectedRoute>
            </Route>
            <Route path="/despesas-old">
              <ProtectedRoute secao="despesas">
                <Despesas />
              </ProtectedRoute>
            </Route>
            <Route path="/relatorios">
              <ProtectedRoute secao="relatorios" requireGranularAccess={true}>
                <Relatorios />
              </ProtectedRoute>
            </Route>
            <Route path="/financeiro">
              <ProtectedRoute secao="financeiro">
                <FechamentosMensais />
              </ProtectedRoute>
            </Route>
            <Route path="/financeiro/auditoria">
              <ProtectedRoute secao="financeiro">
                <Auditoria />
              </ProtectedRoute>
            </Route>
            <Route path="/financeiro/fechamento-diario">
              <ProtectedRoute secao="financeiro">
                <FechamentoDiario />
              </ProtectedRoute>
            </Route>
            <Route path="/financeiro/historico-fechamentos">
              <ProtectedRoute secao="financeiro">
                <HistoricoFechamentos />
              </ProtectedRoute>
            </Route>
            <Route path="/relatorios/observacoes">
              <ProtectedRoute secao="relatorios" requireGranularAccess={true}>
                <RelatorioObservacoes />
              </ProtectedRoute>
            </Route>
            <Route path="/briefing">
              <ProtectedRoute secao="briefing">
                <Briefing />
              </ProtectedRoute>
            </Route>
            <Route path="/becas">
              <ProtectedRoute secao="becas">
                <Becas />
              </ProtectedRoute>
            </Route>
            <Route path="/configuracoes">
              <ProtectedRoute secao="configuracoes" requireGranularAccess={true}>
                <Configuracoes />
              </ProtectedRoute>
            </Route>
            <Route path="/notificacoes">
              <ProtectedRoute secao="home">
                <Notificacoes />
              </ProtectedRoute>
            </Route>
            <Route path="/auditoria">
              <ProtectedRoute secao="auditoria">
                <Auditoria />
              </ProtectedRoute>
            </Route>
            <Route path="/debug-observacoes">
              <ProtectedRoute secao="auditoria">
                <DebugObservacoes />
              </ProtectedRoute>
            </Route>
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </ErrorBoundary>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
