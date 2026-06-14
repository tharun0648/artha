import type { CausalFactor } from '@/types/analysis'

interface CausalBarsProps {
  factors: CausalFactor[]
}

function impactColor(impact: CausalFactor['impact']): string {
  if (impact === 'high') return 'var(--risk-high)'
  if (impact === 'medium') return 'var(--warning)'
  return 'var(--risk-low)'
}

export default function CausalBars({ factors }: CausalBarsProps) {
  const sorted = [...factors].sort((a, b) => b.contribution_pct - a.contribution_pct)

  if (sorted.length === 0) {
    return (
      <div
        className="rounded-2xl border p-5"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          No goal shortfall detected — you are on track at current trajectory.
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          What&apos;s blocking your goal
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Causal attribution — sorted by contribution
        </p>
      </div>

      <div className="space-y-4">
        {sorted.map(f => (
          <div key={f.rank}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {f.factor}
              </span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: impactColor(f.impact) }}>
                {f.contribution_pct}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg-surface-secondary)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${f.contribution_pct}%`, background: impactColor(f.impact) }}
              />
            </div>
            <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--text-secondary)' }}>
              {f.specific_finding}
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--brand)' }}>
              → {f.one_action}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
