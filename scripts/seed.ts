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

  type MarketReturnRow = {
    instrument: string
    period_years: number
    cagr_pct: number
    source: string
    as_of_date: string
  }
  const rows: MarketReturnRow[] = []

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

    } catch {
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
  const fs = await import('fs')
  const path = await import('path')
  const raw = fs.readFileSync(
    path.resolve(process.cwd(), 'scripts/data/rbi-cpi.json'), 'utf-8'
  )
  const rows = JSON.parse(raw)
  const { error } = await supabase
    .from('city_inflation')
    .upsert(rows, { onConflict: 'city,year' })
  if (error) throw error
  console.log(`✅ city_inflation — ${rows.length} rows seeded`)
}

// ── 3. Property Appreciation ──────────────────────────────────
async function seedPropertyAppreciation() {
  console.log('⏳ Seeding property appreciation...')
  const fs = await import('fs')
  const path = await import('path')
  const raw = fs.readFileSync(
    path.resolve(process.cwd(), 'scripts/data/nhb-residex.json'), 'utf-8'
  )
  type ResidexItem = {
    city: string
    state: string
    current_index: number
    prev_year_index: number
    as_of_quarter: string
  }
  const items: ResidexItem[] = JSON.parse(raw)
  const rows = items.map(item => ({
    city: item.city,
    state: item.state,
    annual_appreciation_pct: parseFloat(
      ((item.current_index / item.prev_year_index) - 1).toFixed(6)
    ),
    residex_index_current: item.current_index,
    as_of_quarter: item.as_of_quarter,
  }))
  const { error } = await supabase
    .from('property_appreciation')
    .upsert(rows, { onConflict: 'city' })
  if (error) throw error
  console.log(`✅ property_appreciation — ${rows.length} rows seeded`)
}

// ── 4. Term Premiums ──────────────────────────────────────────
async function seedTermPremiums() {
  console.log('⏳ Seeding term insurance premiums...')
  const fs = await import('fs')
  const path = await import('path')
  const raw = fs.readFileSync(
    path.resolve(process.cwd(), 'scripts/data/term-premiums.json'), 'utf-8'
  )
  const rows = JSON.parse(raw)
  const { error } = await supabase
    .from('term_premiums')
    .upsert(rows)
  if (error) throw error
  console.log(`✅ term_premiums — ${rows.length} rows seeded`)
}

// ── 5. Credit Cards ───────────────────────────────────────────
async function seedCreditCards() {
  console.log('⏳ Seeding credit cards...')
  const fs = await import('fs')
  const path = await import('path')
  const raw = fs.readFileSync(
    path.resolve(process.cwd(), 'scripts/data/cc-data.json'),
    'utf-8'
  )
  const cards = JSON.parse(raw)
  const { error } = await supabase
    .from('credit_cards')
    .upsert(cards, { onConflict: 'card_id' })
  if (error) throw error
  console.log(`✅ credit_cards — ${cards.length} rows seeded`)
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
  } catch (err: unknown) {
    console.error('❌ Seed failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  console.log('\n✅ Seed complete.')
  console.log('   Verify in Supabase table editor before building Phase 4.')
  console.log('   Check market_returns for realistic CAGR values (Nifty ~12% 10yr).')
}

main()

// ── Demo User ─────────────────────────────────────────────────
async function seedDemoUser() {
  console.log('⏳ Seeding demo user...')

  // Step 1: Create or retrieve demo user
  let demoUserId: string

  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: 'demo@artha.app',
    password: 'demo1234',
    email_confirm: true,
  })

  if (createError) {
    if (!createError.message.toLowerCase().includes('already been registered') &&
        !createError.message.toLowerCase().includes('already exists')) {
      throw createError
    }
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError
    const existing = listData.users.find(u => u.email === 'demo@artha.app')
    if (!existing) throw new Error('Demo user not found after creation conflict')
    demoUserId = existing.id
  } else {
    demoUserId = createData.user.id
  }

  // Step 2: Upsert profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: demoUserId,
      age: 28,
      city: 'Bengaluru',
      company_type: 'startup',
      risk_appetite: 'moderate',
    }, { onConflict: 'id' })
  if (profileError) throw profileError

  // Step 3: Upsert financial_twin
  const { error: twinError } = await supabase
    .from('financial_twin')
    .upsert({
      user_id: demoUserId,
      monthly_income: 140000,
      last_year_income: 120000,
      monthly_rent: 28000,
      monthly_food: 12000,
      monthly_other: 8000,
      monthly_transport: 5000,
      monthly_entertainment: 4000,
      total_monthly_emi: 15000,
      current_savings: 450000,
      equity_investments: 200000,
      epf_balance: 180000,
      primary_goal: 'home',
      goal_target_amount: 16000000,
      goal_target_year: 2034,
    }, { onConflict: 'user_id' })
  if (twinError) throw twinError

  // Step 4: Delete stale analysis cache so fresh analysis runs on next load
  const { error: analysisDeleteError } = await supabase
    .from('twin_analyses')
    .delete()
    .eq('user_id', demoUserId)
  if (analysisDeleteError) throw analysisDeleteError

  // Step 5: Replace subscriptions
  const { error: deleteError } = await supabase
    .from('subscriptions')
    .delete()
    .eq('user_id', demoUserId)
  if (deleteError) throw deleteError

  const { error: subError } = await supabase
    .from('subscriptions')
    .insert([
      { user_id: demoUserId, name: 'Netflix',       category: 'entertainment',        monthly_amount: 649  },
      { user_id: demoUserId, name: 'Spotify',        category: 'music_audio',          monthly_amount: 119  },
      { user_id: demoUserId, name: 'Amazon Prime',   category: 'ecommerce',            monthly_amount: 299  },
      { user_id: demoUserId, name: 'Cult.fit',       category: 'fitness_health',       monthly_amount: 1299 },
      { user_id: demoUserId, name: 'Zomato Gold',    category: 'food_dining',          monthly_amount: 149  },
    ])
  if (subError) throw subError

  // Step 6: Done
  console.log(`Demo user ready. UUID: ${demoUserId}`)
}

if (process.argv.includes('--demo-user')) {
  seedDemoUser().catch(err => {
    console.error('❌ seedDemoUser failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
