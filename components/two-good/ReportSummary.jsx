"use client";

const LIKERT_5_DIMS = new Set([
  "Financial Worry", "Self-Confidence", "Voice & Agency", "Work Readiness",
]);

function fmt(n) {
  return typeof n === "number" ? Number(n.toFixed(2)) : "—";
}

function changeColor(n) {
  if (n > 0) return "text-emerald-success";
  if (n < 0) return "text-error";
  return "text-secondary";
}

export default function ReportSummary({ report }) {
  if (!report?.result) return null;

  const { result, isFallback } = report;
  const cm = result.computedMetrics || {};
  const metrics = result.metrics || {};
  const narrative = result.narrative || {};
  const insights = Array.isArray(result.insights) ? result.insights : [];

  const changeRows = Object.entries(cm.changes || {})
    .map(([dim, val]) => ({
      dim,
      baseline: cm.averages?.Baseline?.[dim],
      mo6: cm.averages?.["6mo"]?.[dim],
      absolute: val?.absolute ?? 0,
      percent: val?.percent ?? 0,
      likert: LIKERT_5_DIMS.has(dim),
    }))
    .sort((a, b) => b.absolute - a.absolute);

  const cohorts = Object.entries(cm.cohorts || {});
  const topPerformers = Array.isArray(cm.topPerformers) ? cm.topPerformers.slice(0, 5) : [];
  const atRisk = Array.isArray(cm.atRiskFlags) ? cm.atRiskFlags : [];

  return (
    <div className="mt-unit-8 space-y-unit-8">
      <div className="flex items-center justify-between flex-wrap gap-unit-2">
        <h2 className="font-headline-lg text-headline-lg text-primary">Quarterly impact summary</h2>
        <span
          className={`font-label-md text-label-md px-unit-4 py-unit-1 rounded-full border border-outline-variant ${
            isFallback ? "bg-error-container text-error" : "bg-secondary-container text-on-secondary-container"
          }`}
        >
          {isFallback ? "Fallback copy (Gemini unavailable)" : "Gemini-generated"}
        </span>
      </div>

      {/* Headline metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-unit-4">
        {Object.entries(metrics).map(([k, v]) => (
          <div key={k} className="bg-surface-container-low border border-outline-variant p-unit-6 rounded-lg">
            <p className="font-label-md text-label-md text-secondary uppercase tracking-wider mb-unit-2">{k}</p>
            <p className={`font-display text-primary leading-tight ${String(v).length > 8 ? "text-headline-md" : "text-display"}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Narrative */}
      {(narrative.headlineOutcomes || narrative.cohortBreakdown || narrative.closingRemarks) && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-unit-8 space-y-unit-6 custom-shadow">
          {narrative.headlineOutcomes && (
            <div>
              <h3 className="font-headline-md text-headline-md text-primary mb-unit-2">Headline outcomes</h3>
              <p className="font-body-md text-body-md text-secondary whitespace-pre-wrap leading-relaxed">{narrative.headlineOutcomes}</p>
            </div>
          )}
          {narrative.cohortBreakdown && (
            <div>
              <h3 className="font-headline-md text-headline-md text-primary mb-unit-2">Cohort progress</h3>
              <p className="font-body-md text-body-md text-secondary whitespace-pre-wrap leading-relaxed">{narrative.cohortBreakdown}</p>
            </div>
          )}
          {narrative.closingRemarks && (
            <div>
              <h3 className="font-headline-md text-headline-md text-primary mb-unit-2">Closing</h3>
              <p className="font-body-md text-body-md text-secondary whitespace-pre-wrap leading-relaxed">{narrative.closingRemarks}</p>
            </div>
          )}
        </div>
      )}

      {/* Key insights */}
      {insights.length > 0 && (
        <div className="bg-surface border border-outline-variant rounded-xl p-unit-8">
          <h3 className="font-headline-md text-headline-md text-primary mb-unit-4">Key insights</h3>
          <ul className="space-y-unit-4">
            {insights.map((ins, i) => (
              <li key={i} className="flex gap-unit-4">
                <span className="material-symbols-outlined text-emerald-success shrink-0">insights</span>
                <span className="font-body-md text-body-md text-secondary leading-relaxed">{ins}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dimension movement + side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-unit-8">
        {changeRows.length > 0 && (
          <div className="lg:col-span-2 bg-white border border-outline-variant rounded-xl overflow-hidden custom-shadow">
            <div className="px-unit-6 py-unit-4 border-b border-outline-variant">
              <h3 className="font-headline-md text-headline-md text-primary">Dimension movement</h3>
              <p className="font-label-md text-label-md text-secondary">Baseline → 6 months, ranked by gain</p>
            </div>
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant sticky top-0">
                  <tr>
                    <th className="px-unit-4 py-unit-3 font-label-md text-label-md text-secondary uppercase">Dimension</th>
                    <th className="px-unit-4 py-unit-3 font-label-md text-label-md text-secondary uppercase">Scale</th>
                    <th className="px-unit-4 py-unit-3 font-label-md text-label-md text-secondary uppercase text-right">Baseline</th>
                    <th className="px-unit-4 py-unit-3 font-label-md text-label-md text-secondary uppercase text-right">6mo</th>
                    <th className="px-unit-4 py-unit-3 font-label-md text-label-md text-secondary uppercase text-right">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant font-table-data text-table-data">
                  {changeRows.map((r) => (
                    <tr key={r.dim} className="hover:bg-surface-container">
                      <td className="px-unit-4 py-unit-3 text-primary whitespace-nowrap">{r.dim}</td>
                      <td className="px-unit-4 py-unit-3 text-secondary whitespace-nowrap">{r.likert ? "1–5" : "0–10"}</td>
                      <td className="px-unit-4 py-unit-3 text-primary text-right">{fmt(r.baseline)}</td>
                      <td className="px-unit-4 py-unit-3 text-primary text-right">{fmt(r.mo6)}</td>
                      <td className={`px-unit-4 py-unit-3 text-right font-bold ${changeColor(r.absolute)}`}>
                        {r.absolute > 0 ? "+" : ""}{fmt(r.absolute)} ({r.percent > 0 ? "+" : ""}{r.percent}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="space-y-unit-8">
          {cohorts.length > 0 && (
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-unit-6">
              <h3 className="font-headline-md text-headline-md text-primary mb-unit-4">Cohorts</h3>
              <div className="space-y-unit-4">
                {cohorts.map(([name, c]) => (
                  <div key={name} className="flex items-center justify-between gap-unit-2">
                    <span className="font-body-md text-body-md text-primary">{name}</span>
                    <span className="font-label-md text-label-md text-secondary text-right">{c.clientCount} clients · {c.completionRate}% complete</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topPerformers.length > 0 && (
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-unit-6">
              <h3 className="font-headline-md text-headline-md text-primary mb-unit-4">Top improvements</h3>
              <div className="space-y-unit-2">
                {topPerformers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-unit-2">
                    <span className="font-body-md text-body-md text-primary truncate">{p.id}</span>
                    <span className="font-label-md text-label-md text-emerald-success font-bold whitespace-nowrap">+{fmt(p.change)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-unit-6">
            <h3 className="font-headline-md text-headline-md text-primary mb-unit-2">At-risk flags</h3>
            <p className={`font-display text-display leading-none ${atRisk.length ? "text-error" : "text-emerald-success"}`}>{atRisk.length}</p>
            <p className="font-label-md text-label-md text-secondary mt-unit-2">
              {atRisk.length ? "clients with no progression by 3mo" : "no clients flagged"}
            </p>
          </div>
        </div>
      </div>

      <p className="font-label-md text-label-md text-secondary text-center">
        All client identifiers are de-identified · figures from the demo dataset
      </p>
    </div>
  );
}
