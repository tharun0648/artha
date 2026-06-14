import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { matchCreditCards } from '@/lib/credit-card-match'
import type { FinancialTwin, Subscription } from '@/types/twin'

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [twinRes, subsRes] = await Promise.all([
    supabase.from('financial_twin').select('*').eq('user_id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('is_active', true),
  ])

  if (twinRes.error || !twinRes.data) {
    return NextResponse.json({ error: 'Financial twin not found' }, { status: 404 })
  }

  const twin = twinRes.data as FinancialTwin
  const subscriptions = (subsRes.data ?? []) as Subscription[]

  const cards = await matchCreditCards(twin, subscriptions, supabase)
  return NextResponse.json({ cards })
}
