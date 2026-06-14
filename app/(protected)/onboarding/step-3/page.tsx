'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GoalType } from '@/types/twin'
import SubscriptionPicker, { SubscriptionRow } from '@/components/onboarding/SubscriptionPicker'
import StepIndicator from '@/components/onboarding/StepIndicator'

const GOAL_OPTIONS: { value: GoalType; emoji: string; label: string }[] = [
  { value: 'home', emoji: '🏠', label: 'Home' },
  { value: 'wealth', emoji: '📈', label: 'Wealth' },
  { value: 'safety', emoji: '🛡', label: 'Safety' },
  { value: 'retirement', emoji: '☀', label: 'Retirement' },
  { value: 'education', emoji: '🎓', label: 'Education' },
]

const AMOUNT_CHIPS = [
  { label: '₹25L', value: 2500000 },
  { label: '₹50L', value: 5000000 },
  { label: '₹75L', value: 7500000 },
  { label: '₹1Cr', value: 10000000 },
  { label: '₹2Cr', value: 20000000 },
  { label: '₹5Cr', value: 50000000 },
]

const CURRENT_YEAR = new Date().getFullYear()

function calculateRealisticYear(goalAmount: number, twinSurplus: number, twinSavings: number): number {
  if (twinSurplus <= 0 && twinSavings <= 0) return CURRENT_YEAR + 10
  for (let years = 1; years <= 30; years++) {
    const r = 0.12 / 12
    const n = years * 12
    const sipValue = twinSurplus > 0
      ? twinSurplus * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
      : 0
    const lumpSum = twinSavings * Math.pow(1.12, years)
    if (sipValue + lumpSum >= goalAmount) return CURRENT_YEAR + years
  }
  return CURRENT_YEAR + 30
}

const labelStyle = {
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
} as const

const sectionHeadStyle = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  marginBottom: '12px',
}

export default function Step3Page() {
  const router = useRouter()

  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null)
  const [targetAmount, setTargetAmount] = useState(0)
  const [targetYear, setTargetYear] = useState(CURRENT_YEAR + 10)

  const realisticYear = useMemo(
    () => targetAmount > 0 ? calculateRealisticYear(targetAmount, twinSurplus, twinSavings) : null,
    [targetAmount, twinSurplus, twinSavings]
  )

  const [twinSurplus, setTwinSurplus] = useState(0)
  const [twinSavings, setTwinSavings] = useState(0)

  const [selectedSubs, setSelectedSubs] = useState<SubscriptionRow[]>([])

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchTwin() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('financial_twin')
        .select('monthly_income,total_monthly_expenses,current_savings,equity_investments')
        .eq('user_id', user.id)
        .single()
      if (data) {
        const surplus = data.monthly_income - (data.total_monthly_expenses ?? 0)
        setTwinSurplus(Math.max(surplus, 0))
        setTwinSavings((data.current_savings || 0) + (data.equity_investments || 0))
      }
    }
    fetchTwin()
  }, [])

  useEffect(() => {
    if (realisticYear !== null) {
      setTargetYear(realisticYear)
    }
  }, [realisticYear])

  const handleSubsChange = useCallback((subs: SubscriptionRow[]) => {
    setSelectedSubs(subs)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!selectedGoal) { setError('Please select your primary goal.'); return }
    if (!targetAmount || targetAmount <= 0) { setError('Please enter your target amount.'); return }
    if (targetYear <= CURRENT_YEAR) { setError('Target year must be in the future.'); return }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: twinError } = await supabase.from('financial_twin').upsert(
      { user_id: user.id, primary_goal: selectedGoal, goal_target_amount: targetAmount, goal_target_year: targetYear },
      { onConflict: 'user_id' }
    )
    if (twinError) { setError(twinError.message); setLoading(false); return }

    await supabase.from('subscriptions').delete().eq('user_id', user.id)

    if (selectedSubs.length > 0) {
      const { error: subError } = await supabase.from('subscriptions').insert(
        selectedSubs.map(sub => ({ user_id: user.id, name: sub.name, monthly_amount: sub.monthly_amount, category: sub.category, is_active: true }))
      )
      if (subError) { setError(subError.message); setLoading(false); return }
    }

    fetch('/api/analyze-twin', { method: 'POST' }).catch(() => {})
    router.push('/dashboard?analyzing=true')
  }

  return (
    <div>
      <StepIndicator currentStep={3} />
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Your Goal
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          What&apos;s the one financial goal that matters most right now?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Goal card */}
        <div className="rounded-2xl border p-5"
             style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>

          {/* 2×2 grid + 1 centered */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {GOAL_OPTIONS.slice(0, 4).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedGoal(opt.value)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors"
                style={{
                  borderColor: selectedGoal === opt.value ? 'var(--brand)' : 'var(--border)',
                  background: selectedGoal === opt.value ? 'var(--brand-soft)' : 'var(--bg-surface)',
                }}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-xs font-semibold"
                      style={{ color: selectedGoal === opt.value ? 'var(--brand)' : 'var(--text-primary)' }}>
                  {opt.label}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedGoal(GOAL_OPTIONS[4].value)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors"
              style={{
                borderColor: selectedGoal === GOAL_OPTIONS[4].value ? 'var(--brand)' : 'var(--border)',
                background: selectedGoal === GOAL_OPTIONS[4].value ? 'var(--brand-soft)' : 'var(--bg-surface)',
              }}
            >
              <span className="text-2xl">{GOAL_OPTIONS[4].emoji}</span>
              <span className="text-xs font-semibold"
                    style={{ color: selectedGoal === GOAL_OPTIONS[4].value ? 'var(--brand)' : 'var(--text-primary)' }}>
                {GOAL_OPTIONS[4].label}
              </span>
            </button>
          </div>

          {/* Target amount */}
          <div className="mt-5">
            <p style={{ ...labelStyle, display: 'block' }}>Target amount</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
              {AMOUNT_CHIPS.map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setTargetAmount(chip.value)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                  style={{
                    background: targetAmount === chip.value ? 'var(--brand)' : 'var(--bg-surface-secondary)',
                    color: targetAmount === chip.value ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${targetAmount === chip.value ? 'var(--brand)' : 'var(--border)'}`,
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className="relative mt-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none"
                    style={{ color: 'var(--text-muted)' }}>₹</span>
              <input
                type="number"
                min={1}
                value={targetAmount === 0 ? '' : targetAmount}
                onChange={e => setTargetAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="Custom amount"
                className="w-full rounded-xl border"
                style={{
                  paddingLeft: '28px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px',
                  borderColor: 'var(--border)', background: 'var(--bg-surface)',
                  color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Target year */}
          <div className="mt-4">
            {realisticYear && targetAmount > 0 && (
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                Realistic by: <strong style={{ color: 'var(--brand)' }}>{realisticYear}</strong> · Adjust if needed
              </p>
            )}
            <p style={{ ...labelStyle, display: 'block' }}>Target year</p>
            <input
              type="number"
              min={CURRENT_YEAR + 1}
              max={CURRENT_YEAR + 30}
              value={targetYear}
              onChange={e => setTargetYear(Number(e.target.value))}
              className="w-full rounded-xl border"
              style={{
                padding: '10px 12px', borderColor: 'var(--border)', background: 'var(--bg-surface)',
                color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Subscriptions card */}
        <div className="rounded-2xl border p-5"
             style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>
          <p style={sectionHeadStyle}>Subscriptions</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Select what you&apos;re subscribed to — pick the plan you&apos;re on.
          </p>
          <SubscriptionPicker onChange={handleSubsChange} />
        </div>

        {error && (
          <p className="text-sm rounded-xl px-3 py-2"
             style={{ color: 'var(--risk-high)', background: '#FDF2F0' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full text-white font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: 'var(--brand)', height: '52px', borderRadius: '12px' }}
          onMouseOver={e => !loading && ((e.target as HTMLElement).style.background = 'var(--brand-hover)')}
          onMouseOut={e => !loading && ((e.target as HTMLElement).style.background = 'var(--brand)')}
        >
          {loading ? 'Building your twin…' : 'Build My Financial Twin →'}
        </button>
      </form>
    </div>
  )
}
