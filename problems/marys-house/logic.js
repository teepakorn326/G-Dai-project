// problems/marys-house/logic.js
// Rule-based grant scoring. No AI.
//
// Inputs: an organisation profile (parsed by the LLM into structured tags)
// and the grant corpus from /data/marys-house.json.
// Output: every grant with a score and a reasons array. Sorted desc.
//
// Scoring is intentionally explicit so the demo can show the reasoning.

/**
 * scoreGrants(profile, grants)
 * @param {{
 *   cause: string[],           // e.g. ["domestic violence", "housing"]
 *   region: string[],          // e.g. ["nsw", "sydney"]
 *   needAmountAud: number,     // requested funding
 *   programStage: string,      // "pilot" | "established" | "scaling"
 *   peopleServed: string[],    // ["women", "children", "families"]
 * }} profile
 * @param {Array<object>} grants
 * @returns {Array<{ id, title, funder, amount, deadline, link, score, reasons }>}
 */
export function scoreGrants(profile, grants) {
  const today = new Date();
  const safeProfile = {
    cause: arrLower(profile?.cause),
    region: arrLower(profile?.region),
    needAmountAud: Number(profile?.needAmountAud) || 0,
    programStage: (profile?.programStage || "").toLowerCase(),
    peopleServed: arrLower(profile?.peopleServed),
  };

  const scored = grants.map((g) => {
    const reasons = [];
    let score = 0;

    // 1. Cause match (max 35)
    const causeHits = overlap(arrLower(g.eligibilityTags?.cause), safeProfile.cause);
    if (causeHits.length) {
      score += Math.min(35, causeHits.length * 20);
      reasons.push(`Cause match: ${causeHits.join(", ")}`);
    } else {
      reasons.push("No cause overlap with funder's stated focus");
    }

    // 2. Region match (max 20)
    const regionHits = overlap(arrLower(g.eligibilityTags?.region), safeProfile.region);
    if (regionHits.length || arrLower(g.eligibilityTags?.region).includes("national")) {
      score += 20;
      reasons.push(
        regionHits.length
          ? `Region eligible: ${regionHits.join(", ")}`
          : "National scope — region eligible"
      );
    } else {
      reasons.push("Region not in funder's eligibility");
    }

    // 3. Amount fit (max 20)
    if (safeProfile.needAmountAud > 0 && g.amountRange) {
      const [lo, hi] = g.amountRange;
      if (safeProfile.needAmountAud >= lo && safeProfile.needAmountAud <= hi) {
        score += 20;
        reasons.push(`Ask sits inside funding band A$${lo.toLocaleString()}–A$${hi.toLocaleString()}`);
      } else if (safeProfile.needAmountAud < lo) {
        score += 8;
        reasons.push(`Ask is under typical minimum (A$${lo.toLocaleString()})`);
      } else {
        score += 4;
        reasons.push(`Ask exceeds typical maximum (A$${hi.toLocaleString()})`);
      }
    }

    // 4. People-served match (max 15)
    const peopleHits = overlap(
      arrLower(g.eligibilityTags?.peopleServed),
      safeProfile.peopleServed
    );
    if (peopleHits.length) {
      score += Math.min(15, peopleHits.length * 8);
      reasons.push(`Serves: ${peopleHits.join(", ")}`);
    }

    // 5. Deadline freshness (max 10) — penalise grants closing in < 14 days
    let deadlineNote = "";
    if (g.deadline) {
      const daysOut = Math.round(
        (new Date(g.deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysOut < 0) {
        score -= 50; // effectively rule out closed grants
        deadlineNote = `Closed ${Math.abs(daysOut)} days ago`;
      } else if (daysOut < 14) {
        score += 3;
        deadlineNote = `Closes in ${daysOut} days — tight turnaround`;
      } else if (daysOut <= 60) {
        score += 10;
        deadlineNote = `Closes in ${daysOut} days — workable timeline`;
      } else {
        score += 6;
        deadlineNote = `Closes in ${daysOut} days`;
      }
      reasons.push(deadlineNote);
    }

    return {
      id: g.id,
      title: g.title,
      funder: g.funder,
      amount: g.amountRange ? `A$${g.amountRange[0].toLocaleString()}–A$${g.amountRange[1].toLocaleString()}` : "—",
      deadline: g.deadline || null,
      link: g.link || null,
      score: Math.max(0, score),
      reasons,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// ---- helpers ---------------------------------------------------------------
function arrLower(a) {
  if (!Array.isArray(a)) return [];
  return a.map((s) => String(s).toLowerCase().trim()).filter(Boolean);
}
function overlap(a, b) {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}
