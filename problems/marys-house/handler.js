// problems/marys-house/handler.js
// Flow:
//   1. LLM extracts a structured org profile from free text (input/output only)
//   2. PURE CODE scores every grant against the profile (no AI in scoring)
//   3. LLM writes a short plain-English briefing over the ranked list
//   4. Fall back to the canned briefing in the data file if Gemini dies

import { gen } from "../../lib/gemini.js";
import { loadData, loadFallback } from "../../lib/loadData.js";
import { scoreGrants } from "./logic.js";
import {
  EXTRACT_SYSTEM,
  EXPLAIN_SYSTEM,
  buildExtractUser,
  buildExplainUser,
} from "./prompt.js";

function safeParseJson(text) {
  if (!text) return null;
  // Strip ```json fences if the model added them.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find the first {...} block.
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

export async function handle({ input }) {
  const description = String(input || "").trim();
  if (!description) throw new Error("Please describe the organisation.");

  const data = loadData("marys-house");

  // --- AI step 1: extract structured profile -------------------------------
  let profile = null;
  let extractFailed = false;
  try {
    const raw = await gen(EXTRACT_SYSTEM, buildExtractUser(description));
    profile = safeParseJson(raw);
    if (!profile) extractFailed = true;
  } catch (err) {
    extractFailed = true;
    console.warn("[marys-house] extract failed:", err.message);
  }

  // If extraction failed, fall back to a permissive default profile so the
  // rule engine still produces a ranked list.
  if (!profile) {
    profile = {
      cause: ["women", "domestic violence", "housing"],
      region: ["national", "nsw"],
      needAmountAud: 50000,
      programStage: "established",
      peopleServed: ["women", "families"],
    };
  }

  // --- PURE-CODE step: score every grant -----------------------------------
  const ranked = scoreGrants(profile, data.grants);
  const top = ranked.slice(0, 3);

  // --- AI step 2: plain-English briefing -----------------------------------
  let narrative;
  let isFallback = false;
  try {
    narrative = await gen(EXPLAIN_SYSTEM, buildExplainUser(profile, top));
  } catch (err) {
    const fb = loadFallback("marys-house");
    narrative = fb.narrative;
    isFallback = true;
    console.warn("[marys-house] explain failed, using fallback:", err.message);
  }

  const items = ranked.slice(0, 5).map((g) => ({
    title: `${g.title} — ${g.funder}`,
    subtitle: `${g.amount}${g.deadline ? ` · closes ${g.deadline}` : ""}`,
    body: g.reasons.join(" · "),
    score: g.score,
  }));

  return {
    isFallback: isFallback || extractFailed,
    result: {
      narrative,
      metrics: {
        "Grants scored": ranked.length,
        "Top score": ranked[0]?.score ?? 0,
        "Extracted region": (profile.region || []).join(", ") || "—",
      },
      items,
      raw: { profile, top },
    },
  };
}
