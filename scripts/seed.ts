// scripts/seed.ts
// Run with: npx ts-node --project tsconfig.json scripts/seed.ts
// Requires SUPABASE_SECRET_KEY in .env.local (bypasses RLS)

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

// ── 1. Market Returns ─────────────────────────────────────────
async function seedMarketReturns() {
  console.log('⏳ Seeding market returns from mfapi.in...')

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const schemes = [
    { code: '120716', instrument: 'nifty50',              label: 'UTI Nifty 50 Index Fund Direct' },
    { code: '120684', instrument: 'nifty_next50',         label: 'ICICI Prudential Nifty Next 50 Index Fund Direct' },
    { code: '148726', instrument: 'nifty_midcap_150',     label: 'Nippon India Nifty Midcap 150 Index Fund Direct' },
    { code: '148519', instrument: 'nifty_smallcap_250',   label: 'Nippon India Nifty Smallcap 250 Index Fund Direct' },
    { code: '122639', instrument: 'flexi_cap',            label: 'Parag Parikh Flexi Cap Fund Direct Growth' },
    { code: '118834', instrument: 'large_midcap',         label: 'Mirae Asset Large & Midcap Fund Direct Growth' },
    { code: '135781', instrument: 'elss',                 label: 'Mirae Asset ELSS Tax Saver Fund Direct Growth' },
    { code: '118968', instrument: 'aggressive_hybrid',    label: 'HDFC Balanced Advantage Fund Direct Growth' },
    { code: '119016', instrument: 'short_duration_debt',  label: 'HDFC Short Term Debt Fund Direct Growth' },
  ]

  function getCAGR(
    navData: { date: string; nav: string }[],
    years: number
  ): number | null {
    const targetDate = new Date(today)
    targetDate.setFullYear(today.getFullYear() - years)
    const past = navData.find(d => new Date(d.date) <= targetDate)
    if (!past) return null
    const navToday = parseFloat(navData[0].nav)
    const navPast = parseFloat(past.nav)
    if (navPast === 0) return null
    return Math.pow(navToday / navPast, 1 / years) - 1
  }

  const rows: any[] = []

  for (const scheme of schemes) {
    try {
      const res = await fetch(`https://api.mfapi.in/mf/${scheme.code}`)
      const json = await res.json()
      const navData: { date: string; nav: string }[] = json.data

      for (const years of [1, 3, 5, 10]) {
        const cagr = getCAGR(navData, years)
        if (cagr !== null) {
          rows.push({
            instrument: scheme.instrument,
            period_years: years,
            cagr_pct: parseFloat(cagr.toFixed(6)),
            source: `mfapi.in — ${scheme.label}`,
            as_of_date: todayStr,
          })
        }
      }

      console.log(`  ✓ ${scheme.instrument} (${scheme.code}) — fetched`)
      await new Promise(r => setTimeout(r, 400))

    } catch (err) {
      console.warn(`  ⚠️  ${scheme.instrument} (${scheme.code}) — failed, skipping`)
    }
  }

  // Static instruments — no NAV history needed
  const staticRows = [
    { instrument: 'ppf',             period_years: 10, cagr_pct: 0.071,  source: 'India Post — PPF rate FY2024-25',              as_of_date: todayStr },
    { instrument: 'ppf',             period_years: 5,  cagr_pct: 0.071,  source: 'India Post — PPF rate FY2024-25',              as_of_date: todayStr },
    { instrument: 'epf',             period_years: 10, cagr_pct: 0.082,  source: 'EPFO — EPF interest rate FY2023-24',           as_of_date: todayStr },
    { instrument: 'epf',             period_years: 5,  cagr_pct: 0.082,  source: 'EPFO — EPF interest rate FY2023-24',           as_of_date: todayStr },
    { instrument: 'fd_avg',          period_years: 1,  cagr_pct: 0.068,  source: 'SBI/HDFC/ICICI average FD rate 2024',          as_of_date: todayStr },
    { instrument: 'fd_avg',          period_years: 3,  cagr_pct: 0.070,  source: 'SBI/HDFC/ICICI average FD rate 2024',          as_of_date: todayStr },
    { instrument: 'fd_avg',          period_years: 5,  cagr_pct: 0.070,  source: 'SBI/HDFC/ICICI average FD rate 2024',          as_of_date: todayStr },
    { instrument: 'nsc',             period_years: 5,  cagr_pct: 0.072,  source: 'India Post — NSC rate FY2024-25',              as_of_date: todayStr },
    { instrument: 'sukanya',         period_years: 10, cagr_pct: 0.082,  source: 'India Post — SSY rate FY2024-25',              as_of_date: todayStr },
    { instrument: 'gold',            period_years: 10, cagr_pct: 0.118,  source: 'MCX Gold 10yr avg CAGR estimate 2024',         as_of_date: todayStr },
    { instrument: 'gold',            period_years: 5,  cagr_pct: 0.142,  source: 'MCX Gold 5yr avg CAGR estimate 2024',          as_of_date: todayStr },
    { instrument: 'real_estate_avg', period_years: 10, cagr_pct: 0.085,  source: 'NHB RESIDEX national avg appreciation 2024',   as_of_date: todayStr },
    { instrument: 'real_estate_avg', period_years: 5,  cagr_pct: 0.092,  source: 'NHB RESIDEX national avg appreciation 2024',   as_of_date: todayStr },
  ]

  rows.push(...staticRows)

  const { error } = await supabase
    .from('market_returns')
    .upsert(rows, { onConflict: 'instrument,period_years' })

  if (error) throw error
  console.log(`✅ market_returns — ${rows.length} rows seeded`)
}

// ── 2. City Inflation ─────────────────────────────────────────
async function seedCityInflation() {
  console.log('⏳ Seeding city inflation...')
  // Place RBI DBIE CPI CSV at scripts/data/rbi-cpi.csv
  // Format expected: City, State, CPI_Annual_Pct, Year
  // Download from: https://dbie.rbi.org.in → Prices → CPI Urban by City
  // TODO: implement CSV parse after data file is placed in scripts/data/
  console.log('⚠️  city_inflation — awaiting scripts/data/rbi-cpi.csv')
}

// ── 3. Property Appreciation ──────────────────────────────────
async function seedPropertyAppreciation() {
  console.log('⏳ Seeding property appreciation...')
  // Place NHB RESIDEX extracted data at scripts/data/nhb-residex.json
  // Format: [{ city, state, current_index, prev_year_index, as_of_quarter }]
  // Extract from: https://nhb.org.in/residex → Latest quarterly PDF
  // TODO: implement after data file is placed in scripts/data/
  console.log('⚠️  property_appreciation — awaiting scripts/data/nhb-residex.json')
}

// ── 4. Term Premiums ──────────────────────────────────────────
async function seedTermPremiums() {
  console.log('⏳ Seeding term insurance premiums...')
  // Place manually collected data at scripts/data/term-premiums.json
  // Format: [{ age_years, cover_amount_cr, annual_premium_inr, gender, smoker, insurer }]
  // Source: HDFC Life + Max Life online calculators
  // Policy term: 30 years, online purchase, no riders
  // TODO: implement after data file is placed in scripts/data/
  console.log('⚠️  term_premiums — awaiting scripts/data/term-premiums.json')
}

// ── 5. Credit Cards ───────────────────────────────────────────
async function seedCreditCards() {
  console.log('⏳ Seeding credit cards...')
  // Place Tharun's card dataset at scripts/data/cc-data.json
  // Schema: matches credit_cards table exactly (see types/reference.ts CreditCard)
  // TODO: implement after cc-data.json is provided
  console.log('⚠️  credit_cards — awaiting scripts/data/cc-data.json')
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('🌱 A₹tha seed script starting...\n')

  try {
    await seedMarketReturns()
    await seedCityInflation()
    await seedPropertyAppreciation()
    await seedTermPremiums()
    await seedCreditCards()
  } catch (err) {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  }

  console.log('\n✅ Seed complete.')
  console.log('   Verify in Supabase table editor before building Phase 4.')
  console.log('   Check market_returns for realistic CAGR values (Nifty ~12% 10yr).')
}

main()
