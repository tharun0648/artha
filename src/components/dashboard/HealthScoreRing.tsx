// Health score bar rows for the five financial dimensions (0–20 each, total 100).
import type { HealthScore } from '@/types/analysis'

interface HealthScoreRingProps {
  score: HealthScore
}

const DIMENSIONS: { key: keyof Omit<HealthScore, 'total'>; label: string; max: number }[] = [
  { key: 'emergency_buffer',   label: 'Emergency buffer',  max: 25 },
  { key: 'emi_discipline',     label: 'EMI discipline',    max: 20 },
  { key: 'insurance_coverage', label: 'Insurance',         max: 20 },
  { key: 'investment_habit',   label: 'Investments',       max: 20 },
  { key: 'lifestyle_control',  label: 'Lifestyle control', max: 15 },
]

function scoreColor(total: number): string {
  if (total >= 70) return 'var(--brand)'
  if (total >= 45) return 'var(--accent)'
  return 'var(--negative)'
}

export default function HealthScoreRing({ score }: HealthScoreRingProps) {
  const total = score.total
  const color = scoreColor(total)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '16px' }}>
        Financial Health
      </p>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <p style={{ fontSize: '40px', fontWeight: 700, color, lineHeight: 1, fontFamily: 'var(--font-serif)' }}>{total}</p>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>/ 100</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {DIMENSIONS.map(({ key, label, max }) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>{label}</span>
              <span style={{ fontSize: '13px' }}>
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{score[key]}</span>
                <span style={{ color: 'var(--muted)' }}> / {max}</span>
              </span>
            </div>
            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '4px',
                width: `${(score[key] / 20) * 100}%`,
                background: 'var(--brand)',
                borderRadius: '2px',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
