// NOTE: not currently used; dashboard renders verdict inline in page.tsx
import type { VerdictOutput } from '@/types/analysis'

interface VerdictCardProps {
  verdict: VerdictOutput
  goalLabel: string
  goalAmount: string
  goalYear: number
  editHref: string
}

function probabilityColor(p: number): string {
  if (p >= 70) return 'var(--brand)'
  if (p >= 40) return 'var(--accent)'
  return 'var(--negative)'
}

export default function VerdictCard({ verdict, goalLabel, goalAmount, goalYear, editHref }: VerdictCardProps) {
  const color = probabilityColor(verdict.goal_probability)
  const sorted = [...verdict.causal_attribution].sort((a, b) => b.contribution_pct - a.contribution_pct)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
            Financial Twin
          </p>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '2px' }}>
            {goalLabel} · {goalAmount} by {goalYear}
          </p>
        </div>
        <a
          href={editHref}
          style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none', flexShrink: 0, marginTop: '2px' }}
        >
          Edit goal
        </a>
      </div>

      {/* Hero probability */}
      <p style={{ fontSize: '40px', fontWeight: 700, color, lineHeight: 1, marginBottom: '8px', fontFamily: 'var(--font-serif)' }}>
        {verdict.goal_probability}%
      </p>
      <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6, color: 'var(--ink-2)', marginBottom: '16px', fontFamily: 'var(--font-serif)' }}>
        {verdict.verdict}
      </p>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', marginBottom: '16px' }} />

      {/* Causal attribution */}
      {sorted.length > 0 && (
        <>
          <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px' }}>
            Blocking your goal
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sorted.map(f => (
              <div key={f.rank}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--ink)' }}>{f.factor}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-text)', fontFamily: 'var(--font-serif)' }}>{f.contribution_pct}%</span>
                </div>
                <div style={{ height: '3px', background: 'var(--brand-surface)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '3px', width: `${f.contribution_pct}%`, background: 'var(--brand)', borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
