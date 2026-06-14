'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

function Spinner() {
  return (
    <span className="animate-spin border-2 border-current border-t-transparent rounded-full w-4 h-4 inline-block" />
  )
}

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [fullLoading, setFullLoading] = useState(false)
  const [fullError, setFullError] = useState('')
  const [tempLoading, setTempLoading] = useState(false)
  const [tempError, setTempError] = useState('')

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?oauth=true`,
      },
    })
  }

  const handleFullDemo = async () => {
    setFullLoading(true)
    setFullError('')
    try {
      const res = await fetch('/api/demo/full', { method: 'POST' })
      if (!res.ok) throw new Error()
      router.push('/demo-preview')
    } catch {
      setFullError('Could not load demo. Try again.')
    } finally {
      setFullLoading(false)
    }
  }

  const handleTempDemo = async () => {
    setTempLoading(true)
    setTempError('')
    try {
      const res = await fetch('/api/demo/temp', { method: 'POST' })
      if (!res.ok) throw new Error()
      router.push('/onboarding/step-1')
    } catch {
      setTempError('Could not start session. Try again.')
    } finally {
      setTempLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}
         className="flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="mb-10 text-center">
          <h1 className="text-4xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            A₹tha
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Financial decisions. Better futures.
          </p>
        </div>

        <div className="rounded-2xl border p-8"
             style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Sign in to access your Financial Digital Twin.
          </p>

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-colors hover:opacity-90"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Demo divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs text-gray-400">or try a demo</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Full demo button */}
          <div className="mb-3">
            <button
              onClick={handleFullDemo}
              disabled={fullLoading || tempLoading}
              className="w-full flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-md transition-colors hover:opacity-90 disabled:opacity-60"
              style={{ background: '#4F6F52', color: '#fff' }}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                {fullLoading && <Spinner />}
                View full demo
              </span>
              <span className="text-xs opacity-70">Pre-filled account · instant dashboard</span>
            </button>
            {fullError && <p className="text-red-500 text-sm mt-1">{fullError}</p>}
          </div>

          {/* Temp session button */}
          <div>
            <button
              onClick={handleTempDemo}
              disabled={fullLoading || tempLoading}
              className="w-full flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-md border transition-colors hover:opacity-90 disabled:opacity-60 bg-transparent"
              style={{ borderColor: '#4F6F52', color: '#4F6F52' }}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                {tempLoading && <Spinner />}
                Try it yourself
              </span>
              <span className="text-xs opacity-70">Temporary session · cleared when you close the browser</span>
            </button>
            {tempError && <p className="text-red-500 text-sm mt-1">{tempError}</p>}
          </div>

          <p className="text-xs text-center mt-6" style={{ color: 'var(--text-muted)' }}>
            Your financial data is private and never shared.
          </p>
        </div>

      </div>
    </div>
  )
}
