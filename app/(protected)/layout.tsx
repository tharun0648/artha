import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import UserMenu from '@/components/nav/UserMenu'

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

  const email = user.email ?? 'U'

  return (
    <>
      <nav
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
        className="sticky top-0 z-10 h-14"
      >
        <div className="mx-auto max-w-4xl px-4 h-full flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            A₹tha
          </Link>
          <UserMenu email={email} />
        </div>
      </nav>
      <main className="px-4 py-6 md:py-10 mx-auto w-full max-w-4xl">
        {children}
      </main>
    </>
  )
}
