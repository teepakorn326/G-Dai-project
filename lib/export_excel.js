import fs from 'node:fs';
import * as xlsx from 'xlsx';

export function exportExcel(clients, templatePath, outputPath) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found at ${templatePath}`);
  }

  const workbook = xlsx.readFile(templatePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Map our keys to specific column indices in the template (0-indexed)
  const cols = [
    { dim: "Life Overall", bIdx: 3, m3Idx: 4, m6Idx: 5 },
    { dim: "Standard of Living", bIdx: 6, m3Idx: 7, m6Idx: 8 },
    { dim: "Health", bIdx: 9, m3Idx: 10, m6Idx: 11 },
    { dim: "Achieving in Life", bIdx: 12, m3Idx: 13, m6Idx: 14 },
    { dim: "Personal Relationships", bIdx: 15, m3Idx: 16, m6Idx: 17 },
    { dim: "Safety", bIdx: 18, m3Idx: 19, m6Idx: 20 },
    { dim: "Community", bIdx: 21, m3Idx: 22, m6Idx: 23 },
    { dim: "Future Security", bIdx: 24, m3Idx: 25, m6Idx: 26 },
    { dim: "Financial Worry", bIdx: 27, m3Idx: 28, m6Idx: 29 },
    { dim: "Self-Confidence", bIdx: 30, m3Idx: 31, m6Idx: 32 },
    { dim: "Voice & Agency", bIdx: 33, m3Idx: 34, m6Idx: 35 },
    { dim: "Work Readiness", bIdx: 36, m3Idx: 37, m6Idx: 38 },
    { dim: "Career Confidence", bIdx: 39, m3Idx: 40, m6Idx: 41 },
    { dim: "Skills Awareness", bIdx: 42, m3Idx: 43, m6Idx: 44 }
  ];

  let startRow = 5; // row index 5 represents Excel row 6

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const rIdx = startRow + i;

    // Col A (0): Intake #
    xlsx.utils.sheet_add_aoa(sheet, [[client.intakeId]], { origin: { r: rIdx, c: 0 } });
    
    // Col B (1): Client Name
    xlsx.utils.sheet_add_aoa(sheet, [[client.id]], { origin: { r: rIdx, c: 1 } });
    
    // Col C (2): Cohort
    xlsx.utils.sheet_add_aoa(sheet, [[client.cohort]], { origin: { r: rIdx, c: 2 } });

    // Scores
    for (const mapping of cols) {
      const dim = mapping.dim;
      const bVal = client.scores.Baseline[dim] ?? null;
      const m3Val = client.scores["3mo"][dim] ?? null;
      const m6Val = client.scores["6mo"] ? (client.scores["6mo"][dim] ?? null) : null;

      if (bVal !== null) xlsx.utils.sheet_add_aoa(sheet, [[bVal]], { origin: { r: rIdx, c: mapping.bIdx } });
      if (m3Val !== null) xlsx.utils.sheet_add_aoa(sheet, [[m3Val]], { origin: { r: rIdx, c: mapping.m3Idx } });
      if (m6Val !== null) xlsx.utils.sheet_add_aoa(sheet, [[m6Val]], { origin: { r: rIdx, c: mapping.m6Idx } });
    }
  }

  xlsx.writeFile(workbook, outputPath);
  return { success: true };
}
