import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, FileText, Users, LogOut, Shield, Menu, X, BarChart3, Package, ChevronDown, ChevronRight, HeartHandshake, Building2, ShieldAlert, Key } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userEmail, logout, isAdmin, isDespachante, isPadrao } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<"operacional" | "logistica" | null>(null);
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    setIsChangingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    setIsChangingPassword(false);

    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setIsPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const baseOperacionalItems = [
    { title: "Despacho de ocorrências", path: "/despacho", icon: Shield },
    { title: "SCI - Comando de Incidentes", path: "/sci", icon: ShieldAlert, despachanteOnly: true },
    { title: "Relatório de Serviço", path: "/relatorio-servico", icon: FileText, despachanteOnly: true },
    { title: "Painel de Serviço", path: "/painel-servico", icon: Users, despachanteOnly: true },
    { title: "Gestão Analítico", path: "/relatorios-analiticos", icon: BarChart3, despachanteOnly: true },
    { title: "Gestão de Usuários", path: "/gestao-usuarios", icon: Users, adminOnly: true },
  ];

  const operacionalItems = baseOperacionalItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.despachanteOnly && !isDespachante && !isAdmin) return false;
    return true;
  });

  const baseLogisticaItems = [
    { title: "Gestão Logistica/Administrativo", path: "/gestao-logistica/administrativo", icon: Building2 },
    { title: "Gestão Logistica/Ajuda Humanitária", path: "/gestao-logistica/humanitaria", icon: HeartHandshake },
    { title: "Lista Inventario", path: "/gestao-logistica/inventario", icon: FileText },
    { title: "Dashboard", path: "/gestao-logistica/dashboard", icon: BarChart3 },
  ];

  // Esconder menu de logística para o perfil padrão
  const logisticaItems = isPadrao ? [] : baseLogisticaItems;

  const isHome = location.pathname === "/";
  const isOperacional = operacionalItems.some(i => location.pathname.startsWith(i.path)) || location.pathname.startsWith("/ocorrencia/") || location.pathname.startsWith("/registro-fato") || location.pathname.startsWith("/sci");
  const isLogistica = logisticaItems.some(i => location.pathname.startsWith(i.path));

  let pageTitle = "Sistema de Gestão de Defesa Civil";
  const currentNav = [...operacionalItems, ...logisticaItems].find(n => n.path === location.pathname);
  if (currentNav) pageTitle = currentNav.title;
  if (location.pathname === "/registro-fato" || location.pathname.startsWith("/registro-fato/")) pageTitle = "Registro do Fato";
  if (location.pathname === "/gestao-usuarios") pageTitle = "Gestão de Usuários";

  const toggleAccordion = (section: "operacional" | "logistica") => {
    setOpenAccordion(prev => prev === section ? null : section);
  };

  const NavItem = ({ item }: { item: any }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    return (
      <NavLink
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "hover:bg-sidebar-accent"
        }`}
      >
        <Icon className="w-5 h-5" />
        <span>{item.title}</span>
      </NavLink>
    );
  };

  const SidebarContent = (
    <>
      <div className="p-6 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-sidebar-border shadow-sm">
            <img src="/images/logo-dc-sidebar.png" alt="Defesa Civil Logo" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-xl leading-none">Defesa Civil</h1>
            <p className="text-sidebar-muted text-sm truncate">{userEmail}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 text-sm overflow-y-auto">
        {isHome && (
          <>
            <div className="space-y-1">
              <button 
                onClick={() => toggleAccordion("operacional")}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-sidebar-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5" />
                  <span className="font-medium text-base">Gestão Operacional</span>
                </div>
                {openAccordion === "operacional" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {openAccordion === "operacional" && (
                <div className="pl-4 space-y-1 mt-1 border-l-2 border-sidebar-border ml-6">
                  {operacionalItems.map(item => <NavItem key={item.path} item={item} />)}
                </div>
              )}
            </div>

            <div className="space-y-1 mt-2">
              <button 
                onClick={() => toggleAccordion("logistica")}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-sidebar-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5" />
                  <span className="font-medium text-base">Gestão Logística</span>
                </div>
                {openAccordion === "logistica" ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {openAccordion === "logistica" && (
                <div className="pl-4 space-y-1 mt-1 border-l-2 border-sidebar-border ml-6">
                  {logisticaItems.map(item => <NavItem key={item.path} item={item} />)}
                </div>
              )}
            </div>
          </>
        )}

        {isOperacional && !isHome && (
          <>
            <div className="px-4 py-2 mb-2 text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
              Gestão Operacional
            </div>
            {operacionalItems.map(item => <NavItem key={item.path} item={item} />)}
          </>
        )}

        {isLogistica && !isHome && (
          <>
            <div className="px-4 py-2 mb-2 text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
              Gestão Logística
            </div>
            {logisticaItems.map(item => <NavItem key={item.path} item={item} />)}
          </>
        )}

        {(!isHome && !isOperacional && !isLogistica) && (
          <>
            <div className="px-4 py-2 mb-2 text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
              Gestão Operacional
            </div>
            {operacionalItems.map(item => <NavItem key={item.path} item={item} />)}
            <div className="px-4 py-2 mb-2 mt-4 text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
              Gestão Logística
            </div>
            {logisticaItems.map(item => <NavItem key={item.path} item={item} />)}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2 shrink-0">
        {!isHome && (
          <NavLink
            to="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sidebar-accent transition-colors text-sm"
          >
            <Home className="w-5 h-5" />
            <span>Voltar para tela inicial</span>
          </NavLink>
        )}
        
        {/* Removed Gestão de Usuários from here since it's now in the operational menu */}
        
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogTrigger asChild>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sidebar-accent transition-colors text-sm text-left">
              <Key className="w-5 h-5" />
              <span>Alterar minha senha</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Alterar Senha</DialogTitle>
              <DialogDescription>
                Digite sua nova senha abaixo. Ela deve ter pelo menos 6 caracteres.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleChangePassword} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nova Senha</label>
                <Input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="******"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar Nova Senha</label>
                <Input 
                  type="password" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="******"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? "Alterando..." : "Salvar Senha"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <button
          onClick={async () => { await logout(); navigate("/login"); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors text-sm text-left font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair (LOGOFF)</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-72 bg-sidebar text-sidebar-foreground flex-col shrink-0">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground flex flex-col shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-sidebar-muted hover:text-white"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
            {SidebarContent}
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b h-16 flex items-center gap-3 px-4 md:px-8 shadow-sm shrink-0">
          <button
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-muted"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-lg md:text-2xl font-semibold truncate">{pageTitle}</h2>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
