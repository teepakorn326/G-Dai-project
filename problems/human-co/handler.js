// problems/human-co/handler.js
// 1. LLM parses the request text into a ticket.
// 2. PURE CODE picks the slot (never the LLM).
// 3. LLM writes a short explanation of the deterministic decision.

import { gen } from "../../lib/gemini.js";
import { loadData, loadFallback } from "../../lib/loadData.js";
import { findSlot, complianceFlags, derivePriority } from "./logic.js";
import {
  PARSE_SYSTEM,
  EXPLAIN_SYSTEM,
  buildParseUser,
  buildExplainUser,
} from "./prompt.js";

function safeParseJson(text) {
  if (!text) return null;
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* */
      }
    }
    return null;
  }
}

export async function handle({ input }) {
  const requestText = String(input || "").trim();
  if (!requestText) throw new Error("Please describe the maintenance request.");

  const data = loadData("human-co");

  // --- AI step 1: parse the request ----------------------------------------
  let ticket = null;
  let parseFailed = false;
  try {
    const raw = await gen(PARSE_SYSTEM, buildParseUser(requestText, data.sites));
    ticket = safeParseJson(raw);
  } catch (err) {
    parseFailed = true;
    console.warn("[human-co] parse failed:", err.message);
  }

  // Fallback ticket if parsing fails — pick the first site, mark as general.
  if (!ticket) {
    parseFailed = true;
    ticket = {
      siteId: data.sites[0]?.id,
      category: "general",
      description: requestText.slice(0, 120),
      estHours: 2,
      safetyRisk: /gas|leak|fire|flood|spark/i.test(requestText),
      requestedBy: null,
      earliestPreferred: null,
    };
  }

  // --- PURE-CODE step: schedule it -----------------------------------------
  const decision = findSlot(ticket, data.sites, data.techs, data.bookings || []);
  const priority = decision.ok ? null : decision.priority || derivePriority(ticket);
  const flags = complianceFlags(ticket.siteId, data.sites);

  // --- AI step 2: human-readable explanation -------------------------------
  let narrative;
  let isFallback = false;
  try {
    narrative = await gen(
      EXPLAIN_SYSTEM,
      buildExplainUser(decision, ticket, flags)
    );
  } catch (err) {
    const fb = loadFallback("human-co");
    narrative = fb.narrative;
    isFallback = true;
    console.warn("[human-co] explain failed, using fallback:", err.message);
  }

  const metrics = decision.ok
    ? {
        Priority: decision.slot.priority,
        "SLA (days)": decision.slot.slaDays,
        "Scheduled date": decision.slot.date,
        Tech: decision.slot.techName,
        Site: decision.slot.siteName,
        "Est. hours": decision.slot.hours,
      }
    : {
        Priority: priority?.level || "P4",
        "SLA (days)": priority?.slaDays || 10,
        Status: "No slot found",
      };

  const items = flags.length
    ? [
        {
          title: "Compliance heads-up",
          subtitle: `On site: ${ticket.siteId}`,
          body: flags.join(" · "),
        },
      ]
    : [];

  return {
    isFallback: isFallback || parseFailed,
    result: {
      narrative: decision.ok
        ? narrative
        : `${narrative}\n\nNo slot was found — ${decision.reason}`,
      metrics,
      items,
      raw: { ticket, decision, flags },
    },
  };
}
