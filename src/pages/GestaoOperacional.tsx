import { useNavigate } from "react-router-dom";
import {
  Home,
  FileText,
  Users,
  BarChart3,
  ArrowRight,
  ShieldAlert

} from "lucide-react";

export default function GestaoOperacional() {
  const navigate = useNavigate();

  const rotas = [
    {
      titulo: "Despacho de ocorrências",
      descricao: "Central de registro e atendimento de ocorrências em tempo real.",
      path: "/despacho",
      icon: Home,
      color: "from-amber-500 to-orange-600",
      lightColor: "bg-orange-500/10 text-orange-600",
    },
    {
      titulo: "SCI - Comando de Incidentes",
      descricao: "Sistema de Comando de Incidentes (FEMA/ICS) — gestão multiagência de crises.",
      path: "/sci",
      icon: ShieldAlert,
      color: "from-red-500 to-rose-600",
      lightColor: "bg-red-500/10 text-red-600",
    },
    {
      titulo: "Relatório de Serviço",
      descricao: "Histórico e consolidação das atividades diárias das equipes.",
      path: "/relatorio-servico",
      icon: FileText,
      color: "from-blue-500 to-indigo-600",
      lightColor: "bg-blue-500/10 text-blue-600",
    },
    {
      titulo: "Painel de Serviço",
      descricao: "Gestão das equipes, viaturas e efetivo em operação.",
      path: "/painel-servico",
      icon: Users,
      color: "from-purple-500 to-fuchsia-600",
      lightColor: "bg-purple-500/10 text-purple-600",
    },
    {
      titulo: "Gestão Analítico",
      descricao: "Indicadores, estatísticas e gráficos de eventos climáticos.",
      path: "/relatorios-analiticos",
      icon: BarChart3,
      color: "from-emerald-500 to-teal-600",
      lightColor: "bg-emerald-500/10 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="bg-card rounded-2xl shadow p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-2.5">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Gestão Operacional</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Selecione o serviço operacional desejado
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rotas.map((rota) => {
          const Icon = rota.icon;
          return (
            <button
              key={rota.path}
              onClick={() => navigate(rota.path)}
              className="group relative bg-card overflow-hidden rounded-2xl shadow-sm border hover:shadow-md transition-all duration-300 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="p-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${rota.lightColor} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">{rota.titulo}</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {rota.descricao}
                </p>
                <div className="flex items-center gap-2 text-primary font-medium text-sm">
                  Acessar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
