// Renders the result of a life-scenario simulation: net worth paths, goal impact, risks.
'use client'

import type { SimulationResult } from '@/types/analysis'
import { fmt } from '@/lib/format'

interface Props {
  result: SimulationResult
  scenario?: string
}

function verdictBadgeStyle(v: string): { bg: string; color: string } {
  const lower = v.toLowerCase()
  if (lower.includes('not recommended') || lower.includes('avoid')) {
    return { bg: 'var(--accent-surface)', color: 'var(--accent)' }
  }
  if (lower.includes('caution') || lower.includes('carefully') || lower.includes('risky')) {
    return { bg: 'var(--caution-bg)', color: 'var(--caution-text)' }
  }
  return { bg: 'var(--brand-surface)', color: 'var(--brand-text)' }
}

export default function SimulationCard({ result }: Props) {
  const badge = verdictBadgeStyle(result.verdict)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* TOP — THE CALL */}
      <div>
        <span style={{
          display: 'inline-block',
          background: badge.bg,
          color: badge.color,
          fontSize: 13,
          fontWeight: 500,
          padding: '4px 14px',
          borderRadius: 999,
          marginBottom: 12,
        }}>
          {result.verdict}
        </span>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 17,
          fontWeight: 300,
          color: 'var(--ink)',
          lineHeight: 1.5,
          margin: 0,
        }}>
          {result.goal_impact}
        </p>
      </div>

      {/* MIDDLE — TWO PATHS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* If you stay put */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 8px' }}>If you stay put</p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 400,
            color: 'var(--ink)',
            margin: '0 0 4px',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmt(result.current_path.net_worth_10yr)}
          </p>
          <p style={{ fontSize: 10, color: 'var(--muted)', margin: '0 0 12px' }}>in 10 years</p>
          <div style={{ height: 1, background: 'var(--border)', margin: '0 0 12px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Goal by</span>
            <span style={{
              fontSize: 12,
              fontWeight: 500,
              color: result.current_path.goal_achieved_year ? 'var(--ink)' : 'var(--accent)',
            }}>
              {result.current_path.goal_achieved_year ?? 'Not on track'}
            </span>
          </div>
        </div>

        {/* If you go ahead */}
        <div className="card" style={{ padding: '16px 18px', background: 'var(--brand-surface)', borderColor: 'var(--brand)' }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 8px' }}>If you go ahead</p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 400,
            color: 'var(--positive)',
            margin: '0 0 4px',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmt(result.scenario_path.net_worth_10yr)}
          </p>
          <p style={{ fontSize: 10, color: 'var(--muted)', margin: '0 0 12px' }}>in 10 years</p>
          <div style={{ height: 1, background: 'var(--border)', margin: '0 0 12px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Goal by</span>
            <span style={{
              fontSize: 12,
              fontWeight: 500,
              color: result.scenario_path.goal_achieved_year ? 'var(--positive)' : 'var(--accent)',
            }}>
              {result.scenario_path.goal_achieved_year ?? 'Not on track'}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM — TRADE-OFFS */}
      {(result.key_risks.length > 0 || result.key_opportunities.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {result.key_risks.length > 0 && (
            <div>
              <p style={{ fontSize: 10, color: 'var(--muted)', margin: '0 0 8px' }}>Watch out for</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.key_risks.slice(0, 2).map((r, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>· {r}</li>
                ))}
              </ul>
            </div>
          )}
          {result.key_opportunities.length > 0 && (
            <div>
              <p style={{ fontSize: 10, color: 'var(--muted)', margin: '0 0 8px' }}>Going for you</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.key_opportunities.slice(0, 2).map((o, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>· {o}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Assumptions — always visible */}
      {result.assumption_note && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
            Assumes: {result.assumption_note}
          </p>
        </div>
      )}
    </div>
  )
}
