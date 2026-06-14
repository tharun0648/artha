# A₹tha — Agent Context

## What This Project Is

A₹tha is a personal finance decision tool for young Indians.
It builds a Financial Digital Twin of the user's financial life and runs
causal attribution analysis to quantify exactly what % of their goal shortfall
each risk factor drives. The Decision Lab lets users simulate life decisions
(MBA, home purchase, job switch) against their twin in real time.

Built for the Ayuda Individual Hackathon. Builder: Tharun Kumar.

**Handoff doc:** `SNAPSHOT.md` is the live technical snapshot (updated per session).
This file holds architectural rules and contracts that do not change often.

---

## Core Architectural Rules — Read Before Touching Any File

1. **Math first, AI last.** All financial calculations happen in `lib/financial-math.ts`
   using real data queried from Supabase reference tables. Groq receives pre-calculated
   numbers and reasons over them. Groq never does financial math itself.
   - `causal_attribution` contribution percentages come from `causalAttribution()` in math, not Groq.
   - `subscription_insight` dollar amounts come from math, not Groq.

2. **Two client types — never mix them.**
   - `lib/supabase/client.ts` — browser only, uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `lib/supabase/server.ts` — server components and API routes only (via `cookies()` + `@supabase/ssr`)
   - Never import the server client in a component. Never import the browser client in an API route.
   - **Known gap:** `lib/supabase/server.ts` currently uses the publishable key, not `SUPABASE_SECRET_KEY`.
     RLS still applies via the user session. Secret key is only required for seed scripts.

3. **Groq key is server-side only.** `GROQ_API_KEY` is never prefixed with `NEXT_PUBLIC_`.
   It only appears in `app/api/*/route.ts` files, never in components.

4. **Reference tables are read-only from the app.** No API route or component
   ever writes to `market_returns`, `city_inflation`, `property_appreciation`,
   `term_premiums`, `tax_slabs`, or `credit_cards`. Only the seed script writes
   to these, using `SUPABASE_SECRET_KEY` which bypasses RLS.

5. **One twin per user.** `financial_twin` has a unique constraint on `user_id`.
   Always use upsert, never insert, when saving twin data.

6. **Groq JSON mode only where structured output is required.**
   `analyze-twin` and `simulate` use `response_format: { type: 'json_object' }` and `temperature: 0.3`.
   `chat` uses plain text mode (`temperature: 0.4`, `max_tokens: 400`) — no json_object.
   Always parse and validate structured responses before returning to the client.

7. **Use canonical field names from `types/twin.ts`.** Never use legacy aliases in new code.

   | Wrong (legacy) | Correct (DB / types) |
   |----------------|----------------------|
   | `monthly_misc` | `monthly_other` (+ `monthly_transport`, `monthly_entertainment`) |
   | `monthly_emi` | `total_monthly_emi` |
   | `savings` | `current_savings` |
   | `equity_value` | `equity_investments` |
   | `sub.price` | `sub.monthly_amount` |
   | Manual expense sum | Prefer `twin.total_monthly_expenses` (generated column) |

8. **`twin_analyses` column names.** Cache reads/writes use `output` (jsonb), not `verdict_output`.
   Also: `analysis_type` (`'verdict'`), optional `twin_snapshot` (jsonb).

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # sb_publishable_... — browser safe
SUPABASE_SECRET_KEY=               # sb_secret_... — server only, never browser
SUPABASE_ACCESS_TOKEN=             # sbp_... — Management API, agent use only
SUPABASE_PROJECT_REF=              # alphanumeric project ref from Supabase URL
GROQ_API_KEY=                      # gsk_... — server only
```

---

## Database — 11 Tables

### User Data Tables (RLS: owner-only)

| Table | Purpose |
|-------|---------|
| `profiles` | Age, city, company type, risk appetite — from onboarding Step 1 |
| `financial_twin` | Income, expenses, savings, goal — the core object. Generated columns: `income_growth_rate`, `total_monthly_expenses` |
| `subscriptions` | Active Indian subscriptions selected in onboarding Step 3 |
| `twin_analyses` | Cached verdict output — columns: `analysis_type`, `twin_snapshot`, `output`, `created_at` |
| `simulations` | History of Decision Lab what-if queries and their results |

### Reference Data Tables (RLS: authenticated read-only)

| Table | Source | Populated by |
|-------|--------|--------------|
| `market_returns` | mfapi.in — Nifty 50/Midcap 150 CAGR | seed script (API fetch) |
| `city_inflation` | RBI DBIE CPI CSV | seed script (CSV parse) |
| `property_appreciation` | NHB RESIDEX quarterly PDF | seed script (manual JSON) |
| `term_premiums` | HDFC Life + Max Life calculators | seed script (manual JSON) |
| `tax_slabs` | incometax.gov.in FY2024-25 | migration 00002 (hardcoded) |
| `credit_cards` | Curated 40+ card dataset | seed script (cc-data.json) |

---

## Folder Structure

```
artha/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── auth/callback/route.ts      ← OAuth exchange
│   ├── (protected)/
│   │   ├── layout.tsx              ← sticky nav with Settings link + user initial, max-w-4xl
│   │   ├── onboarding/step-{1,2,3}/page.tsx
│   │   ├── dashboard/page.tsx      ← 3-state rendering (A: no income, B: no goal, C: verdict)
│   │   ├── decision-lab/page.tsx   ← twin sidebar + scenario chips + SimulationCard + ChatPanel
│   │   └── settings/page.tsx       ← read-only profile/twin/subscriptions, edit links to onboarding
│   └── api/
│       ├── analyze-twin/route.ts   ← POST: verdict
│       ├── simulate/route.ts       ← POST: SimulationResult
│       ├── chat/route.ts           ← POST: {reply: string} — Artha persona, grounded in twin
│       ├── spend-check/route.ts    ← POST: SpendCheckResult
│       └── credit-card/route.ts    ← POST: {cards: CreditCard[]} top 3 via matchCreditCards
├── components/
│   ├── onboarding/
│   │   ├── SubscriptionPicker.tsx  ← 1 primary plan per service (cheapest non-zero), accordion
│   │   └── StepIndicator.tsx       ← built, not yet wired into step pages
│   ├── dashboard/
│   │   ├── VerdictCard.tsx
│   │   ├── CausalBars.tsx
│   │   ├── HealthScoreRing.tsx
│   │   └── LoadingVerdict.tsx
│   └── decision-lab/
│       ├── SimulationCard.tsx      ← verdict, path comparison, risks/opportunities
│       └── SpendCheckCard.tsx      ← tone-coded result, insight, opp cost, EMI status, options
├── lib/
│   ├── financial-math.ts
│   ├── prompts.ts                  ← VERDICT_SYSTEM_PROMPT + SIMULATE_SYSTEM_PROMPT + SPEND_CHECK_SYSTEM_PROMPT
│   ├── credit-card-match.ts        ← matchCreditCards(twin, subs, supabase) → CreditCard[] top 3
│   └── subscriptions-data.ts       ← SUBSCRIPTION_CATEGORIES; used by SubscriptionPicker
├── types/twin.ts, analysis.ts, reference.ts
├── proxy.ts                        ← session refresh + route gating (not middleware.ts)
└── supabase/migrations/
```

---

## API Routes — What Each Does

### POST /api/analyze-twin
1. Auth via `cookies()` + `createClient()`
2. Fetch twin + profile + subscriptions (parallel)
3. Check 24h cache in `twin_analyses`; return cached if fresh
4. Run `emergencyFundRunway`, `projectedSavingsAtGoal`, `requiredCorpus`, `causalAttribution`, subscription opportunity cost
5. Build context string with pre-calculated numbers
6. Call Groq with `VERDICT_SYSTEM_PROMPT` — returns `goal_probability`, `confidence`, `verdict`, `health_score` only
7. Merge math-derived `causal_attribution` and `subscription_insight` into final `VerdictOutput`
8. Cache in `twin_analyses` (`analysis_type: 'verdict'`, `output: verdict`)
9. Return `VerdictOutput` JSON

### POST /api/simulate
Body: `{ scenario: string }` (e.g. `"mba"`, `"home"`, `"job-switch"`, or free text)
1. Auth + fetch twin + profile
2. Look up hardcoded `SCENARIO_ASSUMPTIONS` (cost, duration, income multiplier) or use defaults
3. Build modified twin post-scenario; project net worth at 5yr/10yr for both paths (pure math)
4. Build context string comparing current vs scenario paths
5. Call Groq with `SIMULATE_SYSTEM_PROMPT` — returns full `SimulationResult`
6. Normalize + validate response
7. Cache in `simulations` (`user_id`, `scenario`, `output`)
8. Return `SimulationResult` JSON

### POST /api/chat
Body: `{ messages: {role, content}[] }`
1. Auth + fetch twin + profile + subscriptions + latest verdict (all parallel)
2. Build system prompt grounding Artha persona in exact user numbers
3. Call Groq (plain text, not JSON mode) — returns `{reply: string}`
4. No caching (conversational)

### POST /api/spend-check
Body: `{ item: string, amount: number }`
1. Auth + fetch twin + profile + subscriptions (parallel)
2. Pre-compute in server (Groq never recalculates these):
   - `emi_ceiling_breach = amount > (monthly_income × 0.4 − total_monthly_emi)`
   - `opportunity_cost_10yr = sipFutureValue(amount/12, 0.12, 10) − amount`
3. Build context with full twin snapshot + both math values
4. Call Groq with `SPEND_CHECK_SYSTEM_PROMPT` (json_object, temp 0.3)
5. Normalize — math values locked from server, Groq only provides narrative fields
6. Return `SpendCheckResult`

### POST /api/credit-card
No body required.
1. Auth + fetch twin + subscriptions (parallel)
2. Call `matchCreditCards(twin, subs, supabase)` from `lib/credit-card-match.ts`
3. Returns `{ cards: CreditCard[] }` — top 3 scored cards

---

## Groq Output Contracts

**analyze-twin** uses `response_format: { type: 'json_object' }`, `temperature: 0.3`.
Returns (`VerdictOutput` in `types/analysis.ts`):
`goal_probability` (0–100), `confidence` (0–100), `verdict`, `causal_attribution[]`,
`health_score` (5 dimensions 0–20 each + total 0–100), `subscription_insight`

**simulate** uses `response_format: { type: 'json_object' }`, `temperature: 0.3`.
Returns (`SimulationResult` in `types/analysis.ts`):
`scenario`, `assumption_note`, `current_path`, `scenario_path`,
`goal_impact`, `verdict`, `key_risks[]`, `key_opportunities[]`

**chat** uses plain text mode, `temperature: 0.4`, `max_tokens: 400`.
Returns: `{ reply: string }` — Artha persona, grounded in twin numbers, Indian context only.

**spend-check** uses `response_format: { type: 'json_object' }`, `temperature: 0.3`.
Returns (`SpendCheckResult` in `types/analysis.ts`):
`purchase_summary`, `emi_ceiling_breach` (locked from math), `goal_impact_statement`,
`opportunity_cost_10yr` (locked from math), `verdict_tone` (`caution|warning|neutral`),
`one_insight`, `options: ['Buy now', 'Wait 48 hours', 'Skip it']`

**credit-card** — no Groq call. Returns `{ cards: CreditCard[] }` from `matchCreditCards`.

---

## What Is Complete

- [x] Next.js 16 + React 19 + TypeScript + Tailwind v4 + App Router
- [x] Auth (Google OAuth) + `proxy.ts` session gating
- [x] Progressive onboarding Steps 1–3 + `SubscriptionPicker` (1 primary plan per service)
- [x] Dashboard 3-state conditional rendering (A: no income, B: no goal, C: verdict/loading)
- [x] Dashboard State C — poll `twin_analyses`, `VerdictCard`, `CausalBars`, `HealthScoreRing`, "Edit goal" link
- [x] All type files (`types/twin.ts`, `types/analysis.ts`, `types/reference.ts`)
- [x] `lib/financial-math.ts` — all core functions implemented
- [x] `lib/prompts.ts` — `VERDICT_SYSTEM_PROMPT` + `SIMULATE_SYSTEM_PROMPT` + `SPEND_CHECK_SYSTEM_PROMPT`
- [x] `POST /api/analyze-twin` — math + Groq + 24h cache
- [x] `POST /api/simulate` — scenario assumptions + math projections + Groq narration + cache in `simulations`
- [x] `POST /api/chat` — twin-grounded Artha persona, parallel data fetch
- [x] `POST /api/spend-check` — server-side math locked, Groq narrates, returns `SpendCheckResult`
- [x] `POST /api/credit-card` — `matchCreditCards` scoring, returns top 3 `CreditCard[]`
- [x] `lib/credit-card-match.ts` — `matchCreditCards` named export, 4-signal scoring algorithm
- [x] Decision Lab — twin sidebar, 5 chips (3 sim + spend + CC), free-text, modal, `SimulationCard`, `SpendCheckCard`, `CreditCardResults`, `ChatPanel`
- [x] `components/decision-lab/SimulationCard.tsx`
- [x] `components/decision-lab/SpendCheckCard.tsx`
- [x] `app/(protected)/settings/page.tsx` — read-only, 3 sections, edit links
- [x] Settings link in nav
- [x] Light-only theme (`#F8F7F4` page, `#1A1A1A` text, no dark mode block)
- [x] `max-w-4xl` layout throughout (nav content + main)
- [x] Emergency runway recalculated from `total_monthly_expenses` + `current_savings ?? 0`
- [x] Database schema — 11 tables with RLS, all reference data seeded (141 rows)
- [x] Seed script (`scripts/seed.ts`)

---

## What Is Not Built Yet

- [ ] Wire `StepIndicator` into onboarding step pages
- [ ] Shallow onboarding gate fix (`/` and `/auth/callback` — check full progressive state)
- [ ] DB-driven city list in step-1 (currently hardcoded 20 cities)
- [ ] `/signup` route (login handles new users via OAuth; route 404s if linked)
- [ ] Lint fixes (step-3 set-state-in-effect, seed.ts `any`)

---

## Known Issues / Fixes Applied

| Issue | Status |
|-------|--------|
| `analyze-twin` used wrong twin/subscription field names | Fixed |
| `analyze-twin` called math functions with wrong signatures | Fixed |
| `analyze-twin` wrote to non-existent `verdict_output` column | Fixed: uses `output` |
| `lib/prompts.ts` schema disagreed with `types/analysis.ts` | Fixed |
| Dashboard State C used 8s timeout instead of polling `twin_analyses` | Fixed |
| `projectedSavingsAtGoal` hardcoded age 30 | Fixed: passes `profile.age` |
| Dashboard State A/B conditional rendering | Fixed: `!hasFinancials` → State A, `!hasGoal` → State B |
| Emergency runway used manual expense sum | Fixed: uses `total_monthly_expenses` + `current_savings ?? 0` |
| Target year decreased when goal amount increased | Fixed: fallback raised to `CURRENT_YEAR + 30` |
| Dark mode causing ivory/sage palette to invert | Fixed: removed `@media (prefers-color-scheme: dark)` block |
| `lib/subscriptions-data.ts` orphaned | Keep for now; SubscriptionPicker uses its own inline data |
| `StepIndicator.tsx` unused | Built but not imported by step pages |
| Lint: step-3 set-state-in-effect, seed.ts `any` | Deferred |