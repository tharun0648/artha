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
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()

        const destination = profile ? '/dashboard' : '/onboarding/step-1'

        return NextResponse.redirect(`${origin}${destination}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
