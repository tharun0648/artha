// Server wrapper for the demo preview: auth guard redirects non-demo users to /dashboard.
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DemoPreviewClient from './DemoPreviewClient'

export default async function DemoPreviewPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (user?.id !== process.env.DEMO_USER_ID) {
    redirect('/dashboard')
  }

  return (
    <div>
      {/* Demo banner */}
      <div style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '14px', color: '#92400E' }}>
          You&apos;re viewing a demo account. Sign in with Google to use A₹tha with your own data.
        </p>
        <Link href="/login" style={{ fontSize: '14px', fontWeight: 500, color: '#92400E', textDecoration: 'underline', whiteSpace: 'nowrap', marginLeft: '16px' }}>
          Sign in →
        </Link>
      </div>

      <DemoPreviewClient />
    </div>
  )
}
