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
- **Theme:** Light only (Ivory/sage palette). All colors via CSS variables (`var(--bg-page)`, `var(--brand)`, etc.) — never hardcoded hex or Tailwind dark values.
- **StepIndicator:** Uses `var(--brand)` for active/completed steps. No hardcoded dark colors.
- **Nav:** `components/nav/UserMenu.tsx` (client) handles avatar button + dropdown (My profile → `/settings`, Sign out). Passed `email` prop from server layout. Clicking outside closes it.
- **Validation pattern (onboarding forms):** Validate on submit attempt. After first failed attempt, re-validate on each field change so errors clear as user fixes them. Submit button disabled while `!isFormValid || loading`. Errors shown inline below fields as `text-red-500 text-sm`, not a banner.

## Gaps & Limits
- Progressive onboarding gate check at `/` and `/auth/callback` missing deep check.
- City list in Step-1 hardcoded to 20 items.