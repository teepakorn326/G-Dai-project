"use client";

const LIKERT_5_DIMS = new Set([
  "Financial Worry", "Self-Confidence", "Voice & Agency", "Work Readiness",
]);

function fmt(n) {
  return typeof n === "number" ? Number(n.toFixed(2)) : "—";
}
function clamp(n) {
  return Math.max(0, Math.min(100, n));
}

// A baseline -> current bar: muted segment up to baseline, accent segment for the change.
function MovementBar({ baseline, current, max, tone = "emerald" }) {
  const b = typeof baseline === "number" ? clamp((baseline / max) * 100) : 0;
  const c = typeof current === "number" ? clamp((current / max) * 100) : 0;
  const up = c >= b;
  const lo = Math.min(b, c);
  const hi = Math.max(b, c);
  const accent = !up ? "bg-error" : tone === "white" ? "bg-white" : "bg-emerald-success";
  const base = tone === "white" ? "bg-white/40" : "bg-secondary/25";
  const track = tone === "white" ? "bg-white/20" : "bg-surface-container";
  return (
    <div className={`relative h-2.5 w-full overflow-hidden rounded-[9999px] ${track}`}>
      <div className={`absolute inset-y-0 left-0 ${base}`} style={{ width: `${lo}%` }} />
      <div className={`absolute inset-y-0 ${accent}`} style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
    </div>
  );
}

export default function ReportSummary({ report }) {
  if (!report?.result) return null;

  const { result, isFallback } = report;
  const cm = result.computedMetrics || {};
  const metrics = result.metrics || {};
  const narrative = result.narrative || {};
  const insights = Array.isArray(result.insights) ? result.insights : [];

  const overall = cm.overallIndex || {};
  const hasOverall = typeof overall.Baseline === "number" && typeof overall["6mo"] === "number";
  const completion = typeof cm.completionRate === "number" ? cm.completionRate : null;
  const totalClients = metrics["Total Clients"] ?? cm.totalClients;
  const totalDatapoints = metrics["Total Datapoints"] ?? cm.totalDatapoints;

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

  const narrativeSections = [
    { key: "headlineOutcomes", label: "Headline outcomes", icon: "campaign" },
    { key: "cohortBreakdown", label: "Cohort progress", icon: "diversity_3" },
    { key: "closingRemarks", label: "Closing", icon: "favorite" },
  ].filter((s) => narrative[s.key]);

  return (
    <div className="mt-unit-8 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-unit-2">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">Quarterly impact summary</h2>
          <p className="font-label-md text-label-md text-secondary mt-1">
            Baseline → 6-month outcomes across {totalClients ?? "—"} clients
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 font-label-md text-label-md px-4 py-1.5 rounded-[9999px] ${
            isFallback ? "bg-error-container text-error" : "bg-primary text-on-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">{isFallback ? "offline_bolt" : "auto_awesome"}</span>
          {isFallback ? "Fallback copy" : "Gemini-generated"}
        </span>
      </div>

      {/* Hero + key stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hero: Overall Wellbeing Index */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-6 md:p-8 text-white shadow-lg">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-[9999px] bg-white/10" />
          <div className="absolute -right-20 bottom-0 h-32 w-32 rounded-[9999px] bg-white/5" />
          <div className="relative">
            <p className="font-label-md text-label-md uppercase tracking-wider text-white/80">Overall Wellbeing Index</p>
            {hasOverall ? (
              <>
                <div className="mt-3 flex items-end gap-3 flex-wrap">
                  <span className="font-display text-display leading-none">{fmt(overall["6mo"])}</span>
                  <span className="mb-1 inline-flex items-center gap-1 rounded-[9999px] bg-white/20 px-3 py-1 font-label-md text-label-md backdrop-blur">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    +{overall.percent}%
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 font-body-md text-body-md text-white/90 flex-wrap">
                  <span>Baseline {fmt(overall.Baseline)}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  <span>6 months {fmt(overall["6mo"])}</span>
                  <span className="text-white/60">· 0–10 scale</span>
                </div>
                <div className="mt-3">
                  <MovementBar baseline={overall.Baseline} current={overall["6mo"]} max={10} tone="white" />
                </div>
              </>
            ) : (
              <p className="mt-3 font-headline-md text-headline-md">{metrics["Overall Wellbeing Index"] ?? "—"}</p>
            )}
          </div>
        </div>

        {/* Stat stack */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="font-label-md text-label-md text-secondary uppercase tracking-wider">Completion</p>
              <span className="grid h-8 w-8 place-items-center rounded-2xl bg-emerald-success/10 text-emerald-success">
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
              </span>
            </div>
            <p className="font-headline-lg text-headline-lg text-primary leading-tight mt-2">
              {metrics["Completion Rate"] ?? (completion != null ? `${completion}%` : "—")}
            </p>
            {completion != null && (
              <div className="mt-2 h-2 w-full overflow-hidden rounded-[9999px] bg-surface-container">
                <div className="h-full rounded-[9999px] bg-emerald-success" style={{ width: `${clamp(completion)}%` }} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Clients", icon: "groups", value: totalClients },
              { label: "Datapoints", icon: "dataset", value: totalDatapoints },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
                <span className="grid h-8 w-8 place-items-center rounded-2xl bg-primary text-on-primary">
                  <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
                </span>
                <p className="font-headline-lg text-headline-lg text-primary leading-tight mt-3">{s.value ?? "—"}</p>
                <p className="font-label-md text-label-md text-secondary uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Narrative */}
      {narrativeSections.length > 0 && (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 md:p-8 shadow-sm space-y-6">
          {narrativeSections.map((s) => (
            <div key={s.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-success/10 text-emerald-success shrink-0">
                  <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                </span>
                <span className="mt-2 w-px flex-1 bg-outline-variant" />
              </div>
              <div className="flex-1 pb-1">
                <h3 className="font-headline-md text-headline-md text-primary mb-2">{s.label}</h3>
                <p className="font-body-md text-body-md text-secondary whitespace-pre-wrap leading-relaxed">{narrative[s.key]}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key insights */}
      {insights.length > 0 && (
        <div>
          <h3 className="font-headline-md text-headline-md text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-success">lightbulb</span>
            Key insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((ins, i) => (
              <div key={i} className="relative rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
                <span className="grid h-7 w-7 place-items-center rounded-[9999px] bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-label-md text-label-md font-bold mb-3">
                  {i + 1}
                </span>
                <p className="font-body-md text-body-md text-secondary leading-relaxed">{ins}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dimension movement + side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {changeRows.length > 0 && (
          <div className="lg:col-span-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary">analytics</span>
              <h3 className="font-headline-md text-headline-md text-primary">Dimension movement</h3>
            </div>
            <p className="font-label-md text-label-md text-secondary mb-5">Baseline → 6 months, ranked by gain</p>
            <div className="space-y-4">
              {changeRows.map((r) => {
                const max = r.likert ? 5 : 10;
                const positive = r.absolute >= 0;
                return (
                  <div key={r.dim} className="flex items-center gap-4">
                    <div className="w-40 shrink-0">
                      <p className="font-body-md text-body-md text-primary truncate">{r.dim}</p>
                      <p className="font-label-md text-label-md text-secondary">
                        {fmt(r.baseline)} → {fmt(r.mo6)} · {r.likert ? "1–5" : "0–10"}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <MovementBar baseline={r.baseline} current={r.mo6} max={max} />
                    </div>
                    <span className={`w-28 text-right font-label-md text-label-md font-bold shrink-0 ${positive ? "text-emerald-success" : "text-error"}`}>
                      {positive ? "+" : ""}{fmt(r.absolute)} ({r.percent > 0 ? "+" : ""}{r.percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Cohorts */}
          {cohorts.length > 0 && (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <h3 className="font-headline-md text-headline-md text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">diversity_3</span>
                Cohorts
              </h3>
              <div className="space-y-4">
                {cohorts.map(([name, c]) => (
                  <div key={name}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-body-md text-body-md text-primary">{name}</span>
                      <span className="font-label-md text-label-md text-secondary">{c.clientCount} clients</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 overflow-hidden rounded-[9999px] bg-surface-container">
                        <div className="h-full rounded-[9999px] bg-emerald-success" style={{ width: `${clamp(c.completionRate ?? 0)}%` }} />
                      </div>
                      <span className="font-label-md text-label-md text-secondary w-10 text-right">{c.completionRate ?? 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top improvements */}
          {topPerformers.length > 0 && (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <h3 className="font-headline-md text-headline-md text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-success">emoji_events</span>
                Top improvements
              </h3>
              <div className="space-y-3">
                {topPerformers.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-[9999px] bg-emerald-success/10 text-emerald-success font-label-md text-label-md font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 font-body-md text-body-md text-primary truncate">{p.id}</span>
                    <span className="font-label-md text-label-md font-bold text-emerald-success whitespace-nowrap">+{fmt(p.change)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* At-risk */}
          <div className={`rounded-2xl border p-6 shadow-sm ${atRisk.length ? "border-error/30 bg-error-container/40" : "border-outline-variant bg-surface-container-lowest"}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-primary">At-risk flags</h3>
              <span className={`material-symbols-outlined ${atRisk.length ? "text-error" : "text-emerald-success"}`}>
                {atRisk.length ? "warning" : "verified"}
              </span>
            </div>
            <p className={`font-display text-display leading-none mt-2 ${atRisk.length ? "text-error" : "text-emerald-success"}`}>{atRisk.length}</p>
            <p className="font-label-md text-label-md text-secondary mt-2">
              {atRisk.length ? "clients with no progression by 3mo" : "no clients flagged"}
            </p>
          </div>
        </div>
      </div>

      <p className="font-label-md text-label-md text-secondary text-center pt-2">
        All client identifiers are de-identified · figures from the demo dataset
      </p>
    </div>
  );
}
