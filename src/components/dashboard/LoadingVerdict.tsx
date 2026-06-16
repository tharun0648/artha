// Animated loading state shown while /api/analyze-twin is running.
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/logo'

const STATUSES = [
  'Building your financial twin…',
  'Running causal attribution…',
  'Calibrating goal probability…',
  'Modelling your scenarios…',
  'Almost ready…',
]

interface LoadingVerdictProps {
  dots?: string
  onRetry?: () => void
  onBack?: () => void
}

export default function LoadingVerdict({ dots: _dots, onRetry, onBack }: LoadingVerdictProps) {
  const router = useRouter()
  const [statusIndex, setStatusIndex] = useState(0)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setStatusIndex(i => (i + 1) % STATUSES.length)
    }, 1800)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 15000)
    return () => clearTimeout(id)
  }, [])

  if (timedOut) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        background: 'var(--bg)',
        display: 'grid',
        placeItems: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 320, textAlign: 'center' }}>
          <Logo size={28} href={null} />
          <p style={{ fontSize: 14, color: 'var(--ink-2)', fontFamily: 'var(--font)' }}>
            Something went wrong. The analysis didn&apos;t complete in time.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                setTimedOut(false)
                if (onRetry) {
                  onRetry()
                } else {
                  fetch('/api/analyze-twin', { method: 'POST' }).catch(() => {})
                  setTimedOut(false)
                }
              }}
              style={{
                height: '36px',
                padding: '0 16px',
                background: 'none',
                border: '1px solid var(--border-strong)',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ink)',
                cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                if (onBack) {
                  onBack()
                } else {
                  router.push('/onboarding/step-3')
                }
              }}
              style={{
                height: '36px',
                padding: '0 16px',
                background: 'none',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ink-2)',
                cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 40,
      background: 'var(--bg)',
      display: 'grid',
      placeItems: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <Logo size={28} href={null} />

        <div
          className="animate-spin"
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            border: '3px solid var(--brand-surface)',
            borderTopColor: 'var(--brand)',
            animationDuration: '1s',
            animationTimingFunction: 'linear',
          }}
        />

        <p style={{
          fontSize: 14,
          color: 'var(--ink-2)',
          fontFamily: 'var(--font)',
          minWidth: 240,
          textAlign: 'center',
        }}>
          {STATUSES[statusIndex]}
        </p>
      </div>
    </div>
  )
}
