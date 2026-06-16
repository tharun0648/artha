'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AskArthaFAB() {
  const router = useRouter()
  const [show, setShow] = useState(false)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: twin } = await supabase
        .from('financial_twin')
        .select('monthly_income')
        .eq('user_id', user.id)
        .maybeSingle()
      setShow(!!twin && twin.monthly_income > 0)
    }
    check()
  }, [])

  if (!show) return null

  return (
    <button
      type="button"
      title="Ask Artha"
      aria-label="Ask Artha"
      onClick={() => router.push('/decision-lab?panel=chat&q=Why+and+how+can+I+reach+my+goals')}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 50,
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'var(--brand)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--sh-pop)',
        transition: 'background 0.14s, transform 0.14s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--brand-hover)'
        e.currentTarget.style.transform = 'scale(1.07)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--brand)'
        e.currentTarget.style.transform = 'none'
      }}
    >
      <svg
        width="20" height="20" viewBox="0 0 24 24"
        fill="none" stroke="#fff" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}
