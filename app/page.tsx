import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: twin } = await supabase
    .from('financial_twin')
    .select('id, primary_goal')
    .eq('user_id', user.id)
    .single()

  if (!twin?.primary_goal) redirect('/onboarding/step-1')

  redirect('/dashboard')
}
