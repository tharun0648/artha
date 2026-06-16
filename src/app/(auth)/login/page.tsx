'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Logo from '@/components/logo'

function Spinner() {
  return (
    <span className="animate-spin border-2 border-current border-t-transparent rounded-full w-4 h-4 inline-block" />
  )
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function PreviewCard() {
  const r = 44
  const circ = 2 * Math.PI * r
  const pct = 0.76
  const dash = pct * circ
  const bars = [
    { label: 'Dining out', pct: 38 },
    { label: 'Low SIP', pct: 34 },
    { label: 'EMIs', pct: 28 },
  ]

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--sh)',
      padding: '26px',
      width: '100%',
      maxWidth: '340px',
    }}>
      <p className="eyebrow" style={{ marginBottom: '10px' }}>Your verdict</p>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', lineHeight: 1.45, color: 'var(--ink)', marginBottom: '22px' }}>
        You reach 76% of your home goal. Two habits hold back the rest.
      </p>

      <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
        {/* Mini health ring */}
        <div style={{ flexShrink: 0 }}>
          <svg width="104" height="104" viewBox="0 0 104 104">
            <circle cx="52" cy="52" r={r} fill="none" stroke="var(--brand-surface)" strokeWidth="8" />
            <circle
              cx="52" cy="52" r={r}
              fill="none"
              stroke="var(--brand)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              transform="rotate(-90 52 52)"
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
            <text x="52" y="48" textAnchor="middle" fontFamily="var(--font-serif)" fontSize="18" fontWeight="700" fill="var(--ink)">76</text>
            <text x="52" y="62" textAnchor="middle" fontFamily="var(--font)" fontSize="10" fill="var(--muted)">/100</text>
          </svg>
        </div>

        {/* Mini causal bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
          {bars.map(b => (
            <div key={b.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>{b.label}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-text)' }}>{b.pct}%</span>
              </div>
              <div style={{ height: '3px', background: 'var(--brand-surface)', borderRadius: '2px' }}>
                <div style={{ height: '3px', width: `${b.pct}%`, background: 'var(--brand)', borderRadius: '2px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [googleLoading, setGoogleLoading] = useState(false)
  const [fullLoading, setFullLoading] = useState(false)
  const [fullError, setFullError] = useState('')
  const [tempLoading, setTempLoading] = useState(false)
  const [tempError, setTempError] = useState('')

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?oauth=true`,
      },
    })
    setGoogleLoading(false)
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

  const isLoading = googleLoading || fullLoading || tempLoading

  return (
    <div className="login-page-bg">
    <div className="login-card">
    <div className="login-grid">
      {/* ── Left column — story side (hidden on mobile) ── */}
      <div
        className="login-preview-col"
        style={{
          background: 'var(--surface)',
          padding: '56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: '480px' }}>
          <Logo size={30} href={null} />

          <p className="eyebrow" style={{ marginTop: '36px', marginBottom: '12px' }}>
            Personal finance, modelled
          </p>

          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '46px',
            lineHeight: 1.12,
            color: 'var(--ink)',
            margin: '0 0 18px',
          }}>
            Know what&apos;s blocking your future.
          </h1>

          <p style={{ fontSize: '16px', color: 'var(--ink-2)', marginBottom: '32px', lineHeight: 1.6 }}>
            A₹tha models your finances causally so you know exactly what to change to hit your goals faster.
          </p>

          <PreviewCard />
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '12px', letterSpacing: '0.01em' }}>
            A glimpse of your dashboard
          </p>
        </div>
      </div>

      {/* ── Right column — action side (always visible) ── */}
      <div style={{
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '56px 40px',
        minHeight: '480px',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          {/* Google sign-in */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              padding: '13px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: '13px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--ink)',
              fontFamily: 'var(--font)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'border-color 0.14s, background 0.14s',
            }}
            onMouseEnter={e => {
              if (!isLoading) e.currentTarget.style.borderColor = 'var(--brand)'
            }}
            onMouseLeave={e => {
              if (!isLoading) e.currentTarget.style.borderColor = 'var(--border-strong)'
            }}
          >
            {googleLoading ? <Spinner /> : <GoogleIcon />}
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Skip / demo links */}
          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <button
              onClick={handleTempDemo}
              disabled={isLoading}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-text)',
                fontSize: '13.5px',
                fontFamily: 'var(--font)',
                textDecoration: 'underline',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                padding: '4px 0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {tempLoading && <Spinner />}
              Skip & try it without an account
            </button>
            {tempError && (
              <p style={{ fontSize: '12px', color: 'var(--negative)', marginTop: '6px' }}>{tempError}</p>
            )}
            {fullError && (
              <p style={{ fontSize: '12px', color: 'var(--negative)', marginTop: '4px' }}>{fullError}</p>
            )}
          </div>

          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <button
              onClick={handleFullDemo}
              disabled={isLoading}
              style={{
                background: 'none',
                border: '1px solid var(--border-strong)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontFamily: 'var(--font)',
                color: 'var(--ink-2)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'border-color 0.14s, color 0.14s',
              }}
              onMouseEnter={e => {
                if (!isLoading) {
                  e.currentTarget.style.borderColor = 'var(--brand)'
                  e.currentTarget.style.color = 'var(--brand-text)'
                }
              }}
              onMouseLeave={e => {
                if (!isLoading) {
                  e.currentTarget.style.borderColor = 'var(--border-strong)'
                  e.currentTarget.style.color = 'var(--ink-2)'
                }
              }}
            >
              {fullLoading && <Spinner />}
              View full demo →
            </button>
          </div>

          {/* Trust signals */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '36px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--muted)' }}>
              <LockIcon /> Bank-grade privacy
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--muted)' }}>
              <ShieldIcon /> Math-first, no guessing
            </span>
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>
  )
}
