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
  warning: { borderColor: '#D94F4F', label: 'Warning', labelColor: '#D94F4F' },
  caution: { borderColor: 'var(--accent)', label: 'Caution', labelColor: 'var(--accent)' },
  neutral: { borderColor: 'var(--border)', label: 'Looks fine', labelColor: 'var(--brand)' },
}

const OPTION_LABELS: Record<string, string> = {
  'Buy now': 'Buy it',
  'Wait 48 hours': 'Sleep on it',
  'Skip it': 'Skip for now',
}

export default function SpendCheckCard({ result }: Props) {
  const tone = TONE_STYLES[result.verdict_tone]

  return (
    <div
      style={{ background: 'var(--surface)', border: `1px solid ${tone.borderColor}`, borderRadius: '8px', padding: '20px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
          Should you buy this?
        </p>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: tone.labelColor,
          background: 'var(--surface-2)',
          borderRadius: '4px',
          padding: '2px 8px',
        }}>
          {tone.label}
        </span>
      </div>

      {/* Key insight */}
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4, marginBottom: '12px' }}>
        {result.one_insight}
      </p>

      {/* Summary + goal impact */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: '4px' }}>{result.purchase_summary}</p>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6 }}>{result.goal_impact_statement}</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>10-year opportunity cost</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{fmt(result.opportunity_cost_10yr)}</p>
        </div>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>EMI health</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: result.emi_ceiling_breach ? '#D94F4F' : 'var(--brand)' }}>
            {result.emi_ceiling_breach ? '⚠ Risky' : 'Within limit'}
          </p>
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {result.options.map(opt => (
          <span
            key={opt}
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--ink-2)',
              background: 'var(--surface-2)',
              borderRadius: '4px',
              padding: '2px 8px',
            }}
          >
            {OPTION_LABELS[opt] ?? opt}
          </span>
        ))}
      </div>
    </div>
  )
}
