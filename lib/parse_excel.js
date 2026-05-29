import * as xlsx from 'xlsx';

let seen_names = new Set();
let client_name_map = {};
let anonymised_counter = 1;

export function resetGlobals() {
  seen_names = new Set();
  client_name_map = {};
  anonymised_counter = 1;
}

function getAnonymisedName(name) {
  if (!name || typeof name !== "string" || name.trim() === "") return name;
  const nameStrip = name.trim();
  const skips = ["Client Name", "Name", "Guide", "WWE", "Cohort / Program", "Data Entry", "Summary", "Intakes"];
  if (skips.includes(nameStrip)) return name;
  
  if (!client_name_map[nameStrip]) {
    client_name_map[nameStrip] = `Client #${String(anonymised_counter).padStart(3, '0')}`;
    anonymised_counter++;
  }
  return client_name_map[nameStrip];
}

function checkDuplicate(name) {
  if (!name || typeof name !== "string" || name.trim() === "") return;
  const nameStrip = name.trim();
  const skips = ["Client Name", "Name", "Guide", "WWE", "Cohort / Program", "Data Entry", "Summary", "Intakes"];
  if (skips.includes(nameStrip)) return;
  
  const cleaned = nameStrip.toLowerCase();
  if (seen_names.has(cleaned)) {
    throw new Error(`CSV Parse error: Duplicate client name detected across files: '${nameStrip}'`);
  }
  seen_names.add(cleaned);
}

function parseCsv(filePath) {
  const clients = [];
  const dimensionMap = {
    "pwi_life_overall": "Life Overall",
    "pwi_standard_of_living": "Standard of Living",
    "pwi_health": "Health",
    "pwi_achieving_in_life": "Achieving in Life",
    "pwi_personal_relationships": "Personal Relationships",
    "pwi_safety": "Safety",
    "pwi_community": "Community",
    "pwi_future_security": "Future Security",
    "financial_worry": "Financial Worry",
    "self_confidence": "Self-Confidence",
    "voice_agency": "Voice & Agency",
    "work_readiness": "Work Readiness",
    "career_confidence": "Career Confidence",
    "skills_awareness": "Skills Awareness"
  };

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

  for (const row of rows) {
    const clientId = row["client_id"] !== undefined && row["client_id"] !== "" ? String(row["client_id"]) : "Unknown";
    
    if (clientId !== "Unknown") checkDuplicate(clientId);
    const anonymised = clientId !== "Unknown" ? getAnonymisedName(clientId) : "Unknown";
    
    const intake = row["intake_number"] !== undefined ? String(row["intake_number"]) : "";
    const cohort = row["program"] !== undefined ? String(row["program"]) : "";
    
    const scores = { Baseline: {}, "3mo": {}, "6mo": {} };
    
    const parseVal = (valStr) => {
      if (valStr === undefined || valStr === null || String(valStr).trim() === "") return null;
      const num = Number(valStr);
      return isNaN(num) ? null : num;
    };

    for (const [csvBase, dimName] of Object.entries(dimensionMap)) {
      scores["Baseline"][dimName] = parseVal(row[`${csvBase}_baseline`]);
      scores["3mo"][dimName] = parseVal(row[`${csvBase}_3mo`]);
      scores["6mo"][dimName] = parseVal(row[`${csvBase}_6mo`]);
    }
    
    if (Object.values(scores["6mo"]).every(v => v === null)) {
      scores["6mo"] = null;
    }
    
    clients.push({
      id: anonymised,
      intakeId: intake,
      cohort: cohort,
      scores
    });
  }

  const mockSheet = [
    ["Intake #", "Client ID", "Cohort / Program", "Life Overall (Base)", "Life Overall (3mo)", "Life Overall (6mo)"]
  ];
  for (let i = 0; i < Math.min(5, clients.length); i++) {
    const c = clients[i];
    const baseLo = c.scores.Baseline["Life Overall"] ?? '-';
    const m3Lo = c.scores["3mo"]["Life Overall"] ?? '-';
    const m6Lo = c.scores["6mo"] ? (c.scores["6mo"]["Life Overall"] ?? '-') : '-';
    mockSheet.push([c.intakeId, c.id, c.cohort, baseLo, m3Lo, m6Lo]);
  }

  return { clients, sheets: { "Data Entry (CSV)": mockSheet } };
}

function parseXlsx(filePath) {
  const workbook = xlsx.readFile(filePath);
  const parsedSheets = {};
  const clients = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    parsedSheets[sheetName] = rows;
  }

  let dataEntryRows = parsedSheets["Data Entry"];
  if (!dataEntryRows && workbook.SheetNames.length > 0) {
    dataEntryRows = parsedSheets[workbook.SheetNames[0]];
  }

  let clientCount = 0;
  if (dataEntryRows) {
    for (let rowIdx = 5; rowIdx < dataEntryRows.length; rowIdx++) {
      const row = dataEntryRows[rowIdx];
      if (!row || row.length < 3 || (row[0] === null && row[1] === null)) continue;

      const realName = row[1] !== null && row[1] !== undefined ? String(row[1]) : "";
      if (realName) checkDuplicate(realName);
      
      clientCount++;
      const anonymisedName = realName ? getAnonymisedName(realName) : `Client #${String(clientCount).padStart(3, '0')}`;
      
      const intake = row[0] !== null && row[0] !== undefined ? String(row[0]) : "";
      const cohort = row[2] !== null && row[2] !== undefined ? String(row[2]) : "";

      const scores = { Baseline: {}, "3mo": {}, "6mo": {} };
      const cols = [
        [3, 4, 5, "Life Overall"],
        [6, 7, 8, "Standard of Living"],
        [9, 10, 11, "Health"],
        [12, 13, 14, "Achieving in Life"],
        [15, 16, 17, "Personal Relationships"],
        [18, 19, 20, "Safety"],
        [21, 22, 23, "Community"],
        [24, 25, 26, "Future Security"],
        [27, 28, 29, "Financial Worry"],
        [30, 31, 32, "Self-Confidence"],
        [33, 34, 35, "Voice & Agency"],
        [36, 37, 38, "Work Readiness"],
        [39, 40, 41, "Career Confidence"],
        [42, 43, 44, "Skills Awareness"]
      ];

      for (const [bIdx, m3Idx, m6Idx, dim] of cols) {
        const bVal = bIdx < row.length ? row[bIdx] : null;
        const m3Val = m3Idx < row.length ? row[m3Idx] : null;
        const m6Val = m6Idx < row.length ? row[m6Idx] : null;

        scores.Baseline[dim] = typeof bVal === 'number' ? bVal : null;
        scores["3mo"][dim] = typeof m3Val === 'number' ? m3Val : null;
        scores["6mo"][dim] = typeof m6Val === 'number' ? m6Val : null;
      }

      if (Object.values(scores["6mo"]).every(v => v === null)) {
        scores["6mo"] = null;
      }

      clients.push({ id: anonymisedName, intakeId: intake, cohort, scores });
    }
  }

  // Apply anonymisation mask to preview sheet output
  for (const [sName, sRows] of Object.entries(parsedSheets)) {
    for (let rIdx = 0; rIdx < sRows.length; rIdx++) {
      const row = sRows[rIdx];
      if (!row) continue;
      for (let cIdx = 0; cIdx < row.length; cIdx++) {
        const cell = row[cIdx];
        if (typeof cell === 'string') {
          const trimmed = cell.trim();
          if (client_name_map[trimmed]) {
            parsedSheets[sName][rIdx][cIdx] = client_name_map[trimmed];
          }
        }
      }
    }
  }

  return { clients, sheets: parsedSheets };
}

export function parseFiles(filePaths) {
  resetGlobals();
  let all_clients = [];
  let merged_sheets = {};
  
  for (let idx = 0; idx < filePaths.length; idx++) {
    const filePath = filePaths[idx];
    const isCsv = filePath.toLowerCase().endsWith('.csv');
    let data;
    if (isCsv) {
      data = parseCsv(filePath);
    } else {
      data = parseXlsx(filePath);
    }
    
    all_clients.push(...data.clients);
    
    for (const [sheetName, sheetData] of Object.entries(data.sheets)) {
      const mergedKey = filePaths.length === 1 ? sheetName : `${sheetName} (File ${idx+1})`;
      merged_sheets[mergedKey] = sheetData;
    }
  }
  
  return {
    clients: all_clients,
    sheets: merged_sheets
  };
}
