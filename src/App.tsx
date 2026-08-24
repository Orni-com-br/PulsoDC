import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import RegistroFato from "./pages/RegistroFato";
import RelatorioServico from "./pages/RelatorioServico";
import RelatoriosAnaliticos from "./pages/RelatoriosAnaliticos";
import PainelServico from "./pages/PainelServico";
import OcorrenciaDetalhe from "./pages/OcorrenciaDetalhe";
import NotificacaoPage from "./pages/NotificacaoPage";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import GestaoUsuarios from "./pages/GestaoUsuarios";
import GestaoLogistica from "./pages/GestaoLogistica";
import EstoqueAdministrativo from "./pages/EstoqueAdministrativo";
import EstoqueHumanitario from "./pages/EstoqueHumanitario";
import ListaInventario from "./pages/ListaInventario";
import DashboardLogistica from "./pages/DashboardLogistica";
import HubModulos from "./pages/HubModulos";
import GestaoOperacional from "./pages/GestaoOperacional";
import SciIncidentes from "./pages/SciIncidentes";
import SciIncidenteDashboard from "./pages/SciIncidenteDashboard";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <div className="p-8 text-center">Acesso restrito a administradores.</div>;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/notificacao" element={<ProtectedRoute><NotificacaoPage /></ProtectedRoute>} />
            <Route path="/notificacao/:id" element={<ProtectedRoute><NotificacaoPage /></ProtectedRoute>} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<HubModulos />} />
              <Route path="/despacho" element={<Dashboard />} />
              <Route path="/gestao-operacional" element={<GestaoOperacional />} />
              <Route path="/registro-fato" element={<RegistroFato />} />
              <Route path="/registro-fato/:id" element={<RegistroFato />} />
              <Route path="/relatorio-servico" element={<RelatorioServico />} />
              <Route path="/relatorios-analiticos" element={<RelatoriosAnaliticos />} />
              <Route path="/painel-servico" element={<PainelServico />} />
              <Route path="/ocorrencia/:id" element={<OcorrenciaDetalhe />} />
              <Route path="/gestao-usuarios" element={<AdminRoute><GestaoUsuarios /></AdminRoute>} />
              <Route path="/gestao-logistica" element={<GestaoLogistica />} />
              <Route path="/gestao-logistica/administrativo" element={<EstoqueAdministrativo />} />
              <Route path="/gestao-logistica/inventario" element={<ListaInventario />} />
              <Route path="/gestao-logistica/humanitaria" element={<EstoqueHumanitario />} />
              <Route path="/gestao-logistica/dashboard" element={<DashboardLogistica />} />
              <Route path="/sci" element={<SciIncidentes />} />
              <Route path="/sci/:id" element={<SciIncidenteDashboard />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
