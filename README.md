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
- **Supabase** — auth, Postgres, RLS
- **Groq** (Llama 3.3 70B) — narrative generation only, never financial math
- **Tailwind v4** + CSS custom properties design system (Inter, light theme)

---

## Design System

All visual structure uses CSS custom properties — never hardcoded colors or Tailwind dark utilities. Key tokens:

```
--bg          page background (ivory)
--surface     card background (white)
--surface-2   nested surfaces and input backgrounds
--border      default 1px dividers and card edges
--ink         primary text
--ink-2       body / secondary text
--muted       labels, captions, metadata
--brand       #1D6F42 (sage green)
--accent      #C4622D (terracotta orange)
```

Cards: 8px radius, 1px border, no shadows. Type scale: Inter 400–700, 8 defined roles from 11px eyebrows to 40px hero numbers.

---

## Builder

Tharun Kumar — built for the Ayuda Individual Hackathon, Jun 13–14, 2026.

For architectural details and contracts, see [AGENTS.md](./AGENTS.md).
For live technical state and component map, see [SNAPSHOT.md](./SNAPSHOT.md).
