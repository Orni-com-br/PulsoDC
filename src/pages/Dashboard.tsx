import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, Eye, CheckCircle, Clock, AlertTriangle, Users, Camera, Trash2, Maximize2, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LeafletMap from "@/components/LeafletMap";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const statusColor: Record<string, string> = {
  aberta: "bg-amber-100 text-amber-800 border-amber-300",
  encaminhada: "bg-blue-100 text-blue-800 border-blue-300",
  finalizada: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

function getYouTubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPadrao, isDespachante, isAdmin, userEmail } = useAuth();

  const [addingCamera, setAddingCamera] = useState(false);
  const [cameraName, setCameraName] = useState("");
  const [cameraUrl, setCameraUrl] = useState("");
  const [cameraLat, setCameraLat] = useState<number | null>(null);
  const [cameraLng, setCameraLng] = useState<number | null>(null);
  const [fullscreenCamera, setFullscreenCamera] = useState<{ nome: string; url: string } | null>(null);

  const [finalizarModal, setFinalizarModal] = useState<string | null>(null);
  const [narrativa, setNarrativa] = useState("");

  const { data: ocorrencias = [], isLoading } = useQuery({
    queryKey: ["ocorrencias-abertas", isPadrao, userEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocorrencias")
        .select("*, ocorrencia_equipes(equipes(membros))")
        .neq("status", "finalizada")
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Filtra chamados caso seja usuário padrão
      if (isPadrao) {
        return (data as any[]).filter((oc) => {
          if (!oc.ocorrencia_equipes || oc.ocorrencia_equipes.length === 0) return false;
          return oc.ocorrencia_equipes.some((oe: any) => 
            Array.isArray(oe.equipes?.membros) && oe.equipes.membros.includes(userEmail)
          );
        });
      }
      return data;
    },
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ["cameras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cameras")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const finalizarMutation = useMutation({
    mutationFn: async ({ id, narrativa }: { id: string, narrativa: string }) => {
      const { error } = await supabase
        .from("ocorrencias")
        .update({ 
          status: "finalizada",
          narrativa_finalizacao: narrativa 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocorrencias-abertas"] });
      toast.success("Ocorrência finalizada!");
      setFinalizarModal(null);
      setNarrativa("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addCameraMutation = useMutation({
    mutationFn: async () => {
      if (!cameraLat || !cameraLng || !cameraUrl.trim()) throw new Error("Preencha todos os campos e clique no mapa");
      const { error } = await supabase.from("cameras").insert({
        nome: cameraName.trim() || "Câmera",
        latitude: cameraLat,
        longitude: cameraLng,
        url: cameraUrl.trim(),
        tipo: getYouTubeId(cameraUrl) ? "youtube" : "imagem",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cameras"] });
      toast.success("Câmera adicionada!");
      setCameraName("");
      setCameraUrl("");
      setCameraLat(null);
      setCameraLng(null);
      setAddingCamera(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCameraMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cameras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cameras"] });
      toast.success("Câmera removida!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalAbertas = ocorrencias.length;

  const cameraMarkers = cameras.map((cam) => {
    const ytId = getYouTubeId(cam.url);
    return {
      lat: cam.latitude,
      lng: cam.longitude,
      popupNode: (
        <div className="w-64">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm truncate">{cam.nome}</span>
            <div className="flex gap-1">
              <button
                className="p-1 hover:bg-gray-200 rounded"
                title="Tela cheia"
                onClick={() => setFullscreenCamera({ nome: cam.nome, url: cam.url })}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              {(isAdmin || isDespachante) && (
                <button
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                  title="Remover"
                  onClick={() => deleteCameraMutation.mutate(cam.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {ytId ? (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=0`}
              className="w-full aspect-video rounded"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <img
              src={cam.url}
              alt={cam.nome}
              className="w-full rounded object-cover max-h-36 cursor-pointer"
              onClick={() => setFullscreenCamera({ nome: cam.nome, url: cam.url })}
            />
          )}
        </div>
      ),
    };
  });

  const occurrenceMarkers = ocorrencias
    .filter((oc) => oc.latitude && oc.longitude)
    .map((oc) => {
      const isEmAtendimento = oc.status === "encaminhada";
      const isEmEspera = oc.status === "aberta";
      const iconColor = isEmEspera ? "#ef4444" : isEmAtendimento ? "#f97316" : "#3b82f6";
      
      return {
        lat: oc.latitude,
        lng: oc.longitude,
        iconColor,
        popupNode: (
          <div className="w-64">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={statusColor[oc.status] ?? ""}>
                {oc.status}
              </Badge>
              <span className="font-mono text-xs font-semibold">{oc.protocolo}</span>
            </div>
            <h4 className="font-bold text-sm mb-1">{oc.natureza}</h4>
            {oc.historico && <p className="text-xs line-clamp-3 mb-2">{oc.historico}</p>}
            <p className="text-xs text-muted-foreground mb-3">
              {[oc.logradouro, oc.numero, oc.bairro].filter(Boolean).join(", ")}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-7"
              onClick={() => navigate(`/registro-fato/${oc.id}`)}
            >
              Ver Detalhes
            </Button>
          </div>
        )
      };
    });

  const allMarkers = [...cameraMarkers, ...occurrenceMarkers];

  return (
    <div className="space-y-8">
      <div className="bg-card rounded-2xl shadow p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Central de Ocorrências</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Registre novas ocorrências e acompanhe as que estão em aberto.
          </p>
        </div>
        {!isPadrao && (
          <Button size="lg" className="rounded-xl text-base gap-2 px-6 sm:px-8 w-full sm:w-auto" onClick={() => navigate("/registro-fato")}>
            <PlusCircle className="w-5 h-5" /> Nova Ocorrência
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} value={totalAbertas} label="Ocorrências em Aberto" />
        <SummaryCard icon={<Clock className="w-5 h-5 text-blue-500" />} value={ocorrencias.filter((o: any) => o.status === "encaminhada").length} label="Encaminhadas" />
        <SummaryCard icon={<CheckCircle className="w-5 h-5 text-emerald-500" />} value={0} label="Finalizadas Hoje" />
      </div>

      {/* Mapa de Ocorrências e Câmeras */}
      <div className="bg-card rounded-2xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Mapa Situacional
          </h3>
          {!isPadrao && (
            <Button
              variant={addingCamera ? "default" : "outline"}
              size="sm"
              className="rounded-lg gap-1.5"
              onClick={() => setAddingCamera(!addingCamera)}
            >
              {addingCamera ? <X className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              {addingCamera ? "Cancelar" : "Adicionar Câmera"}
            </Button>
          )}
        </div>

        {addingCamera && !isPadrao && (
          <div className="px-6 py-4 border-b border-border bg-muted/30 space-y-3">
            <p className="text-sm text-muted-foreground">Clique no mapa para posicionar a câmera, preencha os dados e salve.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                placeholder="Nome da câmera"
                className="rounded-lg"
              />
              <Input
                value={cameraUrl}
                onChange={(e) => setCameraUrl(e.target.value)}
                placeholder="URL da imagem ou YouTube"
                className="rounded-lg sm:col-span-2"
              />
            </div>
            {cameraLat && cameraLng && (
              <p className="text-xs text-muted-foreground">
                Posição: {cameraLat.toFixed(6)}, {cameraLng.toFixed(6)}
              </p>
            )}
            <Button
              size="sm"
              className="rounded-lg"
              onClick={() => addCameraMutation.mutate()}
              disabled={addCameraMutation.isPending}
            >
              Salvar Câmera
            </Button>
          </div>
        )}

        <div className="p-4">
          <LeafletMap
            lat={addingCamera ? cameraLat : null}
            lng={addingCamera ? cameraLng : null}
            onLocationSelect={addingCamera ? (lat, lng) => { setCameraLat(lat); setCameraLng(lng); } : undefined}
            readOnly={!addingCamera}
            height="h-96"
            markers={allMarkers}
          />
        </div>
      </div>

      {/* Dialog Tela Cheia */}
      <Dialog open={!!fullscreenCamera} onOpenChange={() => setFullscreenCamera(null)}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>{fullscreenCamera?.nome}</DialogTitle>
            <DialogDescription>Visualização em tela cheia da câmera</DialogDescription>
          </DialogHeader>
          {fullscreenCamera && (
            getYouTubeId(fullscreenCamera.url) ? (
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(fullscreenCamera.url)}?autoplay=1`}
                className="w-full aspect-video rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <img
                src={fullscreenCamera.url}
                alt={fullscreenCamera.nome}
                className="w-full rounded-lg object-contain max-h-[70vh]"
              />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Finalizar com Narrativa */}
      <Dialog open={!!finalizarModal} onOpenChange={(o) => !o && setFinalizarModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Ocorrência</DialogTitle>
            <DialogDescription>
              Adicione a narrativa do que aconteceu no local para encerrar o despacho.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              placeholder="Descreva as providências tomadas, situação final e detalhes da operação..."
              value={narrativa}
              onChange={(e) => setNarrativa(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setFinalizarModal(null)}>Cancelar</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={finalizarMutation.isPending || !narrativa.trim()}
              onClick={() => finalizarModal && finalizarMutation.mutate({ id: finalizarModal, narrativa })}
            >
              Confirmar Finalização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ocorrências em Aberto */}
      <div className="bg-card rounded-2xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-bold text-lg">Ocorrências em Aberto</h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : ocorrencias.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhuma ocorrência em aberto.</div>
        ) : (
          <div className="divide-y divide-border">
            {ocorrencias.map((oc: any) => (
              <div key={oc.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-sm">{oc.protocolo}</span>
                    <Badge variant="outline" className={statusColor[oc.status] ?? ""}>
                      {oc.status}
                    </Badge>
                  </div>
                  <p className="font-medium mt-1">{oc.natureza}</p>
                  <p className="text-sm text-muted-foreground">
                    {[oc.logradouro, oc.numero, oc.bairro].filter(Boolean).join(", ") || "Endereço não informado"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(oc.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  {!isPadrao && (
                    <Button variant="outline" size="sm" className="rounded-lg gap-1.5 flex-1 sm:flex-none" onClick={() => navigate(`/ocorrencia/${oc.id}`)}>
                      <Users className="w-4 h-4" /> Empenhar
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="rounded-lg gap-1.5 flex-1 sm:flex-none" onClick={() => navigate(`/registro-fato/${oc.id}`)}>
                    <Eye className="w-4 h-4" /> Editar
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="rounded-lg gap-1.5 flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setFinalizarModal(oc.id)}
                  >
                    <CheckCircle className="w-4 h-4" /> Finalizar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="bg-card rounded-2xl shadow p-5 flex items-center gap-4">
      <div className="bg-muted rounded-xl p-3">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
