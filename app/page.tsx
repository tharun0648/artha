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

  redirect('/dashboard')
}
