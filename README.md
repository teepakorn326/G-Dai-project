# gdai-hack

Central scaffold for the **G'dAI Hack Day**. One Next.js app that supports
multiple nonprofit problem statements and switches between them at the top of
the page. Gemini is used **only** for natural-language input and output. All
core logic (math, scoring, scheduling, pattern detection) is plain code.

## Why this shape

The brief asks for a stable demo. To get that, the LLM is kept on a short
leash:

- **Pure-code logic** owns anything that must be deterministic — donation
  attribution math, grant scoring, the maintenance scheduler, and the
  statistics behind insights.
- **The LLM** parses messy inputs into structured fields and writes the
  outward-facing copy that explains what the code decided. It never picks the
  schedule, the score, or the impact number.
- **Fallbacks** live in each `data/*.json` under `fallback.narrative`, so if
  Gemini rate-limits or times out mid-demo, the UI still shows a sensible
  pre-written result with a "fallback" badge.

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

## Folder map

```
gdai-hack/
├── app/
│   ├── page.jsx              # problem picker + input + result
│   ├── layout.jsx
│   ├── globals.css
│   └── api/generate/route.js # POST { problem, input } → handler via registry
├── lib/
│   ├── gemini.js             # gen(system, user, complex?) — 2.5-flash | 3.1-pro
│   ├── loadData.js           # JSON loader + fallback loader
│   └── constants.js          # model ids + PROBLEMS list
├── problems/
│   ├── registry.js           # problem id → handler
│   ├── two-good/             # donation attribution
│   ├── marys-house/          # grant matching
│   ├── human-co/             # maintenance triage + scheduling
│   └── lifechanger/          # pattern detection
├── components/
│   ├── ProblemPicker.jsx
│   ├── ResultCard.jsx
│   └── DemoBadge.jsx
├── data/                     # one JSON per problem (demo data + fallback)
├── .env.local.example
└── README.md
```

Each problem folder has the same three files:

- `logic.js` — pure code. No `@google/genai` import. Unit-testable on its own.
- `prompt.js` — system + user prompt builders. Only place where voice / tone
  rules live for that problem.
- `handler.js` — orchestrates: pure-code first, then Gemini for I/O, then
  fallback if Gemini fails.

## Adding a new problem

1. Add an entry to `PROBLEMS` in `lib/constants.js`.
2. Create `problems/<id>/{logic.js,prompt.js,handler.js}` and `data/<id>.json`
   (must include a `fallback.narrative` field).
3. Register the handler in `problems/registry.js`.

The page UI and the API route pick it up automatically.

## What each problem does

- **Two Good** — turn a donation amount into the proportion of one woman's
  12-month journey (cost-per-woman A$30,000) and equivalent paid work hours
  (avg wage A$32/hr). The Gemini call only writes the thank-you copy and is
  bound to Two Good's voice rules (warm, dignified, pooled-funding language —
  never "your money paid this specific woman").
- **Mary's House** — extract a structured org profile from a free-text
  description, score the grant corpus against it with explicit rules
  (cause / region / amount / people / deadline), and ask Gemini to write a
  short briefing over the top of the ranked list.
- **HumanCo** — Gemini parses a maintenance request into a ticket; pure code
  picks the slot (clash check, capacity cap, SLA window, weekend rule for
  non-P1). Gemini never picks the slot.
- **Lifechanger** — pure code computes cohort / mentor / attendance stats and
  flags the strongest signal; Gemini writes the analyst-style narrative over
  those exact numbers.

## Demo safety

- `GOOGLE_API_KEY` is read from the environment only — never hardcoded.
- `lib/gemini.js` normalises 429 / 401 / 403 into typed errors.
- Every handler wraps the Gemini call in `try/catch` and serves the canned
  fallback (with a visible "fallback" badge on the result card) on failure.
- The API route has a last-ditch fallback even for unexpected errors, so the
  page should never show a raw error during the live demo.

## Notes

- All data in `/data` is **demo data**. The Two Good FY2025 figures are
  realistic stand-ins. Don't quote them as audited numbers.
- This scaffold is not deployed and not intended to be. It runs locally for
  the hack day.
# G-Dai-project
