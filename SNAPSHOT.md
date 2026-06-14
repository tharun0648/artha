# A₹tha — Snapshot (2026-06-14)

Live technical state and pending tasks.

## Stack Primitives
- Next.js 16.2.9 (App Router, Turbopack) | React 19 | TS 5 | Tailwind v4
- DB: Supabase (`@supabase/ssr` ^0.12)
- LLM: Groq SDK (`llama-3.3-70b-versatile`) | `analyze-twin`, `simulate`, `spend-check`, `chat`
- UI: Light theme only. Canvas bounds: `max-w-4xl mx-auto px-4`. No chart/form libs.

---

## Live Data Pipeline & Route Architecture

User → `/` (Check session via `proxy.ts`)
  ├─ No Session → `/login` (Google OAuth) → `/auth/callback`
  └─ Has Session → Check `financial_twin.primary_goal`
       ├─ No Goal → Onboarding Flow
       │    ├─ `/onboarding/step-1` (Age, City, Company, Risk) → Saves `profiles`
       │    ├─ `/onboarding/step-2` (Income, Expenses, Assets) → Saves `financial_twin` (Upsert)
       │    └─ `/onboarding/step-3` (Goals, Subs via `SubscriptionPicker`) → Saves goals → Fires `/api/analyze-twin` → `/dashboard?analyzing=true`
       └─ Has Goal → `/dashboard` (3 Conditional States)
            ├─ State A (No income): Profile summary + Step-2 CTA
            ├─ State B (No goal): Metrics row + Step-3 CTA
            └─ State C (Has goal): Polling `twin_analyses` (2s interval, max 30) → Shows `VerdictCard`, `HealthScoreRing`, `CausalBars`

### Decision Lab (`/decision-lab`)
Client page + Twin Sidebar + 5 Native Action Chips:
- Sim Chips → `POST /api/simulate` → `SimulationCard` (5y/10y net worth projections via math + Groq text).
- Spend Check Chip → Custom Modal → `POST /api/spend-check` → `SpendCheckCard` (Locked server math for EMI breach & 10y opportunity cost + Groq text).
- Credit Card Chip → `POST /api/credit-card` → `CreditCardResults` (Calls local `matchCreditCards` scoring function, no LLM).
- Chat Input → `POST /api/chat` → Grounded raw conversational text (No JSON mode).

---

## Strict Implementation Maps

### 1. File Responsibilities
- `lib/financial-math.ts`: Core financial math functions. Math First, AI Last rule source.
- `lib/credit-card-match.ts`: Named export `matchCreditCards`. Scores cards based on income limits, lounge access, sub categories, and spend fields.
- `lib/subscriptions-data.ts`: Source of truth array `SUBSCRIPTION_CATEGORIES` for `SubscriptionPicker`.
- `proxy.ts`: Direct route protection & token refresh proxy. No edge `middleware.ts`.

### 2. Table Ownership
- User Space (RLS Owner-only): `profiles`, `financial_twin`, `subscriptions`, `twin_analyses` (`output` jsonb), `simulations`.
- Static Ref Data (RLS Auth Read-only): `market_returns`, `city_inflation`, `property_appreciation`, `term_premiums`, `tax_slabs`, `credit_cards`.

---

## Active Bugs & Sprint 4 Backlog

1. **Bug: Shallow Onboarding Gate**
   - Location: `/` and `/auth/callback`
   - Problem: Only verifies if `financial_twin.primary_goal` exists. Partially onboarded users (Step-1 or 2 abandoned half-way) route to broken states.
   - Fix Needed: Check full step progression metrics before routing.

2. **Task: Unwired UI Components**
   - Target: `components/onboarding/StepIndicator.tsx` exists but is isolated. Wire it into steps 1, 2, and 3.

3. **Task: Static City Registry**
   - Target: Onboarding Step-1 city array is currently hardcoded with 20 items.
   - Fix Needed: Query database directly from the `property_appreciation` table instead.

4. ~~**Task: Clean Compilation Warnings** — Done (2026-06-14)~~
   - Step-3 `realisticYear` moved to `useMemo`; effect reduced to single `setTargetYear` call.
   - `seed.ts` explicit `any` replaced: `MarketReturnRow` type, `ResidexItem` type, `catch` blocks use `unknown`.