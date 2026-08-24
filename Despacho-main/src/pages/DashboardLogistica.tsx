import { useState, useMemo } from "react";
import { 
  Package, AlertTriangle, TrendingUp, TrendingDown, DollarSign, 
  Box, Truck, ShieldCheck, Activity, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Dados vazios pois ainda não temos a tabela de histórico implementada
const mockMovimentacao: any[] = [];

export default function DashboardLogistica() {
  const [timeRange, setTimeRange] = useState("6m");
  const [isExporting, setIsExporting] = useState(false);

  const { data: adm = [] } = useQuery({
    queryKey: ["estoque_administrativo"],
    queryFn: async () => (await supabase.from("estoque_administrativo").select("*")).data || []
  });

  const { data: hum = [] } = useQuery({
    queryKey: ["estoque_humanitario"],
    queryFn: async () => (await supabase.from("estoque_humanitario").select("*")).data || []
  });

  const { data: inv = [] } = useQuery({
    queryKey: ["inventario"],
    queryFn: async () => (await supabase.from("inventario").select("*")).data || []
  });

  const totalSuprimentos = useMemo(() => {
    const admTotal = adm.reduce((acc, i) => acc + (i.quantidade || 0), 0);
    const humTotal = hum.reduce((acc, i) => acc + (i.quantidade || 0), 0);
    return admTotal + humTotal;
  }, [adm, hum]);

  const itensCriticos = useMemo(() => {
    const admCrit = adm.filter(i => (i.quantidade || 0) <= (i.minimo || 0)).length;
    const humCrit = hum.filter(i => (i.quantidade || 0) <= (i.minimo || 0)).length;
    return admCrit + humCrit;
  }, [adm, hum]);

  const totalKitsHumanitarios = useMemo(() => {
    return hum.reduce((acc, i) => acc + (i.quantidade || 0), 0);
  }, [hum]);

  const dataCategorias = useMemo(() => {
    const expediente = adm.filter(i => i.categoria === "expediente").reduce((a,b)=>a+(b.quantidade||0),0);
    const higiene = adm.filter(i => i.categoria === "higiene").reduce((a,b)=>a+(b.quantidade||0),0);
    const fardamento = adm.filter(i => i.categoria === "fardamento").reduce((a,b)=>a+(b.quantidade||0),0);
    const humanitaria = hum.reduce((a,b)=>a+(b.quantidade||0),0);

    return [
      { name: "Expediente", value: expediente, color: "#3b82f6" },
      { name: "Higiene", value: higiene, color: "#8b5cf6" },
      { name: "Fardamento", value: fardamento, color: "#f59e0b" },
      { name: "Humanitária", value: humanitaria, color: "#10b981" },
    ].filter(i => i.value > 0); // Ocultar categorias vazias
  }, [adm, hum]);

  const dataPatrimonio = useMemo(() => {
    const contagemPorArea: Record<string, number> = {};
    inv.forEach(i => {
      const area = i.area_comodo || "Sem Área";
      contagemPorArea[area] = (contagemPorArea[area] || 0) + 1;
    });
    
    return Object.entries(contagemPorArea).map(([name, quantidade]) => ({ name, quantidade }));
  }, [inv]);

  const exportPDF = async () => {
    const dashboardElement = document.getElementById("dashboard-content");
    if (!dashboardElement) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(dashboardElement, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("dashboard-logistica.pdf");
    } catch (error) {
      console.error("Erro ao exportar PDF", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10" id="dashboard-content">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 p-8 sm:p-10 text-white shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse delay-1000"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white">
              Painel Logístico
            </h1>
            <p className="text-indigo-200 text-lg max-w-xl leading-relaxed">
              Visão geral do controle de suprimentos, ajuda humanitária e gestão de patrimônio da Defesa Civil.
            </p>
          </div>
          <div className="flex bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/20 shadow-inner">
            {["7d", "1m", "6m", "1y"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  timeRange === range 
                  ? "bg-white text-indigo-900 shadow-sm scale-105" 
                  : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
            <button
              onClick={exportPDF}
              disabled={isExporting}
              className="ml-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Gerando..." : "Exportar PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Total de Suprimentos" 
          value={totalSuprimentos.toLocaleString()} 
          trend="" 
          trendUp={true} 
          icon={<Package className="w-6 h-6 text-blue-500" />} 
          bgGradient="from-blue-500/10 to-transparent"
          borderColor="border-blue-500/20"
        />
        <KpiCard 
          title="Itens Críticos (Falta)" 
          value={itensCriticos.toString()} 
          trend="" 
          trendUp={true} // less is better
          icon={<AlertTriangle className="w-6 h-6 text-red-500" />} 
          bgGradient="from-red-500/10 to-transparent"
          borderColor="border-red-500/20"
        />
        <KpiCard 
          title="Total de Patrimônios" 
          value={inv.length.toString()} 
          trend="" 
          trendUp={true} 
          icon={<ShieldCheck className="w-6 h-6 text-emerald-500" />} 
          bgGradient="from-emerald-500/10 to-transparent"
          borderColor="border-emerald-500/20"
        />
        <KpiCard 
          title="Itens Humanitários" 
          value={totalKitsHumanitarios.toLocaleString()} 
          trend="" 
          trendUp={true} 
          icon={<Box className="w-6 h-6 text-purple-500" />} 
          bgGradient="from-purple-500/10 to-transparent"
          borderColor="border-purple-500/20"
        />
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Movimentação Area Chart */}
        <div className="lg:col-span-2 bg-card border border-border shadow-sm rounded-3xl p-6 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Movimentação Geral
              </h3>
              <p className="text-sm text-muted-foreground">Entradas vs Saídas ao longo do tempo</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockMovimentacao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEntradas)" />
                <Area type="monotone" dataKey="saidas" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorSaidas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição Categorias Pie Chart */}
        <div className="bg-card border border-border shadow-sm rounded-3xl p-6 transition-all duration-300 hover:shadow-md flex flex-col">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Box className="w-5 h-5 text-amber-500" />
              Distribuição
            </h3>
            <p className="text-sm text-muted-foreground">Volume de itens por categoria</p>
          </div>
          <div className="flex-1 min-h-[300px] w-full flex items-center justify-center -mt-4">
            {dataCategorias.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataCategorias}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {dataCategorias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground text-sm">Sem dados suficientes</div>
            )}
          </div>
        </div>

      </div>

      {/* Patrimônio Bar Chart Area */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-card border border-border shadow-sm rounded-3xl p-6 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Patrimônio por Área
              </h3>
              <p className="text-sm text-muted-foreground">Quantidade de itens alocados por setor</p>
            </div>
            <Button variant="outline" className="rounded-xl border-dashed">
              Ver Inventário Completo
            </Button>
          </div>
          <div className="h-[250px] w-full">
            {dataPatrimonio.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataPatrimonio} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`${value} itens`, "Quantidade"]}
                  />
                  <Bar dataKey="quantidade" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Sem dados de patrimônio registrados</div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

// Subcomponent para KPIs mantido no mesmo arquivo
function KpiCard({ title, value, trend, trendUp, icon, bgGradient, borderColor }: any) {
  return (
    <div className={`relative overflow-hidden bg-card border ${borderColor} shadow-sm rounded-3xl p-6 transition-all duration-300 hover:shadow-md group`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${bgGradient} rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110`}></div>
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="p-3 bg-white/50 backdrop-blur-sm rounded-2xl border shadow-sm">
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-full ${
              trendUp ? "text-emerald-700 bg-emerald-100" : "text-red-700 bg-red-100"
            }`}>
              {trendUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {trend}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-muted-foreground text-sm font-medium mb-1">{title}</h3>
          <p className="text-3xl font-black tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}
