import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const [{ data: profile }, { data: twin }] = await Promise.all([
          supabase.from('profiles').select('id').eq('id', user.id).single(),
          supabase.from('financial_twin').select('id, monthly_take_home, primary_goal').eq('user_id', user.id).single(),
        ])

        let destination: string
        if (!profile) destination = '/onboarding/step-1'
        else if (!twin || !twin.monthly_take_home) destination = '/onboarding/step-2'
        else if (!twin.primary_goal) destination = '/onboarding/step-3'
        else destination = '/dashboard'

        return NextResponse.redirect(`${origin}${destination}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
