// Net worth trajectory visualization: projects current path vs goal target line.
import type { FinancialTwin } from '@/types/twin'
import { fmt } from '@/lib/format'

interface TrajectoryCardProps {
  twin: FinancialTwin
  goalAmount: number
  goalYear: number
}

function projectGrowth(savings: number, surplus: number, years: number): number {
  if (years <= 0) return savings
  const r = 0.12 / 12
  const n = Math.round(years * 12)
  const sip = surplus > 0 ? surplus * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : 0
  return savings * Math.pow(1.12, years) + sip
}

export default function TrajectoryCard({ twin, goalAmount, goalYear }: TrajectoryCardProps) {
  const startYear = new Date().getFullYear()
  const years = Math.max(goalYear - startYear, 1)
  const netWorthStart = (twin.current_savings ?? 0) + (twin.equity_investments ?? 0)
  const surplus = Math.max(twin.monthly_income - (twin.total_monthly_expenses ?? 0), 0)

  const NUM_POINTS = Math.min(years + 1, 12)
  const step = years / (NUM_POINTS - 1)

  const currentPathPts = Array.from({ length: NUM_POINTS }, (_, i) => ({
    year: startYear + i * step,
    value: projectGrowth(netWorthStart, surplus, i * step),
  }))

  const potentialPathPts = Array.from({ length: NUM_POINTS }, (_, i) => ({
    year: startYear + i * step,
    value: netWorthStart + (goalAmount - netWorthStart) * (i / Math.max(NUM_POINTS - 1, 1)),
  }))

  const currentEnd = currentPathPts[currentPathPts.length - 1].value
  const yMax = Math.max(goalAmount, currentEnd) * 1.08

  const VB_W = 400, VB_H = 180
  const PL = 52, PR = 8, PT = 10, PB = 24
  const plotW = VB_W - PL - PR
  const plotH = VB_H - PT - PB

  function toX(year: number) { return PL + ((year - startYear) / years) * plotW }
  function toY(value: number) { return PT + plotH - (value / yMax) * plotH }

  function toPath(pts: { year: number; value: number }[]): string {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.year).toFixed(1)},${toY(p.value).toFixed(1)}`).join(' ')
  }

  const currentD = toPath(currentPathPts)
  const potentialD = toPath(potentialPathPts)
  const goalY = toY(goalAmount)
  const midYear = startYear + Math.round(years / 2)

  const yTicks = [0, 1, 2, 3].map(i => yMax * (i / 3))

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)' }}>
          PATH TO YOUR GOAL
        </span>
        <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)' }}>
          NET WORTH · {fmt(goalAmount)}
        </span>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={{ width: '100%', display: 'block', overflow: 'visible' }}
        aria-hidden="true"
      >
        <style>{`
          @keyframes arthaDraw {
            from { stroke-dashoffset: 2000; }
            to   { stroke-dashoffset: 0; }
          }
          .artha-path-current {
            stroke-dasharray: 2000;
            animation: arthaDraw 1.4s ease-out forwards;
          }
        `}</style>

        {/* Y-axis labels */}
        {yTicks.map((val, i) => (
          <text
            key={i}
            x={PL - 6}
            y={toY(val)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="11"
            fill="var(--muted)"
            fontFamily="var(--font)"
          >
            {fmt(val)}
          </text>
        ))}

        {/* Goal dashed line */}
        <line
          x1={PL} y1={goalY}
          x2={VB_W - PR} y2={goalY}
          stroke="var(--border-strong)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <text
          x={VB_W - PR - 2}
          y={goalY - 5}
          textAnchor="end"
          fontSize="10"
          fill="var(--muted)"
          fontFamily="var(--font)"
        >
          Goal · {fmt(goalAmount)}
        </text>

        {/* Potential path — brand dashed */}
        <path
          d={potentialD}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2"
          strokeDasharray="6 4"
          opacity="0.65"
        />

        {/* Current path — accent solid, draw animation */}
        <path
          d={currentD}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="artha-path-current"
        />

        {/* X-axis labels */}
        {[
          { year: startYear, anchor: 'start' as const },
          { year: midYear,   anchor: 'middle' as const },
          { year: goalYear,  anchor: 'end' as const },
        ].map(({ year, anchor }) => (
          <text
            key={year}
            x={toX(year)}
            y={VB_H - 4}
            textAnchor={anchor}
            fontSize="11"
            fill="var(--muted)"
            fontFamily="var(--font)"
          >
            {year}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '10px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="20" height="4" viewBox="0 0 20 4" aria-hidden="true">
            <line x1="0" y1="2" x2="20" y2="2" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Your current path</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="20" height="4" viewBox="0 0 20 4" aria-hidden="true">
            <line x1="0" y1="2" x2="20" y2="2" stroke="var(--brand)" strokeWidth="2" strokeDasharray="5 3" />
          </svg>
          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>If you fix what&apos;s blocking you</span>
        </div>
      </div>
    </div>
  )
}
