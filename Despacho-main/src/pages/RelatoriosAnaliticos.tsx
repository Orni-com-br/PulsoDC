import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { CloudRain, Activity, Clock, Users, MapPin, AlertTriangle, Loader2, Wind, Waves, Plus, Trash2, Download, Calculator, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
const GUAIBA_KEY = "guaiba_niveis_v1";

function csvEscape(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(";")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function formatHM(ms: number) {
  if (!isFinite(ms) || ms <= 0) return "-";
  const m = Math.round(ms / 60000);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${mm}min` : `${mm}min`;
}

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

type GuaibaLeitura = { date: string; nivel: number };

export default function RelatoriosAnaliticos() {
  const [dataInicio, setDataInicio] = useState(todayISO(-30));
  const [horaInicio, setHoraInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState(todayISO(0));
  const [horaFim, setHoraFim] = useState<string>("");
  const [naturezasSelecionadas, setNaturezasSelecionadas] = useState<string[]>([]);

  const inicioISO = `${dataInicio}T${horaInicio || "00:00"}:00`;
  const fimISO = `${dataFim}T${horaFim || "23:59"}:59`;

  // Filtros de eventos extremos
  const [usarChuva, setUsarChuva] = useState(true);
  const [chuvaMin, setChuvaMin] = useState<number>(40);
  const [chuvaMax, setChuvaMax] = useState<number>(200);

  const [usarVento, setUsarVento] = useState(false);
  const [ventoMin, setVentoMin] = useState<number>(60);
  const [ventoMax, setVentoMax] = useState<number>(200);

  const [usarGuaiba, setUsarGuaiba] = useState(false);
  const [guaibaMin, setGuaibaMin] = useState<number>(3.0);
  const [guaibaMax, setGuaibaMax] = useState<number>(10);

  // Leituras manuais da régua Cais do Porto (persistidas no navegador)
  const [guaibaLeituras, setGuaibaLeituras] = useState<GuaibaLeitura[]>([]);
  const [novaData, setNovaData] = useState<string>(todayISO(0));
  const [novoNivel, setNovoNivel] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GUAIBA_KEY);
      if (raw) setGuaibaLeituras(JSON.parse(raw));
    } catch (e) {
      console.error("Failed to parse Guaiba readings", e);
    }
  }, []);

  const persistGuaiba = (arr: GuaibaLeitura[]) => {
    setGuaibaLeituras(arr);
    localStorage.setItem(GUAIBA_KEY, JSON.stringify(arr));
  };

  const adicionarLeitura = () => {
    const n = parseFloat(novoNivel.replace(",", "."));
    if (!novaData || !isFinite(n)) {
      toast.error("Informe data e nível em metros");
      return;
    }
    const filtradas = guaibaLeituras.filter((l) => l.date !== novaData);
    persistGuaiba([...filtradas, { date: novaData, nivel: n }].sort((a, b) => a.date.localeCompare(b.date)));
    setNovoNivel("");
  };

  const removerLeitura = (date: string) => persistGuaiba(guaibaLeituras.filter((l) => l.date !== date));

  // Ocorrências do período
  const { data: ocorrencias = [], isLoading } = useQuery({
    queryKey: ["analitico-ocorrencias", inicioISO, fimISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocorrencias")
        .select("id, natureza, status, prioridade, created_at, latitude, longitude, bairro")
        .gte("created_at", inicioISO)
        .lte("created_at", fimISO)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: empenhos = [] } = useQuery({
    queryKey: ["analitico-empenhos", inicioISO, fimISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocorrencia_equipes")
        .select("id, ocorrencia_id, equipe_id, hora_despacho, hora_chegada, hora_finalizado, created_at")
        .gte("created_at", inicioISO)
        .lte("created_at", fimISO)
        .limit(10000);
      if (error) throw error;
      return data || [];
    },
  });

  // Clima diário — chuva e rajadas de vento via Open-Meteo Archive
  const { data: clima = { dias: [] as { date: string; mm: number; vento: number }[] }, isFetching: loadingClima } = useQuery({
    queryKey: ["clima", dataInicio, dataFim],
    queryFn: async () => {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=-30.0346&longitude=-51.2177&start_date=${dataInicio}&end_date=${dataFim}&daily=precipitation_sum,wind_gusts_10m_max&timezone=America%2FSao_Paulo&windspeed_unit=kmh`;
      const res = await fetch(url);
      if (!res.ok) return { dias: [] };
      const j = await res.json();
      const dates: string[] = j?.daily?.time || [];
      const mm: number[] = j?.daily?.precipitation_sum || [];
      const vento: number[] = j?.daily?.wind_gusts_10m_max || [];
      return {
        dias: dates.map((d, i) => ({ date: d, mm: Number(mm[i] || 0), vento: Number(vento[i] || 0) })),
      };
    },
  });

  const guaibaPorDia = useMemo(() => {
    const map = new Map<string, number>();
    guaibaLeituras.forEach((l) => map.set(l.date, l.nivel));
    return map;
  }, [guaibaLeituras]);

  // === Derivações ===
  const naturezasUnicas = useMemo(() => {
    const s = new Set<string>();
    ocorrencias.forEach((o) => o.natureza && s.add(o.natureza));
    return Array.from(s).sort();
  }, [ocorrencias]);

  const ocorrenciasFiltradas = useMemo(() => {
    if (naturezasSelecionadas.length === 0) return ocorrencias;
    return ocorrencias.filter((o) => o.natureza && naturezasSelecionadas.includes(o.natureza));
  }, [ocorrencias, naturezasSelecionadas]);

  const porNatureza = useMemo(() => {
    const map = new Map<string, number>();
    ocorrenciasFiltradas.forEach((o) => {
      const k = o.natureza || "Não informada";
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [ocorrenciasFiltradas]);

  const porDia = useMemo(() => {
    const map = new Map<string, number>();
    ocorrenciasFiltradas.forEach((o) => {
      const d = (o.created_at || "").slice(0, 10);
      map.set(d, (map.get(d) || 0) + 1);
    });
    const dates = Array.from(map.keys()).sort();
    return dates.map((d) => ({ date: d, ocorrencias: map.get(d) || 0 }));
  }, [ocorrenciasFiltradas]);

  const porPrioridade = useMemo(() => {
    const map = new Map<string, number>();
    ocorrenciasFiltradas.forEach((o) => {
      const k = o.prioridade || "nao_informada";
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [ocorrenciasFiltradas]);

  const porBairro = useMemo(() => {
    const map = new Map<string, number>();
    ocorrenciasFiltradas.forEach((o) => {
      const k = (o.bairro || "Não informado").trim();
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [ocorrenciasFiltradas]);

  const tempos = useMemo(() => {
    const ocMap = new Map(ocorrencias.map((o) => [o.id, o]));
    const porNat = new Map<string, number[]>();
    const todos: number[] = [];
    empenhos.forEach((e) => {
      if (!e.hora_despacho || !e.hora_finalizado) return;
      const ms = new Date(e.hora_finalizado).getTime() - new Date(e.hora_despacho).getTime();
      if (!isFinite(ms) || ms <= 0) return;
      const oc = ocMap.get(e.ocorrencia_id);
      if (!oc) return;
      if (naturezasSelecionadas.length > 0 && (!oc.natureza || !naturezasSelecionadas.includes(oc.natureza))) return;
      todos.push(ms);
      const k = oc.natureza || "Não informada";
      if (!porNat.has(k)) porNat.set(k, []);
      porNat.get(k)!.push(ms);
    });
    const medioGeral = todos.length ? todos.reduce((a, b) => a + b, 0) / todos.length : 0;
    const porNatArr = Array.from(porNat.entries())
      .map(([name, arr]) => ({
        name,
        atendimentos: arr.length,
        mediaMs: arr.reduce((a, b) => a + b, 0) / arr.length,
      }))
      .sort((a, b) => b.atendimentos - a.atendimentos);
    return { medioGeral, totalAtendimentos: todos.length, porNat: porNatArr };
  }, [empenhos, ocorrencias, naturezasSelecionadas]);

  // Cruzamento eventos extremos x ocorrências
  const cruzamento = useMemo(() => {
    const diasFiltrados = clima.dias.filter((d) => {
      if (usarChuva && !(d.mm >= chuvaMin && d.mm <= chuvaMax)) return false;
      if (usarVento && !(d.vento >= ventoMin && d.vento <= ventoMax)) return false;
      if (usarGuaiba) {
        const n = guaibaPorDia.get(d.date);
        if (n === undefined || !(n >= guaibaMin && n <= guaibaMax)) return false;
      }
      return true;
    });
    // Quando só Guaíba estiver ativo (e não houver dias do clima cobrindo), ainda usa as leituras manuais
    if (usarGuaiba && diasFiltrados.length === 0 && !usarChuva && !usarVento) {
      guaibaLeituras.forEach((l) => {
        if (l.date >= dataInicio && l.date <= dataFim && l.nivel >= guaibaMin && l.nivel <= guaibaMax) {
          diasFiltrados.push({ date: l.date, mm: 0, vento: 0 });
        }
      });
    }
    const setDias = new Set(diasFiltrados.map((d) => d.date));
    const ocsNoIntervalo = ocorrenciasFiltradas.filter((o) => setDias.has((o.created_at || "").slice(0, 10)));
    const porNat = new Map<string, number>();
    ocsNoIntervalo.forEach((o) => {
      const k = o.natureza || "Não informada";
      porNat.set(k, (porNat.get(k) || 0) + 1);
    });
    const setOcIds = new Set(ocsNoIntervalo.map((o) => o.id));
    const guarnicoes = empenhos.filter((e) => setOcIds.has(e.ocorrencia_id)).length;
    const equipesUnicas = new Set(empenhos.filter((e) => setOcIds.has(e.ocorrencia_id)).map((e) => e.equipe_id)).size;
    return {
      dias: diasFiltrados.map((d) => d.date),
      totalOcorrencias: ocsNoIntervalo.length,
      guarnicoesEmpregadas: guarnicoes,
      equipesUnicas,
      porNatureza: Array.from(porNat.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    };
  }, [clima.dias, usarChuva, chuvaMin, chuvaMax, usarVento, ventoMin, ventoMax, usarGuaiba, guaibaMin, guaibaMax, guaibaPorDia, guaibaLeituras, dataInicio, dataFim, ocorrenciasFiltradas, empenhos]);

  // Série combinada
  const serieCombinada = useMemo(() => {
    const ocMap = new Map(porDia.map((d) => [d.date, d.ocorrencias]));
    const climaMap = new Map(clima.dias.map((c) => [c.date, c]));
    const dates = Array.from(new Set([...porDia.map((d) => d.date), ...clima.dias.map((c) => c.date), ...guaibaLeituras.map((g) => g.date)])).sort();
    return dates.map((d) => ({
      date: d,
      ocorrencias: ocMap.get(d) || 0,
      chuva_mm: climaMap.get(d)?.mm || 0,
      vento_kmh: climaMap.get(d)?.vento || 0,
      guaiba_m: guaibaPorDia.get(d) ?? null,
    }));
  }, [porDia, clima.dias, guaibaLeituras, guaibaPorDia]);

  const toggleNatureza = (n: string) => {
    setNaturezasSelecionadas((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  };

  const filtrosAtivosLabel = [
    usarChuva ? `Chuva ${chuvaMin}-${chuvaMax}mm` : null,
    usarVento ? `Vento ${ventoMin}-${ventoMax}km/h` : null,
    usarGuaiba ? `Guaíba ${guaibaMin}-${guaibaMax}m` : null,
  ].filter(Boolean).join(" · ") || "—";

  // === Dimensionamento de equipes ===
  const [dimTipo, setDimTipo] = useState<"chuva" | "vento" | "guaiba">("chuva");
  const [dimPrevisao, setDimPrevisao] = useState<number>(100);
  const [dimJanela, setDimJanela] = useState<number>(24);
  const [dimFator, setDimFator] = useState<number>(30);
  const [dimTempoAtend, setDimTempoAtend] = useState<number>(40);
  const [dimSimultaneidade, setDimSimultaneidade] = useState<number>(3);
  const [dimEspera, setDimEspera] = useState<number>(2);
  const [dimCalculado, setDimCalculado] = useState(false);

  const dimLabels = useMemo(() => {
    switch (dimTipo) {
      case "vento":
        return { previsao: "Rajada máxima prevista (km/h)", fator: "Taxa histórica (ocorrências por km/h)", unidade: "km/h" };
      case "guaiba":
        return { previsao: "Nível previsto — Cais do Porto (m)", fator: "Taxa histórica (ocorrências por metro)", unidade: "m" };
      default:
        return { previsao: "Previsão acumulada (mm)", fator: "Taxa histórica (ocorrências por mm)", unidade: "mm" };
    }
  }, [dimTipo]);

  const dim = useMemo(() => {
    // Total de ocorrências esperadas (inserido diretamente pelo analista)
    const totalOcorrencias = dimFator;
    // Taxa média de chegada (ocorrências/hora)
    const lambda = dimJanela > 0 ? totalOcorrencias / dimJanela : 0;
    // Taxa de pico: multiplica pela simultaneidade (fator de rajada)
    const burstFactor = Number.isFinite(dimSimultaneidade) ? Math.max(1, dimSimultaneidade) : 1;
    const lambdaPico = lambda * burstFactor;
    // Capacidade de atendimento por equipe (atendimentos/hora)
    const mu = dimTempoAtend > 0 ? 60 / dimTempoAtend : 0;
    // Carga base (equipes ocupadas na média)
    const carga = mu > 0 ? lambda / mu : 0;
    // Carga de pico (equipes necessárias no pico)
    const cargaPico = mu > 0 ? lambdaPico / mu : 0;
    const Nbruto = cargaPico;
    const N = Math.max(1, Math.ceil(Nbruto));
    let nivel: { label: string; cor: string } = { label: "Baixo", cor: "bg-emerald-500" };
    if (N >= 4 && N <= 6) nivel = { label: "Médio", cor: "bg-amber-500" };
    else if (N >= 7 && N <= 10) nivel = { label: "Alto", cor: "bg-orange-500" };
    else if (N > 10) nivel = { label: "Crítico", cor: "bg-destructive" };
    return { totalOcorrencias, lambda, lambdaPico, mu, burstFactor, carga, cargaPico, Nbruto, N, nivel };
  }, [dimJanela, dimFator, dimTempoAtend, dimSimultaneidade]);

  const calcularDimensionamento = () => setDimCalculado(true);

  const handleDimNumber = (setter: (value: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value === "" ? 0 : e.currentTarget.valueAsNumber || 0);
    if (dimCalculado) setDimCalculado(true);
  };

  const exportarEventosExtremosCSV = () => {
    const rows: (string | number)[][] = [];
    rows.push(["Relatório", "Eventos Extremos"]);
    rows.push(["Período", `${inicioISO} a ${fimISO}`]);
    rows.push(["Filtros ativos", filtrosAtivosLabel]);
    rows.push([]);
    rows.push(["KPIs"]);
    rows.push(["Dias na faixa", cruzamento.dias.length]);
    rows.push(["Ocorrências", cruzamento.totalOcorrencias]);
    rows.push(["Guarnições empregadas", cruzamento.guarnicoesEmpregadas]);
    rows.push(["Equipes únicas", cruzamento.equipesUnicas]);
    rows.push([]);
    rows.push(["Dias com evento extremo"]);
    rows.push(["Data", "Chuva (mm)", "Vento rajada (km/h)", "Guaíba (m)"]);
    cruzamento.dias.forEach((d) => {
      const c = clima.dias.find((x) => x.date === d);
      rows.push([d, c?.mm ?? "", c?.vento ?? "", guaibaPorDia.get(d) ?? ""]);
    });
    rows.push([]);
    rows.push(["Ocorrências agregadas por natureza"]);
    rows.push(["Natureza", "Quantidade"]);
    cruzamento.porNatureza.forEach((n) => rows.push([n.name, n.value]));
    downloadCSV(`eventos-extremos_${dataInicio}_a_${dataFim}.csv`, rows);
    toast.success("CSV exportado");
  };

  return (
    <div className="space-y-6">
      {/* Filtros principais */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Período e naturezas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Data e hora início</Label>
              <div className="flex gap-2">
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="flex-1" />
                <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="w-32" placeholder="00:00" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Hora opcional — se vazia, considera 00:00.</p>
            </div>
            <div>
              <Label>Data e hora fim</Label>
              <div className="flex gap-2">
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="flex-1" />
                <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} className="w-32" placeholder="23:59" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Hora opcional — se vazia, considera 23:59.</p>
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Naturezas (vazio = todas)</Label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-auto p-2 border rounded-lg">
              {naturezasUnicas.length === 0 && (
                <span className="text-sm text-muted-foreground">Nenhuma natureza no período</span>
              )}
              {naturezasUnicas.map((n) => {
                const ativo = naturezasSelecionadas.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleNatureza(n)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      ativo ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {naturezasSelecionadas.length > 0 && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setNaturezasSelecionadas([])}>
                Limpar seleção
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Eventos extremos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Eventos Extremos
          </CardTitle>
          <CardDescription>
            Combine um ou mais critérios. Dias que atendem a TODOS os filtros ativos serão cruzados com as ocorrências.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chuva */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <CloudRain className="w-4 h-4" /> Chuva (mm/dia)
              </div>
              <Switch checked={usarChuva} onCheckedChange={setUsarChuva} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Mín.</Label>
                <Input type="number" value={chuvaMin} disabled={!usarChuva} onChange={(e) => setChuvaMin(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">Máx.</Label>
                <Input type="number" value={chuvaMax} disabled={!usarChuva} onChange={(e) => setChuvaMax(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Vento */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <Wind className="w-4 h-4" /> Vento — rajada máx. (km/h)
              </div>
              <Switch checked={usarVento} onCheckedChange={setUsarVento} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Mín.</Label>
                <Input type="number" value={ventoMin} disabled={!usarVento} onChange={(e) => setVentoMin(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">Máx.</Label>
                <Input type="number" value={ventoMax} disabled={!usarVento} onChange={(e) => setVentoMax(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Guaíba */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <Waves className="w-4 h-4" /> Nível do Guaíba — régua Cais do Porto (m)
              </div>
              <Switch checked={usarGuaiba} onCheckedChange={setUsarGuaiba} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Mín.</Label>
                <Input type="number" step="0.01" value={guaibaMin} disabled={!usarGuaiba} onChange={(e) => setGuaibaMin(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">Máx.</Label>
                <Input type="number" step="0.01" value={guaibaMax} disabled={!usarGuaiba} onChange={(e) => setGuaibaMax(Number(e.target.value))} />
              </div>
            </div>

            <div className="pt-2 border-t mt-2">
              <Label className="text-xs">Lançar leitura (data + nível em metros)</Label>
              <div className="flex gap-2 mt-1">
                <Input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className="flex-1" />
                <Input type="number" step="0.01" placeholder="ex: 3,20" value={novoNivel} onChange={(e) => setNovoNivel(e.target.value)} className="flex-1" />
                <Button type="button" size="icon" onClick={adicionarLeitura}><Plus className="w-4 h-4" /></Button>
              </div>
              {guaibaLeituras.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {guaibaLeituras
                    .filter((l) => l.date >= dataInicio && l.date <= dataFim)
                    .map((l) => (
                      <Badge key={l.date} variant="secondary" className="gap-1">
                        {l.date}: {l.nivel.toFixed(2)}m
                        <button onClick={() => removerLeitura(l.date)} className="ml-1 hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-2">
                Sem API pública aberta confiável para o Guaíba — lance manualmente as leituras (CPRM/Defesa Civil) que ficam salvas neste navegador.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={<Activity className="w-5 h-5" />} label="Ocorrências no período" value={ocorrenciasFiltradas.length} />
        <KPI icon={<Clock className="w-5 h-5" />} label="Tempo médio geral" value={formatHM(tempos.medioGeral)} />
        <KPI icon={<Users className="w-5 h-5" />} label="Atendimentos finalizados" value={tempos.totalAtendimentos} />
        <KPI icon={<AlertTriangle className="w-5 h-5" />} label="Dias em evento extremo" value={cruzamento.dias.length} />
      </div>

      <Tabs defaultValue="naturezas" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="naturezas">Por Natureza</TabsTrigger>
          <TabsTrigger value="temporal">Série Temporal</TabsTrigger>
          <TabsTrigger value="extremos">Eventos Extremos</TabsTrigger>
          <TabsTrigger value="tempos">Tempos de Atendimento</TabsTrigger>
          <TabsTrigger value="local">Por Local</TabsTrigger>
          <TabsTrigger value="dimensionamento">Dimensionamento</TabsTrigger>
        </TabsList>

        <TabsContent value="naturezas" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Ocorrências por Natureza</CardTitle></CardHeader>
            <CardContent>
              {porNatureza.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, porNatureza.length * 32)}>
                  <BarChart data={porNatureza} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={140} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Distribuição por Prioridade</CardTitle></CardHeader>
            <CardContent>
              {porPrioridade.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={porPrioridade} dataKey="value" nameKey="name" outerRadius={100} label>
                      {porPrioridade.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temporal">
          <Card>
            <CardHeader><CardTitle>Ocorrências por dia</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={porDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="ocorrencias" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extremos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> Cruzamento — {filtrosAtivosLabel}
                  </CardTitle>
                  <CardDescription>
                    Chuva e rajadas via Open-Meteo. Guaíba via lançamentos manuais.
                    {loadingClima && <span className="ml-2 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> carregando clima…</span>}
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={exportarEventosExtremosCSV}>
                  <Download className="w-4 h-4 mr-1" /> Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPI small icon={<AlertTriangle className="w-4 h-4" />} label="Dias na faixa" value={cruzamento.dias.length} />
                <KPI small icon={<Activity className="w-4 h-4" />} label="Ocorrências" value={cruzamento.totalOcorrencias} />
                <KPI small icon={<Users className="w-4 h-4" />} label="Guarnições empregadas" value={cruzamento.guarnicoesEmpregadas} />
                <KPI small icon={<Users className="w-4 h-4" />} label="Equipes únicas" value={cruzamento.equipesUnicas} />
              </div>

              {cruzamento.dias.length > 0 && (
                <div>
                  <Label className="text-xs">Datas com evento extremo</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cruzamento.dias.map((d) => (
                      <Badge key={d} variant="secondary">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {cruzamento.porNatureza.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Detalhamento por natureza</h4>
                  <ResponsiveContainer width="100%" height={Math.max(220, cruzamento.porNatureza.length * 30)}>
                    <BarChart data={cruzamento.porNatureza} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={140} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#06b6d4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Série diária — clima × ocorrências</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={serieCombinada}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="ocorrencias" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="chuva_mm" stroke="#06b6d4" strokeWidth={2} name="Chuva (mm)" />
                  <Line yAxisId="right" type="monotone" dataKey="vento_kmh" stroke="#f59e0b" strokeWidth={2} name="Vento (km/h)" />
                  <Line yAxisId="right" type="monotone" dataKey="guaiba_m" stroke="#ef4444" strokeWidth={2} name="Guaíba (m)" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tempos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KPI icon={<Clock className="w-5 h-5" />} label="Tempo médio geral" value={formatHM(tempos.medioGeral)} />
            <KPI icon={<Activity className="w-5 h-5" />} label="Total de atendimentos finalizados" value={tempos.totalAtendimentos} />
          </div>
          <Card>
            <CardHeader><CardTitle>Tempo médio de atendimento por natureza</CardTitle></CardHeader>
            <CardContent>
              {tempos.porNat.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sem atendimentos finalizados no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Natureza</th>
                        <th className="py-2">Atendimentos</th>
                        <th className="py-2">Tempo médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tempos.porNat.map((t) => (
                        <tr key={t.name} className="border-b">
                          <td className="py-2">{t.name}</td>
                          <td className="py-2">{t.atendimentos}</td>
                          <td className="py-2">{formatHM(t.mediaMs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="local">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> Top 10 Bairros</CardTitle>
            </CardHeader>
            <CardContent>
              {porBairro.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(280, porBairro.length * 32)}>
                  <BarChart data={porBairro} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={140} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dimensionamento" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" /> Dimensionamento de Equipes
              </CardTitle>
              <CardDescription>
                Modelo operacional: <strong>N = ⌈(λ × S) / μ⌉</strong>. λ = taxa média, S = fator de simultaneidade (rajada), μ = capacidade por equipe. Altere os parâmetros para recalcular.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Tipo de evento</Label>
                  <Select value={dimTipo} onValueChange={(v) => setDimTipo(v as "chuva" | "vento" | "guaiba")}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chuva">Chuva (mm)</SelectItem>
                      <SelectItem value="vento">Rajada de Vento (km/h)</SelectItem>
                      <SelectItem value="guaiba">Nível do Guaíba — Cais do Porto (m)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{dimLabels.previsao}</Label>
                  <Input type="number" step={dimTipo === "guaiba" ? 0.01 : 1} value={dimPrevisao} onChange={handleDimNumber(setDimPrevisao)} />
                </div>
                <div>
                  <Label className="text-xs">Janela temporal (h)</Label>
                  <Input type="number" step="1" value={dimJanela} onChange={handleDimNumber(setDimJanela)} />
                </div>
                <div>
                  <Label className="text-xs">Ocorrências esperadas (nº absoluto)</Label>
                  <Input type="number" step="1" min="0" value={dimFator} onChange={handleDimNumber(setDimFator)} />
                </div>
                <div>
                  <Label className="text-xs">Tempo médio de atendimento (min)</Label>
                  <Input type="number" step="1" value={dimTempoAtend} onChange={handleDimNumber(setDimTempoAtend)} />
                </div>
                <div>
                  <Label className="text-xs">Fator de simultaneidade (S)</Label>
                  <Input type="number" step="1" min="1" value={dimSimultaneidade} onChange={handleDimNumber(setDimSimultaneidade)} />
                </div>
                <div>
                  <Label className="text-xs">Espera máxima admissível (h)</Label>
                  <Input type="number" step="0.5" value={dimEspera} onChange={handleDimNumber(setDimEspera)} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={calcularDimensionamento} className="gap-2">
                  <Calculator className="w-4 h-4" /> Calcular
                </Button>
              </div>

              {dimCalculado && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <KPI small icon={<AlertTriangle className="w-4 h-4" />} label="Ocorrências esperadas" value={Math.round(dim.totalOcorrencias)} help="Número absoluto de ocorrências informado pelo analista com base na previsão meteorológica e experiência histórica." />
                    <KPI small icon={<Activity className="w-4 h-4" />} label="λ — taxa média (ocor./h)" value={dim.lambda.toFixed(2)} help="Taxa média de chegada de ocorrências por hora. Fórmula: ocorrências estimadas ÷ janela temporal." />
                    <KPI small icon={<Activity className="w-4 h-4" />} label="λ pico (ocor./h)" value={dim.lambdaPico.toFixed(2)} help="Taxa de pico: taxa média multiplicada pelo fator de simultaneidade (rajada). Fórmula: λ × S." />
                    <KPI small icon={<Clock className="w-4 h-4" />} label="μ — capacidade (atend./h)" value={dim.mu.toFixed(2)} help="Capacidade média de uma equipe atender ocorrências por hora. Fórmula: 60 ÷ tempo médio de atendimento em minutos." />
                    <KPI small icon={<Users className="w-4 h-4" />} label="Carga pico (λ×S/μ)" value={dim.cargaPico.toFixed(2)} help="Equipes necessárias para atender a demanda de pico. Fórmula: λ_pico ÷ μ. Este valor define o N mínimo." />
                  </div>

                  <div className="rounded-lg border p-4 flex items-center justify-between flex-wrap gap-3 bg-muted/30">
                    <div>
                      <div className="text-xs text-muted-foreground">N mínimo (arredondado)</div>
                      <div className="text-3xl font-bold">{dim.N} equipe{dim.N === 1 ? "" : "s"}</div>
                      <div className="text-xs text-muted-foreground mt-1">N bruto = {dim.Nbruto.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Nível operacional</span>
                      <span className={`px-3 py-1 rounded-full text-sm text-white ${dim.nivel.cor}`}>{dim.nivel.label}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Critério: Baixo (1–3) · Médio (4–6) · Alto (7–10) · Crítico (&gt;10). A espera máxima ({dimEspera}h) serve como referência operacional. Aumente S para cenários com rajadas concentradas.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isLoading && (
        <div className="text-center text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 inline animate-spin mr-1" /> Carregando dados…
        </div>
      )}
    </div>
  );
}

function KPI({ icon, label, value, small, help }: { icon: React.ReactNode; label: string; value: string | number; small?: boolean; help?: string }) {
  return (
    <Card>
      <CardContent className={small ? "p-3" : "p-4"}>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          {icon}<span>{label}</span>
          {help && (
            <TooltipProvider delayDuration={150}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 cursor-help" aria-label={`Explicação: ${label}`} />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-relaxed">
                  <p>{help}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </div>
        <div className={`font-bold mt-1 ${small ? "text-lg" : "text-2xl"}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
