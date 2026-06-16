// Spend-check result card with three decision buttons.
// Selecting an option sets local state to show a confirmation message;
// "← Back" clears the result and returns to the default Decision Lab panel.
'use client'

import { useState } from 'react'
import type { SpendCheckResult } from '@/types/analysis'
import { fmt } from '@/lib/format'

interface Props {
  result: SpendCheckResult
  onDismiss: () => void
  onDismissWithMsg: (msg: string) => void
}

const TONE_STYLES = {
  warning: { borderColor: 'var(--negative)', label: 'Warning', labelColor: 'var(--negative)' },
  caution: { borderColor: 'var(--accent)', label: 'Caution', labelColor: 'var(--accent)' },
  neutral: { borderColor: 'var(--border)', label: 'Looks fine', labelColor: 'var(--brand)' },
}

const OPTION_LABELS: Record<string, string> = {
  'Buy now': 'Buy it',
  'Wait 48 hours': 'Sleep on it',
  'Skip it': 'Skip for now',
}

export default function SpendCheckCard({ result, onDismiss: _onDismiss, onDismissWithMsg }: Props) {
  const tone = TONE_STYLES[result.verdict_tone]
  const [decision, setDecision] = useState<string | null>(null)

  function handleOption(opt: string) {
    if (opt === 'Buy now') {
      setDecision('Got it — enjoy the purchase.')
    } else if (opt === 'Wait 48 hours') {
      setDecision('Good call. Give it 48 hours.')
    } else if (opt === 'Skip it') {
      setDecision(`Skipped. ${fmt(result.opportunity_cost_10yr)} saved over 10 years.`)
    }
  }

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
          <p style={{ fontSize: '15px', fontWeight: 600, color: result.emi_ceiling_breach ? 'var(--negative)' : 'var(--brand)' }}>
            {result.emi_ceiling_breach ? '⚠ Risky' : 'Within limit'}
          </p>
        </div>
      </div>

      {/* Buy smart tip */}
      {result.buy_smart && (
        <div style={{
          background: 'var(--brand-surface)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '16px',
        }}>
          <p style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>If you do buy:</p>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>{result.buy_smart}</p>
        </div>
      )}

      {/* Option buttons or confirmation */}
      {decision === null ? (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {result.options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => handleOption(opt)}
              className="btn btn-ghost btn-sm"
            >
              {OPTION_LABELS[opt] ?? opt}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '13px', color: 'var(--positive)', fontStyle: 'italic', marginBottom: '6px' }}>
            {decision}
          </p>
          <button
            type="button"
            onClick={() => onDismissWithMsg('')}
            style={{
              fontSize: '12px',
              color: 'var(--brand-text)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            ← Back to Decision Lab
          </button>
        </div>
      )}
    </div>
  )
}
