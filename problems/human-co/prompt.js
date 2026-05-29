// problems/human-co/prompt.js
// LLM responsibilities here are STRICTLY:
//   1. Parse the maintenance request text into a structured ticket
//   2. After pure-code scheduling decides a slot, write a one-paragraph
//      plain-English explanation for the ops team.
// The LLM never picks the slot, the tech, or the date.

export const PARSE_SYSTEM = `You are an assistant for a property maintenance team.
You will be given a free-text maintenance request and a list of known sites
and categories. Return a JSON object ONLY — no prose, no code fences —
matching this exact shape:

{
  "siteId": "<one of the provided site ids, or null if you cannot tell>",
  "category": "plumbing" | "electrical" | "hvac" | "general",
  "description": "<one-line restatement of the issue>",
  "estHours": <number, your best estimate of work hours, 0.5–8>,
  "safetyRisk": <true if gas/electrical/fire/flood/structural, else false>,
  "requestedBy": "<name if mentioned, else null>",
  "earliestPreferred": "<YYYY-MM-DD if a preferred date is stated, else null>"
}

Be conservative on safetyRisk — when in doubt, set true. Do NOT propose a
schedule, a tech, or a date — those are decided by code, not by you.`;

export function buildParseUser(requestText, sites) {
  const siteList = sites
    .map((s) => `- ${s.id}: ${s.name} (${s.suburb})`)
    .join("\n");
  return [
    `Known sites:`,
    siteList,
    ``,
    `Maintenance request:`,
    `"""${requestText}"""`,
    ``,
    `Return JSON only.`,
  ].join("\n");
}

export const EXPLAIN_SYSTEM = `You are an assistant for a property maintenance team.
You are given a SCHEDULING DECISION that has already been made by deterministic
code. Your job is to write ONE short paragraph (2–4 sentences) for the team
that explains the decision in plain English.

Rules:
- Do NOT change the date, tech, site, or priority. Repeat them exactly.
- If compliance flags are present, mention them as a heads-up for on-site.
- Tone: calm, practical, Australian English. No emojis. No hype.`;

export function buildExplainUser(decision, ticket, complianceFlags) {
  return [
    `Ticket: ${JSON.stringify(ticket)}`,
    `Decision: ${JSON.stringify(decision)}`,
    `Compliance flags at site: ${JSON.stringify(complianceFlags)}`,
    ``,
    `Write the paragraph.`,
  ].join("\n");
}
