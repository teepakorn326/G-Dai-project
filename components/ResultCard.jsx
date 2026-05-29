"use client";

// components/ResultCard.jsx
// Generic result display. Renders:
//   - the human narrative from the handler
//   - the "metrics" object (key/value chips) if present
//   - an optional list of items (e.g. ranked grants, schedule slots)
//   - a collapsible raw-JSON debug view
//   - an interactive email dispatch panel

import { useState } from "react";
import DemoBadge from "./DemoBadge.jsx";

function MetricChips({ metrics }) {
  if (!metrics || typeof metrics !== "object") return null;
  const entries = Object.entries(metrics);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {entries.map(([k, v]) => (
        <div
          key={k}
          className="px-3 py-1.5 rounded-lg bg-slate-100 text-sm"
        >
          <span className="text-slate-500">{k}: </span>
          <span className="font-medium text-slate-900">
            {typeof v === "number" ? v.toLocaleString() : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ItemsList({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ul className="mt-4 space-y-3">
      {items.map((it, i) => (
        <li
          key={i}
          className="border border-slate-200 rounded-xl p-4 bg-white"
        >
          {it.title && (
            <div className="font-semibold text-slate-900">{it.title}</div>
          )}
          {it.subtitle && (
            <div className="text-sm text-slate-500">{it.subtitle}</div>
          )}
          {it.body && (
            <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
              {it.body}
            </div>
          )}
          {it.score !== undefined && (
            <div className="mt-2 text-xs text-slate-500">
              score: <span className="font-medium">{it.score}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function buildEmailHtml(narrative, metrics, items) {
  let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 8px; font-size: 20px;">G'dAI Hack Analysis</h2>
      <p style="color: #64748b; font-size: 13px; margin-top: 0; margin-bottom: 24px;">Generated narrative and data summary</p>
      
      <div style="color: #334155; line-height: 1.6; font-size: 15px; margin-bottom: 28px; white-space: pre-wrap;">
        ${narrative.replace(/\n/g, "<br>")}
      </div>
  `;

  if (metrics && Object.keys(metrics).length > 0) {
    html += `
      <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Metrics</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
    `;
    for (const [k, v] of Object.entries(metrics)) {
      html += `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">${k}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right; color: #0f172a; font-size: 14px;">${v}</td>
        </tr>
      `;
    }
    html += `</table>`;
  }

  if (Array.isArray(items) && items.length > 0) {
    html += `
      <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">Details</h3>
      <div style="margin-top: 12px;">
    `;
    for (const it of items) {
      html += `
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; background-color: #f8fafc;">
          ${it.title ? `<div style="font-weight: 600; color: #0f172a; font-size: 15px;">${it.title}</div>` : ""}
          ${it.subtitle ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${it.subtitle}</div>` : ""}
          ${it.body ? `<div style="font-size: 14px; color: #334155; margin-top: 10px; white-space: pre-wrap; line-height: 1.5;">${it.body}</div>` : ""}
          ${it.score !== undefined ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 10px; text-transform: uppercase;">score: <strong style="color: #475569;">${it.score}</strong></div>` : ""}
        </div>
      `;
    }
    html += `</div>`;
  }

  html += `
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 32px; margin-bottom: 16px;">
      <div style="font-size: 11px; color: #94a3b8; text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">
        Sent via G'dAI Hack Day Scaffold
      </div>
    </div>
  `;
  return html;
}

export default function ResultCard({ result, isFallback }) {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [statusMsg, setStatusMsg] = useState("");

  if (!result) return null;
  const { narrative, metrics, items, raw } = result;

  async function handleSendEmail(e) {
    e.preventDefault();
    if (!emailAddress || sending) return;
    setSending(true);
    setStatus(null);
    setStatusMsg("");

    try {
      const emailHtml = buildEmailHtml(narrative || "", metrics, items);
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailAddress,
          subject: "G'dAI Hack: Analysis Results",
          html: emailHtml,
        }),
      });

      const body = await res.json();
      if (!res.ok || body.error) {
        throw new Error(body.error || "Failed to send email.");
      }

      setStatus("success");
      setStatusMsg("Email sent successfully!");
      setEmailAddress("");
    } catch (err) {
      setStatus("error");
      setStatusMsg(err.message || "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Result</h2>
        <DemoBadge fallback={isFallback} />
      </div>

      {narrative && (
        <p className="mt-3 text-slate-800 leading-relaxed whitespace-pre-wrap">
          {narrative}
        </p>
      )}

      <MetricChips metrics={metrics} />
      <ItemsList items={items} />

      {/* Email Share Component */}
      <div className="mt-6 border-t border-slate-100 pt-5">
        {!showEmailForm ? (
          <button
            type="button"
            onClick={() => setShowEmailForm(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Email this result
          </button>
        ) : (
          <form onSubmit={handleSendEmail} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-800">
                Email Result
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setStatus(null);
                  setStatusMsg("");
                }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
            
            <div className="flex gap-2">
              <input
                type="email"
                required
                disabled={sending}
                placeholder="e.g. name@example.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              <button
                type="submit"
                disabled={sending || !emailAddress}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>

            {statusMsg && (
              <div
                className={[
                  "text-xs font-medium p-2.5 rounded-lg border",
                  status === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800",
                ].join(" ")}
              >
                {statusMsg}
              </div>
            )}
          </form>
        )}
      </div>

      {raw && (
        <details className="mt-5 border-t border-slate-100 pt-4">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
            Show raw output
          </summary>
          <pre className="debug mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg overflow-x-auto">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
