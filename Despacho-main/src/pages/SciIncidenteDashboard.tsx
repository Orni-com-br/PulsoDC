import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FlaskConical, Plus, CheckCircle2, Clock, AlertCircle, UserCog, Boxes, Target, ListChecks, RotateCw, Lock, FileDown, Users, Trash2, Grid3x3, LogOut } from "lucide-react";
import { gerarPaiPdf } from "@/lib/sciPaiPdf";

interface Incidente { id: string; codigo: string; nome: string; tipo_evento: string; status: string; ambiente: string; descricao: string | null; data_abertura: string; comandante_id: string | null; }
interface Papel { id: string; funcao: string; nome_pessoa: string | null; user_id: string | null; agencia_id: string | null; }
interface Periodo { id: string; numero: number; inicio: string; fim: string | null; status: string; }
interface Objetivo { id: string; descricao: string; status: string; periodo_id: string | null; }
interface Recurso { id: string; descricao: string; categoria: string; tipo_capacidade: number | null; status: string; checkin_em: string | null; agencia_id: string | null; desmobilizado_em?: string | null; desmob_motivo?: string | null; desmob_condicao_retorno?: string | null; desmob_licoes_aprendidas?: string | null; }
interface Agencia { id: string; nome: string; sigla: string; }
interface Responsavel { id: string; agencia_id: string; nome: string; cargo: string | null; funcao: string | null; telefone: string | null; email: string | null; radio_canal: string | null; observacoes: string | null; }
interface TLEvent { id: string; descricao: string; categoria: string | null; autor_nome: string | null; created_at: string; }

const FUNCOES = [
  "Comandante do Incidente",
  "Oficial de Segurança",
  "Oficial de Ligação",
  "Oficial de Informação Pública (PIO)",
  "Chefe da Seção de Operações",
  "Chefe da Seção de Planejamento",
  "Chefe da Seção de Logística",
  "Chefe da Seção de Administração/Finanças",
];

export default function SciIncidenteDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [inc, setInc] = useState<Incidente | null>(null);
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [timeline, setTimeline] = useState<TLEvent[]>([]);

  const periodoAtual = useMemo(() => periodos.find(p => p.status === "aberto") || periodos[0], [periodos]);

  const log = async (descricao: string, categoria = "evento") => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("timeline_sci").insert({
      incidente_id: id, periodo_id: periodoAtual?.id, autor_id: user?.id,
      autor_nome: user?.email, categoria, descricao,
    });
  };

  const fetchAll = async () => {
    if (!id) return;
    const [i, p, per, o, r, a, t, resp] = await Promise.all([
      supabase.from("incidentes_sci").select("*").eq("id", id).maybeSingle(),
      supabase.from("papeis_sci").select("*").eq("incidente_id", id),
      supabase.from("periodos_operacionais").select("*").eq("incidente_id", id).order("numero"),
      supabase.from("objetivos_sci").select("*").eq("incidente_id", id).order("created_at"),
      supabase.from("recursos_sci").select("*").eq("incidente_id", id).order("created_at"),
      supabase.from("agencias_sci").select("*").order("sigla"),
      supabase.from("timeline_sci").select("*").eq("incidente_id", id).order("created_at", { ascending: false }).limit(200),
      supabase.from("responsaveis_agencia").select("*").or(`incidente_id.eq.${id},incidente_id.is.null`).order("nome"),
    ]);
    setInc(i.data as any);
    setPapeis((p.data as any) || []);
    setPeriodos((per.data as any) || []);
    setObjetivos((o.data as any) || []);
    setRecursos((r.data as any) || []);
    setAgencias((a.data as any) || []);
    setTimeline((t.data as any) || []);
    setResponsaveis((resp.data as any) || []);
  };

  useEffect(() => { fetchAll(); }, [id]);

  // ----- Estatísticas
  const stats = useMemo(() => ({
    disponivel: recursos.filter(r => r.status === "disponivel").length,
    em_uso: recursos.filter(r => r.status === "em_uso").length,
    fora: recursos.filter(r => r.status === "fora_servico").length,
    objCumpridos: objetivos.filter(o => o.status === "cumprido").length,
    objTotal: objetivos.length,
  }), [recursos, objetivos]);

  // ----- Papel form
  const [pFuncao, setPFuncao] = useState(FUNCOES[1]);
  const [pNome, setPNome] = useState("");
  const [pAgencia, setPAgencia] = useState<string>("none");
  const addPapel = async () => {
    if (!pNome.trim()) return;
    await supabase.from("papeis_sci").insert({
      incidente_id: id, nome_pessoa: pNome, funcao: pFuncao,
      agencia_id: pAgencia === "none" ? null : pAgencia,
    });
    await log(`Designado ${pNome} como ${pFuncao}`, "comando");
    setPNome(""); fetchAll();
  };
  const removePapel = async (pid: string, nome: string) => {
    await supabase.from("papeis_sci").delete().eq("id", pid);
    await log(`Removido papel: ${nome}`, "comando");
    fetchAll();
  };

  // ----- Objetivo form
  const [oDesc, setODesc] = useState("");
  const addObjetivo = async () => {
    if (!oDesc.trim()) return;
    await supabase.from("objetivos_sci").insert({
      incidente_id: id, periodo_id: periodoAtual?.id, descricao: oDesc,
    });
    await log(`Objetivo registrado: ${oDesc}`, "planejamento");
    setODesc(""); fetchAll();
  };
  const updateObjetivo = async (oid: string, status: string, desc: string) => {
    await supabase.from("objetivos_sci").update({ status }).eq("id", oid);
    await log(`Objetivo "${desc}" → ${status}`, "planejamento");
    fetchAll();
  };

  // ----- Recurso form
  const [rDesc, setRDesc] = useState("");
  const [rCat, setRCat] = useState("simples");
  const [rTipo, setRTipo] = useState<string>("3");
  const [rAg, setRAg] = useState<string>("none");
  const addRecurso = async () => {
    if (!rDesc.trim()) return;
    await supabase.from("recursos_sci").insert({
      incidente_id: id, descricao: rDesc, categoria: rCat,
      tipo_capacidade: parseInt(rTipo),
      agencia_id: rAg === "none" ? null : rAg,
    });
    await log(`Recurso cadastrado: ${rDesc}`, "logistica");
    setRDesc(""); fetchAll();
  };
  const checkin = async (r: Recurso) => {
    await supabase.from("recursos_sci").update({ checkin_em: new Date().toISOString() }).eq("id", r.id);
    await log(`Check-in (ICS 211): ${r.descricao}`, "logistica");
    fetchAll();
  };
  const setStatusRec = async (r: Recurso, status: string) => {
    if (status === "em_uso" && !r.checkin_em) {
      toast({ title: "Check-in pendente", description: "Faça o Check-in (ICS 211) antes de alocar o recurso.", variant: "destructive" });
      return;
    }
    await supabase.from("recursos_sci").update({ status }).eq("id", r.id);
    await log(`Recurso "${r.descricao}" → ${status}`, "logistica");
    fetchAll();
  };

  // ----- Agência form
  const [aNome, setANome] = useState(""); const [aSigla, setASigla] = useState(""); const [aTipo, setATipo] = useState("");
  const addAgencia = async () => {
    if (!aNome || !aSigla) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("agencias_sci").insert({ nome: aNome, sigla: aSigla, tipo: aTipo, created_by: user?.id });
    setANome(""); setASigla(""); setATipo(""); fetchAll();
  };

  // ----- Responsáveis por agência
  const [respForm, setRespForm] = useState({ agencia_id: "", nome: "", cargo: "", funcao: "", telefone: "", email: "", radio_canal: "", observacoes: "" });
  const addResponsavel = async () => {
    if (!respForm.agencia_id || !respForm.nome.trim()) {
      toast({ title: "Dados incompletos", description: "Selecione a agência e informe o nome.", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("responsaveis_agencia").insert({
      ...respForm, incidente_id: id, created_by: user?.id,
      cargo: respForm.cargo || null, funcao: respForm.funcao || null,
      telefone: respForm.telefone || null, email: respForm.email || null,
      radio_canal: respForm.radio_canal || null, observacoes: respForm.observacoes || null,
    });
    const ag = agencias.find(a => a.id === respForm.agencia_id);
    await log(`Responsável cadastrado: ${respForm.nome} (${ag?.sigla || "—"})`, "comando");
    setRespForm({ agencia_id: respForm.agencia_id, nome: "", cargo: "", funcao: "", telefone: "", email: "", radio_canal: "", observacoes: "" });
    fetchAll();
  };
  const removeResponsavel = async (r: Responsavel) => {
    await supabase.from("responsaveis_agencia").delete().eq("id", r.id);
    await log(`Responsável removido: ${r.nome}`, "comando");
    fetchAll();
  };

  // ----- Desmobilização
  const [desmobAlvo, setDesmobAlvo] = useState<Recurso | null>(null);
  const [desmobForm, setDesmobForm] = useState({ motivo: "", condicao_retorno: "Operacional", licoes: "" });
  const abrirDesmob = (r: Recurso) => {
    setDesmobAlvo(r);
    setDesmobForm({ motivo: "", condicao_retorno: "Operacional", licoes: "" });
  };
  const confirmarDesmob = async () => {
    if (!desmobAlvo) return;
    if (!desmobForm.motivo.trim()) {
      toast({ title: "Motivo obrigatório", description: "Informe o motivo da desmobilização.", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("recursos_sci").update({
      status: "desmobilizado",
      desmobilizado_em: new Date().toISOString(),
      desmobilizado_por: user?.id,
      desmob_motivo: desmobForm.motivo,
      desmob_condicao_retorno: desmobForm.condicao_retorno,
      desmob_licoes_aprendidas: desmobForm.licoes || null,
    }).eq("id", desmobAlvo.id);
    await log(`Desmobilização (ICS 221): ${desmobAlvo.descricao} · ${desmobForm.motivo} · Retorno ${desmobForm.condicao_retorno}`, "logistica");
    setDesmobAlvo(null);
    fetchAll();
  };

  // ----- Matriz COPAI (Comando, Operações, Planejamento, Administração, Informação/Ligação/Segurança)
  const COPAI_COLS = [
    { key: "comando", label: "Comando", match: ["Comandante"] },
    { key: "operacoes", label: "Operações", match: ["Operações"] },
    { key: "planejamento", label: "Planejamento", match: ["Planejamento"] },
    { key: "logistica", label: "Logística", match: ["Logística"] },
    { key: "admin", label: "Adm/Finanças", match: ["Administração", "Finanças"] },
    { key: "seguranca", label: "Segurança", match: ["Segurança"] },
    { key: "ligacao", label: "Ligação", match: ["Ligação"] },
    { key: "pio", label: "Inf. Pública", match: ["Informação Pública", "PIO"] },
  ];
  const matrizCopai = useMemo(() => {
    const ags = agencias.filter(a => papeis.some(p => p.agencia_id === a.id) || responsaveis.some(r => r.agencia_id === a.id) || recursos.some(r => r.agencia_id === a.id));
    return ags.map(ag => {
      const cells: Record<string, string[]> = {};
      COPAI_COLS.forEach(c => {
        const nomes = papeis
          .filter(p => p.agencia_id === ag.id && c.match.some(m => p.funcao.includes(m)))
          .map(p => p.nome_pessoa || "—");
        cells[c.key] = nomes;
      });
      return { ag, cells, totalRecursos: recursos.filter(r => r.agencia_id === ag.id).length, totalResp: responsaveis.filter(r => r.agencia_id === ag.id).length };
    });
  }, [agencias, papeis, responsaveis, recursos]);

  // ----- Export PAI
  const exportarPai = () => {
    if (!inc || !periodoAtual) {
      toast({ title: "Sem período operacional", description: "Não há PO atual para exportar.", variant: "destructive" });
      return;
    }
    gerarPaiPdf({ incidente: inc, periodo: periodoAtual, papeis, objetivos, recursos, agencias, responsaveis });
    log(`PAI exportado em PDF (PO #${periodoAtual.numero})`, "planejamento");
  };

  // ----- Períodos
  const encerrarPeriodo = async () => {
    if (!periodoAtual) return;
    await supabase.from("periodos_operacionais").update({ status: "encerrado", fim: new Date().toISOString() }).eq("id", periodoAtual.id);
    const proxNum = Math.max(...periodos.map(p => p.numero), 0) + 1;
    const { data: novo } = await supabase.from("periodos_operacionais").insert({ incidente_id: id, numero: proxNum }).select().single();
    // Clonar objetivos pendentes
    const pendentes = objetivos.filter(o => o.status !== "cumprido" && o.periodo_id === periodoAtual.id);
    if (pendentes.length && novo) {
      await supabase.from("objetivos_sci").insert(pendentes.map(o => ({
        incidente_id: id, periodo_id: novo.id, descricao: o.descricao, status: "pendente",
      })));
    }
    await log(`Encerrado PO #${periodoAtual.numero} · iniciado PO #${proxNum} (${pendentes.length} objetivo(s) clonado(s))`, "planejamento");
    fetchAll();
  };

  const encerrarIncidente = async () => {
    if (!confirm("Encerrar definitivamente este incidente?")) return;
    await supabase.from("incidentes_sci").update({ status: "encerrado", data_fechamento: new Date().toISOString() }).eq("id", id);
    await log("Incidente encerrado", "comando");
    fetchAll();
  };

  if (!inc) return <p className="text-muted-foreground">Carregando incidente...</p>;

  const isSimulado = inc.ambiente === "simulado";

  return (
    <div className="space-y-5 max-w-7xl mx-auto relative">
      {isSimulado && (
        <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
          <div className="absolute -rotate-12 top-1/4 left-0 right-0 text-center text-red-600/15 font-black text-6xl tracking-wider select-none">
            EXERCÍCIO · SEM VALOR OPERACIONAL EMERGENCIAL
          </div>
          <div className="absolute rotate-12 bottom-1/4 left-0 right-0 text-center text-red-600/15 font-black text-6xl tracking-wider select-none">
            EXERCÍCIO · SEM VALOR OPERACIONAL EMERGENCIAL
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/sci")}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
        <code className="text-xs bg-muted px-2 py-1 rounded">{inc.codigo}</code>
        {isSimulado && <Badge variant="destructive" className="gap-1"><FlaskConical className="w-3 h-3" /> EXERCÍCIO</Badge>}
        <Badge variant={inc.status === "ativo" ? "default" : "secondary"}>{inc.status}</Badge>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarPai}>
            <FileDown className="w-4 h-4 mr-1" /> PDF do PAI
          </Button>
          {inc.status === "ativo" && (
            <Button variant="outline" size="sm" onClick={encerrarIncidente}>
              <Lock className="w-4 h-4 mr-1" /> Encerrar incidente
            </Button>
          )}
        </div>
      </div>

      <Card className="p-5">
        <h1 className="text-2xl font-bold">{inc.nome}</h1>
        <p className="text-sm text-muted-foreground">{inc.tipo_evento} · Aberto em {new Date(inc.data_abertura).toLocaleString("pt-BR")}</p>
        {inc.descricao && <p className="mt-2 text-sm">{inc.descricao}</p>}
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">PO Atual</div><div className="text-2xl font-bold">#{periodoAtual?.numero ?? "-"}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Disponíveis</div><div className="text-2xl font-bold text-green-600">{stats.disponivel}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Em uso</div><div className="text-2xl font-bold text-blue-600">{stats.em_uso}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Fora de serviço</div><div className="text-2xl font-bold text-red-600">{stats.fora}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Objetivos</div><div className="text-2xl font-bold">{stats.objCumpridos}/{stats.objTotal}</div></Card>
      </div>

      <Tabs defaultValue="comando">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="comando"><UserCog className="w-4 h-4 mr-1" /> Comando</TabsTrigger>
          <TabsTrigger value="agencias"><Users className="w-4 h-4 mr-1" /> Agências / Responsáveis</TabsTrigger>
          <TabsTrigger value="objetivos"><Target className="w-4 h-4 mr-1" /> Objetivos (PAI)</TabsTrigger>
          <TabsTrigger value="recursos"><Boxes className="w-4 h-4 mr-1" /> Recursos / Check-in</TabsTrigger>
          <TabsTrigger value="copai"><Grid3x3 className="w-4 h-4 mr-1" /> Matriz COPAI</TabsTrigger>
          <TabsTrigger value="desmob"><LogOut className="w-4 h-4 mr-1" /> Desmobilização</TabsTrigger>
          <TabsTrigger value="periodos"><RotateCw className="w-4 h-4 mr-1" /> Períodos Operacionais</TabsTrigger>
          <TabsTrigger value="timeline"><ListChecks className="w-4 h-4 mr-1" /> Timeline (ICS 214)</TabsTrigger>
        </TabsList>

        {/* COMANDO */}
        <TabsContent value="comando" className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Designar Staff</h3>
            <div className="grid md:grid-cols-4 gap-2">
              <Input placeholder="Nome da pessoa" value={pNome} onChange={e => setPNome(e.target.value)} />
              <Select value={pFuncao} onValueChange={setPFuncao}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FUNCOES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={pAgencia} onValueChange={setPAgencia}>
                <SelectTrigger><SelectValue placeholder="Agência (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— sem agência —</SelectItem>
                  {agencias.map(a => <SelectItem key={a.id} value={a.id}>{a.sigla}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={addPapel}><Plus className="w-4 h-4 mr-1" /> Designar</Button>
            </div>
          </Card>
          <div className="grid md:grid-cols-2 gap-2">
            {papeis.map(p => (
              <Card key={p.id} className="p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{p.nome_pessoa || "—"}</div>
                  <div className="text-xs text-muted-foreground">{p.funcao}{p.agencia_id ? ` · ${agencias.find(a => a.id === p.agencia_id)?.sigla}` : ""}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removePapel(p.id, p.nome_pessoa || "")}>Remover</Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* AGÊNCIAS / RESPONSÁVEIS */}
        <TabsContent value="agencias" className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Cadastrar agência / órgão parceiro</h3>
            <div className="grid md:grid-cols-4 gap-2">
              <Input placeholder="Nome (ex: Corpo de Bombeiros)" value={aNome} onChange={e => setANome(e.target.value)} />
              <Input placeholder="Sigla (ex: CBMSC)" value={aSigla} onChange={e => setASigla(e.target.value)} />
              <Input placeholder="Tipo (ex: Saúde, Segurança)" value={aTipo} onChange={e => setATipo(e.target.value)} />
              <Button onClick={addAgencia}><Plus className="w-4 h-4 mr-1" /> Adicionar agência</Button>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold">Cadastrar responsável por órgão</h3>
              <p className="text-xs text-muted-foreground">Representante / ponto focal / oficial de ligação de cada agência em operação no incidente.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-2">
              <Select value={respForm.agencia_id} onValueChange={v => setRespForm({ ...respForm, agencia_id: v })}>
                <SelectTrigger><SelectValue placeholder="Agência *" /></SelectTrigger>
                <SelectContent>
                  {agencias.map(a => <SelectItem key={a.id} value={a.id}>{a.sigla} — {a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Nome completo *" value={respForm.nome} onChange={e => setRespForm({ ...respForm, nome: e.target.value })} />
              <Input placeholder="Cargo (ex: Cap. PM)" value={respForm.cargo} onChange={e => setRespForm({ ...respForm, cargo: e.target.value })} />
              <Input placeholder="Função no incidente (ex: Repr. operacional)" value={respForm.funcao} onChange={e => setRespForm({ ...respForm, funcao: e.target.value })} />
              <Input placeholder="Telefone" value={respForm.telefone} onChange={e => setRespForm({ ...respForm, telefone: e.target.value })} />
              <Input placeholder="E-mail" value={respForm.email} onChange={e => setRespForm({ ...respForm, email: e.target.value })} />
              <Input placeholder="Canal de rádio" value={respForm.radio_canal} onChange={e => setRespForm({ ...respForm, radio_canal: e.target.value })} />
              <Textarea className="md:col-span-2" placeholder="Observações" rows={1} value={respForm.observacoes} onChange={e => setRespForm({ ...respForm, observacoes: e.target.value })} />
            </div>
            <Button onClick={addResponsavel}><Plus className="w-4 h-4 mr-1" /> Cadastrar responsável</Button>
          </Card>

          <div className="space-y-3">
            {agencias.length === 0 && <p className="text-sm text-muted-foreground">Cadastre uma agência para começar.</p>}
            {agencias.map(ag => {
              const lista = responsaveis.filter(r => r.agencia_id === ag.id);
              return (
                <Card key={ag.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold">{ag.sigla}</span>
                      <span className="text-sm text-muted-foreground"> · {ag.nome}</span>
                    </div>
                    <Badge variant="outline">{lista.length} responsável(eis)</Badge>
                  </div>
                  {lista.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem responsáveis cadastrados.</p>
                  ) : (
                    <div className="space-y-2">
                      {lista.map(r => (
                        <div key={r.id} className="flex items-start justify-between gap-3 border-t pt-2">
                          <div className="text-sm min-w-0">
                            <div className="font-medium">{r.nome}{r.cargo ? ` — ${r.cargo}` : ""}</div>
                            <div className="text-xs text-muted-foreground">
                              {r.funcao && <>📌 {r.funcao} · </>}
                              {r.telefone && <>📞 {r.telefone} · </>}
                              {r.email && <>✉ {r.email} · </>}
                              {r.radio_canal && <>📻 {r.radio_canal}</>}
                            </div>
                            {r.observacoes && <div className="text-xs italic mt-1">{r.observacoes}</div>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeResponsavel(r)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="objetivos" className="space-y-4">
          <Card className="p-4 space-y-2">
            <h3 className="font-semibold">Novo objetivo · PO #{periodoAtual?.numero}</h3>
            <div className="flex gap-2">
              <Textarea value={oDesc} onChange={e => setODesc(e.target.value)} placeholder="Ex: Evacuar 100% dos moradores em cota inferior a 3m" rows={2} />
              <Button onClick={addObjetivo}><Plus className="w-4 h-4" /></Button>
            </div>
          </Card>
          <div className="space-y-2">
            {objetivos.filter(o => o.periodo_id === periodoAtual?.id).map(o => (
              <Card key={o.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {o.status === "cumprido" ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> :
                   o.status === "em_andamento" ? <Clock className="w-5 h-5 text-blue-600 shrink-0" /> :
                   <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />}
                  <span className="text-sm">{o.descricao}</span>
                </div>
                <Select value={o.status} onValueChange={(v) => updateObjetivo(o.id, v, o.descricao)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="cumprido">Cumprido</SelectItem>
                  </SelectContent>
                </Select>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* RECURSOS */}
        <TabsContent value="recursos" className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Cadastrar agência parceira</h3>
            <div className="grid md:grid-cols-4 gap-2">
              <Input placeholder="Nome" value={aNome} onChange={e => setANome(e.target.value)} />
              <Input placeholder="Sigla" value={aSigla} onChange={e => setASigla(e.target.value)} />
              <Input placeholder="Tipo (ex: Saúde)" value={aTipo} onChange={e => setATipo(e.target.value)} />
              <Button onClick={addAgencia}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
            </div>
            {agencias.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {agencias.map(a => <Badge key={a.id} variant="outline">{a.sigla}</Badge>)}
              </div>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Cadastrar recurso</h3>
            <div className="grid md:grid-cols-5 gap-2">
              <Input className="md:col-span-2" placeholder="Descrição (ex: ABT-12 / Equipe SAMU 03)" value={rDesc} onChange={e => setRDesc(e.target.value)} />
              <Select value={rCat} onValueChange={setRCat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples">Recurso Simples</SelectItem>
                  <SelectItem value="forca_tarefa">Força Tarefa</SelectItem>
                  <SelectItem value="equipe_ataque">Equipe de Ataque</SelectItem>
                </SelectContent>
              </Select>
              <Select value={rTipo} onValueChange={setRTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tipo 1 (máx.)</SelectItem>
                  <SelectItem value="2">Tipo 2</SelectItem>
                  <SelectItem value="3">Tipo 3</SelectItem>
                  <SelectItem value="4">Tipo 4 (mín.)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={rAg} onValueChange={setRAg}>
                <SelectTrigger><SelectValue placeholder="Agência" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— sem agência —</SelectItem>
                  {agencias.map(a => <SelectItem key={a.id} value={a.id}>{a.sigla}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addRecurso}><Plus className="w-4 h-4 mr-1" /> Cadastrar recurso</Button>
          </Card>

          <div className="space-y-2">
            {recursos.filter(r => r.status !== "desmobilizado").map(r => (
              <Card key={r.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium">{r.descricao}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.categoria.replace("_", " ")} · Tipo {r.tipo_capacidade}
                    {r.agencia_id ? ` · ${agencias.find(a => a.id === r.agencia_id)?.sigla}` : ""}
                    {r.checkin_em ? ` · Check-in ${new Date(r.checkin_em).toLocaleTimeString("pt-BR")}` : " · ⚠ sem check-in"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!r.checkin_em && <Button size="sm" variant="outline" onClick={() => checkin(r)}>Check-in (211)</Button>}
                  <Select value={r.status} onValueChange={v => setStatusRec(r, v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponivel">Disponível</SelectItem>
                      <SelectItem value="em_uso">Em uso</SelectItem>
                      <SelectItem value="fora_servico">Fora de serviço</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => abrirDesmob(r)} title="Desmobilizar (ICS 221)">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* MATRIZ COPAI */}
        <TabsContent value="copai" className="space-y-3">
          <Card className="p-4">
            <h3 className="font-semibold">Matriz COPAI — Agência × Responsabilidade</h3>
            <p className="text-xs text-muted-foreground">Cruzamento de quais agências assumem cada função SCI no incidente. Baseado nos papéis designados, responsáveis e recursos alocados.</p>
          </Card>
          {matrizCopai.length === 0 ? (
            <Card className="p-4"><p className="text-sm text-muted-foreground">Nenhuma agência envolvida ainda. Cadastre agências e designe papéis para popular a matriz.</p></Card>
          ) : (
            <Card className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 sticky left-0 bg-muted">Agência</th>
                    {COPAI_COLS.map(c => <th key={c.key} className="text-left p-2">{c.label}</th>)}
                    <th className="text-left p-2">Responsáveis</th>
                    <th className="text-left p-2">Recursos</th>
                  </tr>
                </thead>
                <tbody>
                  {matrizCopai.map(({ ag, cells, totalRecursos, totalResp }) => (
                    <tr key={ag.id} className="border-t">
                      <td className="p-2 font-medium sticky left-0 bg-background">{ag.sigla}</td>
                      {COPAI_COLS.map(c => (
                        <td key={c.key} className="p-2 align-top">
                          {cells[c.key].length === 0
                            ? <span className="text-muted-foreground">—</span>
                            : cells[c.key].map((n, i) => <div key={i}>{n}</div>)}
                        </td>
                      ))}
                      <td className="p-2"><Badge variant="outline">{totalResp}</Badge></td>
                      <td className="p-2"><Badge variant="outline">{totalRecursos}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        {/* DESMOBILIZAÇÃO */}
        <TabsContent value="desmob" className="space-y-3">
          <Card className="p-4">
            <h3 className="font-semibold">Desmobilização formal de recursos (ICS 221)</h3>
            <p className="text-xs text-muted-foreground">Encerre formalmente a participação de recursos no incidente registrando motivo, condição de retorno e lições aprendidas.</p>
          </Card>

          <Card className="p-4">
            <h4 className="font-medium mb-2">Recursos ativos</h4>
            {recursos.filter(r => r.status !== "desmobilizado").length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum recurso ativo.</p>
            ) : (
              <div className="space-y-2">
                {recursos.filter(r => r.status !== "desmobilizado").map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-2 border-t pt-2">
                    <div className="text-sm">
                      <div className="font-medium">{r.descricao}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.agencia_id ? `${agencias.find(a => a.id === r.agencia_id)?.sigla} · ` : ""}{r.status}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => abrirDesmob(r)}>
                      <LogOut className="w-4 h-4 mr-1" /> Desmobilizar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h4 className="font-medium mb-2">Recursos desmobilizados</h4>
            {recursos.filter(r => r.status === "desmobilizado").length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum recurso desmobilizado.</p>
            ) : (
              <div className="space-y-3">
                {recursos.filter(r => r.status === "desmobilizado").map(r => (
                  <div key={r.id} className="border-t pt-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{r.descricao} {r.agencia_id && <span className="text-xs text-muted-foreground">· {agencias.find(a => a.id === r.agencia_id)?.sigla}</span>}</div>
                      <span className="text-xs text-muted-foreground">{r.desmobilizado_em && new Date(r.desmobilizado_em).toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="text-xs mt-1"><strong>Motivo:</strong> {r.desmob_motivo || "—"}</div>
                    <div className="text-xs"><strong>Retorno:</strong> {r.desmob_condicao_retorno || "—"}</div>
                    {r.desmob_licoes_aprendidas && <div className="text-xs italic mt-1"><strong>Lições aprendidas:</strong> {r.desmob_licoes_aprendidas}</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>



        {/* PERIODOS */}
        <TabsContent value="periodos" className="space-y-3">
          <Card className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold">Período Operacional atual</h3>
              <p className="text-sm text-muted-foreground">PO #{periodoAtual?.numero} · iniciado em {periodoAtual ? new Date(periodoAtual.inicio).toLocaleString("pt-BR") : "-"}</p>
            </div>
            <Button onClick={encerrarPeriodo} disabled={!periodoAtual || periodoAtual.status !== "aberto"}>
              <RotateCw className="w-4 h-4 mr-1" /> Encerrar PO e iniciar próximo
            </Button>
          </Card>
          <div className="space-y-2">
            {periodos.map(p => (
              <Card key={p.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">PO #{p.numero}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.inicio).toLocaleString("pt-BR")} → {p.fim ? new Date(p.fim).toLocaleString("pt-BR") : "em curso"}
                  </div>
                </div>
                <Badge variant={p.status === "aberto" ? "default" : "secondary"}>{p.status}</Badge>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline" className="space-y-2">
          <p className="text-sm text-muted-foreground">Registro automático de atividades (compila ICS 214 ao encerrar o PO).</p>
          {timeline.map(ev => (
            <Card key={ev.id} className="p-3 text-sm flex gap-3">
              <div className="text-xs text-muted-foreground shrink-0 w-32">{new Date(ev.created_at).toLocaleString("pt-BR")}</div>
              <div className="flex-1">
                {ev.categoria && <Badge variant="outline" className="mr-2 text-[10px]">{ev.categoria}</Badge>}
                {ev.descricao}
                {ev.autor_nome && <span className="text-xs text-muted-foreground"> · {ev.autor_nome}</span>}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!desmobAlvo} onOpenChange={(o) => !o && setDesmobAlvo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desmobilizar recurso (ICS 221)</DialogTitle>
          </DialogHeader>
          {desmobAlvo && (
            <div className="space-y-3">
              <div className="text-sm">
                <strong>{desmobAlvo.descricao}</strong>
                {desmobAlvo.agencia_id && <span className="text-muted-foreground"> · {agencias.find(a => a.id === desmobAlvo.agencia_id)?.sigla}</span>}
              </div>
              <div>
                <Label>Motivo da desmobilização *</Label>
                <Textarea rows={2} value={desmobForm.motivo} onChange={e => setDesmobForm({ ...desmobForm, motivo: e.target.value })} placeholder="Ex: Missão concluída / Substituição por equipe de revezamento" />
              </div>
              <div>
                <Label>Condição de retorno do recurso</Label>
                <Select value={desmobForm.condicao_retorno} onValueChange={v => setDesmobForm({ ...desmobForm, condicao_retorno: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operacional">Operacional (apto a nova missão)</SelectItem>
                    <SelectItem value="Manutenção">Necessita manutenção</SelectItem>
                    <SelectItem value="Reposição">Necessita reposição de insumos</SelectItem>
                    <SelectItem value="Indisponível">Indisponível / avariado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lições aprendidas</Label>
                <Textarea rows={3} value={desmobForm.licoes} onChange={e => setDesmobForm({ ...desmobForm, licoes: e.target.value })} placeholder="O que funcionou, o que pode ser melhorado, recomendações..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDesmobAlvo(null)}>Cancelar</Button>
            <Button onClick={confirmarDesmob}>Confirmar desmobilização</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
