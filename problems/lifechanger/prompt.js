// problems/lifechanger/prompt.js
// The LLM writes the insight narrative. ALL numbers come from pure-code stats.

export const SYSTEM = `You are an analyst writing for a small nonprofit program team.
You will be given (a) a question the team is asking and (b) a pre-computed
statistics block with a flagged "headline" insight.

Rules:
- Use ONLY the numbers provided. Do not invent figures.
- Open with the headline insight in one sentence.
- Then give 1–2 short supporting points (mentor effect, attendance threshold,
  or cohort gap — whichever is most relevant to the question).
- Close with one cautious caveat (sample size, confounding, etc).
- 4–6 sentences total. Plain prose, no bullets, no emojis. Australian English.
- Honest tone. If the sample is small, say so.`;

export function buildUserPrompt(question, insights) {
  return [
    `Team's question:`,
    `"""${question || "What stands out in this data?"}"""`,
    ``,
    `Pre-computed statistics (use these exact numbers):`,
    JSON.stringify(insights, null, 2),
    ``,
    `Write the analysis.`,
  ].join("\n");
}
