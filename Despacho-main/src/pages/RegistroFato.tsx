import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MapPin, ClipboardList, Phone, User, Camera, Upload, X, ShieldAlert, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import LeafletMap, { type AddressResult } from "@/components/LeafletMap";
import AddressAutocomplete from "@/components/AddressAutocomplete";

function gerarProtocolo() {
  const now = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `DC${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export default function RegistroFato() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isPadrao } = useAuth();
  const isEditing = !!id;

  const [protocolo, setProtocolo] = useState("");
  const [nomeSolicitante, setNomeSolicitante] = useState("");
  const [cpf, setCpf] = useState("");
  const [meioAviso, setMeioAviso] = useState("outro");
  const [telefone, setTelefone] = useState("51");
  const [estrangeiro, setEstrangeiro] = useState("nao");
  const [tipoVia, setTipoVia] = useState("urbana");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cep, setCep] = useState("");
  const [pontoReferencia, setPontoReferencia] = useState("");
  const [tipoLocal, setTipoLocal] = useState("residencia");
  const [historico, setHistorico] = useState("");
  const [narrativaFinalizacao, setNarrativaFinalizacao] = useState("");
  const [natureza, setNatureza] = useState("");
  const [fatoOcorrendo, setFatoOcorrendo] = useState("sim");
  const [partesNoLocal, setPartesNoLocal] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  type Documento = { nome: string; url: string; tipo: string };
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const maxHistorico = 4000;

  useEffect(() => {
    if (id) {
      setLoading(true);
      supabase.from("ocorrencias").select("*").eq("id", id).single().then(({ data, error }) => {
        setLoading(false);
        if (error || !data) {
          toast.error("Ocorrência não encontrada.");
          navigate("/");
          return;
        }
        setProtocolo(data.protocolo);
        setNomeSolicitante(data.nome_solicitante || "");
        setCpf((data as any).cpf || "");
        setMeioAviso(data.meio_aviso || "outro");
        setTelefone(data.telefone || "51");
        setEstrangeiro(data.estrangeiro ? "sim" : "nao");
        setTipoVia(data.tipo_via || "urbana");
        setLogradouro(data.logradouro || "");
        setNumero(data.numero || "");
        setBairro(data.bairro || "");
        setMunicipio((data as any).municipio || "");
        setUf((data as any).uf || "");
        setComplemento(data.complemento || "");
        setCep(data.cep || "");
        setPontoReferencia(data.ponto_referencia || "");
        setTipoLocal(data.tipo_local || "residencia");
        setHistorico(data.historico || "");
        setNarrativaFinalizacao(data.narrativa_finalizacao || "");
        setNatureza(data.natureza || "");
        setFatoOcorrendo(data.fato_ocorrendo ? "sim" : "nao");
        setPartesNoLocal(data.partes_no_local || false);
        setLatitude((data as any).latitude ?? null);
        setLongitude((data as any).longitude ?? null);
        setFotos(((data as any).fotos as string[]) || []);
        setDocumentos((((data as any).documentos as Documento[]) || []));
      });
    } else {
      setProtocolo(gerarProtocolo());
    }
  }, [id, navigate]);

  const handleUploadFotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slotsLivres = 5 - fotos.length;
    if (slotsLivres <= 0) {
      toast.error("Limite de 5 anexos atingido.");
      return;
    }
    const arquivos = Array.from(files).slice(0, slotsLivres);
    setUploadingFoto(true);
    const novasUrls: string[] = [];
    for (const file of arquivos) {
      const isImg = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isImg && !isPdf) continue;
      const ext = file.name.split(".").pop() || (isPdf ? "pdf" : "jpg");
      const path = `${user?.id || "anon"}/${protocolo}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("anexos").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        toast.error("Erro no upload: " + upErr.message);
        continue;
      }
      const { data } = supabase.storage.from("anexos").getPublicUrl(path);
      novasUrls.push(data.publicUrl);
    }
    setFotos((prev) => [...prev, ...novasUrls]);
    setUploadingFoto(false);
    if (novasUrls.length) toast.success(`${novasUrls.length} anexo(s) adicionado(s).`);
  };

  const removerFoto = (idx: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUploadDocumentos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingDoc(true);
    const novos: Documento[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user?.id || "anon"}/${protocolo}/docs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("anexos").upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
      if (upErr) {
        toast.error("Erro no upload: " + upErr.message);
        continue;
      }
      const { data } = supabase.storage.from("anexos").getPublicUrl(path);
      novos.push({ nome: file.name, url: data.publicUrl, tipo: file.type || ext });
    }
    setDocumentos((prev) => [...prev, ...novos]);
    setUploadingDoc(false);
    if (novos.length) toast.success(`${novos.length} documento(s) anexado(s).`);
  };

  const removerDocumento = (idx: number) => {
    setDocumentos((prev) => prev.filter((_, i) => i !== idx));
  };

  const salvar = async (finalizar: boolean) => {
    if (!natureza) {
      toast.error("Selecione a natureza da ocorrência.");
      return;
    }
    setSaving(true);
    const payload = {
      protocolo,
      nome_solicitante: nomeSolicitante || null,
      cpf: cpf || null,
      meio_aviso: meioAviso,
      telefone,
      estrangeiro: estrangeiro === "sim",
      tipo_via: tipoVia,
      logradouro: logradouro || null,
      numero: numero || null,
      bairro: bairro || null,
      municipio: municipio || null,
      uf: uf || null,
      complemento: complemento || null,
      cep: cep || null,
      ponto_referencia: pontoReferencia || null,
      tipo_local: tipoLocal,
      historico: historico || null,
      narrativa_finalizacao: narrativaFinalizacao || null,
      natureza,
      fato_ocorrendo: fatoOcorrendo === "sim",
      partes_no_local: partesNoLocal,
      latitude,
      longitude,
      fotos,
      documentos: documentos as any,
      status: "aberta",
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase.from("ocorrencias").update(payload).eq("id", id));
    } else {
      ({ error } = await supabase.from("ocorrencias").insert({ ...payload, created_by: user?.id }));
    }
    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }

    if (finalizar) {
      toast.success(isEditing ? "Ocorrência atualizada e finalizada!" : "Ocorrência encaminhada e finalizada!");
      navigate("/despacho");
    } else {
      toast.success(isEditing ? "Ocorrência atualizada!" : "Ocorrência encaminhada! Cadastro permanece aberto.");
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando ocorrência...</div>;

  const now = new Date();
  const dataFormatada = `DC ${now.toLocaleTimeString("pt-BR")} (BRT) ${now.toLocaleDateString("pt-BR")}`;

  return (
    <div className="space-y-6">
      {/* Header - Protocolo */}
      <div className="bg-card rounded-2xl shadow p-4 sm:p-6 flex flex-wrap items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-3 min-w-0">
          <Phone className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold truncate">{protocolo}</h2>
            <p className="text-xs text-muted-foreground">{dataFormatada}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:ml-auto min-w-0">
          <User className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{nomeSolicitante || "Nome do Solicitante não informado"}</p>
            <p className="text-xs text-muted-foreground">Meio de Aviso: {meioAviso}</p>
            <p className="text-xs text-muted-foreground">{telefone}</p>
          </div>
        </div>
        <div className="w-full sm:w-auto sm:text-center">
          <p className="text-sm font-semibold">Natureza Informada</p>
          <p className="text-xs text-muted-foreground break-words">{natureza || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 1. Dados do Solicitante */}
        <fieldset className="bg-card rounded-2xl shadow p-6 border border-border">
          <legend className="text-sm font-bold text-primary px-2">Dados do Solicitante</legend>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Nome do Solicitante</label>
              <Input value={nomeSolicitante} onChange={(e) => setNomeSolicitante(e.target.value)} placeholder="Nome do Solicitante" className="rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">CPF</label>
              <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="rounded-lg" maxLength={14} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Meio de Aviso</label>
                <Select value={meioAviso} onValueChange={setMeioAviso}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Telefone</label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Estrangeiro?</label>
              <Select value={estrangeiro} onValueChange={setEstrangeiro}>
                <SelectTrigger className="rounded-lg w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </fieldset>

        {/* 2. Localização */}
        <fieldset className="bg-card rounded-2xl shadow p-6 border border-border">
          <legend className="text-sm font-bold text-primary px-2 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> Localização
          </legend>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tipo de Via *</label>
                <Select value={tipoVia} onValueChange={setTipoVia}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urbana">Via Urbana</SelectItem>
                    <SelectItem value="rural">Via Rural</SelectItem>
                    <SelectItem value="rodovia">Rodovia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">UF *</label>
                <Input value={uf} onChange={e => setUf(e.target.value)} className="rounded-lg" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Município *</label>
                <Input value={municipio} onChange={e => setMunicipio(e.target.value)} className="rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs text-muted-foreground mb-1">Logradouro</label>
                <AddressAutocomplete
                  value={logradouro}
                  onChange={setLogradouro}
                  placeholder="Digite para pesquisar o endereço..."
                  className="rounded-lg"
                  onSelect={(s) => {
                    setLogradouro(s.logradouro || s.displayName.split(",")[0] || "");
                    if (s.numero) setNumero(s.numero);
                    if (s.bairro) setBairro(s.bairro);
                    if (s.cep) setCep(s.cep);
                    setLatitude(s.lat);
                    setLongitude(s.lng);
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Número</label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Nº" className="rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Bairro</label>
                <Input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" className="rounded-lg" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Complemento</label>
                <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Complemento" className="rounded-lg" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">CEP</label>
                <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="CEP" className="rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Ponto de Referência</label>
                <Input value={pontoReferencia} onChange={(e) => setPontoReferencia(e.target.value)} placeholder="Ponto de Referência" className="rounded-lg" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tipo de Local</label>
                <Select value={tipoLocal} onValueChange={setTipoLocal}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residencia">Residência</SelectItem>
                    <SelectItem value="comercio">Comércio</SelectItem>
                    <SelectItem value="via_publica">Via Pública</SelectItem>
                    <SelectItem value="area_verde">Área Verde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </fieldset>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 3. Dados da Ocorrência */}
        <fieldset className="bg-card rounded-2xl shadow p-6 border border-border">
          <legend className="text-sm font-bold text-primary px-2 flex items-center gap-1">
            <ClipboardList className="w-4 h-4" /> Dados da Ocorrência
          </legend>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Histórico (diga o que está acontecendo)</label>
              <Textarea
                placeholder="Diga o que está acontecendo!"
                className="rounded-lg min-h-[120px]"
                maxLength={maxHistorico}
                value={historico}
                onChange={(e) => setHistorico(e.target.value)}
                disabled={isPadrao}
              />
              <p className="text-xs text-muted-foreground text-right mt-1">
                Caracteres Restantes: {maxHistorico - historico.length}
              </p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Evolução / Narrativa de Finalização</label>
              <Textarea
                placeholder="Descreva a evolução da ocorrência ou detalhes da finalização..."
                className="rounded-lg min-h-[120px]"
                value={narrativaFinalizacao}
                onChange={(e) => setNarrativaFinalizacao(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Natureza Inicial *</label>
              <Select value={natureza} onValueChange={setNatureza}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Selecione a natureza" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DC - Ações Temporárias">DC - Ações Temporárias</SelectItem>
                  <SelectItem value="DC - Alagamentos, enxurradas e/ou enchentes">DC - Alagamentos, enxurradas e/ou enchentes</SelectItem>
                  <SelectItem value="DC - Desabamento / Desmoronamento - Queda de Edificações">DC - Desabamento / Desmoronamento - Queda de Edificações</SelectItem>
                  <SelectItem value="DC - Desabamento / Desmoronamento - Queda de Muro">DC - Desabamento / Desmoronamento - Queda de Muro</SelectItem>
                  <SelectItem value="DC - Desabamento / Desmoronamento - Queda ou Rolamento de Rocha">DC - Desabamento / Desmoronamento - Queda ou Rolamento de Rocha</SelectItem>
                  <SelectItem value="DC - Deslizamento e/ou queda de solo ao longo de encostas">DC - Deslizamento e/ou queda de solo ao longo de encostas</SelectItem>
                  <SelectItem value="DC - Destelhamento">DC - Destelhamento</SelectItem>
                  <SelectItem value="DC - Vistoria / Avaliação Técnica - Após Incêndio">DC - Vistoria / Avaliação Técnica - Após Incêndio</SelectItem>
                  <SelectItem value="DC - Vistoria / Avaliação Técnica - Após Inundação/Alagamento">DC - Vistoria / Avaliação Técnica - Após Inundação/Alagamento</SelectItem>
                  <SelectItem value="DC - Vistoria / Avaliação Técnica - Queda de vegetal">DC - Vistoria / Avaliação Técnica - Queda de vegetal</SelectItem>
                  <SelectItem value="DC - Vistoria técnica / operacional">DC - Vistoria técnica / operacional</SelectItem>
                  <SelectItem value="DC - Apoio">DC - Apoio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Fato está ocorrendo neste momento? *</label>
              <Select value={fatoOcorrendo} onValueChange={setFatoOcorrendo}>
                <SelectTrigger className="rounded-lg w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox id="partes-local" checked={partesNoLocal} onCheckedChange={(v) => setPartesNoLocal(!!v)} />
              <label htmlFor="partes-local" className="text-sm">As partes interessadas estão no local?</label>
            </div>

            {/* Anexos da Ocorrência */}
            <div className="pt-4 border-t border-border">
              <label className="block text-xs text-muted-foreground mb-2">Anexos: Fotos e PDFs (até 5)</label>
              <div className="flex flex-wrap gap-2 mb-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={uploadingFoto || fotos.length >= 5}
                  onClick={() => document.getElementById("foto-upload-input")?.click()}
                >
                  <Upload className="w-4 h-4" /> Imagem
                </Button>
                <input
                  id="foto-upload-input"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { handleUploadFotos(e.target.files); e.target.value = ""; }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={uploadingFoto || fotos.length >= 5}
                  onClick={() => document.getElementById("pdf-upload-input")?.click()}
                >
                  <FileText className="w-4 h-4" /> PDF
                </Button>
                <input
                  id="pdf-upload-input"
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => { handleUploadFotos(e.target.files); e.target.value = ""; }}
                />
                <label
                  htmlFor="foto-camera-input"
                  className={`inline-flex items-center justify-center gap-2 h-9 rounded-lg px-3 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer ${(uploadingFoto || fotos.length >= 5) ? "pointer-events-none opacity-50" : ""}`}
                >
                  <Camera className="w-4 h-4" /> Câmera
                </label>
                <input
                  id="foto-camera-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={uploadingFoto || fotos.length >= 5}
                  onChange={(e) => { handleUploadFotos(e.target.files); e.target.value = ""; }}
                />
                {uploadingFoto && <span className="text-xs text-muted-foreground self-center">Enviando...</span>}
              </div>
              {fotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {fotos.map((url, idx) => {
                    const isPdf = url.toLowerCase().split("?")[0].endsWith(".pdf");
                    return (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                        {isPdf ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-full flex flex-col items-center justify-center p-2 text-center hover:bg-accent"
                          >
                            <FileText className="w-8 h-8 text-primary mb-1" />
                            <span className="text-xs text-muted-foreground truncate w-full">PDF {idx + 1}</span>
                          </a>
                        ) : (
                          <img src={url} alt={`Anexo ${idx + 1}`} className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => removerFoto(idx)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-90 hover:opacity-100"
                          aria-label="Remover anexo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </fieldset>

        {/* 4. Mapa */}
        <fieldset className="bg-card rounded-2xl shadow p-6 border border-border">
          <legend className="text-sm font-bold text-primary px-2 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> Mapa
          </legend>
          <div className="mt-2">
            <LeafletMap
              lat={latitude}
              lng={longitude}
              hideSearch
              onLocationSelect={(lat, lng, addr) => {
                setLatitude(lat);
                setLongitude(lng);
                if (addr) {
                  if (addr.logradouro) setLogradouro(addr.logradouro);
                  if (addr.numero) setNumero(addr.numero);
                  if (addr.bairro) setBairro(addr.bairro);
                  if (addr.cep) setCep(addr.cep);
                }
              }}
            />
          </div>
        </fieldset>

        {/* 5. Documentos relativos à ocorrência */}
        <fieldset className="bg-card rounded-2xl shadow p-6 border border-border">
          <legend className="text-sm font-bold text-primary px-2 flex items-center gap-1">
            <FileText className="w-4 h-4" /> Anexar Documentos Relativos à Ocorrência
          </legend>
          <p className="text-xs text-muted-foreground mt-2 mb-3">
            Relatórios, pareceres e outros documentos. Aceita qualquer formato (PDF, DOC, DOCX, XLS, XLSX, TXT, imagens, etc.).
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={uploadingDoc}
              onClick={() => document.getElementById("documento-upload-input")?.click()}
            >
              <Upload className="w-4 h-4" /> Anexar Documentos
            </Button>
            <input
              id="documento-upload-input"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { handleUploadDocumentos(e.target.files); e.target.value = ""; }}
            />
            {uploadingDoc && <span className="text-xs text-muted-foreground self-center">Enviando...</span>}
          </div>
          {documentos.length > 0 && (
            <ul className="space-y-2">
              {documentos.map((doc, idx) => (
                <li key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate flex-1"
                    title={doc.nome}
                  >
                    {doc.nome}
                  </a>
                  <button
                    type="button"
                    onClick={() => removerDocumento(idx)}
                    className="bg-destructive text-destructive-foreground rounded-full p-1 hover:opacity-90"
                    aria-label="Remover documento"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      </div>

      {/* Rodapé */}
      <div className="bg-card rounded-2xl shadow p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-xl border-indigo-500 text-indigo-700 hover:bg-indigo-50 w-full sm:w-auto"
            onClick={() => window.open(id ? `/notificacao/${id}` : '/notificacao', '_blank')}
            type="button"
          >
            Gerar Notificação
          </Button>
          {isEditing && (
            <Button
              variant="outline"
              className="rounded-xl border-red-500 text-red-700 hover:bg-red-50 w-full sm:w-auto"
              onClick={() => navigate(`/ocorrencia/${id}?tab=apr`)}
              type="button"
            >
              <ShieldAlert className="w-4 h-4 mr-1" /> Análise Preliminar de Risco
            </Button>
          )}
          <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={() => navigate("/")}>
            Cancelar
          </Button>
          <Button
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
            disabled={saving}
            onClick={() => salvar(false)}
          >
            {isEditing ? "Salvar" : "Encaminhar"}
          </Button>
          <Button
            className="rounded-xl w-full sm:w-auto"
            disabled={saving}
            onClick={() => salvar(true)}
          >
            {isEditing ? "Salvar e Finalizar" : "Encaminhar e Finalizar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
