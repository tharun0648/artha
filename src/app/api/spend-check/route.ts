import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { SPEND_CHECK_SYSTEM_PROMPT } from '@/lib/prompts'
import type { SpendCheckResult } from '@/types/analysis'
import type { FinancialTwin, Profile, Subscription } from '@/types/twin'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

interface SpendCheckRequest {
  item: string
  amount: number
}

function fmt(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${Math.round(n)}`
}

function pct(part: number, whole: number): string {
  if (!whole) return '0%'
  return `${Math.round((part / whole) * 100)}%`
}

function normalizeResult(raw: Record<string, unknown>, mathValues: { emiBreached: boolean; oppCost: number }): SpendCheckResult {
  const tone = String(raw.verdict_tone ?? 'neutral')
  return {
    purchase_summary: String(raw.purchase_summary ?? ''),
    emi_ceiling_breach: mathValues.emiBreached,
    goal_impact_statement: String(raw.goal_impact_statement ?? ''),
    opportunity_cost_10yr: mathValues.oppCost,
    verdict_tone: (tone === 'warning' || tone === 'caution') ? tone : 'neutral',
    one_insight: String(raw.one_insight ?? ''),
    options: ['Buy now', 'Wait 48 hours', 'Skip it'],
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: SpendCheckRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const item = String(body.item ?? '').trim()
  const amount = Number(body.amount)
  if (!item) return NextResponse.json({ error: 'Item name required' }, { status: 400 })
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })

  const [twinRes, profileRes, subsRes] = await Promise.all([
    supabase.from('financial_twin').select('*').eq('user_id', user.id).single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('name,monthly_amount,category').eq('user_id', user.id).eq('is_active', true),
  ])

  if (twinRes.error || !twinRes.data) {
    return NextResponse.json({ error: 'Financial twin not found' }, { status: 404 })
  }
  if (profileRes.error || !profileRes.data) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const twin = twinRes.data as FinancialTwin
  const profile = profileRes.data as Profile
  const subscriptions = (subsRes.data ?? []) as Pick<Subscription, 'name' | 'monthly_amount' | 'category'>[]

  // Pre-computed math — Groq receives results, never recalculates
  const emiHeadroom = twin.monthly_income * 0.4 - twin.total_monthly_emi
  const emiBreached = amount > emiHeadroom

  // Opportunity cost: lump-sum compound growth at 12% over 10 years minus principal
  const oppCost = Math.round(amount * Math.pow(1.12, 10)) - amount

  const surplus = twin.monthly_income - twin.total_monthly_expenses
  const monthlySubTotal = subscriptions.reduce((s, sub) => s + sub.monthly_amount, 0)

  const context = `
PURCHASE EVALUATION
===================
Item: ${item}
Amount: ${fmt(amount)}

USER FINANCIAL SNAPSHOT
- Monthly income: ${fmt(twin.monthly_income)}
- Monthly expenses: ${fmt(twin.total_monthly_expenses)}
- Monthly surplus: ${fmt(surplus)} (${pct(surplus, twin.monthly_income)} savings rate)
- Total EMI: ${fmt(twin.total_monthly_emi)} (${pct(twin.total_monthly_emi, twin.monthly_income)} of income)
- EMI headroom (40% ceiling): ${fmt(Math.max(emiHeadroom, 0))}
- Current savings: ${fmt(twin.current_savings)}
- Goal: ${twin.primary_goal ?? 'Not set'} · ${fmt(twin.goal_target_amount)} by ${twin.goal_target_year}
- City: ${profile.city ?? 'Unknown'} · Age: ${profile.age} · Risk: ${profile.risk_appetite}
- Monthly subscriptions: ${fmt(monthlySubTotal)} across ${subscriptions.length} services

PRE-COMPUTED MATH (do not recalculate)
- EMI ceiling breach: ${emiBreached ? 'YES — amount exceeds available EMI headroom of ' + fmt(Math.max(emiHeadroom, 0)) : 'NO — within EMI headroom'}
- Purchase as % of monthly surplus: ${pct(amount, surplus)}
- 10-year opportunity cost (if invested instead): ${fmt(oppCost)}
`.trim()

  let result: SpendCheckResult
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SPEND_CHECK_SYSTEM_PROMPT },
        { role: 'user', content: context },
      ],
    })

    const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string, unknown>
    result = normalizeResult(raw, { emiBreached, oppCost })

    if (!result.one_insight || !result.purchase_summary) {
      throw new Error('Groq returned malformed spend-check result')
    }
  } catch (err) {
    console.error('[spend-check] groq error:', err)
    return NextResponse.json({ error: 'Spend check failed — please retry' }, { status: 500 })
  }

  return NextResponse.json(result)
}
