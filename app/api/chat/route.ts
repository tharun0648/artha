import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import type { FinancialTwin, Profile, Subscription } from '@/types/twin'
import type { VerdictOutput } from '@/types/analysis'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
}

function fmt(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${Math.round(n)}`
}

function buildSystemPrompt(
  twin: FinancialTwin,
  profile: Profile,
  subscriptions: Subscription[],
  verdict: VerdictOutput | null
): string {
  const surplus = twin.monthly_income - twin.total_monthly_expenses
  const savingsRate = twin.monthly_income > 0
    ? Math.round((surplus / twin.monthly_income) * 100)
    : 0
  const yearsToGoal = twin.goal_target_year
    ? twin.goal_target_year - new Date().getFullYear()
    : null

  const subLines = subscriptions.length > 0
    ? subscriptions.map(s => `  · ${s.name}: ₹${s.monthly_amount}/mo`).join('\n')
    : '  · None recorded'

  const goalLine = twin.primary_goal
    ? `${twin.primary_goal} · ${fmt(twin.goal_target_amount)} by ${twin.goal_target_year}${yearsToGoal !== null ? ` (${yearsToGoal} years away)` : ''}`
    : 'Not set'

  const verdictLines = verdict
    ? `Goal probability: ${verdict.goal_probability}% (confidence ${verdict.confidence}%)
Verdict: ${verdict.verdict}`
    : 'Goal analysis: Not yet run'

  return `You are Artha, a personal finance partner for young working Indians.

Persona: sharp, direct, zero fluff. Speak like a CA friend who knows the user's exact numbers.
Never give generic advice. Every answer must reference the user's specific rupee amounts below.
Indian context only: SIP, EPF, NPS, ELSS, PPF, tax slabs, Indian real estate. No US/UK products.
Keep replies under 120 words unless the user explicitly asks for a detailed breakdown.
End with one concrete next step when giving advice.
If asked about something unrelated to personal finance, redirect in one sentence.

USER FINANCIAL SNAPSHOT
=======================
Income & cashflow
- Monthly take-home: ${fmt(twin.monthly_income)}
- Monthly expenses (total): ${fmt(twin.total_monthly_expenses)}
- Monthly surplus: ${fmt(surplus)} (${savingsRate}% savings rate)
- Total monthly EMI: ${fmt(twin.total_monthly_emi)}

Assets
- Savings / liquid: ${fmt(twin.current_savings)}
- Equity / MF: ${fmt(twin.equity_investments)}
- EPF balance: ${fmt(twin.epf_balance)}

Profile
- Age: ${profile.age}
- City: ${profile.city ?? 'Unknown'}
- Company type: ${profile.company_type ?? 'Unknown'}
- Risk appetite: ${profile.risk_appetite ?? 'moderate'}

Goal
- ${goalLine}
- ${verdictLines}

Active subscriptions (monthly)
${subLines}
Total subscription spend: ${fmt(subscriptions.reduce((s, sub) => s + sub.monthly_amount, 0))}/mo`.trim()
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ChatRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const messages = body.messages ?? []
  if (!messages.length) {
    return NextResponse.json({ error: 'Messages required' }, { status: 400 })
  }

  const [twinRes, profileRes, subsRes, verdictRes] = await Promise.all([
    supabase.from('financial_twin').select('*').eq('user_id', user.id).single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('name,monthly_amount,category').eq('user_id', user.id).eq('is_active', true),
    supabase
      .from('twin_analyses')
      .select('output')
      .eq('user_id', user.id)
      .eq('analysis_type', 'verdict')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
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
  const verdict = (verdictRes.data?.output ?? null) as VerdictOutput | null

  const systemPrompt = buildSystemPrompt(twin, profile, subscriptions, verdict)

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 400,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    })

    const reply = completion.choices[0]?.message?.content?.trim()
      ?? "I couldn't generate a response. Please try again."
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[chat] groq error:', err)
    return NextResponse.json({ error: 'Chat failed — please retry' }, { status: 500 })
  }
}
