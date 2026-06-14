'use client'

import type { SimulationResult } from '@/types/analysis'

interface Props {
  result: SimulationResult
}

function fmt(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${n}`
}

function verdictColor(v: string): string {
  const lower = v.toLowerCase()
  if (lower.includes('go for') || lower.includes('recommended')) return 'var(--success)'
  if (lower.includes('not recommended') || lower.includes('avoid')) return 'var(--risk-high)'
  return 'var(--warning)'
}

export default function SimulationCard({ result }: Props) {
  const color = verdictColor(result.verdict)

  return (
    <div className="space-y-3">
      {/* Verdict */}
      <div
        className="rounded-2xl border p-5"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Verdict
        </p>
        <p className="text-base font-semibold mb-1" style={{ color }}>
          {result.verdict}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {result.goal_impact}
        </p>
      </div>

      {/* Path comparison */}
      <div
        className="rounded-2xl border p-5"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Projection comparison
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3 space-y-2"
            style={{ background: 'var(--bg-surface-secondary)' }}
          >
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Current path</p>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>5-yr net worth</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {fmt(result.current_path.net_worth_5yr)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>10-yr net worth</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {fmt(result.current_path.net_worth_10yr)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Goal reached</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {result.current_path.goal_achieved_year ?? '—'}
              </p>
            </div>
          </div>

          <div
            className="rounded-xl p-3 space-y-2"
            style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)' }}
          >
            <p className="text-xs font-medium" style={{ color: 'var(--brand)' }}>After scenario</p>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>5-yr net worth</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {fmt(result.scenario_path.net_worth_5yr)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>10-yr net worth</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {fmt(result.scenario_path.net_worth_10yr)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Goal reached</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {result.scenario_path.goal_achieved_year ?? '—'}
              </p>
            </div>
          </div>
        </div>

        {result.scenario_path.break_even_year && (
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Break-even: {result.scenario_path.break_even_year} · Monthly surplus after: {fmt(result.scenario_path.monthly_surplus_after)}
          </p>
        )}

        {result.assumption_note && (
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Assumptions: {result.assumption_note}
          </p>
        )}
      </div>

      {/* Risks & opportunities */}
      {(result.key_risks.length > 0 || result.key_opportunities.length > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {result.key_risks.length > 0 && (
            <div
              className="rounded-2xl border p-4"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--risk-high)' }}>
                Risks
              </p>
              <ul className="space-y-1.5">
                {result.key_risks.map((r, i) => (
                  <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--risk-high)' }}>·</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.key_opportunities.length > 0 && (
            <div
              className="rounded-2xl border p-4"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--success)' }}>
                Opportunities
              </p>
              <ul className="space-y-1.5">
                {result.key_opportunities.map((o, i) => (
                  <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--success)' }}>·</span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
