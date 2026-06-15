# A₹tha — Rules

Personal finance digital twin for young Indians. Causal attribution + life simulations.
Session updates go to `SNAPSHOT.md`. This file holds unchanging contracts.

## Rules — Read Before Touch

1. **Math first, AI last.** Calculations inside `lib/financial-math.ts` use Supabase data. Groq reason over pre-calculated numbers. Groq never do finance math.
   - `causal_attribution` percent from `causalAttribution()`, not Groq.
   - `subscription_insight` amount from math, not Groq.

2. **Two clients — never mix.**
   - `lib/supabase/client.ts` — browser only (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
   - `lib/supabase/server.ts` — server components/API routes (`cookies()` + `@supabase/ssr`).
   - Never mix imports. Server client use publishable key (RLS apply via session).

3. **Groq key server only.** `GROQ_API_KEY` no prefix. API routes only, no UI components.

4. **Reference tables read-only.** App never write `market_returns`, `city_inflation`, `property_appreciation`, `term_premiums`, `tax_slabs`, `credit_cards`. Only seed script write via `SUPABASE_SECRET_KEY`.

5. **One twin.** `financial_twin` unique on `user_id`. Always upsert, never insert.

6. **Groq JSON mode.** `analyze-twin`, `simulate`, `spend-check` use `response_format: { type: 'json_object' }`, temp 0.3. `chat` use text mode, temp 0.4, max_tokens 400. Validate JSON before return.

7. **Field names (`types/twin.ts`).** No legacy aliases:
   - Use `monthly_other`, `monthly_transport`, `monthly_entertainment` (Not `monthly_misc`).
   - Use `total_monthly_emi` (Not `monthly_emi`).
   - Use `current_savings` (Not `savings`).
   - Use `equity_investments` (Not `equity_value`).
   - Use `sub.monthly_amount` (Not `sub.price`).
   - Use generated column `twin.total_monthly_expenses` instead of manual calculation sums.

8. **`twin_analyses` columns.** Cache use `output` (jsonb), not `verdict_output`. Use `analysis_type: 'verdict'`.

9. **TypeScript hygiene.** No `any` type annotations anywhere. Seed payloads use inline object types. `catch` blocks type errors as `unknown`; narrow with `instanceof Error` before `.message`. Derived state computed with `useMemo` — never `setState` inside `useEffect` for values computable from existing state.

---

## Schema & API Contracts

### Tables
- **User (RLS Owner):** `profiles`, `financial_twin`, `subscriptions`, `twin_analyses`, `simulations`.
- **Ref (RLS Auth Read):** `market_returns`, `city_inflation`, `property_appreciation`, `term_premiums`, `tax_slabs`, `credit_cards`.

### API Routes
- **POST /api/analyze-twin:** Cache check → run math functions → Groq handle narrative (`goal_probability`, `confidence`, `verdict`, `health_score`) → Merge math array → Cache `twin_analyses`.
- **POST /api/simulate:** `{ scenario }` → Math compute 5y/10y net worth paths → Groq generate `SimulationResult` (`assumption_note`, `current_path`, `scenario_path`, `goal_impact`, `key_risks`, `key_opportunities`).
- **POST /api/spend-check:** `{ item, amount }` → Server compute `emi_ceiling_breach`, `opportunity_cost_10yr` via math → Groq return narrative fields only (`purchase_summary`, `goal_impact_statement`, `verdict_tone`, `one_insight`).
- **POST /api/credit-card:** No LLM. Use `matchCreditCards(twin, subs, supabase)` for top 3 cards.

---

## UI Contracts

### Theme
- Light only. Page background: `var(--bg)`. No white full-bleed pages, no dark panels.
- All colors via CSS custom properties — never hardcoded hex or Tailwind dark values.
- See `SNAPSHOT.md` for the full token set and type scale.

### Card System
- **Card:** `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 8px`. No `box-shadow`.
- **Nested surface / input bg:** `background: var(--surface-2)`, `border: 1px solid var(--border)`, `border-radius: 6px`.
- **Dividers:** `1px solid var(--border)`. No colored rules, no heavy separators.

### CSS Variable Names (use these — not legacy aliases)
- Backgrounds: `var(--bg)`, `var(--surface)`, `var(--surface-2)`
- Borders: `var(--border)`, `var(--border-strong)`
- Text: `var(--ink)`, `var(--ink-2)`, `var(--muted)`
- Brand: `var(--brand)`, `var(--brand-hover)`, `var(--brand-surface)`, `var(--brand-text)`
- Accent: `var(--accent)`, `var(--accent-surface)`
- Legacy aliases (`--bg-page`, `--bg-surface`, `--text-primary`, etc.) exist for backwards compat but do not use in new code.

### Controls
- **Primary button:** `bg var(--brand)`, white text, `border: none`, `border-radius: 6px`, `height: 36px`, `font-size: 14px`, `font-weight: 500`. Hover: `var(--brand-hover)`.
- **Secondary button:** transparent, `border: 1px solid var(--border-strong)`, `color: var(--ink)`. Same sizing.
- **Ghost button:** no border, no bg, `color: var(--ink-2)`, `font-size: 13px`, `font-weight: 500`. Hover: `color: var(--ink)`.
- **Input/select:** `bg var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 6px`, `height: 36px`, `font-size: 14px`. Focus via global CSS rule (border brand + 3px ring brand-surface).
- **Persona/chip buttons:** surface + border. Selected: `border-color var(--brand)`, `bg var(--brand-surface)`, `color var(--brand)`.
- **Pills/badges:** `bg var(--surface-2)`, `border-radius: 4px`, `font-size: 11px`, `font-weight: 500`.

### Logo Component
- Import from `@/components/logo`. Props: `size?: number` (default 28), `href?: string | null` (default `/dashboard`).
- Nav: `<Logo size={24} />`. Login: inline text wordmark only (24px, Inter 600).
- Vital Ring SVG mark is defined in `components/logo.tsx` — do not inline it elsewhere.
- Favicon: `public/favicon.svg`.

### Dashboard Layout (State C)
- Two-column CSS grid: `lg:grid-cols-[65%_35%]`, column gap 20px, max-width 1080px.
- Left column: Twin card (eyebrow + 40px probability hero + verdict + divider + causal bars inline) + subscription insight card.
- Right column: `HealthScoreRing` (bar rows only, no SVG donut) + Snapshot card (6-stat 2-col grid) + brand CTA button.

### StepIndicator
- Circles: 24px diameter. Completed: brand fill, white ✓. Active: brand fill, white number, `box-shadow: 0 0 0 4px var(--brand-surface)`. Inactive: surface bg, 1px border, muted number.
- Connector: 1px line. Completed segment: `var(--brand)`. Pending: `var(--border)`.
- Labels: 11px, muted. Active: `var(--brand-text)`.

### Nav
- `components/nav/UserMenu.tsx` (client) handles avatar button + dropdown (My profile → `/settings`, Sign out).
- Dropdown: `var(--surface)`, `1px solid var(--border)`, `8px` radius. No Tailwind gray classes.
- Passed `email` prop from server layout. Clicking outside closes it.

### Validation pattern (onboarding forms)
- Validate on submit attempt. After first failed attempt, re-validate on each field change.
- Submit button disabled while `!isFormValid || loading`.
- Errors: `12px #D94F4F` below the field. No red border on the input itself.

## Demo System
- `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` / `DEMO_USER_ID` in env.
- `POST /api/demo/full` — signs in demo user, sets session cookie, routes to `/demo-preview`.
- `POST /api/demo/temp` — `signInAnonymously()`, routes to `/onboarding/step-1`.
- `/demo-preview` — protected page, only renders for `DEMO_USER_ID`. Others redirected to `/dashboard`.
- `scripts/seed.ts --demo-user` — idempotent seed for demo account. Run with `npx ts-node --project tsconfig.scripts.json`.

## Routing Gate (updated)
- `/` and `/auth/callback`: No profile row → `/onboarding/step-1`. Profile exists → `/dashboard`.
- Dashboard handles incomplete state inline via yellow banners (no twin → step-2 CTA, no goal → step-3 CTA).

## Gaps & Limits
- City list in Step-1 hardcoded to 20 items.
- Demo user's twin_analyses not pre-seeded (dashboard will trigger analyze-twin on first load).
