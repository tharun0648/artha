# A₹tha — Know What's Blocking Your Future

A personal finance decision tool for young Indians built around a Financial Digital Twin.
Built for the Ayuda Individual Hackathon — Jun 13–14, 2025.

## What It Does

A₹tha builds a persistent financial model of your life in 5 minutes, then answers the
question every other finance app ignores: what is specifically blocking you from your
goal — and by exactly how much?

The Causal Attribution Engine quantifies each risk factor's contribution to your goal
shortfall. Not "lifestyle inflation is a risk" — "lifestyle inflation drives 38% of
your shortfall." The Decision Lab lets you simulate any life decision against your
twin in real time.

## Core Flow

1. **Build your Financial Digital Twin** — 3-step onboarding (profile → financial data → goals + subscriptions)
2. **Get your analysis** — A₹tha runs deterministic math on real Indian data, then Groq for causal reasoning
3. **View your verdict** — Goal probability %, causal attribution breakdown, health score
4. **Simulate decisions** — Decision Lab for what-if scenarios (MBA, home purchase, job switch, spend checks, card recommendations)
5. **Track progress** — Your twin persists and evolves as your salary and decisions change

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | Next.js 16.2.9 (App Router) + React 19  |
| Language    | TypeScript                          |
| Styling     | Tailwind v4 + CSS Variables         |
| Icons       | Lucide React                        |
| Backend     | Supabase (PostgreSQL + Auth)        |
| AI          | Groq — llama-3.3-70b-versatile      |
| Design      | Design System v2 (Inter, sage/ivory, light theme only) |

## Architecture Principle

App code does all financial math using real Indian datasets stored in Supabase
(mfapi.in Nifty returns, NHB RESIDEX property appreciation, RBI CPI inflation,
insurer term premiums). Groq only reasons over pre-calculated accurate numbers —
it never does financial calculations itself. This eliminates hallucination risk
on financial figures.

## Database

11 tables across two categories:

**User data (5):** `profiles`, `financial_twin`, `subscriptions`,
`twin_analyses`, `simulations`

**Reference data (6):** `market_returns`, `city_inflation`,
`property_appreciation`, `term_premiums`, `tax_slabs`, `credit_cards`

All tables have Row Level Security enabled. User tables are owner-only.
Reference tables are authenticated read-only.

## API Routes

- `/api/analyze-twin` — Core analysis endpoint (financial math + Groq reasoning)
- `/api/simulate` — Decision Lab endpoint for what-if scenarios (5y/10y net worth paths)
- `/api/spend-check` — Purchase analysis: server math for EMI breach + 10yr opportunity cost, Groq for narrative
- `/api/credit-card` — Credit card matching (no LLM, uses local scoring function)
- `/api/chat` — Conversational interface (text mode, no JSON)

## Project Structure
artha/
├── app/
│   ├── (auth)/login and signup
│   ├── (protected)/onboarding, dashboard, decision-lab
│   └── api/analyze-twin, simulate, spend-check
├── components/onboarding, dashboard, decision-lab, shared
├── lib/supabase, financial-math, credit-card-match, subscriptions-data
├── types/twin, analysis, reference
├── scripts/seed.ts
└── supabase/migrations/

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # Browser-safe key (sb_publishable_...)
SUPABASE_SECRET_KEY=               # Server-only key (sb_secret_...)
SUPABASE_ACCESS_TOKEN=             # Management API token (sbp_...)
SUPABASE_PROJECT_REF=              # Project reference from URL
GROQ_API_KEY=                      # Groq API key (gsk_...)
```

## Data Sources

- **Market returns** — mfapi.in (Nifty 50 historical NAV, CAGR calculated)
- **City inflation** — RBI DBIE CPI tables (CSV download)
- **Property appreciation** — NHB RESIDEX quarterly report (PDF extraction)
- **Term premiums** — HDFC Life + Max Life online calculators (manual)
- **Tax slabs** — incometax.gov.in FY2024-25, both regimes (hardcoded)
- **Credit cards** — curated dataset, 40+ Indian cards

## Current Limitations

- Light theme only (no dark mode)
- City list in onboarding is hardcoded (20 cities)
- Shallow onboarding gate check (partial progress may route to broken states)
- No external chart or form libraries (custom UI only)

## What Was Cut for V1

- Bank/CC statement upload — PDF format varies by Indian bank, breaks demos
- Account Aggregator — requires RBI-registered FIU status
- Weekly nudges — needs 7+ days of behavioral data to be meaningful
- RAG for reference data — structured numerical data, direct queries are faster
- Peer benchmarking — no user dataset at scale on day 1

## Builder

Tharun Kumar — [github.com/tharun0648/artha](https://github.com/tharun0648/artha)

## Developer Documentation

- **AGENTS.md** — Architectural rules and contracts (stable)
- **SNAPSHOT.md** — Live technical snapshot (updated per session)

## License

Built for the Ayuda Individual Hackathon — Jun 13–14, 2025