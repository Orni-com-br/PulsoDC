import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Calendar, CheckCircle2, Users, Plus, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import LeafletMap from "@/components/LeafletMap";
import { geocodeAddress } from "@/lib/geocode";
import AprWizard from "@/components/apr/AprWizard";
import { useAuth } from "@/hooks/useAuth";

export default function OcorrenciaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPadrao } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "apr" ? "apr" : searchParams.get("tab") === "equipes" ? "equipes" : "detalhes";
  const [equipeSelecionada, setEquipeSelecionada] = useState<string>("");

  const [geoLat, setGeoLat] = useState<number | null>(null);
  const [geoLng, setGeoLng] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const { data: oc, isLoading } = useQuery({
    queryKey: ["ocorrencia", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ocorrencias").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: equipesDisponiveis = [] } = useQuery({
    queryKey: ["equipes-todas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipes").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: empenhos = [], refetch: refetchEmpenhos } = useQuery({
    queryKey: ["ocorrencia-equipes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocorrencia_equipes")
        .select("*, equipes(*)")
        .eq("ocorrencia_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  const empenharMutation = useMutation({
    mutationFn: async (equipeId: string) => {
      const { error: e1 } = await supabase.from("ocorrencia_equipes").insert({
        ocorrencia_id: id!,
        equipe_id: equipeId,
        hora_despacho: new Date().toISOString(),
      });
      if (e1) throw e1;
      await supabase.from("equipes").update({ status: "em_atendimento" }).eq("id", equipeId);
      await supabase.from("ocorrencias").update({ status: "encaminhada" }).eq("id", id!);
    },
    onSuccess: () => {
      toast.success("Equipe empenhada!");
      setEquipeSelecionada("");
      refetchEmpenhos();
      queryClient.invalidateQueries({ queryKey: ["equipes-todas"] });
      queryClient.invalidateQueries({ queryKey: ["ocorrencia", id] });
    },
    onError: (e: Error) => toast.error("Erro ao empenhar: " + e.message),
  });

  const liberarMutation = useMutation({
    mutationFn: async ({ empenhoId, equipeId }: { empenhoId: string; equipeId: string }) => {
      const { error } = await supabase
        .from("ocorrencia_equipes")
        .update({ hora_finalizado: new Date().toISOString() })
        .eq("id", empenhoId);
      if (error) throw error;
      await supabase.from("equipes").update({ status: "disponivel" }).eq("id", equipeId);
    },
    onSuccess: () => {
      toast.success("Equipe liberada!");
      refetchEmpenhos();
      queryClient.invalidateQueries({ queryKey: ["equipes-todas"] });
    },
    onError: (e: Error) => toast.error("Erro ao liberar: " + e.message),
  });

  // Geocode the occurrence address when no lat/lng is stored
  useEffect(() => {
    if (!oc) return;
    const hasCoords = (oc as any).latitude && (oc as any).longitude;
    if (hasCoords) {
      setGeoLat((oc as any).latitude);
      setGeoLng((oc as any).longitude);
      return;
    }
    if (!oc.logradouro && !oc.bairro) return;
    let cancelled = false;
    setGeocoding(true);
    geocodeAddress({
      logradouro: oc.logradouro,
      numero: oc.numero,
      bairro: oc.bairro,
      municipio: oc.municipio,
      uf: oc.uf,
      cep: oc.cep,
    })
      .then((res) => {
        if (cancelled || !res) return;
        setGeoLat(res.lat);
        setGeoLng(res.lng);
      })
      .finally(() => !cancelled && setGeocoding(false));
    return () => {
      cancelled = true;
    };
  }, [oc]);

  const markers = useMemo(() => {
    if (!geoLat || !geoLng) return [];
    return [
      {
        lat: geoLat,
        lng: geoLng,
        popupNode: (
          <div className="w-48 text-sm">
            <p className="font-bold border-b pb-1 mb-1">{oc?.protocolo ?? ""}</p>
            <p className="text-xs text-muted-foreground">
              {[oc?.logradouro, oc?.numero, oc?.bairro].filter(Boolean).join(", ")}
            </p>
          </div>
        )
      },
    ];
  }, [geoLat, geoLng, oc]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!oc) return <div className="p-8 text-center text-muted-foreground">Ocorrência não encontrada.</div>;

  const isFinalized = oc.status === "finalizada";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-2xl shadow p-6 flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold">{oc.protocolo}</h2>
          <p className="text-sm text-muted-foreground">{oc.natureza || "—"}</p>
          <p className="text-xs text-muted-foreground">
            {[oc.logradouro, oc.numero, oc.bairro].filter(Boolean).join(", ") || "Endereço não informado"}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">{oc.status}</Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className={`grid w-full mb-6 ${!isPadrao ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          {!isPadrao && <TabsTrigger value="equipes">Empenhar Equipe</TabsTrigger>}
          <TabsTrigger value="apr">APR-DC</TabsTrigger>
        </TabsList>
        
        <TabsContent value="detalhes" className="space-y-6">
          {/* Datas de abertura e fechamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl shadow p-5 flex items-center gap-4">
              <div className="bg-primary/10 rounded-xl p-3"><Calendar className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Data de Abertura</p>
                <p className="text-lg font-semibold">{new Date(oc.created_at).toLocaleString("pt-BR")}</p>
              </div>
            </div>
            <div className="bg-card rounded-2xl shadow p-5 flex items-center gap-4">
              <div className="bg-primary/10 rounded-xl p-3"><CheckCircle2 className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Data de Fechamento</p>
                <p className="text-lg font-semibold">
                  {isFinalized ? new Date(oc.updated_at).toLocaleString("pt-BR") : "Em aberto"}
                </p>
              </div>
            </div>
          </div>

          {/* Histórico, Atividades e Narrativa de Finalização */}
          {(oc.historico || (oc as any).atividades || oc.narrativa_finalizacao) && (
            <div className="bg-card rounded-2xl shadow p-6 space-y-4">
              {oc.historico && (
                <div>
                  <h3 className="font-bold text-sm text-muted-foreground mb-2">Histórico</h3>
                  <p className="text-sm whitespace-pre-wrap">{oc.historico}</p>
                </div>
              )}
              {(oc as any).atividades && (
                <div>
                  <h3 className="font-bold text-sm text-muted-foreground mb-2">Atividades Realizadas</h3>
                  <p className="text-sm whitespace-pre-wrap">{(oc as any).atividades}</p>
                </div>
              )}
              {oc.narrativa_finalizacao && (
                <div>
                  <h3 className="font-bold text-sm text-muted-foreground mb-2">Narrativa de Finalização</h3>
                  <p className="text-sm whitespace-pre-wrap text-emerald-700 font-medium">{oc.narrativa_finalizacao}</p>
                </div>
              )}
            </div>
          )}

          {/* Mapa georreferenciado */}
          <div className="bg-card rounded-2xl shadow p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Localização
            </h3>
            {geocoding && (
              <p className="text-xs text-muted-foreground mb-2">Localizando endereço no mapa...</p>
            )}
            {!geoLat || !geoLng ? (
              <p className="text-sm text-muted-foreground">
                {geocoding ? "Buscando coordenadas..." : "Não foi possível localizar o endereço no mapa."}
              </p>
            ) : (
              <LeafletMap
                lat={geoLat}
                lng={geoLng}
                readOnly
                height="h-[400px]"
                markers={markers}
              />
            )}
          </div>
        </TabsContent>

        {!isPadrao && (
          <TabsContent value="equipes" className="space-y-6">
          <div className="bg-card rounded-2xl shadow p-6 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Empenhar Equipe
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={equipeSelecionada} onValueChange={setEquipeSelecionada}>
                <SelectTrigger className="rounded-lg flex-1">
                  <SelectValue placeholder="Selecione uma equipe disponível" />
                </SelectTrigger>
                <SelectContent>
                  {equipesDisponiveis
                    .filter((e: any) => e.status === "disponivel")
                    .map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  {equipesDisponiveis.filter((e: any) => e.status === "disponivel").length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhuma equipe disponível</div>
                  )}
                </SelectContent>
              </Select>
              <Button
                className="rounded-xl gap-2"
                disabled={!equipeSelecionada || empenharMutation.isPending}
                onClick={() => empenharMutation.mutate(equipeSelecionada)}
              >
                <Plus className="w-4 h-4" /> Empenhar
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg">Equipes Empenhadas</h3>
            </div>
            {empenhos.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhuma equipe empenhada.</div>
            ) : (
              <div className="divide-y divide-border">
                {empenhos.map((emp: any) => (
                  <div key={emp.id} className="px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3">
                    <Users className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{emp.equipes?.nome ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        Despacho: {emp.hora_despacho ? new Date(emp.hora_despacho).toLocaleString("pt-BR") : "—"}
                      </p>
                      {emp.hora_finalizado && (
                        <p className="text-xs text-emerald-600">
                          Liberada: {new Date(emp.hora_finalizado).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                    {!emp.hora_finalizado && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg gap-1.5"
                        disabled={liberarMutation.isPending}
                        onClick={() => liberarMutation.mutate({ empenhoId: emp.id, equipeId: emp.equipe_id })}
                      >
                        <X className="w-4 h-4" /> Liberar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        )}

        <TabsContent value="apr">
          <div className="py-4">
            <AprWizard ocorrenciaId={oc.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
