// Client nav bar component: display name, avatar (→ /settings), sign-out icon.
// In demo mode: listens for 'demo-persona-change' events to update the displayed name.
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_PERSONAS } from '@/lib/demo-personas'

function readDemoFirstName(): string | null {
  if (typeof window === 'undefined') return null
  const idx = sessionStorage.getItem('demoPersonaIdx')
  if (idx === null) return null
  const persona = DEMO_PERSONAS[parseInt(idx, 10)]
  return persona?.firstName ?? null
}

export default function UserMenu({ email, isDemo }: { email: string; isDemo?: boolean }) {
  const router = useRouter()
  const [demoFirstName, setDemoFirstName] = useState<string | null>(null)

  useEffect(() => {
    if (!isDemo) return
    setDemoFirstName(readDemoFirstName())

    function onPersonaChange(e: Event) {
      const idx = (e as CustomEvent<number>).detail
      setDemoFirstName(DEMO_PERSONAS[idx]?.firstName ?? null)
    }
    window.addEventListener('demo-persona-change', onPersonaChange)
    return () => window.removeEventListener('demo-persona-change', onPersonaChange)
  }, [isDemo])

  const username = isDemo
    ? `${demoFirstName ?? 'Demo'} (Demo)`
    : email.split('@')[0]

  const initial = isDemo
    ? (demoFirstName?.[0] ?? 'D').toUpperCase()
    : (email[0] ?? 'U').toUpperCase()

  async function handleSignOut() {
    if (isDemo) sessionStorage.removeItem('demoPersonaIdx')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
        {username}
      </span>
      <div
        onClick={() => router.push('/settings')}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && router.push('/settings')}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: 500,
          background: 'var(--surface-2)',
          color: 'var(--ink-2)',
          cursor: 'pointer',
          border: '1px solid var(--border)',
          flexShrink: 0,
        }}
        aria-label="Go to profile settings"
      >
        {initial}
      </div>
      <button
        onClick={handleSignOut}
        aria-label="Sign out"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--r-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          color: 'var(--muted)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--negative)'
          e.currentTarget.style.borderColor = 'var(--negative)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--muted)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }}
      >
        <LogOut size={14} />
      </button>
    </div>
  )
}
