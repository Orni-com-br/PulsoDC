import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, Filter, BarChart3, MapIcon, Download, Upload, List, Award, Eye } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import LeafletMap from "@/components/LeafletMap";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { geocodeAddress, sleep } from "@/lib/geocode";

const FIELD_MAP: Record<string, string> = {
  protocolo: "protocolo",
  nome_solicitante: "nome_solicitante",
  nome: "nome_solicitante",
  solicitante: "nome_solicitante",
  nome_do_solicitante: "nome_solicitante",
  telefone: "telefone",
  telefone_do_solicitante: "telefone",
  cpf: "cpf",
  natureza: "natureza",
  naturezas: "natureza",
  bairro: "bairro",
  logradouro: "logradouro",
  endereco: "logradouro",
  numero: "numero",
  complemento: "complemento",
  cep: "cep",
  municipio: "municipio",
  uf: "uf",
  historico: "historico",
  narrativa: "historico",
  status: "status",
  prioridade: "prioridade",
  meio_aviso: "meio_aviso",
  ponto_referencia: "ponto_referencia",
  tipo_local: "tipo_local",
  tipo_de_local: "tipo_local",
  tipo_via: "tipo_via",
  tipo_de_via: "tipo_via",
  latitude: "latitude",
  longitude: "longitude",
  data_atendimento: "created_at",
  nome_do_atendente: "_atendente",
  nome_do_operador: "_operador",
  atividades: "atividades",
  data_ocorrencia: "_data_ocorrencia",
  data_envio_despacho: "_data_despacho",
  data_empenho_equipe: "_data_empenho",
  data_finalizador: "_data_finalizador",
  usuario_finalizador: "_usuario_finalizador",
};

function normalizeKey(key: string): string | null {
  const k = key.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
  return FIELD_MAP[k] || null;
}

function parseLegacyDate(value: unknown) {
  const str = String(value ?? "").trim();
  if (!str) return null;

  const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;

  const [, day, month, year, hour = "00", minute = "00", second = "00"] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function importarArquivo(file: File, queryClient: ReturnType<typeof useQueryClient>) {
  try {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      toast({ title: "Arquivo vazio", description: "Nenhum dado encontrado no arquivo.", variant: "destructive" });
      return;
    }

    const mapped = rows.map((row, index) => {
      const record: Record<string, any> = {};
      const normalizedRow = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeKey(key) ?? key, value]),
      );

      for (const [key, value] of Object.entries(row)) {
        const field = normalizeKey(key);
        if (field && !field.startsWith("_") && value !== null && value !== undefined && value !== "") {
          if (field === "latitude" || field === "longitude") {
            const numericValue = Number(value);
            if (!Number.isNaN(numericValue)) record[field] = numericValue;
          } else if (field !== "created_at") {
            record[field] = String(value).trim();
          }
        }
      }

      record.created_at =
        parseLegacyDate(normalizedRow.created_at) ??
        parseLegacyDate(normalizedRow._data_ocorrencia) ??
        new Date().toISOString();

      if (!record.protocolo) {
        record.protocolo = `IMP-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      }
      if (!record.status) {
        record.status = "finalizada";
      }
      return record;
    });

    // PII logging removed for security reasons

    // Geocode entries that have an address but no coordinates (throttled to respect Nominatim policy).
    const toGeocode = mapped.filter((r) => !r.latitude && !r.longitude && (r.logradouro || r.bairro));
    if (toGeocode.length > 0) {
      toast({
        title: "Georreferenciando endereços",
        description: `${toGeocode.length} registro(s). Isso pode demorar alguns minutos.`,
      });
      for (const rec of toGeocode) {
        const res = await geocodeAddress({
          logradouro: rec.logradouro,
          numero: rec.numero,
          bairro: rec.bairro,
          municipio: rec.municipio,
          uf: rec.uf,
          cep: rec.cep,
        });
        if (res) {
          rec.latitude = res.lat;
          rec.longitude = res.lng;
        }
        await sleep(1100); // Nominatim: max 1 req/second
      }
    }

    const BATCH = 100;
    let inserted = 0;
    for (let i = 0; i < mapped.length; i += BATCH) {
      const batch = mapped.slice(i, i + BATCH);
      const { error } = await supabase.from("ocorrencias").insert(batch as any);
      if (error) throw error;
      inserted += batch.length;
    }

    toast({ title: "Importação concluída", description: `${inserted} registro(s) importado(s) com sucesso.` });
    queryClient.invalidateQueries({ queryKey: ["relatorio-ocorrencias"] });
  } catch (err: any) {
    console.error(err);
    toast({ title: "Erro na importação", description: err.message || "Falha ao importar arquivo.", variant: "destructive" });
  }
}

const statusColor: Record<string, string> = {
  aberta: "bg-amber-100 text-amber-800 border-amber-300",
  encaminhada: "bg-blue-100 text-blue-800 border-blue-300",
  finalizada: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1", "#14b8a6", "#e11d48"];

const NATURE_COLORS: Record<string, string> = {
  "Queda de vegetal": "#10b981",
  "Alagamento": "#3b82f6",
  "enchente": "#3b82f6",
  "Deslizamento": "#ca8a04",
  "Destelhamento": "#6366f1",
  "Desabamento": "#ef4444",
  "Incêndio": "#f97316",
};

function getNatureColor(natureza?: string) {
  if (!natureza) return "#6b7280";
  for (const [key, color] of Object.entries(NATURE_COLORS)) {
    if (natureza.toLowerCase().includes(key.toLowerCase())) return color;
  }
  let hash = 0;
  for (let i = 0; i < natureza.length; i++) hash = natureza.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function escapeHtml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function gerarPDF(oc: any) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`
    <!DOCTYPE html>
    <html><head><title>Ocorrência ${escapeHtml(oc.protocolo)}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
      .header { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px; }
      .header img { width: 80px; height: 80px; }
      .header h1 { font-size: 18px; color: #1e40af; margin: 0; }
      .header p { font-size: 12px; color: #666; margin: 2px 0; }
      h2 { font-size: 14px; color: #1e40af; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 20px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
      .field { margin-bottom: 6px; }
      .field label { font-size: 11px; color: #666; display: block; }
      .field span { font-size: 13px; font-weight: 500; }
      .historico { background: #f9f9f9; padding: 10px; border-radius: 6px; font-size: 13px; white-space: pre-wrap; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <div class="header">
      <img src="/images/logo-defesa-civil.png" alt="Defesa Civil POA" />
      <div>
        <h1>DEFESA CIVIL</h1>
        <p>Relatório de Ocorrência</p>
        <p>Protocolo: <strong>${escapeHtml(oc.protocolo)}</strong></p>
        <p>Data: ${escapeHtml(new Date(oc.created_at).toLocaleString("pt-BR"))}</p>
      </div>
    </div>
    <h2>Dados do Solicitante</h2>
    <div class="grid">
      <div class="field"><label>Nome</label><span>${escapeHtml(oc.nome_solicitante || "—")}</span></div>
      <div class="field"><label>Telefone</label><span>${escapeHtml(oc.telefone || "—")}</span></div>
      <div class="field"><label>Meio de Aviso</label><span>${escapeHtml(oc.meio_aviso || "—")}</span></div>
      <div class="field"><label>Estrangeiro</label><span>${oc.estrangeiro ? "Sim" : "Não"}</span></div>
    </div>
    <h2>Localização</h2>
    <div class="grid">
      <div class="field"><label>Logradouro</label><span>${escapeHtml(oc.logradouro || "—")}, ${escapeHtml(oc.numero || "S/N")}</span></div>
      <div class="field"><label>Bairro</label><span>${escapeHtml(oc.bairro || "—")}</span></div>
      <div class="field"><label>Município/UF</label><span>${escapeHtml(oc.municipio || "")} / ${escapeHtml(oc.uf || "")}</span></div>
      <div class="field"><label>CEP</label><span>${escapeHtml(oc.cep || "—")}</span></div>
      <div class="field"><label>Complemento</label><span>${escapeHtml(oc.complemento || "—")}</span></div>
      <div class="field"><label>Ponto de Referência</label><span>${escapeHtml(oc.ponto_referencia || "—")}</span></div>
      <div class="field"><label>Tipo de Via</label><span>${escapeHtml(oc.tipo_via || "—")}</span></div>
      <div class="field"><label>Tipo de Local</label><span>${escapeHtml(oc.tipo_local || "—")}</span></div>
    </div>
    <h2>Dados da Ocorrência</h2>
    <div class="grid">
      <div class="field"><label>Natureza</label><span>${escapeHtml(oc.natureza || "—")}</span></div>
      <div class="field"><label>Status</label><span>${escapeHtml(oc.status)}</span></div>
      <div class="field"><label>Fato ocorrendo</label><span>${oc.fato_ocorrendo ? "Sim" : "Não"}</span></div>
      <div class="field"><label>Partes no local</label><span>${oc.partes_no_local ? "Sim" : "Não"}</span></div>
    </div>
    <h2>Histórico</h2>
    <div class="historico">${escapeHtml(oc.historico || "Sem histórico registrado.")}</div>
    <h2>Atividades Realizadas</h2>
    <div class="historico">${escapeHtml(oc.atividades || "Nenhuma atividade registrada.")}</div>
    <script>window.onload = function() { window.print(); }</script>
    </body></html>
  `);
  w.document.close();
}

function sanitizeCSV(text: any): string {
  if (text === null || text === undefined) return "";
  let s = String(text).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  return `"${s}"`;
}

function exportarCSV(data: any[]) {
  const headers = ["Protocolo", "Status", "Natureza", "Bairro", "Logradouro", "Solicitante", "Data"];
  const rows = data.map((oc) => [
    sanitizeCSV(oc.protocolo),
    sanitizeCSV(oc.status),
    sanitizeCSV(oc.natureza),
    sanitizeCSV(oc.bairro),
    sanitizeCSV(oc.logradouro),
    sanitizeCSV(oc.nome_solicitante),
    sanitizeCSV(new Date(oc.created_at).toLocaleString("pt-BR")),
  ]);
  const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio_ocorrencias_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function gerarCertidao(oc: any, userEmail: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  const agora = new Date().toLocaleString("pt-BR");
  const dataFato = new Date(oc.created_at).toLocaleString("pt-BR");
  const hash = btoa(`${oc.protocolo}-${oc.id}-${Date.now()}`).slice(0, 20).toUpperCase();

  w.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Certidão ${escapeHtml(oc.protocolo)}</title>
<style>
  @page { size: A4; margin: 25mm 20mm; }
  body { font-family: 'Times New Roman', Times, serif; color: #1a1a1a; padding: 40px; line-height: 1.7; font-size: 13px; }
  .header { text-align: center; border-bottom: 3px double #1e3a5f; padding-bottom: 18px; margin-bottom: 30px; }
  .header img { width: 90px; height: 90px; margin-bottom: 8px; }
  .header h1 { font-size: 18px; color: #1e3a5f; margin: 4px 0; letter-spacing: 2px; text-transform: uppercase; }
  .header h2 { font-size: 15px; color: #1e3a5f; margin: 4px 0; font-weight: normal; }
  .header p { font-size: 12px; color: #555; margin: 2px 0; }
  .titulo-certidao { text-align: center; font-size: 16px; font-weight: bold; color: #1e3a5f; margin: 25px 0 10px; letter-spacing: 3px; text-transform: uppercase; text-decoration: underline; }
  .protocolo-box { text-align: center; background: #f0f4fa; border: 1px solid #c0d0e0; border-radius: 6px; padding: 10px; margin: 15px auto; max-width: 500px; }
  .protocolo-box strong { font-size: 15px; color: #1e3a5f; }
  .protocolo-box p { font-size: 11px; color: #666; margin: 4px 0 0; }
  .corpo { text-align: justify; margin: 20px 0; }
  .secao { margin-top: 22px; }
  .secao h3 { font-size: 13px; font-weight: bold; color: #1e3a5f; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
  .campo { margin: 6px 0; }
  .campo label { font-weight: bold; color: #333; }
  .campo span { color: #1a1a1a; }
  .clausulas { background: #fafafa; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0; font-size: 12px; }
  .clausulas p { margin: 8px 0; }
  .clausulas strong { color: #1e3a5f; }
  .historico-box { background: #f9f9f9; padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 6px; font-style: italic; white-space: pre-wrap; margin: 8px 0; }
  .assinatura { margin-top: 50px; text-align: center; }
  .assinatura .linha { width: 300px; border-top: 1px solid #333; margin: 0 auto 5px; }
  .assinatura p { margin: 2px 0; font-size: 12px; }
  .rodape { text-align: center; font-size: 10px; color: #999; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px; }
  @media print { body { padding: 0; } }
</style></head><body>

<div class="header">
  <img src="/images/logo-defesa-civil.png" alt="Defesa Civil POA" />
  <h1>Defesa Civil</h1>
  <h2>Certidão de Ocorrência</h2>
  <p>Secretaria Municipal de Segurança</p>
</div>

<div class="titulo-certidao">Certidão de Registro de Ocorrência</div>

<div class="protocolo-box">
  <strong>PROTOCOLO Nº: ${escapeHtml(oc.protocolo)}</strong>
  <p>DATA DE EMISSÃO: ${escapeHtml(agora)}</p>
</div>

<div class="corpo">
  <p>A <strong>Defesa Civil</strong>, no uso de suas atribuições legais e para fins de direito, <strong>CERTIFICA</strong> que consta em seus registros a seguinte notificação de ocorrência, cujos dados foram fornecidos exclusivamente pelo solicitante:</p>
</div>

<div class="secao">
  <h3>1. Dados do Registro (Declaratórios)</h3>
  <div class="campo"><label>Solicitante:</label> <span>${escapeHtml(oc.nome_solicitante || "Não informado")}</span></div>
  <div class="campo"><label>Meio de Contato:</label> <span>${escapeHtml(oc.meio_aviso || "—")} ${oc.telefone ? "— " + escapeHtml(oc.telefone) : ""}</span></div>
  <div class="campo"><label>Data/Hora do Fato:</label> <span>${escapeHtml(dataFato)}</span></div>
  <div class="campo"><label>Natureza do Chamado:</label> <span>${escapeHtml(oc.natureza || "—")}</span></div>
  <div class="campo"><label>Status do Registro:</label> <span>${escapeHtml(oc.status)}</span></div>
</div>

<div class="secao">
  <h3>2. Localização Declarada</h3>
  <div class="campo"><label>Logradouro:</label> <span>${escapeHtml(oc.logradouro || "—")}${oc.numero ? ", " + escapeHtml(oc.numero) : ""}</span></div>
  <div class="campo"><label>Bairro:</label> <span>${escapeHtml(oc.bairro || "—")}</span></div>
  <div class="campo"><label>Município/UF:</label> <span>${escapeHtml(oc.municipio || "")} / ${escapeHtml(oc.uf || "")}</span></div>
</div>

<div class="secao">
  <h3>3. Relatório Executivo (Síntese dos Fatos)</h3>
  <p>O registro em tela refere-se a uma solicitação de apoio técnico-operacional em área urbana. Conforme o histórico relatado pelo solicitante:</p>
  <div class="historico-box">"${escapeHtml(oc.historico || "Sem histórico registrado.")}"</div>
  <p>O evento foi devidamente triado para fins de monitoramento e coordenação de riscos pela Defesa Civil Municipal.</p>
</div>

<div class="secao">
  <h3>3.1. Atividades Realizadas pela Equipe</h3>
  <div class="historico-box">${escapeHtml(oc.atividades || "Nenhuma atividade registrada.")}</div>
</div>

<div class="secao">
  <h3>4. Cláusulas de Salvaguarda Jurídica</h3>
  <div class="clausulas">
    <p><strong>Natureza da Informação:</strong> A presente certidão constitui extrato fiel do sistema oficial, baseada estritamente no relato do solicitante. A responsabilidade pela veracidade das informações é exclusiva de quem as declarou.</p>
    <p><strong>Isenção de Responsabilidade:</strong> Este documento não configura assunção de culpa ou responsabilidade civil por parte do município ou de seus agentes.</p>
    <p><strong>Finalidade:</strong> Documento de caráter informativo administrativo, não substituindo laudos técnicos de órgãos de segurança pública ou perícia criminal.</p>
  </div>
</div>

<div class="secao">
  <h3>5. Identificação do Emissor</h3>
  <div class="campo"><label>Servidor Responsável:</label> <span>${escapeHtml(userEmail)}</span></div>
  <div class="campo"><label>Cargo:</label> <span>Agente de Defesa Civil</span></div>
  <div class="campo"><label>Autenticação:</label> <span>${escapeHtml(hash)}</span></div>
</div>

<div class="assinatura">
  <div class="linha"></div>
  <p><strong>${escapeHtml(userEmail)}</strong></p>
  <p>Agente de Defesa Civil</p>
  <p>Defesa Civil</p>
</div>

<div class="rodape">
  <p>Defesa Civil</p>
  <p>Documento emitido eletronicamente em ${escapeHtml(agora)} — Autenticação: ${escapeHtml(hash)}</p>
</div>

<script>window.onload = function() { window.print(); }<\/script>
</body></html>`);
  w.document.close();
}

export default function RelatorioServico() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userEmail } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [filtroNatureza, setFiltroNatureza] = useState("todas");
  const [filtroBairro, setFiltroBairro] = useState("todos");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [tab, setTab] = useState("lista");

  const { data: ocorrencias = [], isLoading } = useQuery({
    queryKey: ["relatorio-ocorrencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocorrencias")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const naturezas = useMemo(() => [...new Set(ocorrencias.map((o) => o.natureza).filter(Boolean))], [ocorrencias]);
  const bairros = useMemo(() => [...new Set(ocorrencias.map((o) => o.bairro).filter(Boolean))].sort(), [ocorrencias]);

  const filtered = useMemo(() => ocorrencias.filter((oc) => {
    if (filtroStatus !== "todas" && oc.status !== filtroStatus) return false;
    if (filtroNatureza !== "todas" && oc.natureza !== filtroNatureza) return false;
    if (filtroBairro !== "todos" && oc.bairro !== filtroBairro) return false;
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      const match =
        oc.protocolo?.toLowerCase().includes(busca) ||
        oc.nome_solicitante?.toLowerCase().includes(busca) ||
        oc.logradouro?.toLowerCase().includes(busca) ||
        oc.bairro?.toLowerCase().includes(busca);
      if (!match) return false;
    }
    if (filtroDataInicio) {
      if (new Date(oc.created_at) < new Date(filtroDataInicio)) return false;
    }
    if (filtroDataFim) {
      if (new Date(oc.created_at) > new Date(filtroDataFim)) return false;
    }
    return true;
  }), [ocorrencias, filtroStatus, filtroNatureza, filtroBairro, filtroBusca, filtroDataInicio, filtroDataFim]);

  // Chart data
  const chartNatureza = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((oc) => { const n = oc.natureza || "Não informada"; counts[n] = (counts[n] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace("DC - ", ""), value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const chartBairro = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((oc) => { const b = oc.bairro || "Não informado"; counts[b] = (counts[b] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 15);
  }, [filtered]);

  const chartTempo = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((oc) => {
      const d = new Date(oc.created_at).toLocaleDateString("pt-BR");
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).reverse();
  }, [filtered]);

  const mapMarkers = useMemo(() => 
    filtered
      .filter((oc) => (oc as any).latitude && (oc as any).longitude)
      .map((oc) => {
        const endereco = [oc.logradouro, oc.numero, oc.bairro].filter(Boolean).join(", ") || "Endereço não informado";
        const dataHora = new Date(oc.created_at).toLocaleString("pt-BR");
        return {
          lat: (oc as any).latitude as number,
          lng: (oc as any).longitude as number,
          iconColor: getNatureColor(oc.natureza),
          popupNode: (
            <div className="w-64 text-sm">
              <p className="font-bold mb-1 border-b pb-1">{oc.protocolo}</p>
              <p className="mb-1 font-semibold text-primary">{oc.natureza || "Natureza não informada"}</p>
              <p className="mb-1 text-muted-foreground text-xs">{endereco}</p>
              <p className="text-xs">{dataHora}</p>
            </div>
          )
        };
      }),
    [filtered]
  );

  const limparFiltros = () => {
    setFiltroBusca("");
    setFiltroStatus("todas");
    setFiltroNatureza("todas");
    setFiltroBairro("todos");
    setFiltroDataInicio("");
    setFiltroDataFim("");
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl shadow p-6">
        <h3 className="text-xl font-bold mb-6 text-center border-b-2 border-destructive pb-3">
          RELATÓRIO DE SERVIÇO
        </h3>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-muted-foreground mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={filtroBusca} onChange={(e) => setFiltroBusca(e.target.value)} placeholder="Pesquisar..." className="rounded-lg pl-9" />
            </div>
          </div>
          <div className="w-40">
            <label className="block text-xs text-muted-foreground mb-1">Início</label>
            <Input type="datetime-local" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} className="rounded-lg text-xs" />
          </div>
          <div className="w-40">
            <label className="block text-xs text-muted-foreground mb-1">Fim</label>
            <Input type="datetime-local" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} className="rounded-lg text-xs" />
          </div>
          <div className="w-32">
            <label className="block text-xs text-muted-foreground mb-1">Status</label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="encaminhada">Encaminhada</SelectItem>
                <SelectItem value="finalizada">Finalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-56">
            <label className="block text-xs text-muted-foreground mb-1">Natureza</label>
            <Select value={filtroNatureza} onValueChange={setFiltroNatureza}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {naturezas.map((n) => <SelectItem key={n} value={n!}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <label className="block text-xs text-muted-foreground mb-1">Bairro</label>
            <Select value={filtroBairro} onValueChange={setFiltroBairro}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {bairros.map((b) => <SelectItem key={b} value={b!}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="rounded-lg gap-1.5" onClick={limparFiltros}>
            <Filter className="w-4 h-4" /> Limpar
          </Button>
          <Button variant="outline" className="rounded-lg gap-1.5" onClick={() => exportarCSV(filtered)}>
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
          <Button variant="outline" className="rounded-lg gap-1.5" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" /> Importar Arquivo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importarArquivo(f, queryClient);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card shadow rounded-xl">
          <TabsTrigger value="lista" className="gap-1.5"><List className="w-4 h-4" /> Lista</TabsTrigger>
          <TabsTrigger value="graficos" className="gap-1.5"><BarChart3 className="w-4 h-4" /> Gráficos</TabsTrigger>
          <TabsTrigger value="mapa" className="gap-1.5"><MapIcon className="w-4 h-4" /> Mapa</TabsTrigger>
        </TabsList>

        {/* LISTA */}
        <TabsContent value="lista">
          <div className="bg-card rounded-2xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg">Ocorrências ({filtered.length})</h3>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhuma ocorrência encontrada.</div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((oc) => (
                  <div key={oc.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-sm">{oc.protocolo}</span>
                        <Badge variant="outline" className={statusColor[oc.status] ?? ""}>{oc.status}</Badge>
                      </div>
                      <p className="font-medium mt-1">{oc.natureza || "—"}</p>
                      <p className="text-sm text-muted-foreground">
                        {[oc.logradouro, oc.numero, oc.bairro].filter(Boolean).join(", ") || "Endereço não informado"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Solicitante: {oc.nome_solicitante || "—"} • {new Date(oc.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="rounded-lg gap-1.5" onClick={() => navigate(`/ocorrencia/${oc.id}`)}>
                        <Eye className="w-4 h-4" /> Detalhe
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-lg gap-1.5" onClick={() => gerarPDF(oc)}>
                        <FileText className="w-4 h-4" /> PDF
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-lg gap-1.5" onClick={() => gerarCertidao(oc, userEmail)}>
                        <Award className="w-4 h-4" /> Certidão
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* GRÁFICOS */}
        <TabsContent value="graficos">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Por Natureza */}
            <div className="bg-card rounded-2xl shadow p-6">
              <h4 className="font-bold mb-4">Ocorrências por Natureza</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={chartNatureza} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => `${e.name.slice(0, 20)}… (${e.value})`}>
                    {chartNatureza.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Por Bairro */}
            <div className="bg-card rounded-2xl shadow p-6">
              <h4 className="font-bold mb-4">Top 15 Bairros</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartBairro} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Por Tempo */}
            <div className="bg-card rounded-2xl shadow p-6 xl:col-span-2">
              <h4 className="font-bold mb-4">Ocorrências por Data</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartTempo}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Por Status */}
            <div className="bg-card rounded-2xl shadow p-6 xl:col-span-2">
              <h4 className="font-bold mb-4">Por Status</h4>
              <div className="flex gap-6 justify-center">
                {["aberta", "encaminhada", "finalizada"].map((s) => {
                  const count = filtered.filter((oc) => oc.status === s).length;
                  return (
                    <div key={s} className="text-center">
                      <div className="text-3xl font-bold">{count}</div>
                      <Badge variant="outline" className={statusColor[s]}>{s}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* MAPA */}
        <TabsContent value="mapa">
          <div className="bg-card rounded-2xl shadow p-6">
            <h4 className="font-bold mb-4">Mapa de Ocorrências ({mapMarkers.length} com localização)</h4>
            <LeafletMap
              lat={null}
              lng={null}
              readOnly
              height="h-[500px]"
              markers={mapMarkers}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
