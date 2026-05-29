// lib/constants.js
// Shared constants. Keep all magic strings/numbers used across the app here.

export const MODEL_DEFAULT = "gemini-2.5-flash";
export const MODEL_COMPLEX = "gemini-3.1-pro";

// The Two Good Co. application configuration
export const PROBLEMS = [
  {
    id: "two-good",
    label: "Two Good",
    blurb: "Consolidate client wellbeing tracking outcomes into an automated quarterly impact report.",
    inputLabel: "Quarter / Period to report",
    inputPlaceholder: "e.g. Q3 2026",
    inputType: "text",
    acceptsFile: true,
  }
];

export const PROBLEM_IDS = PROBLEMS.map((p) => p.id);
