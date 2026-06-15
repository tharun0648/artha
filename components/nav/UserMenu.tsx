'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function UserMenu({ email }: { email: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const initial = (email[0] ?? 'U').toUpperCase()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
        style={{ background: 'var(--brand)' }}
        aria-label="User menu"
      >
        {initial}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-40 z-50"
          style={{
            top: '100%',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
        >
          <button
            onClick={() => { setOpen(false); router.push('/settings') }}
            className="w-full text-left px-4 py-2.5"
            style={{
              fontSize: '14px',
              color: 'var(--ink)',
              background: 'none',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            My profile
          </button>
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2.5 flex items-center gap-2"
            style={{
              fontSize: '14px',
              color: 'var(--risk-high)',
              background: 'none',
              border: 'none',
              borderRadius: '0 0 8px 8px',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
