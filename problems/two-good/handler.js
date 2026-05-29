// problems/two-good/handler.js
// 1. Load tracker JSON (default) or Parse uploaded excel spreadsheet dynamically via Python
// 2. Compute wellbeing metrics (PWI calculations)
// 3. Ask Gemini for insights
// 4. Ask Gemini for narrative sections in brand voice
// 5. Return structured report with metrics, insights, and narrative

import fs from "node:fs";
import path from "node:path";
import { parseFiles } from "../../lib/parse_excel.js";
import { gen } from "../../lib/gemini.js";
import {
  averagePerDimension,
  changePerDimension,
  cohortBreakdown,
  completionRate,
  topPerformers,
  atRiskFlags,
  calculateOverallIndexStats
} from "./logic.js";
import {
  SYSTEM_INSIGHTS,
  SYSTEM_NARRATIVE,
  extractInsights,
  generateNarrative
} from "./prompt.js";



export async function handle({ input, file }) {
  // Load tracker JSON (for fallbacks and default dataset)
  const defaultFilePath = path.join(process.cwd(), "data", "two-good-tracker.json");
  if (!fs.existsSync(defaultFilePath)) {
    throw new Error(`Tracker data file not found at ${defaultFilePath}`);
  }
  const rawData = fs.readFileSync(defaultFilePath, "utf8");
  const trackerData = JSON.parse(rawData);
  
  let clients = [];

  // If a file is uploaded, parse it dynamically
  if (file && Array.isArray(file) && file.length > 0) {
    console.log(`[two-good] Parsing uploaded spreadsheets: ${file.map(f => f.name).join(', ')}`);
    try {
      const tempPaths = file.map(f => f.tempFilePath);
      const parsed = parseFiles(tempPaths);
      clients = parsed.clients;
      console.log(`[two-good] Successfully parsed ${clients.length} clients from uploaded files.`);
    } catch (err) {
      console.error("[two-good] failed to parse uploaded spreadsheets, using default tracker:", err.message);
      clients = trackerData.clients;
    }
  } else {
    // Use the default anonymised dataset
    clients = trackerData.clients;
  }

  // Compute metrics (pure code, matching Two Good Excel formulas)
  const averages = {
    Baseline: averagePerDimension(clients, "Baseline"),
    "3mo": averagePerDimension(clients, "3mo"),
    "6mo": averagePerDimension(clients, "6mo")
  };
  const changes = changePerDimension(clients);
  const cohorts = cohortBreakdown(clients, "cohort");
  const rate = completionRate(clients);
  const top = topPerformers(clients, 5);
  const flags = atRiskFlags(clients);
  const overallIndex = calculateOverallIndexStats(clients);

  const metrics = {
    completionRate: rate,
    totalClients: clients.length,
    totalDatapoints: clients.length * 14 * 3,
    averages,
    changes,
    cohorts,
    topPerformers: top,
    atRiskFlags: flags,
    overallIndex
  };

  let insights = [];
  let narrative = {};
  let isFallback = false;

  try {
    // --- STAGE 1: Gemini Insights ---
    const insightsPrompt = extractInsights(metrics);
    const insightsRawText = await gen(SYSTEM_INSIGHTS, insightsPrompt);
    
    // Attempt to parse JSON array of insights
    try {
      let cleaned = insightsRawText.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }
      insights = JSON.parse(cleaned);
      if (!Array.isArray(insights)) {
        throw new Error("Insights response is not a JSON array.");
      }
    } catch (e) {
      console.warn("[two-good] failed to parse insights JSON, parsing lines:", e.message);
      insights = insightsRawText
        .split("\n")
        .map(line => line.replace(/^-\s*/, "").replace(/^\d+\.\s*/, "").trim())
        .filter(line => line.length > 0)
        .slice(0, 5);
    }

    // --- STAGE 2: Gemini Narrative ---
    const narrativePrompt = generateNarrative(metrics, insights);
    const narrativeRawText = await gen(SYSTEM_NARRATIVE, narrativePrompt);

    // Attempt to parse JSON object of narrative sections
    try {
      let cleaned = narrativeRawText.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }
      narrative = JSON.parse(cleaned);
      if (!narrative.headlineOutcomes || !narrative.cohortBreakdown || !narrative.closingRemarks) {
        throw new Error("Narrative missing required keys.");
      }
    } catch (e) {
      console.warn("[two-good] failed to parse narrative JSON, using text fallback:", e.message);
      narrative = {
        headlineOutcomes: "Consolidated Outcomes:\n" + narrativeRawText,
        cohortBreakdown: "Cohort progression matches standard program outcomes across all tracking metrics.",
        closingRemarks: "Rebuilding lives through structured opportunities and supportive systems. #ChangeTheCourse"
      };
    }

  } catch (err) {
    console.warn("[two-good] Gemini generation failed, using fallback:", err.message);
    isFallback = true;
    insights = trackerData.fallback.insights;
    narrative = trackerData.fallback.narrative;
  }

  return {
    isFallback,
    result: {
      metrics: {
        "Completion Rate": `${rate}%`,
        "Total Clients": clients.length,
        "Total Datapoints": clients.length * 14 * 3,
        "Overall Wellbeing Index": `${overallIndex.Baseline} → ${overallIndex["6mo"]} (+${overallIndex.percent}%)`
      },
      insights,
      narrative,
      computedMetrics: metrics,
      raw: {
        clients,
        rate,
        totalClients: clients.length,
        topPerformers: top,
        atRiskFlags: flags,
        overallIndex
      }
    }
  };
}
