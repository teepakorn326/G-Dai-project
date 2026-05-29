// problems/two-good/logic.js
// Pure math. No AI. Donation attribution for Two Good.
//

export const TWO_GOOD_CONSTANTS = Object.freeze({
  // Cost of putting one woman through Two Good's full 12-month Work Work Work
  // program (approx, used for storytelling).
  COST_PER_WOMAN_AUD: 30000,
  // Average wage per hour paid to women in the program.
  AVG_WAGE_PER_HOUR_AUD: 32,
  // Approx ingredients cost of one meal delivered through Eat Purposeful.
  MEAL_COST_AUD: 9,
});

/**
 * computeImpact(amountAud)
 * Pure math — no rounding tricks, no marketing.
 * @param {number} amountAud
 * @returns {{
 *   amountAud: number,
 *   percentOfOneWomansJourney: number,  // e.g. 0.25  (= 25%)
 *   hoursFunded: number,
 *   mealsEquivalent: number
 * }}
 */
export function computeImpact(amountAud) {
  const amt = Number(amountAud);
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error("Donation amount must be a positive number.");
  }
  const { COST_PER_WOMAN_AUD, AVG_WAGE_PER_HOUR_AUD, MEAL_COST_AUD } =
    TWO_GOOD_CONSTANTS;

  const percentOfOneWomansJourney = amt / COST_PER_WOMAN_AUD;
  const hoursFunded = amt / AVG_WAGE_PER_HOUR_AUD;
  const mealsEquivalent = amt / MEAL_COST_AUD;

  return {
    amountAud: round2(amt),
    percentOfOneWomansJourney: round4(percentOfOneWomansJourney),
    hoursFunded: round1(hoursFunded),
    mealsEquivalent: Math.floor(mealsEquivalent),
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
function round2(n) {
  return Math.round(n * 100) / 100;
}
function round4(n) {
  return Math.round(n * 10000) / 10000;
}

// --- TG-1 Automated Impact Report PWI Metrics logic ---

export const PWI_DIMENSIONS = [
  "Life Overall",
  "Standard of Living",
  "Health",
  "Achieving in Life",
  "Personal Relationships",
  "Safety",
  "Community",
  "Future Security",
  "Financial Worry",
  "Self-Confidence",
  "Voice & Agency",
  "Work Readiness",
  "Career Confidence",
  "Skills Awareness"
];

// Specific dimensions tracked on a 1-5 scale instead of the standard 0-10 scale
export const LIKERT_5_SCALE_DIMENSIONS = [
  "Financial Worry",
  "Self-Confidence",
  "Voice & Agency",
  "Work Readiness"
];

/**
 * Normalizes scores to a consistent 0-10 range for overall indexing.
 * 1-5 Likert scale -> (score - 1) * 2.5
 */
export function getNormalizedScore(dim, score) {
  if (score === null || score === undefined) return null;
  if (LIKERT_5_SCALE_DIMENSIONS.includes(dim)) {
    return (score - 1) * 2.5;
  }
  return score;
}

/**
 * Helper to calculate unrounded averages per dimension.
 * Excludes null/undefined scores (matching Excel AVERAGEIF behavior).
 */
function getUnroundedAverages(clients, timepoint) {
  const averages = {};
  for (const dim of PWI_DIMENSIONS) {
    let sum = 0;
    let count = 0;
    for (const client of clients) {
      const score = client.scores?.[timepoint]?.[dim];
      if (score !== undefined && score !== null && typeof score === 'number') {
        sum += score;
        count++;
      }
    }
    averages[dim] = count > 0 ? sum / count : 0;
  }
  return averages;
}

/**
 * Calculates average per dimension for a given timepoint.
 * Matches Excel behavior (ignores null/undefined scores) and rounds to 2 decimals.
 * @param {Array} clients 
 * @param {string} timepoint - 'Baseline', '3mo', or '6mo'
 * @returns {Object} - dimension -> average score
 */
export function averagePerDimension(clients, timepoint) {
  const unrounded = getUnroundedAverages(clients, timepoint);
  const rounded = {};
  for (const dim of PWI_DIMENSIONS) {
    rounded[dim] = Number(unrounded[dim].toFixed(2));
  }
  return rounded;
}

/**
 * Calculates absolute and percentage change from Baseline to 6mo per dimension.
 * Computes changes on unrounded floats first, then rounds for output (Excel behavior).
 * @param {Array} clients 
 * @returns {Object} - dimension -> { absolute: number, percent: number }
 */
export function changePerDimension(clients) {
  const unroundedBase = getUnroundedAverages(clients, "Baseline");
  const unrounded6mo = getUnroundedAverages(clients, "6mo");
  const change = {};
  for (const dim of PWI_DIMENSIONS) {
    const base = unroundedBase[dim] || 0;
    const m6 = unrounded6mo[dim] || 0;
    const absolute = Number((m6 - base).toFixed(2));
    const percent = base > 0 ? Number(((absolute / base) * 100).toFixed(1)) : 0;
    change[dim] = { absolute, percent };
  }
  return change;
}

/**
 * Calculates the overall consolidated PWI index (all 14 dimensions normalized).
 */
function getOverallIndex(clients, timepoint) {
  const unrounded = getUnroundedAverages(clients, timepoint);
  let sum = 0;
  let count = 0;
  for (const dim of PWI_DIMENSIONS) {
    const avg = unrounded[dim];
    if (avg > 0) {
      const normalized = getNormalizedScore(dim, avg);
      if (normalized !== null) {
        sum += normalized;
        count++;
      }
    }
  }
  return count > 0 ? sum / count : 0;
}

/**
 * Compiles macro stats comparing overall Baseline Index vs 6-Month Index.
 * @param {Array} clients 
 * @returns {Object} - index stats
 */
export function calculateOverallIndexStats(clients) {
  const baseIndex = getOverallIndex(clients, "Baseline");
  const mo6Index = getOverallIndex(clients, "6mo");
  const absolute = mo6Index - baseIndex;
  const percent = baseIndex > 0 ? (absolute / baseIndex) * 100 : 0;
  return {
    Baseline: Number(baseIndex.toFixed(2)),
    "6mo": Number(mo6Index.toFixed(2)),
    absolute: Number(absolute.toFixed(2)),
    percent: Number(percent.toFixed(1))
  };
}

/**
 * Group clients by a property and calculate averages and completion rates.
 * @param {Array} clients 
 * @param {string} groupBy - field to group by (default 'cohort')
 * @returns {Object} - cohort name -> breakdown metrics
 */
export function cohortBreakdown(clients, groupBy = 'cohort') {
  const groups = {};
  for (const client of clients) {
    const groupVal = client[groupBy] || "Unknown";
    if (!groups[groupVal]) {
      groups[groupVal] = [];
    }
    groups[groupVal].push(client);
  }

  const breakdown = {};
  for (const groupVal in groups) {
    const groupClients = groups[groupVal];
    breakdown[groupVal] = {
      clientCount: groupClients.length,
      averages: {
        Baseline: averagePerDimension(groupClients, "Baseline"),
        "3mo": averagePerDimension(groupClients, "3mo"),
        "6mo": averagePerDimension(groupClients, "6mo")
      },
      completionRate: completionRate(groupClients)
    };
  }
  return breakdown;
}

/**
 * Completion rate calculation: percentage of clients who have 6mo data.
 * @param {Array} clients 
 * @returns {number} - completion rate % (0-100, 1 decimal)
 */
export function completionRate(clients) {
  if (!clients || clients.length === 0) return 0;
  let completed = 0;
  for (const client of clients) {
    const m6Scores = client.scores?.["6mo"];
    if (m6Scores && Object.keys(m6Scores).length > 0) {
      const hasScores = Object.values(m6Scores).some(
        (v) => v !== null && v !== undefined && typeof v === 'number'
      );
      if (hasScores) {
        completed++;
      }
    }
  }
  return Number(((completed / clients.length) * 100).toFixed(1));
}

/**
 * Helper to calculate client's average score across all 14 dimensions.
 */
function getClientAverage(client, timepoint) {
  const scores = client.scores?.[timepoint];
  if (!scores) return null;
  let sum = 0;
  let count = 0;
  for (const dim of PWI_DIMENSIONS) {
    const v = scores[dim];
    if (v !== null && v !== undefined && typeof v === 'number') {
      const normalized = getNormalizedScore(dim, v);
      if (normalized !== null) {
        sum += normalized;
        count++;
      }
    }
  }
  if (count === 0) return null;
  return sum / count;
}

/**
 * Top performers based on highest score improvement from Baseline to 6mo.
 * @param {Array} clients 
 * @param {number} limit 
 * @returns {Array} - sorted top performing clients
 */
export function topPerformers(clients, limit = 5) {
  const list = [];
  for (const client of clients) {
    const baseAvg = getClientAverage(client, "Baseline");
    const mo6Avg = getClientAverage(client, "6mo");
    if (baseAvg !== null && mo6Avg !== null) {
      const change = mo6Avg - baseAvg;
      if (change > 0) {
        list.push({
          id: client.id,
          intakeId: client.intakeId,
          cohort: client.cohort,
          baselineAvg: Number(baseAvg.toFixed(2)),
          mo6Avg: Number(mo6Avg.toFixed(2)),
          change: Number(change.toFixed(2))
        });
      }
    }
  }
  return list.sort((a, b) => b.change - a.change).slice(0, limit);
}

/**
 * At-risk flags: clients with score drop or no progression (change <= 0) by 3mo.
 * @param {Array} clients 
 * @returns {Array} - list of at risk clients
 */
export function atRiskFlags(clients) {
  const flagged = [];
  for (const client of clients) {
    const baseAvg = getClientAverage(client, "Baseline");
    const mo3Avg = getClientAverage(client, "3mo");
    if (baseAvg !== null && mo3Avg !== null) {
      const change = mo3Avg - baseAvg;
      if (change <= 0) {
        flagged.push({
          id: client.id,
          intakeId: client.intakeId,
          cohort: client.cohort,
          baselineAvg: Number(baseAvg.toFixed(2)),
          mo3Avg: Number(mo3Avg.toFixed(2)),
          change: Number(change.toFixed(2)),
          reason: change < 0 ? "Score drop by 3mo" : "No progression by 3mo"
        });
      }
    }
  }
  return flagged;
}
