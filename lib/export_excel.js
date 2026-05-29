import fs from 'node:fs';
import ExcelJS from 'exceljs';
import {
  averagePerDimension,
  changePerDimension,
  completionRate,
  calculateOverallIndexStats,
  PWI_DIMENSIONS,
  LIKERT_5_SCALE_DIMENSIONS,
} from '../problems/two-good/logic.js';

// Dimension order matches the Data Entry sheet: 3 meta columns (intake, client,
// cohort) then Baseline / 3mo / 6mo for each of the 14 PWI dimensions.
const DIMS = [
  "Life Overall", "Standard of Living", "Health", "Achieving in Life",
  "Personal Relationships", "Safety", "Community", "Future Security",
  "Financial Worry", "Self-Confidence", "Voice & Agency", "Work Readiness",
  "Career Confidence", "Skills Awareness",
];

const FIRST_DATA_ROW = 6;                 // rows 1-5 are the styled header
const LAST_COL = 3 + DIMS.length * 3;     // 3 meta + 3 timepoints x 14 dims = 45
const BAND_ROWS = [6, 7];                 // template's two alternating row styles

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const signed = (n) => `${n >= 0 ? "+" : ""}${n}`;

// Add a "Methodology" sheet documenting how every metric / percentage in the
// report is calculated, alongside the value computed from this dataset. Uses
// the same pure logic the app uses, so the explanations match the dashboard.
function addMethodologySheet(wb, clients) {
  const existing = wb.getWorksheet("Methodology");
  if (existing) wb.removeWorksheet(existing.id);
  const ws = wb.addWorksheet("Methodology");

  ws.getColumn(1).width = 36;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 52;

  const title = ws.addRow(["How the numbers are calculated"]);
  title.font = { bold: true, size: 14 };
  ws.addRow([]);
  const note = ws.addRow([
    "Client identifiers are de-identified. PWI dimensions use a 0–10 scale, except Financial Worry, Self-Confidence, Voice & Agency and Work Readiness which use a 1–5 Likert scale (normalised to 0–10 as (score − 1) × 2.5 for the overall index). Averages ignore blank scores.",
  ]);
  ws.mergeCells(note.number, 1, note.number, 7);
  note.getCell(1).alignment = { wrapText: true };
  note.height = 56;
  ws.addRow([]);

  const idx = calculateOverallIndexStats(clients);
  const rate = completionRate(clients);
  const head = ws.addRow(["Metric", "Value", "How it's calculated"]);
  head.font = { bold: true };
  ws.mergeCells(head.number, 3, head.number, 7);
  [
    ["Total clients", clients.length, "Count of client records imported from the upload"],
    ["Completion rate", `${rate}%`, "Clients with at least one 6-month score ÷ total clients × 100"],
    ["Overall Wellbeing Index — baseline", idx.Baseline, "Mean of all 14 dimension averages at baseline (1–5 dims normalised to 0–10)"],
    ["Overall Wellbeing Index — 6 months", idx["6mo"], "Mean of all 14 dimension averages at 6 months (normalised)"],
    ["Overall Wellbeing Index — gain", `${signed(idx.absolute)} (${signed(idx.percent)}%)`, "(6-month index − baseline index); % = change ÷ baseline index × 100"],
  ].forEach((r) => {
    const row = ws.addRow(r);
    ws.mergeCells(row.number, 3, row.number, 7);
    row.getCell(3).alignment = { wrapText: true };
  });

  ws.addRow([]);
  const sub = ws.addRow(["Per-dimension change (Baseline → 6 months)"]);
  sub.font = { bold: true, size: 12 };
  const h2 = ws.addRow(["Dimension", "Scale", "Baseline avg", "6-month avg", "Change", "% change", "How % change is calculated"]);
  h2.font = { bold: true };

  const base = averagePerDimension(clients, "Baseline");
  const mo6 = averagePerDimension(clients, "6mo");
  const changes = changePerDimension(clients);
  for (const dim of PWI_DIMENSIONS) {
    const c = changes[dim] || { absolute: 0, percent: 0 };
    const scale = LIKERT_5_SCALE_DIMENSIONS.includes(dim) ? "1–5" : "0–10";
    const row = ws.addRow([
      dim,
      scale,
      base[dim],
      mo6[dim],
      signed(c.absolute),
      `${signed(c.percent)}%`,
      "(6-month avg − baseline avg) ÷ baseline avg × 100",
    ]);
    row.getCell(7).alignment = { wrapText: true };
  }
}

/**
 * Fill the styled PWI tracker template with parsed clients, preserving the
 * template's colours, zebra banding, merges, column widths and hidden columns.
 * Returns the generated workbook as a Buffer (no temp file needed).
 */
export async function exportExcel(clients, templatePath) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found at ${templatePath}`);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet("Data Entry") || wb.worksheets[0];

  // Snapshot the two alternating data-row styles from the template before we
  // start overwriting rows, so we can re-apply the banding to every output row
  // (including rows past the template's example data).
  const bandStyles = BAND_ROWS.map((rn) => {
    const row = ws.getRow(rn);
    const styles = [];
    for (let c = 1; c <= LAST_COL; c++) {
      styles[c] = JSON.parse(JSON.stringify(row.getCell(c).style || {}));
    }
    return styles;
  });

  const lastTemplateRow = ws.lastRow ? ws.lastRow.number : FIRST_DATA_ROW;

  clients.forEach((client, i) => {
    const row = ws.getRow(FIRST_DATA_ROW + i);
    const band = bandStyles[i % 2];
    for (let c = 1; c <= LAST_COL; c++) row.getCell(c).style = band[c];

    row.getCell(1).value = toNumber(client.intakeId) ?? (client.intakeId ?? "");
    row.getCell(2).value = client.id ?? "";
    row.getCell(3).value = client.cohort ?? "";

    DIMS.forEach((dim, k) => {
      const base = 4 + 3 * k;
      row.getCell(base).value = toNumber(client.scores?.Baseline?.[dim]);
      row.getCell(base + 1).value = toNumber(client.scores?.["3mo"]?.[dim]);
      row.getCell(base + 2).value = toNumber(client.scores?.["6mo"]?.[dim]);
    });
  });

  // Clear leftover example rows when the new data is shorter than the template.
  for (let r = FIRST_DATA_ROW + clients.length; r <= lastTemplateRow; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= LAST_COL; c++) row.getCell(c).value = null;
  }

  addMethodologySheet(wb, clients);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
