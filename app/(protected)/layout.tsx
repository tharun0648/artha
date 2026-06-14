import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user || error) {
    redirect('/login')
  }

  const userInitial = (
    user.user_metadata?.full_name?.[0] ||
    user.email?.[0] ||
    'U'
  ).toUpperCase()

  return (
    <>
      <nav
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
        className="sticky top-0 z-10 h-14"
      >
        <div className="mx-auto max-w-4xl px-4 h-full flex items-center justify-between">
          <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            A₹tha
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Settings
            </Link>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
              style={{ background: 'var(--brand)' }}
            >
              {userInitial}
            </div>
          </div>
        </div>
      </nav>
      <main className="px-4 py-6 md:py-10 mx-auto w-full max-w-4xl">
        {children}
      </main>
    </>
  )
}
