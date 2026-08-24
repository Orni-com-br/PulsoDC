import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Plus, FlaskConical, ArrowRight } from "lucide-react";

interface Incidente {
  id: string;
  codigo: string;
  nome: string;
  tipo_evento: string;
  status: string;
  ambiente: string;
  data_abertura: string;
}

const TIPOS_EVENTO = ["Inundação", "Vendaval", "Desabamento", "Incêndio", "Deslizamento", "Estiagem", "Outro"];

export default function SciIncidentes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [list, setList] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("Inundação");
  const [descricao, setDescricao] = useState("");
  const [ambiente, setAmbiente] = useState<"real" | "simulado">("real");

  const fetchList = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("incidentes_sci")
      .select("*")
      .order("data_abertura", { ascending: false });
    setList((data as Incidente[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchList(); }, []);

  const gerarCodigo = async () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const prefix = `INC-${yyyy}${mm}${dd}-`;
    const { data } = await supabase
      .from("incidentes_sci")
      .select("codigo")
      .like("codigo", `${prefix}%`);
    const seq = String(((data?.length) || 0) + 1).padStart(3, "0");
    return `${prefix}${seq}`;
  };

  const criar = async () => {
    if (!nome.trim()) { toast({ title: "Informe o nome da operação", variant: "destructive" }); return; }
    const codigo = await gerarCodigo();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("incidentes_sci")
      .insert({
        codigo, nome, tipo_evento: tipo, descricao, ambiente,
        comandante_id: user?.id, created_by: user?.id,
      })
      .select()
      .single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    // Cria período operacional 1
    await supabase.from("periodos_operacionais").insert({ incidente_id: data.id, numero: 1 });
    // Cria papel de comandante
    await supabase.from("papeis_sci").insert({
      incidente_id: data.id, user_id: user?.id, nome_pessoa: user?.email, funcao: "Comandante do Incidente",
    });
    await supabase.from("timeline_sci").insert({
      incidente_id: data.id, autor_id: user?.id, autor_nome: user?.email,
      categoria: "abertura", descricao: `Incidente ${codigo} aberto (${ambiente.toUpperCase()})`,
    });
    toast({ title: "Incidente criado", description: codigo });
    setOpen(false); setNome(""); setDescricao("");
    navigate(`/sci/${data.id}`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-card rounded-2xl shadow p-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-xl p-2.5">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">SCI — Sistema de Comando de Incidentes</h2>
            <p className="text-muted-foreground text-sm">Baseado na doutrina FEMA/ICS — gestão multiagência</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Ativar novo Incidente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ativar Incidente SCI</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome da operação</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Inundação Arroio Cavalhada" />
              </div>
              <div>
                <Label>Tipo de evento</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_EVENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição inicial</Label>
                <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} />
              </div>
              <div>
                <Label>Ambiente</Label>
                <Select value={ambiente} onValueChange={(v: any) => setAmbiente(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="real">Real — Operacional</SelectItem>
                    <SelectItem value="simulado">Simulado — Exercício</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={criar}>Ativar Incidente</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Nenhum incidente ativo. Clique em <strong>Ativar novo Incidente</strong> para iniciar.
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map(inc => (
            <Card key={inc.id} className="p-5 cursor-pointer hover:shadow-md transition" onClick={() => navigate(`/sci/${inc.id}`)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs bg-muted px-2 py-0.5 rounded">{inc.codigo}</code>
                    {inc.ambiente === "simulado" && (
                      <Badge variant="destructive" className="gap-1"><FlaskConical className="w-3 h-3" /> EXERCÍCIO</Badge>
                    )}
                    <Badge variant={inc.status === "ativo" ? "default" : "secondary"}>{inc.status}</Badge>
                  </div>
                  <h3 className="font-bold mt-1 truncate">{inc.nome}</h3>
                  <p className="text-xs text-muted-foreground">{inc.tipo_evento} · aberto em {new Date(inc.data_abertura).toLocaleString("pt-BR")}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
