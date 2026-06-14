import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import {
  projectedSavingsAtGoal,
  requiredCorpus,
  compoundGrowth,
} from '@/lib/financial-math'
import { SIMULATE_SYSTEM_PROMPT } from '@/lib/prompts'
import type { SimulationResult } from '@/types/analysis'
import type { FinancialTwin, Profile } from '@/types/twin'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

interface SimulateRequest {
  scenario: string
}

function fmt(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${n}`
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
  yearsToProject: number,
  city: string,
  risk: 'conservative' | 'moderate' | 'aggressive',
  age: number
): Promise<{ year5: number; year10: number; goalYear: number | null }> {
  const monthlyExpenses = twin.total_monthly_expenses
  const monthlySurplus = Math.max(twin.monthly_income - monthlyExpenses, 0)
  const currentCorpus = twin.current_savings + twin.equity_investments + twin.epf_balance

  // Simple projection: assume constant surplus, market returns ~10% annually
  const year5 = compoundGrowth(currentCorpus, 0.10, 5) + monthlySurplus * 12 * 5 * 1.05
  const year10 = compoundGrowth(currentCorpus, 0.10, 10) + monthlySurplus * 12 * 10 * 1.05

  // Find goal achievement year
  let goalYear: number | null = null
  if (twin.primary_goal && twin.goal_target_amount > 0) {
    const yearsToGoal = twin.goal_target_year - new Date().getFullYear()
    const projected = compoundGrowth(currentCorpus, 0.10, yearsToGoal) +
      monthlySurplus * 12 * yearsToGoal * 1.05
    if (projected >= twin.goal_target_amount) {
      goalYear = twin.goal_target_year
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
  scenario: string
): SimulationResult {
  const cp = (raw.current_path ?? {}) as Record<string, unknown>
  const sp = (raw.scenario_path ?? {}) as Record<string, unknown>

  return {
    scenario: String(raw.scenario ?? scenario),
    assumption_note: String(raw.assumption_note ?? ''),
    current_path: {
      net_worth_5yr: clamp(Math.round(Number(cp.net_worth_5yr) || 0), 0, 999_99_99_999),
      net_worth_10yr: clamp(Math.round(Number(cp.net_worth_10yr) || 0), 0, 999_99_99_999),
      goal_achieved_year: cp.goal_achieved_year ? Math.round(Number(cp.goal_achieved_year)) : null,
    },
    scenario_path: {
      net_worth_5yr: clamp(Math.round(Number(sp.net_worth_5yr) || 0), 0, 999_99_99_999),
      net_worth_10yr: clamp(Math.round(Number(sp.net_worth_10yr) || 0), 0, 999_99_99_999),
      goal_achieved_year: sp.goal_achieved_year ? Math.round(Number(sp.goal_achieved_year)) : null,
      break_even_year: sp.break_even_year ? Math.round(Number(sp.break_even_year)) : null,
      monthly_surplus_after: clamp(Math.round(Number(sp.monthly_surplus_after) || 0), -999_99_999, 999_99_999),
    },
    goal_impact: String(raw.goal_impact ?? ''),
    verdict: String(raw.verdict ?? 'Feasible but requires careful planning.'),
    key_risks: Array.isArray(raw.key_risks) ? raw.key_risks.map(String) : [],
    key_opportunities: Array.isArray(raw.key_opportunities) ? raw.key_opportunities.map(String) : [],
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

  const twin = twinRes.data as FinancialTwin
  const profile = profileRes.data as Profile
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

  let currentPath: Awaited<ReturnType<typeof projectNetWorth>>
  let scenarioPath: Awaited<ReturnType<typeof projectNetWorth>>
  let context: string

  try {
    [currentPath, scenarioPath] = await Promise.all([
      projectNetWorth(twin, 10, city, risk, profile.age),
      projectNetWorth(modifiedTwin, 10, city, risk, profile.age),
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
    result = normalizeSimulationResult(raw, scenario)

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
