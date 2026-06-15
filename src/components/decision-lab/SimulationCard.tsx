'use client'

import type { SimulationResult } from '@/types/analysis'

interface Props {
  result: SimulationResult
  scenario?: string
}

function fmt(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${n}`
}

function verdictColor(v: string): string {
  const lower = v.toLowerCase()
  if (lower.includes('go for') || lower.includes('recommended')) return 'var(--brand)'
  if (lower.includes('not recommended') || lower.includes('avoid')) return '#D94F4F'
  return 'var(--accent)'
}

const SCENARIO_LABELS: Record<string, string> = {
  mba: 'do an MBA',
  home: 'buy a home',
  'job-switch': 'switch jobs',
}

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }
const nested: React.CSSProperties = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }

export default function SimulationCard({ result, scenario }: Props) {
  const color = verdictColor(result.verdict)
  const scenarioLabel = scenario ? (SCENARIO_LABELS[scenario] ?? 'make this move') : 'make this move'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
        Here&apos;s what happens to your finances if you {scenarioLabel}.
      </p>

      {/* Verdict */}
      <div style={card}>
        <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '8px' }}>
          What this means for you
        </p>
        <p style={{ fontSize: '15px', fontWeight: 600, color, marginBottom: '6px' }}>{result.verdict}</p>
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--ink-2)' }}>{result.goal_impact}</p>
      </div>

      {/* Path comparison */}
      <div style={card}>
        <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px' }}>
          Projection comparison
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={nested}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', marginBottom: '8px' }}>If you don&apos;t do this</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>In 5 years</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{fmt(result.current_path.net_worth_5yr)}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>In 10 years</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{fmt(result.current_path.net_worth_10yr)}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Goal by</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{result.current_path.goal_achieved_year ?? '—'}</p>
              </div>
            </div>
          </div>

          <div style={{ ...nested, border: '1px solid var(--brand)', background: 'var(--brand-surface)' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brand)', marginBottom: '8px' }}>If you go ahead</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>In 5 years</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{fmt(result.scenario_path.net_worth_5yr)}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>In 10 years</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{fmt(result.scenario_path.net_worth_10yr)}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Goal by</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{result.scenario_path.goal_achieved_year ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {result.scenario_path.break_even_year && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '12px' }}>
            Break-even: {result.scenario_path.break_even_year} · Monthly surplus after: {fmt(result.scenario_path.monthly_surplus_after)}
          </p>
        )}
        {result.assumption_note && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.5 }}>
            Assumptions: {result.assumption_note}
          </p>
        )}
      </div>

      {/* Risks & opportunities */}
      {(result.key_risks.length > 0 || result.key_opportunities.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {result.key_risks.length > 0 && (
            <div style={card}>
              <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#D94F4F', marginBottom: '8px' }}>
                Watch out for
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none', margin: 0, padding: 0 }}>
                {result.key_risks.map((r, i) => (
                  <li key={i} style={{ fontSize: '14px', color: 'var(--ink-2)' }}>⚠ {r}</li>
                ))}
              </ul>
            </div>
          )}
          {result.key_opportunities.length > 0 && (
            <div style={card}>
              <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brand)', marginBottom: '8px' }}>
                Upside if you do this
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none', margin: 0, padding: 0 }}>
                {result.key_opportunities.map((o, i) => (
                  <li key={i} style={{ fontSize: '14px', color: 'var(--ink-2)' }}>✓ {o}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
