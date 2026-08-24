import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, ShoppingBasket, Droplets, BedDouble, Tent,
  TrendingUp, TrendingDown, AlertTriangle, Edit2, Trash2, X, Save,
  HeartHandshake, Shirt, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Categoria = "alimentos" | "agua" | "abrigo" | "vestuario";

interface ItemEstoque {
  id: string;
  nome: string;
  categoria: Categoria;
  quantidade: number;
  unidade: string;
  minimo: number;
  ultima_atualizacao: string;
}

const catConfig: Record<Categoria, { label: string; icon: typeof ShoppingBasket; color: string; bg: string }> = {
  alimentos: { label: "Alimentos", icon: ShoppingBasket, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  agua: { label: "Água", icon: Droplets, color: "text-cyan-600", bg: "bg-cyan-50 border-cyan-200" },
  abrigo: { label: "Abrigo", icon: Tent, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  vestuario: { label: "Vestuário / Cama", icon: Shirt, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
};

export default function EstoqueHumanitario() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItemEstoque | null>(null);
  const [form, setForm] = useState({ nome: "", categoria: "alimentos" as Categoria, quantidade: 0, unidade: "un", minimo: 0 });
  const [movDialog, setMovDialog] = useState<{ item: ItemEstoque; tipo: "entrada" | "saida" } | null>(null);
  const [movQtd, setMovQtd] = useState(0);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["estoque_humanitario"],
    queryFn: async () => {
      const { data, error } = await supabase.from("estoque_humanitario").select("*").order("nome");
      if (error) throw error;
      return data as ItemEstoque[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (item: Partial<ItemEstoque>) => {
      if (editItem) {
        const { error } = await supabase.from("estoque_humanitario").update({ ...item, ultima_atualizacao: new Date().toISOString() }).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("estoque_humanitario").insert([{ ...item, ultima_atualizacao: new Date().toISOString() }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque_humanitario"] });
      setDialogOpen(false);
      toast.success(editItem ? "Item atualizado com sucesso!" : "Item adicionado com sucesso!");
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("estoque_humanitario").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque_humanitario"] });
      toast.success("Item removido com sucesso!");
    },
    onError: (error) => toast.error(error.message)
  });

  const movMutation = useMutation({
    mutationFn: async ({ id, quantidade }: { id: string, quantidade: number }) => {
      const { error } = await supabase.from("estoque_humanitario").update({ quantidade, ultima_atualizacao: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque_humanitario"] });
      setMovDialog(null);
      setMovQtd(0);
      toast.success("Movimentação registrada com sucesso!");
    },
    onError: (error) => toast.error(error.message)
  });

  const filtered = items
    .filter((i) => filtroCategoria === "todos" || i.categoria === filtroCategoria)
    .filter((i) => i.nome.toLowerCase().includes(busca.toLowerCase()));

  const totalItens = items.reduce((s, i) => s + (i.quantidade || 0), 0);
  const alertas = items.filter((i) => (i.quantidade || 0) <= (i.minimo || 0)).length;

  function openNew() {
    setEditItem(null);
    setForm({ nome: "", categoria: "alimentos", quantidade: 0, unidade: "un", minimo: 0 });
    setDialogOpen(true);
  }
  function openEdit(item: ItemEstoque) {
    setEditItem(item);
    setForm({ nome: item.nome, categoria: item.categoria, quantidade: item.quantidade, unidade: item.unidade, minimo: item.minimo });
    setDialogOpen(true);
  }
  function saveItem() {
    if (!form.nome.trim()) return;
    saveMutation.mutate(form);
  }
  function deleteItem(id: string) {
    deleteMutation.mutate(id);
  }
  function applyMov() {
    if (!movDialog || movQtd <= 0) return;
    const novaQtd = movDialog.tipo === "entrada" ? movDialog.item.quantidade + movQtd : Math.max(0, movDialog.item.quantidade - movQtd);
    movMutation.mutate({ id: movDialog.item.id, quantidade: novaQtd });
  }

  function exportCSV() {
    const headers = ["Item", "Categoria", "Quantidade", "Unidade", "Estoque Minimo", "Status"];
    const rows = filtered.map(i => {
      const status = i.quantidade <= i.minimo ? "Crítico" : "Normal";
      return `"${i.nome}","${catConfig[i.categoria].label}","${i.quantidade}","${i.unidade}","${i.minimo}","${status}"`;
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "estoque_humanitario.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-card rounded-2xl shadow p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/gestao-logistica")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-2.5">
              <HeartHandshake className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Ajuda Humanitária</h2>
              <p className="text-muted-foreground text-sm">Cestas básicas, água, colchões, roupas de cama e lonas</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl gap-2" onClick={exportCSV}>
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Button className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={openNew}>
              <Plus className="w-4 h-4" /> Novo Item
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={<HeartHandshake className="w-5 h-5 text-emerald-500" />} label="Itens cadastrados" value={items.length} />
        <KpiCard icon={<TrendingUp className="w-5 h-5 text-cyan-500" />} label="Total em estoque" value={totalItens} />
        <KpiCard icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} label="Abaixo do mínimo" value={alertas} alert={alertas > 0} />
        <KpiCard icon={<ShoppingBasket className="w-5 h-5 text-purple-500" />} label="Categorias" value={4} />
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl shadow p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar item..." className="pl-9 rounded-xl" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["todos", "alimentos", "agua", "abrigo", "vestuario"] as const).map((cat) => (
            <Button key={cat} size="sm" variant={filtroCategoria === cat ? "default" : "outline"} className="rounded-xl text-xs"
              onClick={() => setFiltroCategoria(cat)}>
              {cat === "todos" ? "Todos" : catConfig[cat].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold">Item</th>
                <th className="text-left px-4 py-3 font-semibold">Categoria</th>
                <th className="text-center px-4 py-3 font-semibold">Qtd</th>
                <th className="text-center px-4 py-3 font-semibold">Mín.</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item) => {
                const cat = catConfig[item.categoria];
                const Icon = cat.icon;
                const baixo = item.quantidade <= item.minimo;
                return (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{item.nome}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${cat.bg}`}>
                        <Icon className={`w-3 h-3 ${cat.color}`} /> {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold">{item.quantidade} <span className="font-normal text-muted-foreground">{item.unidade}</span></td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{item.minimo}</td>
                    <td className="px-4 py-3 text-center">
                      {baixo ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Crítico</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Normal</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-emerald-600" title="Entrada"
                          onClick={() => { setMovDialog({ item, tipo: "entrada" }); setMovQtd(0); }}>
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-orange-600" title="Saída"
                          onClick={() => { setMovDialog({ item, tipo: "saida" }); setMovQtd(0); }}>
                          <TrendingDown className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" title="Editar" onClick={() => openEdit(item)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-red-500" title="Excluir" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum item encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog Add/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Item" : "Novo Item"}</DialogTitle>
            <DialogDescription>Preencha os dados do item humanitário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="rounded-xl mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria })}
                  className="w-full mt-1 rounded-xl border px-3 py-2 text-sm bg-background">
                  <option value="alimentos">Alimentos</option>
                  <option value="agua">Água</option>
                  <option value="abrigo">Abrigo</option>
                  <option value="vestuario">Vestuário / Cama</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Unidade</label>
                <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} className="rounded-xl mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Quantidade</label>
                <Input type="number" min={0} value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: +e.target.value })} className="rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Estoque mínimo</label>
                <Input type="number" min={0} value={form.minimo} onChange={(e) => setForm({ ...form, minimo: +e.target.value })} className="rounded-xl mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
              <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={saveItem}>
                <Save className="w-4 h-4 mr-1" /> Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Movimentação */}
      <Dialog open={!!movDialog} onOpenChange={() => setMovDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{movDialog?.tipo === "entrada" ? "Entrada" : "Saída"} de Estoque</DialogTitle>
            <DialogDescription>{movDialog?.item.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Estoque atual: <strong>{movDialog?.item.quantidade} {movDialog?.item.unidade}</strong></p>
            <div>
              <label className="text-sm font-medium">Quantidade</label>
              <Input type="number" min={1} value={movQtd || ""} onChange={(e) => setMovQtd(+e.target.value)} className="rounded-xl mt-1" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setMovDialog(null)}>Cancelar</Button>
              <Button className={`rounded-xl ${movDialog?.tipo === "entrada" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-orange-700"}`}
                onClick={applyMov}>
                {movDialog?.tipo === "entrada" ? "Registrar Entrada" : "Registrar Saída"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: number; alert?: boolean }) {
  return (
    <div className={`bg-card rounded-2xl shadow p-4 flex items-center gap-3 ${alert ? "ring-2 ring-amber-300" : ""}`}>
      <div className="bg-muted rounded-xl p-2.5">{icon}</div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
