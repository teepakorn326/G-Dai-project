// problems/lifechanger/handler.js
// 1. Pure-code: compute statistics + flag the strongest signal.
// 2. AI: write a short, plainly-true narrative over those exact numbers.

import { gen } from "../../lib/gemini.js";
import { loadData, loadFallback } from "../../lib/loadData.js";
import { detectInsights } from "./logic.js";
import { SYSTEM, buildUserPrompt } from "./prompt.js";

export async function handle({ input }) {
  const question = String(input || "").trim();
  const data = loadData("lifechanger");

  // --- pure-code stage ------------------------------------------------------
  const insights = detectInsights(data.records);

  const metrics = {
    Participants: insights.n,
    "Overall completion": `${(insights.overallCompletionRate * 100).toFixed(1)}%`,
    "Mentor uplift": `${(insights.mentorEffect.delta * 100).toFixed(1)} pts`,
    Headline: insights.headline?.kind || "—",
  };

  // Use the heavier model for this one — it's interpretive and benefits from
  // the better reasoning. (Falls back to flash automatically if pro fails.)
  let narrative;
  let isFallback = false;
  try {
    narrative = await gen(SYSTEM, buildUserPrompt(question, insights), true);
  } catch (err) {
    // Try the cheaper model before giving up.
    try {
      narrative = await gen(SYSTEM, buildUserPrompt(question, insights), false);
    } catch (err2) {
      const fb = loadFallback("lifechanger");
      narrative = fb.narrative;
      isFallback = true;
      console.warn(
        "[lifechanger] both models failed, using fallback:",
        err2.message
      );
    }
  }

  const items = insights.cohortStats.map((c) => ({
    title: `Cohort ${c.cohort}`,
    subtitle: `n=${c.n} · avg sessions ${c.avgSessions}`,
    body: `Completion ${(c.completionRate * 100).toFixed(1)}% · mentor matched ${(
      c.mentorMatchedRate * 100
    ).toFixed(0)}%`,
    score: Math.round(c.completionRate * 100),
  }));

  return {
    isFallback,
    result: {
      narrative,
      metrics,
      items,
      raw: { insights },
    },
  };
}
