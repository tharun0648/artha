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
          className="absolute right-0 mt-2 w-40 rounded-md border border-gray-200 bg-white shadow-md z-50"
          style={{ top: '100%' }}
        >
          <button
            onClick={() => { setOpen(false); router.push('/settings') }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 rounded-t-md"
            style={{ color: '#1A1A1A' }}
          >
            My profile
          </button>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 rounded-b-md flex items-center gap-2 text-red-500"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
