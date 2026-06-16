// NOTE: not currently used; dashboard renders blockers inline in page.tsx
'use client'

import { useState } from 'react'
import type { CausalFactor } from '@/types/analysis'

interface CausalBarsProps {
  factors: CausalFactor[]
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        color: 'var(--muted)',
        flexShrink: 0,
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease',
      }}
    >
      <path d="M2 4l4 4 4-4" />
    </svg>
  )
}

export default function CausalBars({ factors }: CausalBarsProps) {
  const sorted = [...factors].sort((a, b) => b.contribution_pct - a.contribution_pct)
  const [expandedRanks, setExpandedRanks] = useState<Set<number>>(new Set())

  function toggle(rank: number) {
    setExpandedRanks(prev => {
      const next = new Set(prev)
      if (next.has(rank)) {
        next.delete(rank)
      } else {
        next.add(rank)
      }
      return next
    })
  }

  if (sorted.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
          No goal shortfall detected — you are on track at current trajectory.
        </p>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
        What&apos;s blocking your goal
      </p>
      <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
        Causal attribution — sorted by contribution
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {sorted.map(f => {
          const expanded = expandedRanks.has(f.rank)
          return (
            <div key={f.rank}>
              <button
                type="button"
                onClick={() => toggle(f.rank)}
                style={{
                  width: '100%',
                  minHeight: '44px',
                  background: 'none',
                  border: 'none',
                  padding: '8px 0',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--ink)' }}>{f.factor}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-text)', fontFamily: 'var(--font-serif)' }}>{f.contribution_pct}%</span>
                    <ChevronIcon expanded={expanded} />
                  </div>
                </div>
                <div style={{ height: '3px', background: 'var(--brand-surface)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '3px', width: `${f.contribution_pct}%`, background: 'var(--brand)', borderRadius: '2px' }} />
                </div>
              </button>

              <div
                style={{
                  overflow: 'hidden',
                  maxHeight: expanded ? '120px' : '0',
                  transition: 'max-height 0.2s ease',
                }}
              >
                <div style={{ paddingBottom: '12px' }}>
                  <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--ink-2)', marginBottom: '4px' }}>{f.specific_finding}</p>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brand)' }}>→ {f.one_action}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
