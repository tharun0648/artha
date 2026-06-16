import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()

  if (!profile) redirect('/onboarding/step-1')

  const { data: twin } = await supabase
    .from('financial_twin')
    .select('monthly_income')
    .eq('user_id', user.id)
    .single()

  if (!twin || twin.monthly_income === 0) redirect('/onboarding/step-2')

  redirect('/dashboard')
}
