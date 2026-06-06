import { Document, Packer, Paragraph, TableCell, TableRow, TextRun, WidthType } from "docx";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import type { Customer, Deal } from "../types";
import type { DocumentDraft, DocumentType } from "./documentService";

export type ExportFormat = "PDF" | "Word" | "Excel";

export function getSupportedExportFormats(documentType: DocumentType): ExportFormat[] {
  return documentType === "견적서" ? ["PDF", "Word", "Excel"] : ["PDF", "Word"];
}

export function recommendedExportFormat(documentType: DocumentType): ExportFormat {
  if (documentType === "견적서") return "Excel";
  if (documentType === "제안서") return "PDF";
  return "Word";
}

export function buildExportFileName(customer: Customer, deal: Deal, documentType: DocumentType, format: ExportFormat, date = new Date(), templateName?: string) {
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const ext = format === "Excel" ? "xlsx" : format === "Word" ? "docx" : "pdf";
  return `${sanitize(customer.baseName || customer.displayName || customer.name)}_${documentType}_${sanitize(templateName || deal.name)}_${ymd}.${ext}`;
}

export async function exportDocument(draft: DocumentDraft, format: ExportFormat, customer: Customer, deal: Deal) {
  const fileName = buildExportFileName(customer, deal, draft.documentType, format, new Date(), draft.templateName);
  if (!getSupportedExportFormats(draft.documentType).includes(format)) {
    throw new Error(`${draft.documentType} 문서는 ${format} 다운로드를 지원하지 않습니다.`);
  }
  if (format === "Excel") exportToExcel(draft, fileName);
  if (format === "PDF") exportToPdf(draft, fileName);
  if (format === "Word") await exportToWord(draft, fileName);
  return fileName;
}

export function exportToPdf(draft: DocumentDraft, fileName: string) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const lines = splitText([draft.title, "", draft.body].join("\n"), 80);
  const isOfficialLetter = draft.body.includes("문서번호") || draft.body.includes("수    신");
  let y = isOfficialLetter ? 70 : 46;
  if (isOfficialLetter) {
    pdf.setTextColor(29, 78, 216);
    pdf.setFont("helvetica", "bold");
    pdf.text("KICA", 40, 32);
    pdf.setFontSize(8);
    pdf.text("CRM", 40, 43);
    pdf.setFontSize(12);
    pdf.text("KICA CRM", 495, 805);
    pdf.setTextColor(0, 0, 0);
  }
  pdf.setFont("helvetica", "bold");
  pdf.text(draft.title, 40, y);
  pdf.setFont("helvetica", "normal");
  y += 26;
  lines.forEach((line) => {
    if (y > 790) {
      pdf.addPage();
      y = 46;
    }
    pdf.text(line, 40, y);
    y += 16;
  });
  pdf.save(fileName);
}

export async function exportToWord(draft: DocumentDraft, fileName: string) {
  const isOfficialLetter = draft.body.includes("문서번호") || draft.body.includes("수    신");
  const doc = new Document({
    sections: [{
      children: [
        ...(isOfficialLetter ? [
          new Paragraph({ children: [new TextRun({ text: "KICA", bold: true, color: "1D4ED8" }), new TextRun({ text: " CRM", bold: true, color: "64748B" })] }),
          new Paragraph({ text: "" }),
        ] : []),
        new Paragraph({ children: [new TextRun({ text: draft.title, bold: true, size: 30 })] }),
        new Paragraph({ text: "" }),
        ...draft.sections.flatMap((section) => [
          new Paragraph({ children: [new TextRun({ text: section.label, bold: true })] }),
          new Paragraph({ text: section.value }),
        ]),
        ...(isOfficialLetter ? [
          new Paragraph({ text: "" }),
          new Paragraph({ children: [new TextRun({ text: "KICA CRM", bold: true, color: "1D4ED8" })] }),
        ] : []),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, fileName);
}

export function exportToExcel(draft: DocumentDraft, fileName: string) {
  const rows = draft.documentType === "견적서"
    ? quoteRowsFromDraft(draft)
    : [{ 제목: draft.title, 내용: draft.body }];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, draft.documentType);
  XLSX.writeFile(workbook, fileName);
}

function quoteRowsFromDraft(draft: DocumentDraft) {
  const pick = (label: string) => draft.sections.find((section) => section.label === label)?.value || "";
  return [{
    No: 1,
    품목: pick("견적 제목") || draft.title,
    "제품/모듈": pick("제품/라이선스 구성"),
    수량: pick("수량"),
    단가: pick("단가"),
    공급가: pick("공급가"),
    할인율: pick("할인율"),
    "할인 금액": pick("할인 금액"),
    금액: pick("최종 금액"),
    비고: pick("비고"),
  }];
}

export function createQuoteTableRows(draft: DocumentDraft) {
  return draft.sections.map((section) => new TableRow({
    children: [
      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph(section.label)] }),
      new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [new Paragraph(section.value)] }),
    ],
  }));
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function sanitize(value: string) {
  return value.replace(/[\\/:*?"<>|\s()·]+/g, "").slice(0, 48);
}

function splitText(text: string, max = 80) {
  return text.split("\n").flatMap((line) => {
    if (line.length <= max) return [line];
    const chunks: string[] = [];
    for (let i = 0; i < line.length; i += max) chunks.push(line.slice(i, i + max));
    return chunks;
  });
}
