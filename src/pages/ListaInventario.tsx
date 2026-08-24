import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, FileText, Camera, Upload, Trash2, Edit2, MapPin, Monitor, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PatrimonioItem {
  id: string;
  area_comodo: string;
  item_descricao: string;
  marca_modelo: string;
  numero_serie: string;
  numero_patrimonio: string;
  observacoes: string;
  imagem_url?: string;
}

export default function ListaInventario() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<PatrimonioItem | null>(null);
  
  const [form, setForm] = useState<Omit<PatrimonioItem, "id">>({
    area_comodo: "",
    item_descricao: "",
    marca_modelo: "",
    numero_serie: "",
    numero_patrimonio: "",
    observacoes: "",
    imagem_url: "",
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventario"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventario").select("*").order("numero_patrimonio");
      if (error) throw error;
      return data as PatrimonioItem[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (item: Partial<PatrimonioItem>) => {
      if (editItem) {
        const { error } = await supabase.from("inventario").update(item).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventario").insert([item]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
      setDialogOpen(false);
      toast.success(editItem ? "Item atualizado com sucesso!" : "Item adicionado com sucesso!");
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventario").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
      toast.success("Item removido com sucesso!");
    },
    onError: (error) => toast.error(error.message)
  });

  const filtered = items.filter(
    (i) =>
      (i.item_descricao?.toLowerCase() || "").includes(busca.toLowerCase()) ||
      (i.numero_patrimonio?.toLowerCase() || "").includes(busca.toLowerCase()) ||
      (i.area_comodo?.toLowerCase() || "").includes(busca.toLowerCase())
  );

  function openNew() {
    setEditItem(null);
    setForm({
      area_comodo: "",
      item_descricao: "",
      marca_modelo: "",
      numero_serie: "",
      numero_patrimonio: "",
      observacoes: "",
      imagem_url: "",
    });
    setDialogOpen(true);
  }

  function openEdit(item: PatrimonioItem) {
    setEditItem(item);
    setForm({
      area_comodo: item.area_comodo || "",
      item_descricao: item.item_descricao || "",
      marca_modelo: item.marca_modelo || "",
      numero_serie: item.numero_serie || "",
      numero_patrimonio: item.numero_patrimonio || "",
      observacoes: item.observacoes || "",
      imagem_url: item.imagem_url || "",
    });
    setDialogOpen(true);
  }

  function saveItem() {
    if (!form.item_descricao.trim() || !form.numero_patrimonio.trim()) return;
    saveMutation.mutate(form);
  }

  function deleteItem(id: string) {
    deleteMutation.mutate(id);
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, imagem_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  function exportCSV() {
    const headers = ["Número de Patrimônio", "Item / Descrição", "Área / Cômodo", "Marca / Modelo", "Número de Série", "Observações"];
    const rows = filtered.map(i => {
      const obs = i.observacoes ? i.observacoes.replace(/"/g, '""').replace(/\n/g, ' ') : "";
      return `"${i.numero_patrimonio}","${i.item_descricao}","${i.area_comodo}","${i.marca_modelo}","${i.numero_serie}","${obs}"`;
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lista_inventario_patrimonio.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="bg-card rounded-2xl shadow p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/gestao-logistica")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-2.5">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Inventário de Patrimônio</h2>
              <p className="text-muted-foreground text-sm">Controle de mesas, cadeiras, computadores e equipamentos</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl gap-2" onClick={exportCSV}>
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Button className="rounded-xl gap-2" onClick={openNew}>
              <Plus className="w-4 h-4" /> Novo Patrimônio
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela de Patrimônios */}
      <div className="bg-card rounded-2xl shadow overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-muted/10 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={busca} 
              onChange={(e) => setBusca(e.target.value)} 
              placeholder="Buscar por descrição, patrimônio ou área..." 
              className="pl-9 rounded-xl bg-white" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold w-16">Imagem</th>
                <th className="text-left px-4 py-3 font-semibold">Número de Patrimônio</th>
                <th className="text-left px-4 py-3 font-semibold">Item / Descrição</th>
                <th className="text-left px-4 py-3 font-semibold">Área / Cômodo</th>
                <th className="text-left px-4 py-3 font-semibold">Marca / Modelo</th>
                <th className="text-left px-4 py-3 font-semibold">Número de Série</th>
                <th className="text-left px-4 py-3 font-semibold max-w-[200px]">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-muted/20 transition-colors cursor-pointer group" 
                  onClick={() => openEdit(item)}
                >
                  <td className="px-4 py-3">
                    {item.imagem_url ? (
                      <img src={item.imagem_url} alt="" className="w-10 h-10 rounded-md object-cover border" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border">
                        <Monitor className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-primary">{item.numero_patrimonio}</td>
                  <td className="px-4 py-3 font-semibold">{item.item_descricao}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border bg-slate-50 text-slate-700">
                      <MapPin className="w-3 h-3" /> {item.area_comodo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.marca_modelo || "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.numero_serie || "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]" title={item.observacoes}>
                    {item.observacoes || "-"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhum item de patrimônio encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog Edit / Add */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edição de Patrimônio" : "Registro de Novo Patrimônio"}</DialogTitle>
            <DialogDescription>Preencha as informações do equipamento ou mobiliário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2 max-h-[75vh] overflow-y-auto px-1">
            
            <div className="flex gap-5">
              {/* Imagem */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/30 overflow-hidden relative group">
                  {form.imagem_url ? (
                    <img src={form.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-10 h-10 text-muted-foreground/50" />
                  )}
                  <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-sm font-medium">
                    <Upload className="w-5 h-5 mb-1" /> Imagem
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
                {form.imagem_url && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => setForm({...form, imagem_url: ""})}>
                    Remover foto
                  </Button>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Número de Patrimônio *</Label>
                  <Input 
                    value={form.numero_patrimonio} 
                    onChange={(e) => setForm({ ...form, numero_patrimonio: e.target.value })} 
                    placeholder="Ex: PAT-12345"
                    className="rounded-lg mt-1 font-mono uppercase" 
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Item / Descrição *</Label>
                  <Input 
                    value={form.item_descricao} 
                    onChange={(e) => setForm({ ...form, item_descricao: e.target.value })} 
                    placeholder="Ex: Notebook Corporativo"
                    className="rounded-lg mt-1" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Área / Cômodo</Label>
                <Input 
                  value={form.area_comodo} 
                  onChange={(e) => setForm({ ...form, area_comodo: e.target.value })} 
                  placeholder="Ex: Sala de Reuniões, Recepção"
                  className="rounded-lg mt-1" 
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marca / Modelo</Label>
                <Input 
                  value={form.marca_modelo} 
                  onChange={(e) => setForm({ ...form, marca_modelo: e.target.value })} 
                  placeholder="Ex: Dell Inspiron 15"
                  className="rounded-lg mt-1" 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Número de Série</Label>
              <Input 
                value={form.numero_serie} 
                onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} 
                placeholder="Ex: SN-987654321"
                className="rounded-lg mt-1 font-mono" 
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observações</Label>
              <Textarea 
                value={form.observacoes} 
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })} 
                placeholder="Estado de conservação, detalhes sobre funcionamento, etc."
                className="rounded-lg mt-1 min-h-[100px] resize-none" 
              />
            </div>

          </div>

          <div className="flex items-center justify-between pt-4 border-t mt-4">
            {editItem ? (
              <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={() => { deleteItem(editItem.id); setDialogOpen(false); }}>
                <Trash2 className="w-4 h-4 mr-2" /> Excluir Patrimônio
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button 
                className="rounded-xl bg-blue-600 hover:bg-blue-700" 
                onClick={saveItem}
                disabled={!form.item_descricao.trim() || !form.numero_patrimonio.trim()}
              >
                Salvar Registro
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
