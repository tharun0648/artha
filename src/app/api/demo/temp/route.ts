import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.auth.signInAnonymously()

  if (error) {
    return NextResponse.json({ error: 'Temp session failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
