# A₹tha — Snapshot (2026-06-16)

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
**Surfaces:** `--bg` (#F4F1E8 warm ivory), `--surface` (#FFFFFF), `--surface-2` (#F7F4EC)
**Borders:** `--border` (#E7E2D4), `--border-strong` (#D8D2C0)
**Text:** `--ink` (#222A22), `--ink-2` (#576055), `--muted` (#8E948A)
**Brand:** `--brand` (#5F7E57 sage), `--brand-hover` (#4B6645), `--brand-surface` (#E9EEE2), `--brand-surface-2` (#DCE5D2), `--brand-text` (#4B6645)
**Accent:** `--accent` (#BE7A52 terracotta), `--accent-surface` (#F3E6DA)
**Semantic:** `--positive` (#4F8A5B), `--negative` (#C2553D), `--amber` (#CE9B4B)
**Typography:** `--font` (Hanken Grotesk), `--font-serif` (Instrument Serif)
**Radius:** `--r-xs` (6px), `--r-sm` (9px), `--r` (13px), `--r-lg` (18px), `--r-xl` (24px)
**Shadows:** `--sh-sm`, `--sh`, `--sh-lg`, `--sh-pop`

Legacy aliases (`--bg-page`, `--bg-surface`, `--text-primary`, etc.) remain in `:root` for backwards compatibility.

### Type Scale
| Role | Size | Weight | Color | Font |
|---|---|---|---|---|
| Hero numbers | 40px | 700 | dynamic (brand/accent) | Hanken Grotesk |
| Page title / section header | 18px | 600 | `--ink` | Hanken Grotesk |
| Card title | 15px | 600 | `--ink` | Hanken Grotesk |
| Body / description | 14px | 400 | `--ink-2` | Hanken Grotesk |
| Stat values in rows | 15px | 600 | `--ink` | Hanken Grotesk |
| Labels / metadata | 12px | 500 | `--muted` | Hanken Grotesk |
| Eyebrow / section tags | 11px | 600 | `--brand-text` (uppercase, 0.09em) | Hanken Grotesk |
| Captions / fine print | 12px | 400 | `--muted` | Hanken Grotesk |
| Display / narrative text | 17px+ | 400-700 | `--ink` | Instrument Serif |

**Typography helpers:** `.eyebrow` class (11px/600/uppercase/0.09em letter-spacing/brand-text).

### Card System
- **Card:** `.card` class — `var(--surface)`, `border: 1px solid var(--border)`, `border-radius: var(--r-lg)` (18px), padding 22px. Variants: `.card-lg` (28px padding), `.card-flat` (surface-2 bg, transparent border), `.card-hoverable` (hover effects with shadow/transform).
- **Nested surface / input area:** `var(--surface-2)`, `border: 1px solid var(--border)`, `border-radius: var(--r-sm)` (9px).
- **Dividers:** `1px solid var(--border)`. No colored rules.

### Controls
- **Button:** `.btn` base class — flex, gap 8px, border-radius `var(--r-sm)`, font-size 14px/600, padding 10px 18px.
- **Primary button:** `.btn-primary` — `var(--brand)`, white text, hover shadow effect.
- **Secondary button:** `.btn-ghost` — `var(--surface)`, `border: 1px solid var(--border-strong)`, `var(--ink)`.
- **Subtle button:** `.btn-subtle` — `var(--surface-2)`, transparent border, `var(--ink-2)`.
- **Sizes:** `.btn-lg` (13px 24px, 15px, var(--r) radius), `.btn-sm` (7px 13px, 13px), `.btn-block` (width 100%).
- **Input / select:** `.input` class — `var(--surface)`, `border: 1px solid var(--border-strong)`, `border-radius: var(--r-sm)`, padding 11px 13px. Focus ring: `border var(--brand)` + `box-shadow 0 0 0 3px var(--brand-surface)` (via global CSS).
- **Persona/chip buttons:** surface + border; selected = `var(--brand-surface)` + `var(--brand)` border.
- **Pills/badges:** `var(--surface-2)`, `border-radius: var(--r-xs)`, `11px/500`.

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
  - **Left:** Twin card (eyebrow + hero probability% + verdict text + divider + causal attribution inline rows) + `TrajectoryCard` (net worth path visualization) + subscription insight card.
  - **Right:** `HealthScoreRing` (bar rows, no donut) + Snapshot card (6-stat 2-col grid) + `AskArthaCard` (chat interface with suggested questions) + Decision Lab CTA button.

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

### Login Page (`src/app/(auth)/login/page.tsx`)
- **Two-column layout:** `.login-grid` (1.05fr 0.95fr) — hidden preview column on mobile.
- **Left column (preview):** Logo + headline + description + `PreviewCard` (mini dashboard verdict with health ring + causal bars).
- **Right column (action):** Google OAuth button + demo options (full demo / temp session) in centered card.
- **Icons:** LockIcon, ShieldIcon (security badges), GoogleIcon (OAuth button).
- **Styling:** Rounded buttons (13px radius), hover effects, consistent with design system.

---

## Strict Implementation Maps

### 1. File Responsibilities
- `src/lib/financial-math.ts`: Core financial math functions. Math First, AI Last rule source.
- `src/lib/credit-card-match.ts`: Named export `matchCreditCards`. Scores cards based on income limits, lounge access, sub categories, and spend fields.
- `src/lib/subscriptions-data.ts`: 5 categories, 11 services (entertainment, music, food, productivity, telecom).
- `src/lib/prompts.ts`: `VERDICT_SYSTEM_PROMPT`, `SIMULATE_SYSTEM_PROMPT`, `SPEND_CHECK_SYSTEM_PROMPT`.
- `proxy.ts`: Direct route protection & token refresh proxy. No edge `middleware.ts`.
- `src/components/logo.tsx`: Vital Ring mark + wordmark lockup. Used in nav and can be used anywhere.
- `src/components/dashboard/AskArthaCard.tsx`: Chat interface with suggested questions (`POST /api/chat`), answer display, CTA to Decision Lab.
- `src/components/dashboard/TrajectoryCard.tsx`: Net worth trajectory visualization (SVG line chart), current vs potential paths, 12% growth assumption.

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

## Build Status (2026-06-16)

- `npx tsc --noEmit` — clean, zero errors
- `npm run build` — clean, all 18 routes compile (8 dynamic, 2 static)

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
13. ~~**Task: Warm palette + typography update** — Done (2026-06-15)~~
    - Updated to warm palette (#F4F1E8 bg, #5F7E57 brand, #BE7A52 accent).
    - New typography: Hanken Grotesk (UI) + Instrument Serif (display/narrative).
    - Enhanced radius system (6px/9px/13px/18px/24px).
    - New shadow system (4 levels).
    - Utility classes: `.card`, `.btn`, `.input`, `.eyebrow`, `.login-grid`, `.lab-grid`.
    - Login page redesign: two-column layout with preview card.
    - New dashboard components: `AskArthaCard` (chat), `TrajectoryCard` (net worth visualization).
14. ~~**Task: Final audit + README architecture diagram** — Done (2026-06-16)~~
    - Full architecture diagram added to README with user-facing explanations.
    - AGENTS.md and SNAPSHOT.md updated to current state.
    - Build verified clean: zero TS errors, all 18 routes compile.
