# A₹tha — Snapshot (2026-06-15)

Live technical state and pending tasks.

## Stack Primitives
- Next.js 16.2.9 (App Router, Turbopack) | React 19 | TS 5 | Tailwind v4
- Project Structure: Standard `src/` directory layout (`src/app`, `src/components`, `src/lib`, `src/types`)
- DB: Supabase (`@supabase/ssr` ^0.12)
- LLM: Groq SDK (`llama-3.3-70b-versatile`) | `analyze-twin`, `simulate`, `spend-check`, `chat`
- UI: Light theme only. Inter 400/500/600/700. Canvas: `max-w-[1080px] mx-auto px-6`. No chart/form libs.

---

## Design System

### CSS Custom Properties (`src/app/globals.css`)
**Surfaces:** `--bg` (page), `--surface` (card), `--surface-2` (nested/input bg)
**Borders:** `--border` (default), `--border-strong` (buttons, focused elements)
**Text:** `--ink` (primary), `--ink-2` (body/secondary), `--muted` (labels, captions)
**Brand:** `--brand`, `--brand-hover`, `--brand-surface`, `--brand-text`
**Accent:** `--accent` (orange, causal bars, caution), `--accent-surface`
**Semantic:** `--success`, `--warning`, `--risk-high`, `--risk-medium`, `--risk-low`

Legacy aliases (`--bg-page`, `--bg-surface`, `--text-primary`, etc.) remain in `:root` for backwards compatibility.

### Type Scale
| Role | Size | Weight | Color |
|---|---|---|---|
| Hero numbers | 40px | 700 | dynamic (brand/accent/#D94F4F) |
| Page title / section header | 18px | 600 | `--ink` |
| Card title | 15px | 600 | `--ink` |
| Body / description | 14px | 400 | `--ink-2` |
| Stat values in rows | 15px | 600 | `--ink` |
| Labels / metadata | 12px | 500 | `--muted` |
| Eyebrow / section tags | 11px | 600 | `--muted` (uppercase, 0.08em) |
| Captions / fine print | 12px | 400 | `--muted` |

### Card System
- **Card:** `bg var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 8px`. No box-shadow.
- **Nested surface / input area:** `bg var(--surface-2)`, `border: 1px solid var(--border)`, `border-radius: 6px`.
- **Dividers:** `1px solid var(--border)`. No colored rules.

### Controls
- **Primary button:** `var(--brand)`, white text, `6px` radius, `36px` height, `14px/500`.
- **Secondary button:** transparent, `1px solid var(--border-strong)`, `var(--ink)`, same size.
- **Ghost button:** no border/bg, `var(--ink-2)`, `13px/500`.
- **Input / select:** `var(--surface)`, `1px solid var(--border)`, `6px` radius, `36px` height. Focus ring: `border var(--brand)` + `box-shadow 0 0 0 3px var(--brand-surface)` (via global CSS).
- **Persona/chip buttons:** surface + border; selected = `var(--brand-surface)` + `var(--brand)` border.
- **Pills/badges:** `var(--surface-2)`, `4px` radius, `11px/500`.

### Logo
- `src/components/logo.tsx` — Vital Ring SVG mark + Inter 600 wordmark. Props: `size` (default 28), `href` (default `/dashboard`, pass `null` to render without link).
- `public/favicon.svg` — ring mark on brand-green square bg.
- Nav uses `<Logo size={24} />`. Login page uses inline text wordmark (24px).

---

## Live Data Pipeline & Route Architecture

User → `/` (Check session via `proxy.ts`)
  ├─ No Session → `/login` (Google OAuth + demo buttons) → `/auth/callback`
  └─ Has Session → Check `profiles` row
       ├─ No Profile → `/onboarding/step-1`
       └─ Profile exists → `/dashboard` (incomplete state handled via inline banners)

### Onboarding
- Step-1: Age, City, Company, Risk → saves `profiles`. Form card: 480px, 32px padding. `Step1Form` client component.
- Step-2: Income, Expenses, Assets → saves `financial_twin` (upsert). 3 persona quick-fill buttons (graduate/midcareer/senior).
- Step-3: Goals + `SubscriptionPicker` → saves goals → fires `/api/analyze-twin` → `/dashboard?analyzing=true`
- `StepIndicator`: 24px circles. Completed = brand fill + ✓. Active = brand fill + `box-shadow: 0 0 0 4px var(--brand-surface)`. Connector: 1px line, completed segment brand-colored.

### Dashboard (3 inline states, no redirect)
- **State A: no twin/income** — profile summary card + step-2 CTA card.
- **State B: no goal** — 3 stat cards (surplus, savings rate, runway) + step-3 CTA card.
- **State C: full verdict** — two-column CSS grid (`lg:grid-cols-[65%_35%]`, `max-w-[1080px]`):
  - **Left:** Twin card (eyebrow + hero probability% + verdict text + divider + causal attribution inline rows) + subscription insight card.
  - **Right:** `HealthScoreRing` (bar rows, no donut) + Snapshot card (6-stat 2-col grid) + Decision Lab CTA button.

### Decision Lab (`/decision-lab`)
Client page + Twin Sidebar + 5 Native Action Chips:
- Sim Chips → `POST /api/simulate` → `SimulationCard`
- Spend Check Chip → Modal → `POST /api/spend-check` → `SpendCheckCard`
- Credit Card Chip → `POST /api/credit-card` → `CreditCardResults` (no LLM)
- Chat Input → `POST /api/chat` → grounded conversational text

### Demo System
- `POST /api/demo/full` → signs in `demo@artha.app`, redirects to `/demo-preview`
- `POST /api/demo/temp` → anonymous session, redirects to `/onboarding/step-1`
- `/demo-preview` — guarded by `DEMO_USER_ID` env check, shows financial snapshot + amber banner

---

## Strict Implementation Maps

### 1. File Responsibilities
- `src/lib/financial-math.ts`: Core financial math functions. Math First, AI Last rule source.
- `src/lib/credit-card-match.ts`: Named export `matchCreditCards`. Scores cards based on income limits, lounge access, sub categories, and spend fields.
- `src/lib/subscriptions-data.ts`: 5 categories, 11 services (entertainment, music, food, productivity, telecom).
- `src/lib/prompts.ts`: `VERDICT_SYSTEM_PROMPT`, `SIMULATE_SYSTEM_PROMPT`, `SPEND_CHECK_SYSTEM_PROMPT`.
- `proxy.ts`: Direct route protection & token refresh proxy. No edge `middleware.ts`.
- `src/components/logo.tsx`: Vital Ring mark + wordmark lockup. Used in nav and can be used anywhere.

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
- `npm run test:eval` — Real Groq eval: 27 cases × 3 personas → `scripts/eval-output.json`
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
4. ~~**Task: Unwired StepIndicator** — Done~~
5. ~~**Task: Clean Compilation Warnings** — Done (2026-06-14)~~
6. ~~**Task: Dark Background Fix** — Done (2026-06-14)~~
7. ~~**Task: Onboarding Inline Validation** — Done (2026-06-14)~~
8. ~~**Task: UserMenu Dropdown Nav** — Done (2026-06-14)~~
9. ~~**Task: Demo System** — Done (2026-06-14)~~
10. ~~**Task: Decision Lab copy improvements** — Done (2026-06-14)~~
11. ~~**Task: Chat system prompt improvements** — Done (2026-06-14)~~
12. ~~**Task: Design system overhaul** — Done (2026-06-15)~~
    - CSS custom property set finalised (`--bg`, `--surface`, `--surface-2`, `--border`, `--border-strong`, `--ink`, `--ink-2`, `--muted`, brand, accent tokens).
    - Inter-only type scale with 8 defined roles.
    - Card system: 8px radius, 1px border, no shadows.
    - Controls: primary/secondary/ghost buttons, 36px inputs with focus ring.
    - Dashboard: two-column grid layout, hero probability, inline causal bars, snapshot card.
    - `HealthScoreRing` rewritten to bar rows (no donut).
    - `StepIndicator` redesigned (24px circles, brand ring for active step).
    - `Logo` component created with Vital Ring SVG mark. Favicon added.
    - Login page: single centered card, no dark panels.
    - Layout max-width updated to 1080px.
