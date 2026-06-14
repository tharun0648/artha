import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const email = process.env.DEMO_USER_EMAIL
  const password = process.env.DEMO_USER_PASSWORD

  if (!email || !password) {
    return NextResponse.json({ error: 'Demo login failed' }, { status: 500 })
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: 'Demo login failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
