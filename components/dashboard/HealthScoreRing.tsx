import type { HealthScore } from '@/types/analysis'

interface HealthScoreRingProps {
  score: HealthScore
}

const DIMENSIONS: { key: keyof Omit<HealthScore, 'total'>; label: string }[] = [
  { key: 'emergency_buffer', label: 'Emergency buffer' },
  { key: 'emi_discipline', label: 'EMI discipline' },
  { key: 'insurance_coverage', label: 'Insurance' },
  { key: 'investment_habit', label: 'Investments' },
  { key: 'lifestyle_control', label: 'Lifestyle control' },
]

function scoreColor(total: number): string {
  if (total >= 70) return 'var(--success)'
  if (total >= 45) return 'var(--warning)'
  return 'var(--risk-high)'
}

export default function HealthScoreRing({ score }: HealthScoreRingProps) {
  const total = score.total
  const color = scoreColor(total)
  const circumference = 2 * Math.PI * 42
  const offset = circumference - (total / 100) * circumference

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Financial health score
      </p>

      <div className="flex items-center gap-6">
        <div className="relative shrink-0 w-[100px] h-[100px]">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-surface-secondary)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums" style={{ color }}>
              {total}
            </span>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              / 100
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          {DIMENSIONS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {label}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-secondary)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(score[key] / 20) * 100}%`, background: 'var(--brand)' }}
                  />
                </div>
                <span className="text-xs tabular-nums w-6 text-right" style={{ color: 'var(--text-primary)' }}>
                  {score[key]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
