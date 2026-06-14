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
  ├─ No Session → `/login` (Google OAuth + demo buttons) → `/auth/callback`
  └─ Has Session → Check `profiles` row
       ├─ No Profile → `/onboarding/step-1`
       └─ Profile exists → `/dashboard` (incomplete state handled via inline banners)

### Onboarding
- Step-1: Age, City, Company, Risk → saves `profiles`
- Step-2: Income, Expenses, Assets → saves `financial_twin` (upsert). Has 3 persona quick-fill buttons.
- Step-3: Goals + `SubscriptionPicker` → saves goals → fires `/api/analyze-twin` → `/dashboard?analyzing=true`

### Dashboard (3 inline states, no redirect)
- **Banner: no twin/income** → "Complete your financial profile" → `/onboarding/step-2`
- **Banner: no goal** → "Add your financial goal" → `/onboarding/step-3`
- **Full state** → VerdictCard, HealthScoreRing, CausalBars, subscription insight, Decision Lab CTA

### Decision Lab (`/decision-lab`)
Client page + Twin Sidebar + 5 Native Action Chips:
- Sim Chips → `POST /api/simulate` → `SimulationCard` (5y/10y net worth projections via math + Groq text).
- Spend Check Chip → Custom Modal → `POST /api/spend-check` → `SpendCheckCard` (Locked server math for EMI breach & 10y opportunity cost + Groq text).
- Credit Card Chip → `POST /api/credit-card` → `CreditCardResults` (Calls local `matchCreditCards` scoring function, no LLM).
- Chat Input → `POST /api/chat` → Grounded conversational text. System prompt includes user's actual numbers. Rule 6 enforces `→ This week:` action ending.

### Demo System
- `POST /api/demo/full` → signs in `demo@artha.app`, redirects to `/demo-preview`
- `POST /api/demo/temp` → anonymous session, redirects to `/onboarding/step-1`
- `/demo-preview` — guarded by `DEMO_USER_ID` env check, shows financial snapshot + amber banner
- Login page has "View full demo" + "Try it yourself" buttons below Google sign-in

---

## Strict Implementation Maps

### 1. File Responsibilities
- `lib/financial-math.ts`: Core financial math functions. Math First, AI Last rule source.
- `lib/credit-card-match.ts`: Named export `matchCreditCards`. Scores cards based on income limits, lounge access, sub categories, and spend fields.
- `lib/subscriptions-data.ts`: Trimmed to 5 categories, 11 services (entertainment, music, food, productivity, telecom).
- `lib/prompts.ts`: `VERDICT_SYSTEM_PROMPT`, `SIMULATE_SYSTEM_PROMPT`, `SPEND_CHECK_SYSTEM_PROMPT`.
- `proxy.ts`: Direct route protection & token refresh proxy. No edge `middleware.ts`.

### 2. Math Lock Rules
- `opportunity_cost_10yr` in spend-check = `Math.round(amount * Math.pow(1.12, 10)) - amount` (lump-sum, not SIP).
- `emi_ceiling_breach` = `amount > (monthly_income * 0.4 - total_monthly_emi)`. Always overwritten post-Groq parse.

### 3. Table Ownership
- User Space (RLS Owner-only): `profiles`, `financial_twin`, `subscriptions`, `twin_analyses` (`output` jsonb), `simulations`.
- Static Ref Data (RLS Auth Read-only): `market_returns`, `city_inflation`, `property_appreciation`, `term_premiums`, `tax_slabs`, `credit_cards`.

---

## Testing

- `npm run test:unit` — 12 pure math tests (`__tests__/unit/financial-math.test.ts`)
- `npm run test:api` — 12 API route tests with mocked Supabase + Groq (`__tests__/api/`)
- `npm run test:e2e` — Playwright E2E against running dev server (`__tests__/e2e/`)
- `npm run test:eval` — Real Groq eval: 27 cases × 3 personas → `scripts/eval-output.json` (run with `npx ts-node --project tsconfig.scripts.json scripts/groq-eval.ts`)
- Last eval run: 0 parse failures, 0 slow responses (>5s), 15,641 total tokens

---

## Active Bugs & Backlog

1. **Bug: Static City Registry**
   - Onboarding Step-1 city array hardcoded with 20 items.
   - Fix: Query `property_appreciation` table directly.

2. **Task: Demo twin_analyses not pre-seeded**
   - Demo user lands on dashboard and triggers `analyze-twin` on first load.
   - Fix: Pre-seed a cached verdict row via seed script.

3. ~~**Bug: Shallow Onboarding Gate** — Fixed (2026-06-14)~~
   - Routing now checks only for `profiles` row. Incomplete twin/goal handled via dashboard banners.

4. ~~**Task: Unwired StepIndicator** — Done~~

5. ~~**Task: Clean Compilation Warnings** — Done (2026-06-14)~~

6. ~~**Task: Dark Background Fix** — Done (2026-06-14)~~

7. ~~**Task: Onboarding Inline Validation** — Done (2026-06-14)~~

8. ~~**Task: UserMenu Dropdown Nav** — Done (2026-06-14)~~

9. ~~**Task: Demo System** — Done (2026-06-14)~~
   - `/api/demo/full`, `/api/demo/temp`, `/demo-preview`, login page buttons, `seedDemoUser()`.

10. ~~**Task: Decision Lab copy improvements** — Done (2026-06-14)~~
    - SimulationCard: plain-English labels, scenario summary line, ⚠/✓ prefixes.
    - SpendCheckCard: "Should you buy this?", plain-English stat labels, option pill remapping.

11. ~~**Task: Chat system prompt improvements** — Done (2026-06-14)~~
    - Prompt uses user's exact rupee numbers. Rule 6 enforces `→ This week:` action line.
