// POST /api/simulate — run a life-scenario simulation against a user's financial twin.
// Math (net worth projections) is pre-computed here; Groq writes narrative only.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import {
  sipFutureValue,
  compoundGrowth,
} from '@/lib/financial-math'
import { SIMULATE_SYSTEM_PROMPT } from '@/lib/prompts'
import { fmt } from '@/lib/format'
import type { SimulationResult } from '@/types/analysis'
import type { FinancialTwin, Profile } from '@/types/twin'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

interface SimulateRequest {
  scenario: string
  // Demo persona overrides — skips DB fetch when present
  twinOverride?: FinancialTwin
  profileOverride?: Profile
}

function pct(part: number, whole: number): string {
  if (!whole) return '0%'
  return `${Math.round((part / whole) * 100)}%`
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

// Scenario assumptions: hardcoded parameters for common life decisions
const SCENARIO_ASSUMPTIONS: Record<
  string,
  {
    assumption: string
    cost: number // initial capital needed
    duration: number // months to breakeven
    incomeMultiplier: number // multiplier after duration
    savingsImpact: number // % reduction in monthly savings during duration
  }
> = {
  mba: {
    assumption: '2-year MBA (₹25L fees), 2 years no income, then 35% income boost',
    cost: 25_00_000,
    duration: 24,
    incomeMultiplier: 1.35,
    savingsImpact: 0.95, // 95% of savings redirected to fees
  },
  home: {
    assumption: 'Home down payment (₹50L), 0.5% monthly appreciation, EMI offsets rent savings',
    cost: 50_00_000,
    duration: 6,
    incomeMultiplier: 1.0,
    savingsImpact: 0.85, // 85% of surplus goes to EMI instead of savings
  },
  'job-switch': {
    assumption: '2-month gap, 25% salary bump, ₹5L relocation cost',
    cost: 5_00_000,
    duration: 2,
    incomeMultiplier: 1.25,
    savingsImpact: 0.7, // 70% of savings during transition
  },
}

async function projectNetWorth(
  twin: FinancialTwin,
  city: string,
  risk: 'conservative' | 'moderate' | 'aggressive',
  age: number
): Promise<{ year5: number; year10: number; goalYear: number | null }> {
  const monthlyExpenses = twin.total_monthly_expenses
  const monthlySurplus = Math.max(twin.monthly_income - monthlyExpenses, 0)
  const currentCorpus = twin.current_savings + twin.equity_investments + twin.epf_balance
  const returnRate = 0.11 // ~Nifty 50 long-term CAGR

  // SIP future value: compounding monthly contributions
  const year5 = sipFutureValue(monthlySurplus, returnRate, 5)
             + compoundGrowth(currentCorpus, returnRate, 5)

  const year10 = sipFutureValue(monthlySurplus, returnRate, 10)
              + compoundGrowth(currentCorpus, returnRate, 10)

  // Goal achievement check
  let goalYear: number | null = null
  if (twin.primary_goal && twin.goal_target_amount > 0) {
    const currentYear = new Date().getFullYear()
    for (let y = 1; y <= 20; y++) {
      const projected = sipFutureValue(monthlySurplus, returnRate, y)
                      + compoundGrowth(currentCorpus, returnRate, y)
      if (projected >= twin.goal_target_amount) {
        goalYear = currentYear + y
        break
      }
    }
  }

  return { year5, year10, goalYear }
}

async function buildSimulationContext(
  twin: FinancialTwin,
  profile: Profile,
  scenario: string,
  currentPath: Awaited<ReturnType<typeof projectNetWorth>>,
  scenarioPath: Awaited<ReturnType<typeof projectNetWorth>>,
  modifiedTwin: FinancialTwin,
  assumptions: (typeof SCENARIO_ASSUMPTIONS)[string]
): Promise<string> {
  const monthlyExpenses = twin.total_monthly_expenses
  const monthlySurplus = Math.max(twin.monthly_income - monthlyExpenses, 0)
  const scenarioMonthlySurplus = Math.max(modifiedTwin.monthly_income - modifiedTwin.total_monthly_expenses, 0)

  return `
SCENARIO SIMULATION: ${scenario.toUpperCase()}
==================================================

CURRENT FINANCIAL STATE
- Monthly income: ${fmt(twin.monthly_income)}
- Monthly expenses: ${fmt(monthlyExpenses)}
- Monthly surplus: ${fmt(monthlySurplus)}
- Total assets: ${fmt(twin.current_savings + twin.equity_investments + twin.epf_balance)}
- Goal: ${twin.primary_goal} · ${fmt(twin.goal_target_amount)} by ${twin.goal_target_year}

SCENARIO ASSUMPTIONS
${assumptions.assumption}

SCENARIO IMPACT
- Initial capital required: ${fmt(assumptions.cost)}
- Duration of impact: ${assumptions.duration} months
- Income multiplier after: ${assumptions.incomeMultiplier.toFixed(2)}x
- Savings impact during transition: ${(assumptions.savingsImpact * 100).toFixed(0)}%

MODIFIED STATE POST-SCENARIO
- Monthly income (after): ${fmt(modifiedTwin.monthly_income)}
- Monthly expenses (adjusted): ${fmt(modifiedTwin.total_monthly_expenses)}
- Monthly surplus (after): ${fmt(scenarioMonthlySurplus)}

PROJECTION COMPARISON (5yr / 10yr net worth)
- Current path: ${fmt(currentPath.year5)} / ${fmt(currentPath.year10)}
- Scenario path: ${fmt(scenarioPath.year5)} / ${fmt(scenarioPath.year10)}
- Net difference at 10yr: ${fmt(scenarioPath.year10 - currentPath.year10)}

GOAL ACHIEVEMENT
- Current path: ${currentPath.goalYear ? `year ${currentPath.goalYear}` : 'Not achievable'}
- Scenario path: ${scenarioPath.goalYear ? `year ${scenarioPath.goalYear}` : 'Not achievable'}
`.trim()
}

function normalizeSimulationResult(
  raw: Record<string, unknown>,
  scenario: string,
  currentPath: { year5: number; year10: number; goalYear: number | null },
  scenarioPath: { year5: number; year10: number; goalYear: number | null },
  scenarioMonthlySurplus: number
): SimulationResult {
  return {
    scenario: String(raw.scenario ?? scenario),
    assumption_note: String(raw.assumption_note ?? ''),
    current_path: {
      net_worth_5yr: Math.round(currentPath.year5),
      net_worth_10yr: Math.round(currentPath.year10),
      goal_achieved_year: currentPath.goalYear,
    },
    scenario_path: {
      net_worth_5yr: Math.round(scenarioPath.year5),
      net_worth_10yr: Math.round(scenarioPath.year10),
      goal_achieved_year: scenarioPath.goalYear,
      break_even_year: raw.break_even_year
        ? clamp(Math.round(Number(raw.break_even_year)), 2024, 2060)
        : null,
      monthly_surplus_after: scenarioMonthlySurplus,
    },
    goal_impact: String(raw.goal_impact ?? ''),
    verdict: String(raw.verdict ?? 'Feasible but requires careful planning.'),
    key_risks: Array.isArray(raw.key_risks) ? raw.key_risks.map(String).slice(0, 3) : [],
    key_opportunities: Array.isArray(raw.key_opportunities)
      ? raw.key_opportunities.map(String).slice(0, 3)
      : [],
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: SimulateRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const scenario = String(body.scenario ?? '').toLowerCase().trim()
  if (!scenario) {
    return NextResponse.json({ error: 'Scenario required' }, { status: 400 })
  }

  let twin: FinancialTwin
  let profile: Profile

  if (body.twinOverride && body.profileOverride) {
    // Demo mode: use client-supplied persona data, skip DB
    twin = body.twinOverride
    profile = body.profileOverride
  } else {
    const [twinRes, profileRes] = await Promise.all([
      supabase.from('financial_twin').select('*').eq('user_id', user.id).single(),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

    if (twinRes.error || !twinRes.data) {
      return NextResponse.json({ error: 'Financial twin not found' }, { status: 404 })
    }
    if (profileRes.error || !profileRes.data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    twin = twinRes.data as FinancialTwin
    profile = profileRes.data as Profile
  }

  const city = profile.city || 'National Average'
  const risk = profile.risk_appetite ?? 'moderate'

  // Get or infer scenario assumptions
  const assumptions = SCENARIO_ASSUMPTIONS[scenario] || {
    assumption: `Hypothetical scenario: ${scenario}`,
    cost: 10_00_000,
    duration: 3,
    incomeMultiplier: 1.15,
    savingsImpact: 0.8,
  }

  // Build modified twin for post-scenario state
  const modifiedTwin: FinancialTwin = {
    ...twin,
    monthly_income: Math.round(twin.monthly_income * assumptions.incomeMultiplier),
    current_savings: Math.max(
      twin.current_savings - assumptions.cost,
      0
    ),
  }

  const scenarioMonthlySurplus = Math.max(
    modifiedTwin.monthly_income - modifiedTwin.total_monthly_expenses, 0
  )

  let currentPath: Awaited<ReturnType<typeof projectNetWorth>>
  let scenarioPath: Awaited<ReturnType<typeof projectNetWorth>>
  let context: string

  try {
    [currentPath, scenarioPath] = await Promise.all([
      projectNetWorth(twin, city, risk, profile.age),
      projectNetWorth(modifiedTwin, city, risk, profile.age),
    ])

    context = await buildSimulationContext(
      twin,
      profile,
      scenario,
      currentPath,
      scenarioPath,
      modifiedTwin,
      assumptions
    )
  } catch (mathErr) {
    console.error('[simulate] math error:', mathErr)
    return NextResponse.json({ error: 'Failed to compute projections' }, { status: 500 })
  }

  let result: SimulationResult
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SIMULATE_SYSTEM_PROMPT },
        { role: 'user', content: context },
      ],
    })

    const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string, unknown>
    result = normalizeSimulationResult(raw, scenario, currentPath, scenarioPath, scenarioMonthlySurplus)

    if (!result.scenario || !result.verdict) {
      throw new Error('Groq returned malformed simulation result')
    }
  } catch (groqErr) {
    console.error('[simulate] groq error:', groqErr)
    return NextResponse.json({ error: 'Simulation failed — please retry' }, { status: 500 })
  }

  const { error: insertErr } = await supabase.from('simulations').insert({
    user_id: user.id,
    scenario,
    output: result,
  })

  if (insertErr) {
    console.error('[simulate] cache write error:', insertErr)
  }

  return NextResponse.json(result)
}
