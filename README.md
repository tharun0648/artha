# A₹tha — Know What's Blocking Your Future

A personal finance decision tool for young Indians, built around a Financial Digital Twin.

---

## What It Does

Most finance apps tell you to "save more." A₹tha tells you *exactly* what's blocking your goal — and by how much.

You fill in your income, expenses, savings, and goal once. A₹tha builds a persistent model of your financial life, runs real math on Indian market data, and answers:

- What's the probability I reach my goal?
- Which specific factor is hurting me the most — and by what percentage?
- What happens to my finances if I do an MBA, buy a house, or switch jobs?
- Should I buy this ₹80,000 phone right now?

---

## How It Works

**Step 1 — Build your twin**
Three-minute onboarding: your profile, income and expenses, and your financial goal. Quick-fill persona buttons let you start with a realistic template and edit from there.

**Step 2 — Get your verdict**
A₹tha runs deterministic math on real Indian datasets (Nifty returns, RBI inflation, NHB property prices), then uses Groq's Llama 3.3 to reason over the numbers and explain them in plain English. The AI never does the math — it only narrates results.

**Step 3 — Use the Decision Lab**
Simulate any life decision against your twin in real time:
- **MBA / Home / Job switch** — see 5-year and 10-year net worth projections under each scenario
- **Spend check** — get an instant verdict on any purchase with EMI health and opportunity cost
- **Credit card match** — find the best card for your actual spending pattern
- **Chat** — ask your twin anything about your money in plain language

---

## Try It

**Full demo** — sign in with a pre-filled mid-career account to see a live dashboard instantly.

**Try it yourself** — start a temporary session, fill in your own numbers, and explore without creating an account.

Both options are on the login page — no Google sign-in required to explore.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                           USER ENTRY POINTS                            │
│                                                                        │
│   /login page                                                          │
│    ├─ Google OAuth  ──────────────────────────────┐                   │
│    ├─ Full Demo (pre-filled account)              │                   │
│    └─ Temp Session (anonymous, no account needed) │                   │
│                                                   ▼                   │
│   /auth/callback ──► profile exists? ──► /dashboard                   │
│                              │                                         │
│                              └──► no profile ──► /onboarding/step-1   │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                      ONBOARDING  (3 steps)                             │
│                                                                        │
│  Step 1 — Who you are                                                  │
│    Age, city, company, risk appetite                                   │
│    → saves to: profiles table                                          │
│                                                                        │
│  Step 2 — Your money                                                   │
│    Monthly income, expenses, assets, EMIs                              │
│    → saves to: financial_twin table (one row per user, always upsert) │
│                                                                        │
│  Step 3 — Your goal + subscriptions                                    │
│    Target amount, timeline, active subscriptions                       │
│    → saves to: subscriptions table                                     │
│    → fires:    POST /api/analyze-twin                                  │
│    → redirects to: /dashboard?analyzing=true                           │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                          DASHBOARD                                     │
│                                                                        │
│  Renders one of three states based on data completeness:               │
│                                                                        │
│  State A — no twin yet                                                 │
│    Profile summary card + prompt to complete Step 2                    │
│                                                                        │
│  State B — twin exists, no goal yet                                    │
│    3 live stats (surplus, savings rate, runway) + Step 3 CTA           │
│                                                                        │
│  State C — full data (twin + goal + verdict)                           │
│  ┌─────────────────────────────┐  ┌──────────────────────────────┐    │
│  │  LEFT COLUMN  (65%)         │  │  RIGHT COLUMN  (35%)         │    │
│  │                             │  │                              │    │
│  │  Twin Card                  │  │  Health Score Ring           │    │
│  │   • Goal probability %      │  │   • 5 bar rows (savings,     │    │
│  │   • Verdict text            │  │     EMI, spending, etc.)     │    │
│  │   • Causal attribution bars │  │                              │    │
│  │     (which factor drives    │  │  Snapshot Card               │    │
│  │      what % of shortfall)   │  │   • 6-stat 2-column grid     │    │
│  │                             │  │     (income, surplus, EMI,   │    │
│  │  Trajectory Card            │  │     savings, equity, runway) │    │
│  │   • SVG net worth chart     │  │                              │    │
│  │   • Current vs potential    │  │  Ask Artha (Chat)            │    │
│  │     path over 10 years      │  │   • Suggested questions      │    │
│  │                             │  │   • POST /api/chat           │    │
│  │  Subscription Insight       │  │   • Plain-language answers   │    │
│  │   • Monthly sub total       │  │                              │    │
│  │   • 10-yr opportunity cost  │  │  → Decision Lab CTA          │    │
│  └─────────────────────────────┘  └──────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                         DECISION LAB  (/decision-lab)                  │
│                                                                        │
│  Twin Sidebar  (your live financial snapshot, always visible)          │
│                                                                        │
│  5 action chips:                                                       │
│                                                                        │
│  [Simulate]    POST /api/simulate     math + Groq  →  SimulationCard  │
│  [Spend Check] POST /api/spend-check  math + Groq  →  SpendCheckCard  │
│  [Credit Card] POST /api/credit-card  pure math    →  Top 3 cards     │
│  [Chat]        POST /api/chat         Groq text    →  Inline reply     │
│  [What-if]     custom scenario input  math + Groq  →  Projection card │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                      COMPUTE & DATA LAYER                              │
│                                                                        │
│                      ┌─────────────────┐                              │
│  API route receives  │ financial-math  │  ← all numbers live here     │
│  user's twin data ──►│    .ts          │    (causal attribution,       │
│                      │                 │     opportunity cost,          │
│                      │  deterministic  │     EMI ceiling, net worth    │
│                      │  calculations   │     projections)              │
│                      └────────┬────────┘                              │
│                               │ pre-computed numbers                   │
│                               ▼                                        │
│                      ┌─────────────────┐                              │
│                      │   Groq Llama    │  ← narrative only, temp 0.3  │
│                      │   3.3  70B      │    JSON mode for structured   │
│                      │                 │    responses, text mode for   │
│                      │  never does     │    chat (temp 0.4)            │
│                      │  math itself    │                               │
│                      └────────┬────────┘                              │
│                               │ merged result                          │
│                               ▼                                        │
│                      ┌─────────────────┐                              │
│                      │ twin_analyses   │  ← verdict cached here so    │
│                      │ cache (Supabase)│    dashboard doesn't re-run  │
│                      └─────────────────┘    Groq on every page load   │
│                                                                        │
│  Supabase Postgres (with Row Level Security)                           │
│                                                                        │
│  User-owned tables (each user sees only their own data):               │
│    profiles          personal info, risk appetite, city                │
│    financial_twin    income, expenses, assets — one row per user       │
│    subscriptions     Netflix, Spotify, etc.                            │
│    twin_analyses     cached verdict JSON from analyze-twin             │
│    simulations       saved what-if results                             │
│                                                                        │
│  Reference tables (read-only, seeded once, shared across all users):  │
│    market_returns          Nifty 50 historical return rates            │
│    city_inflation          RBI CPI data per city                       │
│    property_appreciation   NHB price indices per city                  │
│    term_premiums           insurance premium benchmarks                │
│    tax_slabs               Indian income tax slabs                     │
│    credit_cards            card catalogue for matching                 │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                       CORE DESIGN PRINCIPLE                            │
│                                                                        │
│   Math first, AI last.                                                 │
│                                                                        │
│   financial-math.ts computes every number deterministically.           │
│   Groq receives the pre-computed results and writes narrative.         │
│   Groq never performs financial calculations.                          │
│                                                                        │
│   This means: same input → same numbers, always. The AI only          │
│   changes how results are explained, not what the results are.         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## What Makes It Different

| Other apps | A₹tha |
|---|---|
| "You spend too much on food" | "Food is 15% of income — ₹2,000 above healthy benchmark" |
| Generic advice | Every response cites your actual rupee amounts |
| Vague goal tracking | Causal attribution: which factor drives what % of your shortfall |
| Static dashboard | Live what-if simulations against your financial model |

---

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript 5
- **Project Structure:** Standard `src/` directory with App Router, components, lib, and types
- **Supabase** — auth, Postgres, RLS
- **Groq** (Llama 3.3 70B) — narrative generation only, never financial math
- **Tailwind v4** + CSS custom properties design system (Hanken Grotesk + Instrument Serif, warm light theme)

---

## Design System

All visual structure uses CSS custom properties — never hardcoded colors or Tailwind dark utilities. Key tokens:

```
--bg          #F4F1E8 (warm ivory page background)
--surface     #FFFFFF (card background)
--surface-2   #F7F4EC (nested surfaces and input backgrounds)
--border      #E7E2D4 (default 1px dividers and card edges)
--border-strong #D8D2C0 (buttons, focused elements)
--ink         #222A22 (primary text)
--ink-2       #576055 (body / secondary text)
--muted       #8E948A (labels, captions, metadata)
--brand       #5F7E57 (sage green)
--accent      #BE7A52 (terracotta orange)
--font        Hanken Grotesk (UI)
--font-serif  Instrument Serif (display, narrative)
```

Cards: 18px radius, 1px border, no shadows (except hoverable). Type scale: Hanken Grotesk 400–700 + Instrument Serif for display, 8 defined roles from 11px eyebrows to 40px hero numbers.

---

## Builder

Tharun Kumar — built for the Ayuda Individual Hackathon, Jun 13–14, 2026.

For architectural contracts and coding rules, see [AGENTS.md](./AGENTS.md).
For live technical state and component map, see [SNAPSHOT.md](./SNAPSHOT.md).
