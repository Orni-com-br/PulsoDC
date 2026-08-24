import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PaiData {
  incidente: any;
  periodo: any;
  papeis: any[];
  objetivos: any[];
  recursos: any[];
  agencias: any[];
  responsaveis: any[];
}

export function gerarPaiPdf({ incidente, periodo, papeis, objetivos, recursos, agencias, responsaveis }: PaiData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 40;
  const agSigla = (id: string | null) => id ? (agencias.find(a => a.id === id)?.sigla || "—") : "—";

  // Cabeçalho
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("PLANO DE AÇÃO DO INCIDENTE (PAI)", W / 2, y, { align: "center" }); y += 18;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`Sistema de Comando de Incidentes — ICS 202 / 203 / 204`, W / 2, y, { align: "center" }); y += 20;

  if (incidente.ambiente === "simulado") {
    doc.setTextColor(200, 0, 0); doc.setFont("helvetica", "bold");
    doc.text("⚠ EXERCÍCIO — SEM VALOR OPERACIONAL EMERGENCIAL", W / 2, y, { align: "center" });
    doc.setTextColor(0); doc.setFont("helvetica", "normal"); y += 18;
  }

  // ICS 202 — Objetivos do Período Operacional
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text("ICS 202 — Objetivos do Período Operacional", 40, y); y += 14;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  autoTable(doc, {
    startY: y,
    head: [["Campo", "Valor"]],
    body: [
      ["Incidente", `${incidente.codigo} — ${incidente.nome}`],
      ["Tipo do evento", incidente.tipo_evento || "—"],
      ["Período Operacional", `PO #${periodo?.numero ?? "-"}`],
      ["Início do PO", periodo ? new Date(periodo.inicio).toLocaleString("pt-BR") : "—"],
      ["Fim do PO", periodo?.fim ? new Date(periodo.fim).toLocaleString("pt-BR") : "em curso"],
      ["Aberto em", new Date(incidente.data_abertura).toLocaleString("pt-BR")],
      ["Status do incidente", incidente.status],
    ],
    styles: { fontSize: 9 }, headStyles: { fillColor: [40, 60, 100] },
    margin: { left: 40, right: 40 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  const objsPeriodo = objetivos.filter(o => o.periodo_id === periodo?.id);
  autoTable(doc, {
    startY: y,
    head: [["#", "Objetivo", "Status"]],
    body: objsPeriodo.length
      ? objsPeriodo.map((o, i) => [String(i + 1), o.descricao, o.status])
      : [["—", "Nenhum objetivo registrado para este período.", "—"]],
    styles: { fontSize: 9 }, headStyles: { fillColor: [40, 60, 100] },
    margin: { left: 40, right: 40 },
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // ICS 203 — Lista de Designação Organizacional
  if (y > 680) { doc.addPage(); y = 40; }
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text("ICS 203 — Lista de Designação Organizacional", 40, y); y += 8;
  autoTable(doc, {
    startY: y + 4,
    head: [["Função", "Nome", "Agência"]],
    body: papeis.length
      ? papeis.map(p => [p.funcao, p.nome_pessoa || "—", agSigla(p.agencia_id)])
      : [["—", "Nenhum papel designado.", "—"]],
    styles: { fontSize: 9 }, headStyles: { fillColor: [40, 60, 100] },
    margin: { left: 40, right: 40 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Responsáveis por Agência
  if (responsaveis.length) {
    if (y > 680) { doc.addPage(); y = 40; }
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("Responsáveis por Agência / Órgão", 40, y); y += 4;
    autoTable(doc, {
      startY: y + 4,
      head: [["Agência", "Nome", "Cargo / Função", "Telefone", "E-mail", "Rádio"]],
      body: responsaveis.map(r => [
        agSigla(r.agencia_id),
        r.nome,
        [r.cargo, r.funcao].filter(Boolean).join(" / ") || "—",
        r.telefone || "—",
        r.email || "—",
        r.radio_canal || "—",
      ]),
      styles: { fontSize: 8 }, headStyles: { fillColor: [40, 60, 100] },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  }

  // ICS 204 — Atribuição de Recursos
  if (y > 680) { doc.addPage(); y = 40; }
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text("ICS 204 — Atribuição de Recursos", 40, y); y += 8;
  autoTable(doc, {
    startY: y + 4,
    head: [["Descrição", "Categoria", "Tipo", "Agência", "Check-in", "Status"]],
    body: recursos.length
      ? recursos.map(r => [
          r.descricao,
          (r.categoria || "").replace("_", " "),
          r.tipo_capacidade ?? "—",
          agSigla(r.agencia_id),
          r.checkin_em ? new Date(r.checkin_em).toLocaleString("pt-BR") : "⚠ sem",
          r.status,
        ])
      : [["—", "Nenhum recurso cadastrado.", "—", "—", "—", "—"]],
    styles: { fontSize: 9 }, headStyles: { fillColor: [40, 60, 100] },
    margin: { left: 40, right: 40 },
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // Rodapé em todas as páginas
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(
      `${incidente.codigo} · PO #${periodo?.numero ?? "-"} · Gerado em ${new Date().toLocaleString("pt-BR")}  —  Página ${i}/${pages}`,
      W / 2, doc.internal.pageSize.getHeight() - 20, { align: "center" }
    );
    doc.setTextColor(0);
  }

  doc.save(`PAI_${incidente.codigo}_PO${periodo?.numero ?? "x"}.pdf`);
}
