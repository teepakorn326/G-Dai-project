// problems/human-co/logic.js
// Constraint scheduling / triage — PURE CODE.
// The LLM only parses the natural-language request into a structured ticket.
// This file owns:
//   - priority calculation
//   - clash detection (don't double-book the same tech at the same time)
//   - capacity check (each tech has a daily hours cap)
//   - slot selection (earliest viable slot)
//
// The LLM NEVER decides the schedule. That guarantees no clashes in the demo.

/**
 * @typedef Ticket
 * @property {string} siteId
 * @property {string} category   - e.g. "plumbing" | "electrical" | "hvac" | "general"
 * @property {string} description
 * @property {number} estHours
 * @property {boolean} safetyRisk
 * @property {string|null} requestedBy
 * @property {string|null} earliestPreferred  // ISO date
 */

/**
 * @typedef Site
 * @property {string} id
 * @property {string} name
 * @property {string} suburb
 * @property {string[]} compliance
 */

/**
 * @typedef Tech
 * @property {string} id
 * @property {string} name
 * @property {string[]} skills
 * @property {number} dailyHoursCap
 * @property {string[]} servesSiteIds
 */

/**
 * @typedef Booking
 * @property {string} techId
 * @property {string} siteId
 * @property {string} date   // YYYY-MM-DD
 * @property {number} hours
 */

const PRIORITY_RULES = [
  { match: /gas|leak|electrical|sparks|smoke|fire|flood|burst/i, level: "P1", sla: 1 },
  { match: /hot water|no power|no water|locked out|security/i, level: "P2", sla: 2 },
  { match: /repair|broken|cracked|jam|stuck|noisy/i, level: "P3", sla: 5 },
];

/**
 * derivePriority(ticket) → { level, slaDays, reason }
 */
export function derivePriority(ticket) {
  if (ticket?.safetyRisk) {
    return { level: "P1", slaDays: 1, reason: "Flagged as safety risk." };
  }
  const text = `${ticket?.category || ""} ${ticket?.description || ""}`;
  for (const rule of PRIORITY_RULES) {
    if (rule.match.test(text)) {
      return {
        level: rule.level,
        slaDays: rule.sla,
        reason: `Matched keyword rule: ${rule.match}`,
      };
    }
  }
  return { level: "P4", slaDays: 10, reason: "No urgent keywords detected." };
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * findSlot(ticket, sites, techs, existingBookings, opts)
 *   → { ok: true, slot } | { ok: false, reason }
 *
 * Greedy: walk forward from today (or earliestPreferred) day by day until
 * we find a tech who (a) serves this site, (b) has matching skills,
 * (c) has remaining capacity that day. Respects SLA: if no slot found within
 * sla*2 days, returns { ok: false }.
 */
export function findSlot(ticket, sites, techs, existingBookings, opts = {}) {
  const today = opts.today ? new Date(opts.today) : new Date();
  const startDate = ticket.earliestPreferred
    ? new Date(ticket.earliestPreferred)
    : today;
  const start = startDate > today ? startDate : today;

  const priority = derivePriority(ticket);
  const horizonDays = Math.max(priority.slaDays * 2, 7);

  const site = sites.find((s) => s.id === ticket.siteId);
  if (!site) return { ok: false, reason: `Unknown site ${ticket.siteId}` };

  const eligibleTechs = techs.filter(
    (t) =>
      t.servesSiteIds.includes(site.id) &&
      (t.skills.includes(ticket.category) || t.skills.includes("general"))
  );
  if (eligibleTechs.length === 0) {
    return {
      ok: false,
      reason: `No tech serves ${site.name} with skill "${ticket.category}".`,
    };
  }

  // Build a map: techId -> date -> booked hours
  const bookedMap = new Map();
  for (const b of existingBookings) {
    if (!bookedMap.has(b.techId)) bookedMap.set(b.techId, new Map());
    const inner = bookedMap.get(b.techId);
    inner.set(b.date, (inner.get(b.date) || 0) + b.hours);
  }

  const estHours = Math.max(0.5, Number(ticket.estHours) || 2);

  for (let i = 0; i <= horizonDays; i++) {
    const cursor = addDays(start, i);
    if (isWeekend(cursor) && priority.level !== "P1") continue; // weekends only for P1

    for (const tech of eligibleTechs) {
      const dateKey = ymd(cursor);
      const used = bookedMap.get(tech.id)?.get(dateKey) || 0;
      const remaining = tech.dailyHoursCap - used;
      if (remaining >= estHours) {
        return {
          ok: true,
          slot: {
            date: dateKey,
            techId: tech.id,
            techName: tech.name,
            siteId: site.id,
            siteName: site.name,
            hours: estHours,
            priority: priority.level,
            slaDays: priority.slaDays,
            reason: priority.reason,
            daysOutFromToday: Math.round(
              (cursor.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            ),
          },
        };
      }
    }
  }

  return {
    ok: false,
    reason: `No capacity within ${horizonDays} days for ${site.name} (${ticket.category}).`,
    priority,
  };
}

/**
 * complianceFlags(siteId, sites) — surface any open compliance obligations
 * so the scheduler tech is reminded on-site.
 */
export function complianceFlags(siteId, sites) {
  const site = sites.find((s) => s.id === siteId);
  if (!site) return [];
  return site.compliance || [];
}
