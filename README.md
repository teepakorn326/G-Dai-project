# gdai-hack

A Next.js app for the **G'dAI Hack Day**, built for Two Good Co (an Australian
social enterprise supporting women recovering from domestic violence,
homelessness, and addiction).

It turns a messy CS.Net wellbeing-tracker export (CSV/XLSX) into a consolidated
quarterly **Personal Wellbeing Index (PWI)** impact report, and re-exports a
clean tracker spreadsheet. Gemini is used **only** for natural-language output;
all metrics are computed by plain, deterministic code.

## Why this shape

The brief asks for a stable demo, so the LLM is kept on a short leash:

- **Pure-code logic** owns everything that must be deterministic — the PWI
  averages, scale normalisation, completion rate, cohort breakdown, top
  performers, and at-risk flags.
- **The LLM** only writes the outward-facing copy (insights + narrative
  sections) on top of the numbers the code already computed. It never computes
  a metric.
- **Fallbacks** live in `data/two-good-tracker.json` under `fallback`
  (`insights` + a `narrative` object), so if Gemini rate-limits or times out
  mid-demo the UI still shows a sensible pre-written result.

## Setup

```bash
cd gdai-hack
npm install
cp .env.local.example .env.local
# then open .env.local and paste your key:
# GOOGLE_API_KEY=AIza...
npm run dev
```

Open <http://localhost:3000>.

Get a Gemini API key at <https://aistudio.google.com/app/apikey>.

Optional: set `RESEND_API_KEY` in `.env.local` to enable the `/api/email`
endpoint (used to email a report). The app runs fine without it.

## Flow

1. **Upload** a CS.Net export (`.csv` or `.xlsx`), or click *Use Demo Dataset*.
2. **Review** — the file is parsed and anonymised; you see the mapped client
   records before generating.
3. **Generate** — pure code computes the PWI metrics, then Gemini writes the
   insights and narrative over those exact numbers.
4. **Download** — export a clean PWI tracker `.xlsx` built from the parsed data.

## Folder map

```
gdai-hack/
├── app/
│   ├── page.jsx                 # renders the Two Good ReportDashboard
│   ├── layout.jsx
│   ├── globals.css
│   └── api/
│       ├── generate/route.js    # POST { problem, input } (+ optional files) → report
│       ├── parse/route.js       # POST files → parsed/anonymised client preview
│       ├── export/route.js      # POST { clients } → generated tracker .xlsx
│       └── email/route.js       # POST { to, subject, html } → Resend (optional)
├── lib/
│   ├── gemini.js                # gen(system, user) — always the complex model
│   ├── parse_excel.js           # native CSV/XLSX parsing + anonymisation + score validation
│   ├── export_excel.js          # native XLSX export from parsed clients
│   ├── loadData.js              # JSON loader + fallback loader
│   └── constants.js             # model ids + PROBLEMS list
├── problems/
│   └── two-good/                # the only wired problem (PWI impact report)
│       ├── logic.js             # pure PWI math (no @google/genai import)
│       ├── prompt.js            # system + user prompt builders / voice rules
│       └── handler.js           # orchestrates: pure code → Gemini → fallback
├── components/two-good/
│   ├── ReportDashboard.jsx      # the whole UI (upload → review → generate → download)
│   └── PipelineVisualizer.jsx
├── data/                        # demo data + tracker template
└── .env.local.example
```

> Note: `problems/{human-co,lifechanger,marys-house,multimodal}/` and their
> `data/*.json` files are **unused scaffold** from an earlier multi-problem
> version. Only `two-good` is wired (see `lib/constants.js` and
> `app/api/generate/route.js`). Treat them as reference, or delete them.

## What the Two Good problem does

`problems/two-good/` consolidates a wellbeing tracker into a quarterly report:

- **logic.js** (pure code) computes per-dimension averages at Baseline / 3mo /
  6mo, normalises the 1–5 Likert dimensions to a 0–10 scale for the overall
  index, and derives completion rate, cohort breakdown, top performers, and
  at-risk flags.
- **prompt.js** holds Two Good's voice rules (warm, grounded, dignified, scale-
  aware) and builds the insight + narrative prompts.
- **handler.js** parses the upload (or the default dataset), computes the
  metrics, asks Gemini for insights then narrative, and falls back to the
  pre-written copy in `data/two-good-tracker.json` if Gemini fails.

## The 14 PWI dimensions

Scored **0–10**: Life Overall, Standard of Living, Health, Achieving in Life,
Personal Relationships, Safety, Community, Future Security, Career Confidence,
Skills Awareness.

Scored **1–5** (Likert): Financial Worry, Self-Confidence, Voice & Agency, Work
Readiness.

Parsing rejects any value outside a dimension's valid range (real CS.Net
exports are messy — e.g. hours/wages columns can bleed into score columns), so
out-of-range cells are treated as missing rather than corrupting the averages.

## Demo safety

- `GOOGLE_API_KEY` is read from the environment only — never hardcoded.
- `lib/gemini.js` normalises 429 / 401 / 403 into typed errors.
- The two-good handler wraps the Gemini calls in `try/catch` and serves the
  canned fallback on failure.
- `app/api/generate/route.js` has a last-ditch fallback even for unexpected
  errors, returning the shape the UI expects so the page never shows a raw
  error during the live demo.

## Notes

- All data in `/data` is **demo data**. Client identifiers are anonymised at
  parse time (`Client #001`, …). Figures are realistic stand-ins, not audited.
- This scaffold runs locally for the hack day. It can also be deployed to
  Vercel (the API routes use the Node runtime and a writable `/tmp`).
