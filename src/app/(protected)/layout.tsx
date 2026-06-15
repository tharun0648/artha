import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import UserMenu from '@/components/nav/UserMenu'
import Logo from '@/components/logo'

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
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        className="sticky top-0 z-10 h-14"
      >
        <div className="mx-auto max-w-270 px-6 h-full flex items-center justify-between">
          <Logo size={24} href="/dashboard" />
          <UserMenu email={email} />
        </div>
      </nav>
      <main className="px-6 py-8 mx-auto w-full max-w-270">
        {children}
      </main>
    </>
  )
}
