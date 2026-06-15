import type { CausalFactor } from '@/types/analysis'

interface CausalBarsProps {
  factors: CausalFactor[]
}

export default function CausalBars({ factors }: CausalBarsProps) {
  const sorted = [...factors].sort((a, b) => b.contribution_pct - a.contribution_pct)

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sorted.map(f => (
          <div key={f.rank}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', color: 'var(--ink)' }}>{f.factor}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{f.contribution_pct}%</span>
            </div>
            <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '3px', width: `${f.contribution_pct}%`, background: 'var(--accent)', borderRadius: '2px' }} />
            </div>
            <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--ink-2)', marginBottom: '4px' }}>{f.specific_finding}</p>
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brand)' }}>→ {f.one_action}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
