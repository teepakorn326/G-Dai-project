import fs from 'node:fs';
import ExcelJS from 'exceljs';

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

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
