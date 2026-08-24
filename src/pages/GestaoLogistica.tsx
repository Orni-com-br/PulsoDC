import { useNavigate } from "react-router-dom";
import {
  Building2,
  HeartHandshake,
  Package,
  Shirt,
  SprayCan,
  FileText,
  Droplets,
  BedDouble,
  ShoppingBasket,
  Tent,
  ArrowRight,
} from "lucide-react";

export default function GestaoLogistica() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="bg-card rounded-2xl shadow p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-2.5">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Gestão Logística</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Controle de estoque e distribuição de materiais
            </p>
          </div>
        </div>
      </div>

      {/* Two Main Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Administrativo Card */}
        <button
          id="btn-logistica-administrativo"
          onClick={() => navigate("/gestao-logistica/administrativo")}
          className="group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 transition-all duration-500 group-hover:from-blue-500 group-hover:via-blue-600 group-hover:to-indigo-700" />
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-lg group-hover:scale-125 transition-transform duration-700" />

          <div className="relative p-8 sm:p-10">
            {/* Icon */}
            <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/25 transition-colors duration-300 ring-1 ring-white/20">
              <Building2 className="w-8 h-8 text-white" />
            </div>

            {/* Title & Description */}
            <h3 className="text-2xl font-bold text-white mb-2">
              Gestão Logistica/Administrativo
            </h3>
            <p className="text-blue-100 text-sm leading-relaxed mb-6">
              Controle de materiais de expediente, higiene e limpeza, fardamento
              e suprimentos internos.
            </p>

            {/* Quick Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="inline-flex items-center gap-1 text-xs bg-white/15 backdrop-blur-sm text-white/90 px-2.5 py-1 rounded-full ring-1 ring-white/10">
                <FileText className="w-3 h-3" /> Expediente
              </span>
              <span className="inline-flex items-center gap-1 text-xs bg-white/15 backdrop-blur-sm text-white/90 px-2.5 py-1 rounded-full ring-1 ring-white/10">
                <SprayCan className="w-3 h-3" /> Higiene
              </span>
              <span className="inline-flex items-center gap-1 text-xs bg-white/15 backdrop-blur-sm text-white/90 px-2.5 py-1 rounded-full ring-1 ring-white/10">
                <Shirt className="w-3 h-3" /> Fardamento
              </span>
            </div>

            {/* CTA Arrow */}
            <div className="flex items-center gap-2 text-white/80 group-hover:text-white transition-colors text-sm font-medium">
              Acessar módulo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
            </div>
          </div>
        </button>

        {/* Ajuda Humanitária Card */}
        <button
          id="btn-logistica-humanitaria"
          onClick={() => navigate("/gestao-logistica/humanitaria")}
          className="group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 transition-all duration-500 group-hover:from-emerald-500 group-hover:via-teal-600 group-hover:to-cyan-700" />
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-lg group-hover:scale-125 transition-transform duration-700" />

          <div className="relative p-8 sm:p-10">
            {/* Icon */}
            <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/25 transition-colors duration-300 ring-1 ring-white/20">
              <HeartHandshake className="w-8 h-8 text-white" />
            </div>

            {/* Title & Description */}
            <h3 className="text-2xl font-bold text-white mb-2">
              Gestão Logistica/Ajuda Humanitária
            </h3>
            <p className="text-emerald-100 text-sm leading-relaxed mb-6">
              Gestão de cestas básicas, água, colchões, roupas de cama, lonas e
              materiais de apoio a desabrigados.
            </p>

            {/* Quick Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="inline-flex items-center gap-1 text-xs bg-white/15 backdrop-blur-sm text-white/90 px-2.5 py-1 rounded-full ring-1 ring-white/10">
                <ShoppingBasket className="w-3 h-3" /> Cestas
              </span>
              <span className="inline-flex items-center gap-1 text-xs bg-white/15 backdrop-blur-sm text-white/90 px-2.5 py-1 rounded-full ring-1 ring-white/10">
                <Droplets className="w-3 h-3" /> Água
              </span>
              <span className="inline-flex items-center gap-1 text-xs bg-white/15 backdrop-blur-sm text-white/90 px-2.5 py-1 rounded-full ring-1 ring-white/10">
                <BedDouble className="w-3 h-3" /> Colchões
              </span>
              <span className="inline-flex items-center gap-1 text-xs bg-white/15 backdrop-blur-sm text-white/90 px-2.5 py-1 rounded-full ring-1 ring-white/10">
                <Tent className="w-3 h-3" /> Lonas
              </span>
            </div>

            {/* CTA Arrow */}
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
