# A₹tha — Technical Snapshot
_Updated 2026-06-14 · Sprint 3 complete_

---

## Stack

- **Next.js 16.2.9** (App Router, Turbopack dev)
- **React 19**, TypeScript 5, Tailwind CSS v4
- **Supabase** (`@supabase/ssr` ^0.12, `@supabase/supabase-js` ^2.108)
- **Groq SDK** ^1.2.1 — wired in `analyze-twin`, `simulate`, `spend-check`, `chat` routes (`llama-3.3-70b-versatile`)
- `lucide-react` ^1.18 (installed, not yet used in any component)
- No charting lib, no form lib, no state manager

---

## What Is Built and Working

### Auth flow
- `app/page.tsx` — server component, checks session → redirects to `/login` or `/dashboard` or `/onboarding/step-1` based on twin existence
- `app/(auth)/login/page.tsx` — Google OAuth only, design system v2, calls `supabase.auth.signInWithOAuth`
- `app/auth/callback/route.ts` — exchanges code for session, checks twin, routes to step-1 or dashboard
- `app/(protected)/layout.tsx` — server component, validates session via `getUser()`, sticky nav with Settings link + user initial avatar, `max-w-4xl` content width
- `proxy.ts` — root session refresh + auth/protected-route redirects (Next.js proxy, not `middleware.ts`)

### Design system
- Light-only theme. Dark mode block removed from `globals.css`.
- `--bg-page: #F8F7F4` (ivory), `--text-primary: #1A1A1A`, `--brand: #4F6F52` (sage), `--risk-high: #C96A5B` (terracotta)
- All page content constrained to `max-w-4xl mx-auto px-4`. Nav is full-width but inner content is max-w-4xl.

### Onboarding
- **Step 1** (`/onboarding/step-1`) — age + city (side-by-side), company type (2×2 pill grid), risk appetite (range slider 0–2). Saves to `profiles` table. Redirects to `/dashboard`.
- **Step 2** (`/onboarding/step-2`) — income (take-home + last year), 4 outgoings (rent, food, everything-else, EMI), 3 assets (savings, equity, EPF). Two-column grid on sm+. Live surplus chip. Saves to `financial_twin` via upsert. Redirects to `/dashboard`.
- **Step 3** (`/onboarding/step-3`) — 5-goal grid (2×2 + 1, responsive to 3-col on sm+), amount chips + custom input, auto-calculates target year via SIP FV formula (12% monthly compounding, fallback `CURRENT_YEAR + 30` to prevent year decreasing as amount grows). `SubscriptionPicker` shows one primary plan per service (cheapest non-zero), single-toggle buttons per service. Saves twin goal fields + `subscriptions` rows. Fires `/api/analyze-twin`. Redirects to `/dashboard?analyzing=true`.

### Dashboard
Three states driven by twin data:
- **State A** (`!twin || monthly_income === 0`) — profile summary card (age, city, work, risk) + "What's A₹tha calculating?" explanation + CTA to step-2
- **State B** (has income, no goal) — 3-metric row (surplus, savings rate %, emergency runway in days/months using `current_savings ?? 0 / total_monthly_expenses * 30` with colour coding) + CTA to step-3
- **State C analyzing** — `LoadingVerdict` spinner with animated dots; polls `twin_analyses` every 2s (max 30 attempts); auto-triggers `/api/analyze-twin` if goal exists but no cached verdict; timeout shows retry card
- **State C complete** — `VerdictCard` (goal probability + verdict text), `HealthScoreRing` (5-dimension score), `CausalBars` (ranked factors with contribution %), subscription opportunity-cost callout, "Edit goal" link (top-right, secondary, links to `/onboarding/step-3`), link to Decision Lab

### API — analyze-twin
- `POST /api/analyze-twin` — auth, parallel fetch of twin + profile + subscriptions, 24h cache check
- Runs `emergencyFundRunway`, `projectedSavingsAtGoal` (with `profile.age`), `requiredCorpus`, `causalAttribution`, subscription 10yr opportunity cost
- Groq returns `goal_probability`, `confidence`, `verdict`, `health_score` only; server merges math-derived `causal_attribution` and `subscription_insight`
- Caches to `twin_analyses` (`analysis_type: 'verdict'`, `output`, `twin_snapshot`) and returns `VerdictOutput`

### API — simulate
- `POST /api/simulate` — body: `{ scenario: string }` (e.g. `"mba"`, `"home"`, `"job-switch"`, or free text)
- Auth + parallel fetch of twin + profile
- Looks up `SCENARIO_ASSUMPTIONS` (hardcoded: cost, duration months, income multiplier, savings impact %) or uses defaults for unrecognised scenarios
- Builds modified twin post-scenario; projects net worth at 5yr/10yr for both paths via `compoundGrowth` + simple SIP estimate (pure math, no DB calls)
- Calls Groq with `SIMULATE_SYSTEM_PROMPT` (json_object, temperature 0.3, max_tokens 1000)
- Normalises response via `normalizeSimulationResult`; caches in `simulations` table
- Returns `SimulationResult`

### API — chat
- `POST /api/chat` — body: `{ messages: {role, content}[] }`
- Auth + parallel fetch of twin + profile + subscriptions + latest verdict from `twin_analyses`
- Builds system prompt grounding Artha persona in exact rupee values: income, surplus, EMI, savings, equity, EPF, goal, probability, subscription list with per-item amounts
- Calls Groq (plain text, temperature 0.4, max_tokens 400) — not JSON mode
- Returns `{ reply: string }` — no caching (conversational)

### API — spend-check
- `POST /api/spend-check` — body: `{ item: string, amount: number }`
- Auth + parallel fetch of twin + profile + subscriptions
- Server pre-computes before calling Groq (locked values, Groq cannot override):
  - `emi_ceiling_breach = amount > (monthly_income × 0.4 − total_monthly_emi)`
  - `opportunity_cost_10yr = sipFutureValue(amount/12, 0.12, 10) − amount`
- Context includes full twin snapshot, item/amount, both math values
- Calls Groq with `SPEND_CHECK_SYSTEM_PROMPT` (json_object, temperature 0.3, max_tokens 500)
- `normalizeResult` locks `emi_ceiling_breach` and `opportunity_cost_10yr` from server math
- Returns `SpendCheckResult`

### API — credit-card
- `POST /api/credit-card` — no body required
- Auth + parallel fetch of twin + subscriptions
- Calls `matchCreditCards(twin, subs, supabase)` from `lib/credit-card-match.ts`
- Returns `{ cards: CreditCard[] }` — top 3, no Groq call

### Decision Lab
- `app/(protected)/decision-lab/page.tsx` — fully implemented client component
- Twin sidebar: income, surplus, goal, goal probability (from latest verdict)
- **5 chips**: MBA, Buy a house, Job switch → `POST /api/simulate`; Check a purchase → inline modal; Best credit cards → `POST /api/credit-card`
- Free-text custom scenario input with Run button
- Inline modal (no library) for spend check: item name + amount inputs, submit closes modal and calls `/api/spend-check`
- Only one result shown at a time — new chip clears previous result
- `SimulationCard`, `SpendCheckCard`, `CreditCardResults` rendered inline below chips
- `ChatPanel` always visible at bottom — sends message history to `/api/chat`, maintains messages in React state, auto-scrolls

### Settings
- `app/(protected)/settings/page.tsx` — server component
- Fetches profile + twin + subscriptions in `Promise.all`
- Three read-only sections (Profile → step-1, Financial model → step-2, Goal & subscriptions → step-3), each with `Edit →` link
- Graceful empty states with inline CTAs
- Settings link in nav (top-right, before user initial)

### Components
- `components/onboarding/SubscriptionPicker.tsx` — accordion by category; each service shows one primary plan (cheapest non-zero amount) as a single toggle button; "Showing primary plans" note below; running total + 10yr opportunity cost footer
- `components/onboarding/StepIndicator.tsx` — 3-step progress indicator (exists, not yet wired into step pages)
- `components/dashboard/VerdictCard.tsx` — goal probability headline + confidence badge + verdict sentence
- `components/dashboard/HealthScoreRing.tsx` — SVG ring + 5 dimension breakdown
- `components/dashboard/CausalBars.tsx` — ranked causal factors with contribution bars
- `components/dashboard/LoadingVerdict.tsx` — analyzing skeleton with animated dots
- `components/decision-lab/SimulationCard.tsx` — verdict with colour coding, 2-column path comparison (5yr/10yr net worth + goal year), break-even row, risks/opportunities lists
- `components/decision-lab/SpendCheckCard.tsx` — tone-coded card (warning/caution/neutral), one_insight headline, purchase summary, goal impact, 2-stat grid (opp cost + EMI ceiling status), option pills

### Lib
- `lib/financial-math.ts` — all core functions implemented; signatures aligned with API routes and `types/twin.ts`
- `lib/prompts.ts` — `VERDICT_SYSTEM_PROMPT` + `SIMULATE_SYSTEM_PROMPT` + `SPEND_CHECK_SYSTEM_PROMPT`
- `lib/credit-card-match.ts` — `matchCreditCards(twin, subs, supabase): Promise<CreditCard[]>`. Fetches `credit_cards` table filtered by `min_annual_income_inr ≤ monthly_income × 12`. Scoring: +3 lounge × income > ₹80k, +2 dominant sub-category match, +2 low/free fee, +1 per twin spend field overlap. Returns top 3.
- `lib/supabase/client.ts` — browser client (publishable key)
- `lib/supabase/server.ts` — server client currently also uses the publishable key via `@supabase/ssr`
- `lib/supabase/middleware.ts` — middleware helper (createServerClient wrapper)
- `lib/subscriptions-data.ts` — `SUBSCRIPTION_CATEGORIES` array. Used by `SubscriptionPicker`. **`lib/subscriptions-data.ts` is the source of truth for SubscriptionPicker** (the old orphaned `INDIAN_SUBSCRIPTIONS` export is superseded).

### Types
- `types/twin.ts` — `Profile`, `FinancialTwin`, `Subscription`, `GoalType`, `CompanyType`, `RiskAppetite` — complete
- `types/analysis.ts` — `VerdictOutput`, `SimulationResult`, `SpendCheckResult`, `CausalFactor`, `HealthScore`, `FinancialPath` — complete
- `types/reference.ts` — `MarketReturn`, `CityInflation`, `PropertyAppreciation`, `TermPremium`, `TaxSlab`, `CreditCard`, `MarketInstrument` — complete

### Database (11 tables, all applied)
- `profiles`, `financial_twin`, `subscriptions`, `twin_analyses`, `simulations` — user data, RLS owner-only
- `market_returns` (47 rows), `city_inflation` (11 rows), `property_appreciation` (11 rows), `term_premiums` (12 rows), `tax_slabs` (10 rows), `credit_cards` (50 rows) — reference, authenticated read-only

---

## What Is Stubbed / Not Built

| File | Status |
|------|--------|
| `proxy.ts` (root) | Exists and handles session refresh / route gating; docs still refer to `middleware.ts` historically |
| `app/page.tsx` + `app/auth/callback/route.ts` | Onboarding completion check is shallow — keys only off `financial_twin.primary_goal`, not full progressive state |

---

## Current Data Flow (login → dashboard)

```
User hits /
  → app/page.tsx (server)
  → no session → redirect /login

/login
  → Google OAuth popup
  → Supabase redirects to /auth/callback?code=...

/auth/callback
  → exchanges code for session
  → checks financial_twin for primary_goal
  → no twin → redirect /onboarding/step-1
  → has twin → redirect /dashboard

/onboarding/step-1
  → saves to `profiles` (upsert by id)
  → router.push('/dashboard')

/dashboard (State A — no income)
  → shows profile summary + CTA to step-2

/onboarding/step-2
  → saves to `financial_twin` (upsert by user_id)
  → router.push('/dashboard')

/dashboard (State B — has income, no goal)
  → shows surplus / savings rate / emergency runway + CTA to step-3

/onboarding/step-3
  → saves goal fields to financial_twin (upsert)
  → deletes + re-inserts subscriptions
  → fires POST /api/analyze-twin (fire-and-forget)
  → router.push('/dashboard?analyzing=true')

/dashboard (State C analyzing)
  → LoadingVerdict while ?analyzing=true
  → polls twin_analyses every 2s (max 30 attempts / 60s)
  → on cache hit → State C complete (VerdictCard, HealthScoreRing, CausalBars)
  → on timeout → error card with retry button (re-fires /api/analyze-twin)

POST /api/analyze-twin
  → auth → fetch twin/profile/subs → check 24h cache → math → Groq → merge → cache → return VerdictOutput

/decision-lab
  → twin sidebar (income, surplus, goal, probability)
  → sim chip / custom input → POST /api/simulate → SimulationCard
  → "Check a purchase" chip → inline modal → POST /api/spend-check → SpendCheckCard
  → "Best credit cards" chip → POST /api/credit-card → CreditCardResults
  → ChatPanel → POST /api/chat → reply appended to message list

/settings
  → server-rendered: profile + twin + subscriptions
  → read-only, edit links to each onboarding step
```

---

## Known Issues / TODOs

1. **Root route / callback onboarding gate is shallow** — both `/` and `/auth/callback` only check whether `financial_twin.primary_goal` exists. Partially onboarded users (step-1 done, step-2 not) may be routed incorrectly.

2. **`lib/credit-card-match.ts` is empty** — needed for spend-check credit card recommendations.

3. **Step-1 CITIES list is hardcoded** — 20 cities. Spec says CitySelector should be populated from `property_appreciation` table. Currently not DB-driven.

4. **No `signup/page.tsx`** — login handles both new + returning users via Google OAuth so functionally not needed, but route 404s if linked.

5. **`components/onboarding/StepIndicator.tsx` exists but is unused** — not imported by step-1/2/3 pages.

6. **Lint is failing** — errors include React `set-state-in-effect` in step-3 and `any` usage in `scripts/seed.ts`.

7. **Simulate route uses hardcoded scenario assumptions** — MBA, home, job-switch are hardcoded with fixed costs and income multipliers. Free-text scenarios fall back to generic defaults. This is intentional for now; a more dynamic approach is deferred.

---

## Phase 4 Remaining Work

### Sprint 1 — done
- [x] Reconcile `analyze-twin` with `types/twin.ts`, `types/analysis.ts`, and `lib/financial-math.ts`
- [x] Align `lib/prompts.ts` with `VerdictOutput` contract
- [x] Dashboard State C UI: `VerdictCard`, `CausalBars`, `HealthScoreRing`, `LoadingVerdict`
- [x] Poll `twin_analyses` instead of 8s timeout

### Sprint 2 — done
- [x] Fix dashboard State A/B/C conditional rendering
- [x] Fix emergency runway calculation (use `total_monthly_expenses` + `current_savings ?? 0`)
- [x] Fix target year monotonicity bug (fallback `CURRENT_YEAR + 30`)
- [x] SubscriptionPicker: collapse to 1 primary plan per service
- [x] Implement `POST /api/simulate` + `SimulationCard`
- [x] Implement `POST /api/chat` (Artha persona, twin-grounded)
- [x] Decision Lab full UI (sidebar + chips + SimulationCard + ChatPanel)
- [x] Settings page (read-only, 3 sections, edit links)
- [x] Light-only theme (remove dark mode block)
- [x] `max-w-4xl` layout throughout
- [x] Settings nav link
- [x] "Edit goal" link in dashboard State C header

### Sprint 3 — done
- [x] `POST /api/spend-check` — server math locked, Groq narrates, `SpendCheckResult`
- [x] `POST /api/credit-card` — `matchCreditCards` scoring, top 3 cards
- [x] `lib/credit-card-match.ts` — 4-signal scoring, named export only
- [x] `SpendCheckCard` component — tone-coded, insight, opp cost, EMI status, options
- [x] Decision Lab: "Check a purchase" chip + inline modal (no library)
- [x] Decision Lab: "Best credit cards" chip + `CreditCardResults` inline
- [x] `SPEND_CHECK_SYSTEM_PROMPT` in `lib/prompts.ts`

### Sprint 4 (remaining)
- [ ] Shallow onboarding gate fix (`/` and `/auth/callback`)
- [ ] Wire `StepIndicator` into onboarding step pages
- [ ] DB-driven city list in step-1
- [ ] Fix lint (step-3 effect, seed.ts `any`)
