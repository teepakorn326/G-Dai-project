// problems/lifechanger/logic.js
// Pattern / insight detection over program outcome data — PURE CODE.
// No AI. We compute the stats; the LLM only writes the explanation.

/**
 * detectInsights(records)
 *   records: [{ participantId, cohort, ageBand, mentorMatched, sessionsAttended, completed, employmentMonths }]
 *
 *   Returns a structured insights object the prompt layer can hand to Gemini.
 */
export function detectInsights(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("No records to analyse.");
  }

  // Overall completion rate
  const totalCompletion = mean(records.map((r) => (r.completed ? 1 : 0)));

  // Group by cohort
  const byCohort = groupBy(records, "cohort");
  const cohortStats = Object.entries(byCohort).map(([cohort, rows]) => ({
    cohort,
    n: rows.length,
    completionRate: round3(mean(rows.map((r) => (r.completed ? 1 : 0)))),
    avgSessions: round1(mean(rows.map((r) => r.sessionsAttended))),
    avgEmploymentMonths: round1(mean(rows.map((r) => r.employmentMonths))),
    mentorMatchedRate: round3(mean(rows.map((r) => (r.mentorMatched ? 1 : 0)))),
  }));
  cohortStats.sort((a, b) => b.completionRate - a.completionRate);

  // Mentor effect — completion rate with mentor vs without
  const withMentor = records.filter((r) => r.mentorMatched);
  const withoutMentor = records.filter((r) => !r.mentorMatched);
  const mentorEffect = {
    withMentorCompletion: round3(mean(withMentor.map((r) => (r.completed ? 1 : 0)))),
    withoutMentorCompletion: round3(
      mean(withoutMentor.map((r) => (r.completed ? 1 : 0)))
    ),
    delta: 0,
    nWith: withMentor.length,
    nWithout: withoutMentor.length,
  };
  mentorEffect.delta = round3(
    mentorEffect.withMentorCompletion - mentorEffect.withoutMentorCompletion
  );

  // Sessions threshold — does attending >= 8 sessions correlate with completion?
  const highAttend = records.filter((r) => r.sessionsAttended >= 8);
  const lowAttend = records.filter((r) => r.sessionsAttended < 8);
  const attendanceEffect = {
    highCompletion: round3(mean(highAttend.map((r) => (r.completed ? 1 : 0)))),
    lowCompletion: round3(mean(lowAttend.map((r) => (r.completed ? 1 : 0)))),
    threshold: 8,
    nHigh: highAttend.length,
    nLow: lowAttend.length,
  };

  // Age-band breakdown
  const byAge = groupBy(records, "ageBand");
  const ageStats = Object.entries(byAge)
    .map(([ageBand, rows]) => ({
      ageBand,
      n: rows.length,
      completionRate: round3(mean(rows.map((r) => (r.completed ? 1 : 0)))),
    }))
    .sort((a, b) => b.completionRate - a.completionRate);

  // Headline insight = biggest single delta we can defend
  const candidates = [
    {
      kind: "mentor",
      magnitude: Math.abs(mentorEffect.delta),
      direction: mentorEffect.delta >= 0 ? "boosts" : "reduces",
      summary: `Participants matched with a mentor complete at ${pct(
        mentorEffect.withMentorCompletion
      )} vs ${pct(mentorEffect.withoutMentorCompletion)} without — a ${pct(
        Math.abs(mentorEffect.delta)
      )} gap.`,
    },
    {
      kind: "attendance",
      magnitude: Math.abs(
        attendanceEffect.highCompletion - attendanceEffect.lowCompletion
      ),
      direction:
        attendanceEffect.highCompletion >= attendanceEffect.lowCompletion
          ? "boosts"
          : "reduces",
      summary: `Attending 8+ sessions: ${pct(
        attendanceEffect.highCompletion
      )} completion vs ${pct(attendanceEffect.lowCompletion)} below the threshold.`,
    },
    {
      kind: "cohort",
      magnitude:
        cohortStats.length > 1
          ? Math.abs(
              cohortStats[0].completionRate -
                cohortStats[cohortStats.length - 1].completionRate
            )
          : 0,
      direction: "varies",
      summary:
        cohortStats.length > 1
          ? `Cohort ${cohortStats[0].cohort} leads at ${pct(
              cohortStats[0].completionRate
            )}; cohort ${cohortStats[cohortStats.length - 1].cohort} trails at ${pct(
              cohortStats[cohortStats.length - 1].completionRate
            )}.`
          : "",
    },
  ];
  candidates.sort((a, b) => b.magnitude - a.magnitude);
  const headline = candidates[0];

  return {
    n: records.length,
    overallCompletionRate: round3(totalCompletion),
    headline,
    cohortStats,
    mentorEffect,
    attendanceEffect,
    ageStats,
  };
}

// ---- helpers ---------------------------------------------------------------
function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function groupBy(arr, key) {
  return arr.reduce((acc, r) => {
    const k = r[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(r);
    return acc;
  }, {});
}
function round1(n) {
  return Math.round(n * 10) / 10;
}
function round3(n) {
  return Math.round(n * 1000) / 1000;
}
function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}
