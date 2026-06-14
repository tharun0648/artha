import type { VerdictOutput } from '@/types/analysis'

interface VerdictCardProps {
  verdict: VerdictOutput
}

function probabilityColor(p: number): string {
  if (p >= 70) return 'var(--success)'
  if (p >= 45) return 'var(--warning)'
  return 'var(--risk-high)'
}

export default function VerdictCard({ verdict }: VerdictCardProps) {
  const color = probabilityColor(verdict.goal_probability)

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Goal probability
          </p>
          <p className="text-4xl font-semibold tabular-nums" style={{ color }}>
            {verdict.goal_probability}%
          </p>
        </div>
        <div
          className="rounded-full px-3 py-1 text-xs font-medium shrink-0"
          style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
        >
          {verdict.confidence}% confidence
        </div>
      </div>
      <p className="text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>
        {verdict.verdict}
      </p>
    </div>
  )
}
