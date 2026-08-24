import { useNavigate } from "react-router-dom";
import { Shield, Package, ArrowRight } from "lucide-react";

export default function HubModulos() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
          SISTEMA DE GESTÃO DE DEFESA CIVIL
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Selecione o módulo que deseja acessar para continuar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Gestão Operacional */}
        <button
          onClick={() => navigate("/despacho")}
          className="group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 transition-all duration-500 group-hover:from-blue-500 group-hover:via-blue-600 group-hover:to-indigo-700" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-lg group-hover:scale-125 transition-transform duration-700" />

          <div className="relative p-8 sm:p-10">
            <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/25 transition-colors duration-300 ring-1 ring-white/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Gestão Operacional
            </h3>
            <p className="text-blue-100 text-sm leading-relaxed mb-6">
              Acesse o despacho de ocorrências, relatórios e painel de serviço.
            </p>
            <div className="flex items-center gap-2 text-white/80 group-hover:text-white transition-colors text-sm font-medium">
              Acessar módulo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
            </div>
          </div>
        </button>

        {/* Gestão Logística */}
        <button
          onClick={() => navigate("/gestao-logistica/administrativo")}
          className="group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 transition-all duration-500 group-hover:from-emerald-500 group-hover:via-teal-600 group-hover:to-cyan-700" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-lg group-hover:scale-125 transition-transform duration-700" />

          <div className="relative p-8 sm:p-10">
            <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/25 transition-colors duration-300 ring-1 ring-white/20">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Gestão Logística
            </h3>
            <p className="text-emerald-100 text-sm leading-relaxed mb-6">
              Controle de materiais administrativos e ajuda humanitária.
            </p>
            <div className="flex items-center gap-2 text-white/80 group-hover:text-white transition-colors text-sm font-medium">
              Acessar módulo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
