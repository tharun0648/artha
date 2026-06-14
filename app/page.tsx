import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: twin }] = await Promise.all([
    supabase.from('profiles').select('id').eq('id', user.id).single(),
    supabase.from('financial_twin').select('id, monthly_take_home, primary_goal').eq('user_id', user.id).single(),
  ])

  if (!profile) redirect('/onboarding/step-1')

  if (!twin || !twin.monthly_take_home) redirect('/onboarding/step-2')

  if (!twin.primary_goal) redirect('/onboarding/step-3')

  redirect('/dashboard')
}
