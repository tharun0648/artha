import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import {
  emergencyFundRunway,
  causalAttribution,
  projectedSavingsAtGoal,
  requiredCorpus,
  sipFutureValue,
  getMarketReturn,
} from '@/lib/financial-math'
import { VERDICT_SYSTEM_PROMPT } from '@/lib/prompts'
import type { CausalFactor, HealthScore, SubscriptionInsight, VerdictOutput } from '@/types/analysis'
import type { FinancialTwin, Profile, Subscription } from '@/types/twin'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const ONE_ACTIONS: Record<string, string> = {
  'Low savings rate': 'Automate a SIP for at least 20% of take-home pay.',
  'High EMI burden': 'Pause new loans until EMI drops below 30% of income.',
  'Lifestyle inflation': 'Freeze discretionary spend at last month\'s level for 90 days.',
  'Insufficient emergency fund': 'Build a 3-month expense buffer before new investments.',
  'Under-invested in equity': 'Shift surplus into a diversified index fund SIP.',
  'Goal timeline too short': 'Extend the target year or increase monthly savings.',
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

async function subscriptionOpportunityCost10yr(monthlyAmount: number): Promise<number> {
  if (monthlyAmount <= 0) return 0
  const rate = await getMarketReturn('nifty50', 10)
  const fv = sipFutureValue(monthlyAmount, rate, 10)
  return Math.round(fv - monthlyAmount * 12 * 10)
}

function buildCausalFactors(
  mathFactors: Awaited<ReturnType<typeof causalAttribution>>
): CausalFactor[] {
  return mathFactors.map((f, i) => ({
    rank: i + 1,
    factor: f.factor,
    contribution_pct: f.contribution_pct,
    impact: f.contribution_pct >= 30 ? 'high' : f.contribution_pct >= 15 ? 'medium' : 'low',
    specific_finding: f.finding,
    one_action: ONE_ACTIONS[f.factor] ?? `Take one concrete step to improve ${f.factor.toLowerCase()}.`,
  }))
}

function buildSubscriptionInsight(
  monthlyTotal: number,
  tenYearCost: number
): SubscriptionInsight {
  return {
    monthly_total: monthlyTotal,
    annual_total: monthlyTotal * 12,
    ten_year_opportunity_cost: tenYearCost,
  }
}

function normalizeGroqScores(
  raw: Record<string, unknown>,
  causalFactors: CausalFactor[],
  subscriptionInsight: SubscriptionInsight
): VerdictOutput {
  const hs = (raw.health_score ?? {}) as Record<string, number>
  const dimensions = {
    emergency_buffer: clamp(Math.round(hs.emergency_buffer ?? 10), 0, 20),
    emi_discipline: clamp(Math.round(hs.emi_discipline ?? 10), 0, 20),
    insurance_coverage: clamp(Math.round(hs.insurance_coverage ?? 10), 0, 20),
    investment_habit: clamp(Math.round(hs.investment_habit ?? 10), 0, 20),
    lifestyle_control: clamp(Math.round(hs.lifestyle_control ?? 10), 0, 20),
  }
  const total = Object.values(dimensions).reduce((s, v) => s + v, 0)

  return {
    goal_probability: clamp(Math.round(Number(raw.goal_probability) || 0), 0, 100),
    confidence: clamp(Math.round(Number(raw.confidence) || 50), 0, 100),
    verdict: String(raw.verdict || 'Your financial twin analysis is ready.'),
    causal_attribution: causalFactors,
    health_score: { ...dimensions, total } satisfies HealthScore,
    subscription_insight: subscriptionInsight,
  }
}

async function buildContext(
  twin: FinancialTwin,
  profile: Profile,
  subscriptions: Subscription[]
): Promise<{
  context: string
  projectedSavings: number
  corpus: number
  causalFactors: CausalFactor[]
  subscriptionInsight: SubscriptionInsight
}> {
  const monthlyExpenses = twin.total_monthly_expenses
  const monthlySurplus = twin.monthly_income - monthlyExpenses
  const totalAssets = twin.current_savings + twin.equity_investments + twin.epf_balance
  const monthlySubSpend = subscriptions.reduce((s, sub) => s + (sub.monthly_amount ?? 0), 0)
  const yearsToGoal = twin.goal_target_year - new Date().getFullYear()
  const city = profile.city || 'National Average'
  const risk = profile.risk_appetite ?? 'moderate'

  const runwayMonths = emergencyFundRunway(twin.current_savings, monthlyExpenses)

  const [projectedSavings, corpus, subOpportunityCost] = await Promise.all([
    projectedSavingsAtGoal(twin, yearsToGoal, city, risk, profile.age),
    requiredCorpus(twin.goal_target_amount, yearsToGoal, city),
    subscriptionOpportunityCost10yr(monthlySubSpend),
  ])

  const mathCausal = await causalAttribution(twin, profile, projectedSavings, corpus)
  const causalFactors = buildCausalFactors(mathCausal)
  const subscriptionInsight = buildSubscriptionInsight(monthlySubSpend, subOpportunityCost)

  const projRatio = corpus > 0 ? projectedSavings / corpus : 0

  const context = `
USER FINANCIAL SNAPSHOT
=======================

PROFILE
- Age: ${profile.age}
- City: ${profile.city}
- Company type: ${profile.company_type}
- Risk appetite: ${profile.risk_appetite}

INCOME & EXPENSES (monthly)
- Take-home income: ${fmt(twin.monthly_income)}
- Rent: ${fmt(twin.monthly_rent)}
- Food: ${fmt(twin.monthly_food)}
- Transport: ${fmt(twin.monthly_transport)}
- Entertainment: ${fmt(twin.monthly_entertainment)}
- Other: ${fmt(twin.monthly_other)}
- EMI: ${fmt(twin.total_monthly_emi)}
- Total expenses: ${fmt(monthlyExpenses)}
- Monthly surplus: ${fmt(monthlySurplus)}
- Savings rate: ${pct(monthlySurplus, twin.monthly_income)}
- Expense-to-income ratio: ${pct(monthlyExpenses, twin.monthly_income)}

ASSETS
- Savings / liquid cash: ${fmt(twin.current_savings)}
- Equity / stocks / MF: ${fmt(twin.equity_investments)}
- EPF balance: ${fmt(twin.epf_balance)}
- Total assets: ${fmt(totalAssets)}
- Assets as multiple of annual income: ${twin.monthly_income ? (totalAssets / (twin.monthly_income * 12)).toFixed(2) : 'n/a'}x

EMERGENCY FUND
- Runway: ${runwayMonths >= 999 ? '999+' : runwayMonths.toFixed(1)} months (${runwayMonths >= 6 ? 'adequate' : runwayMonths >= 3 ? 'borderline' : 'insufficient'})

GOAL
- Primary goal: ${twin.primary_goal}
- Target amount: ${fmt(twin.goal_target_amount)}
- Target year: ${twin.goal_target_year}
- Years remaining: ${yearsToGoal}

PROJECTIONS (pre-computed by financial-math.ts)
- Required corpus at goal: ${fmt(corpus)}
- Projected savings at goal year: ${fmt(projectedSavings)}
- Projection ratio (projected / required): ${projRatio.toFixed(2)}x
- Goal reachable at current trajectory: ${projRatio >= 1 ? 'YES' : 'NO — shortfall of ' + fmt(corpus - projectedSavings)}

CAUSAL FACTORS (pre-computed — do not recalculate percentages)
${causalFactors.map(f => `- ${f.factor}: ${f.contribution_pct}% — ${f.specific_finding}`).join('\n')}

SUBSCRIPTIONS
- Monthly subscription spend: ${fmt(monthlySubSpend)}
- Active subscriptions: ${subscriptions.length}
- 10-year opportunity cost if invested instead: ${fmt(subOpportunityCost)}
- Subscription spend as % of surplus: ${pct(monthlySubSpend, monthlySurplus)}
`.trim()

  return { context, projectedSavings, corpus, causalFactors, subscriptionInsight }
}

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [twinRes, profileRes, subsRes] = await Promise.all([
    supabase.from('financial_twin').select('*').eq('user_id', user.id).single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id),
  ])

  if (twinRes.error || !twinRes.data) {
    return NextResponse.json({ error: 'Financial twin not found' }, { status: 404 })
  }
  if (profileRes.error || !profileRes.data) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const twin = twinRes.data as FinancialTwin
  const profile = profileRes.data as Profile
  const subscriptions = (subsRes.data ?? []) as Subscription[]

  const { data: cached } = await supabase
    .from('twin_analyses')
    .select('output, created_at')
    .eq('user_id', user.id)
    .eq('analysis_type', 'verdict')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (cached?.output && cached?.created_at) {
    const ageMs = Date.now() - new Date(cached.created_at).getTime()
    if (ageMs < 24 * 60 * 60 * 1000) {
      return NextResponse.json(cached.output as VerdictOutput)
    }
  }

  let context: string
  let causalFactors: CausalFactor[]
  let subscriptionInsight: SubscriptionInsight
  try {
    ;({ context, causalFactors, subscriptionInsight } = await buildContext(twin, profile, subscriptions))
  } catch (mathErr) {
    console.error('[analyze-twin] math error:', mathErr)
    return NextResponse.json({ error: 'Failed to compute financial projections' }, { status: 500 })
  }

  let verdict: VerdictOutput
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: VERDICT_SYSTEM_PROMPT },
        { role: 'user', content: context },
      ],
    })

    const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string, unknown>
    verdict = normalizeGroqScores(raw, causalFactors, subscriptionInsight)

    if (typeof verdict.goal_probability !== 'number' || !verdict.verdict) {
      throw new Error('Groq returned malformed verdict scores')
    }
  } catch (groqErr) {
    console.error('[analyze-twin] groq error:', groqErr)
    return NextResponse.json({ error: 'Analysis failed — please retry' }, { status: 500 })
  }

  const { error: insertErr } = await supabase.from('twin_analyses').insert({
    user_id: user.id,
    analysis_type: 'verdict',
    twin_snapshot: { twin, profile, subscriptions },
    output: verdict,
  })

  if (insertErr) {
    console.error('[analyze-twin] cache write error:', insertErr)
  }

  return NextResponse.json(verdict)
}
