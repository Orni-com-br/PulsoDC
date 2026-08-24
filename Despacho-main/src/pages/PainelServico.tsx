import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Edit, Trash2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const statusLabels: Record<string, string> = {
  disponivel: "Disponível",
  em_atendimento: "Em Atendimento",
  pausa: "Em Pausa",
};

const statusColors: Record<string, string> = {
  disponivel: "bg-emerald-100 text-emerald-800 border-emerald-300",
  em_atendimento: "bg-amber-100 text-amber-800 border-amber-300",
  pausa: "bg-muted text-muted-foreground border-border",
};

function EquipeCard({ eq, updateStatusMutation, deleteMutation, usuariosSistema = [] }: { eq: any, updateStatusMutation: any, deleteMutation: any, usuariosSistema: any[] }) {
  const queryClient = useQueryClient();
  const [novoMembro, setNovoMembro] = useState("");

  const updateMembrosMutation = useMutation({
    mutationFn: async ({ id, membros }: { id: string; membros: string[] }) => {
      const { error } = await supabase.from("equipes").update({ membros }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAddMembro = () => {
    if (!novoMembro.trim()) return;
    const currentMembros = eq.membros || [];
    if (currentMembros.includes(novoMembro.trim())) {
      toast.error("Membro já está na equipe.");
      return;
    }
    updateMembrosMutation.mutate({ id: eq.id, membros: [...currentMembros, novoMembro.trim()] });
    setNovoMembro("");
    toast.success("Membro adicionado!");
  };

  const handleRemoveMembro = (membro: string) => {
    const currentMembros = eq.membros || [];
    updateMembrosMutation.mutate({ id: eq.id, membros: currentMembros.filter((m: string) => m !== membro) });
    toast.success("Membro removido.");
  };

  return (
    <div className="px-4 sm:px-6 py-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Users className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{eq.nome}</p>
          <p className="text-xs text-muted-foreground">
            Criada em {new Date(eq.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <Badge variant="outline" className={statusColors[eq.status] ?? ""}>
          {statusLabels[eq.status] ?? eq.status}
        </Badge>
        <div className="flex gap-1">
          {eq.status === "disponivel" && (
            <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => updateStatusMutation.mutate({ id: eq.id, status: "em_atendimento" })}>
              Iniciar Atendimento
            </Button>
          )}
          {eq.status === "em_atendimento" && (
            <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => updateStatusMutation.mutate({ id: eq.id, status: "disponivel" })}>
              Liberar
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(eq.id)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
      
      {/* Gestão de Membros */}
      <div className="pl-8 flex flex-col gap-2">
        <div className="text-sm font-medium text-muted-foreground">Contas / Membros da Equipe:</div>
        {eq.membros && eq.membros.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {eq.membros.map((membro: string) => {
              const userName = usuariosSistema?.find((u: any) => u.email === membro)?.nome || usuariosSistema?.find((u: any) => u.email === membro)?.full_name || membro;
              return (
                <Badge key={membro} variant="secondary" className="flex items-center gap-1 pl-2 pr-1 py-1">
                  {userName}
                  <button
                    onClick={() => handleRemoveMembro(membro)}
                    className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">Nenhum membro adicionado.</div>
        )}
        
        <div className="flex gap-2 max-w-sm mt-1">
          <Select value={novoMembro} onValueChange={setNovoMembro}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecione um usuário..." />
            </SelectTrigger>
            <SelectContent>
              {usuariosSistema?.length > 0 ? (
                usuariosSistema.map(user => (
                  <SelectItem key={user.email} value={user.email}>
                    {user.nome || user.full_name || user.email}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>Nenhum usuário cadastrado</SelectItem>
              )}
            </SelectContent>
          </Select>
          
          <Button size="sm" variant="secondary" onClick={handleAddMembro} className="h-8 shrink-0" disabled={updateMembrosMutation.isPending || !novoMembro || novoMembro === "none"}>
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PainelServico() {
  const queryClient = useQueryClient();
  const [novaEquipe, setNovaEquipe] = useState("");

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuariosSistema"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_users_list");
      if (error) {
        console.error("Erro ao buscar usuários:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: equipes = [], isLoading } = useQuery({
    queryKey: ["equipes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipes").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from("equipes").insert({ nome });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      setNovaEquipe("");
      toast.success("Equipe adicionada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("equipes").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Remover referências primeiro para evitar violar foreign key (ocorrencia_equipes)
      await supabase.from("ocorrencia_equipes").delete().eq("equipe_id", id);
      const { error } = await supabase.from("equipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      toast.success("Equipe removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disponiveisCount = equipes.filter((e) => e.status === "disponivel").length;
  const emAtendimentoCount = equipes.filter((e) => e.status === "em_atendimento").length;

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl shadow p-5 flex items-center gap-4">
          <div className="bg-emerald-100 rounded-xl p-3"><Users className="w-5 h-5 text-emerald-600" /></div>
          <div>
            <p className="text-2xl font-bold">{disponiveisCount}</p>
            <p className="text-sm text-muted-foreground">Disponíveis</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl shadow p-5 flex items-center gap-4">
          <div className="bg-amber-100 rounded-xl p-3"><Users className="w-5 h-5 text-amber-600" /></div>
          <div>
            <p className="text-2xl font-bold">{emAtendimentoCount}</p>
            <p className="text-sm text-muted-foreground">Em Atendimento</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl shadow p-5 flex items-center gap-4">
          <div className="bg-muted rounded-xl p-3"><Users className="w-5 h-5 text-muted-foreground" /></div>
          <div>
            <p className="text-2xl font-bold">{equipes.length}</p>
            <p className="text-sm text-muted-foreground">Total de Equipes</p>
          </div>
        </div>
      </div>

      {/* Adicionar equipe */}
      <div className="bg-card rounded-2xl shadow p-6">
        <h3 className="font-bold text-lg mb-4">Adicionar Equipe</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Nome da equipe (ex: Equipe Operacional CGRD-1)"
            value={novaEquipe}
            onChange={(e) => setNovaEquipe(e.target.value)}
            className="rounded-lg"
          />
          <Button
            className="rounded-xl gap-2 w-full sm:w-auto"
            disabled={!novaEquipe.trim()}
            onClick={() => addMutation.mutate(novaEquipe.trim())}
          >
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Lista de equipes */}
      <div className="bg-card rounded-2xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-bold text-lg">Equipes de Serviço</h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : equipes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhuma equipe cadastrada.</div>
        ) : (
          <div className="divide-y divide-border">
            {equipes.map((eq) => (
              <EquipeCard 
                key={eq.id} 
                eq={eq} 
                updateStatusMutation={updateStatusMutation} 
                deleteMutation={deleteMutation} 
                usuariosSistema={usuarios}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
