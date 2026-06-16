// POST /api/chat — conversational Artha advisor backed by the user's financial twin.
// Accepts twinOverride/profileOverride/subsOverride/verdictOverride for demo personas.
// Uses text mode (not JSON), temp 0.4, max 400 tokens per AGENTS.md rule 6.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import type { FinancialTwin, Profile, Subscription } from '@/types/twin'
import type { VerdictOutput } from '@/types/analysis'
import { fmt } from '@/lib/format'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
}

function buildSystemPrompt(
  twin: FinancialTwin,
  profile: Profile,
  subscriptions: Subscription[],
  verdict: VerdictOutput | null
): string {
  const income = twin.monthly_income ?? 0
  const expenses = twin.total_monthly_expenses ?? (
    (twin.monthly_rent ?? 0) +
    (twin.monthly_food ?? 0) +
    (twin.monthly_other ?? 0) +
    (twin.monthly_transport ?? 0) +
    (twin.monthly_entertainment ?? 0) +
    (twin.total_monthly_emi ?? 0)
  )
  const surplus = income - expenses
  const surplusPct = income > 0 ? Math.round((surplus / income) * 100) : 0
  const runway = Math.round((twin.current_savings ?? 0) / Math.max(1, expenses))
  const subscriptionList = subscriptions.length > 0
    ? subscriptions.map(s => `${s.name} ${fmt(s.monthly_amount)}/mo`).join(', ')
    : 'None recorded'
  const goalProbability = verdict?.goal_probability ?? 'not yet calculated'
  const otherExpenses = (twin.monthly_other ?? 0) + (twin.monthly_transport ?? 0) + (twin.monthly_entertainment ?? 0)

  return `You are Artha, a sharp and direct personal finance advisor for Indians. You have access to this user's complete financial picture. Always reason from their specific numbers — never give generic advice.

USER'S FINANCIAL SNAPSHOT:
- Monthly take-home: ${fmt(income)}
- Monthly expenses: ${fmt(expenses)} (rent ${fmt(twin.monthly_rent ?? 0)}, food ${fmt(twin.monthly_food ?? 0)}, EMIs ${fmt(twin.total_monthly_emi ?? 0)}, other ${fmt(otherExpenses)})
- Monthly surplus: ${fmt(surplus)} (${surplusPct}% savings rate)
- Savings: ${fmt(twin.current_savings ?? 0)} | Equity: ${fmt(twin.equity_investments ?? 0)} | EPF: ${fmt(twin.epf_balance ?? 0)}
- Emergency runway: ${runway} months
- Goal: ${twin.primary_goal ?? 'Not set'} — ${fmt(twin.goal_target_amount ?? 0)} by ${twin.goal_target_year ?? 'N/A'}
- Goal probability: ${goalProbability}% (from latest analysis)
- Active subscriptions: ${subscriptionList}

RULES:
1. Never give advice without referencing at least one of their actual numbers.
2. For expense questions: calculate what % of their income each category is, compare to healthy benchmarks (rent <30%, food <15%, EMIs <40%), then give a specific rupee recommendation.
3. For savings questions: use their actual surplus and compound it at 12% to show what SIP they could start.
4. Keep responses under 120 words. Be direct. No filler phrases like "Great question!" or "Certainly!".
5. If asked something outside personal finance, say: "I only help with financial decisions. What would you like to know about your money?"
6. ALWAYS end your response with a line starting with '→ This week:' followed by one specific, concrete action. Example: '→ This week: set up a ₹5k SIP on Groww or Zerodha.' Never end without this line.
7. CRITICAL: Always write rupee amounts using Indian short notation — Cr for crores, L for lakhs, k for thousands. NEVER write raw numbers with many zeros. Examples: ₹1.6Cr not ₹16000000, ₹68k not ₹68000, ₹1.5L not ₹150000.`
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ChatRequest & {
    twinOverride?: FinancialTwin
    profileOverride?: Profile
    subsOverride?: Subscription[]
    verdictOverride?: VerdictOutput
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const messages = body.messages ?? []
  if (!messages.length) {
    return NextResponse.json({ error: 'Messages required' }, { status: 400 })
  }

  let twin: FinancialTwin
  let profile: Profile
  let subscriptions: Subscription[]
  let verdict: VerdictOutput | null

  if (body.twinOverride && body.profileOverride) {
    twin = body.twinOverride
    profile = body.profileOverride
    subscriptions = body.subsOverride ?? []
    verdict = body.verdictOverride ?? null
  } else {
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

    twin = twinRes.data as FinancialTwin
    profile = profileRes.data as Profile
    subscriptions = (subsRes.data ?? []) as Subscription[]
    verdict = (verdictRes.data?.output ?? null) as VerdictOutput | null
  }

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
