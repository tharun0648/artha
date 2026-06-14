'use client'

import type { SpendCheckResult } from '@/types/analysis'

interface Props {
  result: SpendCheckResult
}

function fmt(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${Math.round(n)}`
}

const TONE_STYLES = {
  warning: { border: 'var(--risk-high)', label: 'Warning', labelColor: 'var(--risk-high)', bg: '#FDF2F0' },
  caution: { border: 'var(--warning)', label: 'Caution', labelColor: 'var(--warning)', bg: '#FDF8EF' },
  neutral: { border: 'var(--border)', label: 'Looks fine', labelColor: 'var(--success)', bg: 'var(--bg-surface)' },
}

export default function SpendCheckCard({ result }: Props) {
  const tone = TONE_STYLES[result.verdict_tone]

  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: tone.bg, borderColor: tone.border, boxShadow: 'var(--shadow-md)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Spend check
        </p>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ color: tone.labelColor, background: 'rgba(255,255,255,0.7)' }}
        >
          {tone.label}
        </span>
      </div>

      {/* Key insight */}
      <p className="text-base font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
        {result.one_insight}
      </p>

      {/* Summary + goal impact */}
      <div className="space-y-1.5">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{result.purchase_summary}</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{result.goal_impact_statement}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>10-yr opportunity cost</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {fmt(result.opportunity_cost_10yr)}
          </p>
        </div>
        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>EMI ceiling</p>
          <p
            className="text-sm font-semibold"
            style={{ color: result.emi_ceiling_breach ? 'var(--risk-high)' : 'var(--success)' }}
          >
            {result.emi_ceiling_breach ? 'Would breach 40%' : 'Within limit'}
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="flex gap-2 flex-wrap">
        {result.options.map(opt => (
          <span
            key={opt}
            className="text-xs px-3 py-1.5 rounded-full border font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.6)' }}
          >
            {opt}
          </span>
        ))}
      </div>
    </div>
  )
}
