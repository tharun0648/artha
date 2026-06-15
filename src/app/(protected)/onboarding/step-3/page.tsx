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

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--muted)',
  letterSpacing: '0.02em',
  marginBottom: '6px',
  display: 'block',
}

const sectionHeadStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  marginBottom: '12px',
}

const inputBase: React.CSSProperties = {
  width: '100%',
  height: '36px',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function Step3Page() {
  const router = useRouter()

  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null)
  const [targetAmount, setTargetAmount] = useState(0)
  const [targetYear, setTargetYear] = useState(CURRENT_YEAR + 10)
  const [twinSurplus, setTwinSurplus] = useState(0)
  const [twinSavings, setTwinSavings] = useState(0)
  const [selectedSubs, setSelectedSubs] = useState<SubscriptionRow[]>([])

  const realisticYear = useMemo(
    () => targetAmount > 0 ? calculateRealisticYear(targetAmount, twinSurplus, twinSavings) : null,
    [targetAmount, twinSurplus, twinSavings]
  )

  const [errors, setErrors] = useState<{ goal?: string; amount?: string }>({})
  const [attempted, setAttempted] = useState(false)
  const [loading, setLoading] = useState(false)

  const isFormValid = selectedGoal !== null && targetAmount > 0

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

  function validateGoalForm(goal: GoalType | null, amount: number): { goal?: string; amount?: string } {
    const e: { goal?: string; amount?: string } = {}
    if (!goal) e.goal = 'Please select your primary goal'
    if (!amount || amount <= 0) e.amount = 'Please enter a target amount'
    return e
  }

  function handleGoalSelect(goal: GoalType) {
    setSelectedGoal(goal)
    if (attempted) setErrors(validateGoalForm(goal, targetAmount))
  }

  function handleAmountChange(amount: number) {
    setTargetAmount(amount)
    if (attempted) setErrors(validateGoalForm(selectedGoal, amount))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAttempted(true)
    const errs = validateGoalForm(selectedGoal, targetAmount)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: twinError } = await supabase.from('financial_twin').upsert(
      { user_id: user.id, primary_goal: selectedGoal, goal_target_amount: targetAmount, goal_target_year: targetYear },
      { onConflict: 'user_id' }
    )
    if (twinError) { setErrors({ goal: twinError.message }); setLoading(false); return }

    await supabase.from('subscriptions').delete().eq('user_id', user.id)

    if (selectedSubs.length > 0) {
      const { error: subError } = await supabase.from('subscriptions').insert(
        selectedSubs.map(sub => ({ user_id: user.id, name: sub.name, monthly_amount: sub.monthly_amount, category: sub.category, is_active: true }))
      )
      if (subError) { setErrors({ goal: subError.message }); setLoading(false); return }
    }

    fetch('/api/analyze-twin', { method: 'POST' }).catch(() => {})
    router.push('/dashboard?analyzing=true')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <StepIndicator currentStep={3} />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Goal selection card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>Your Goal</h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: '24px' }}>
              What&apos;s the one financial goal that matters most right now?
            </p>

            {/* Goal grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '4px' }}>
              {GOAL_OPTIONS.slice(0, 4).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleGoalSelect(opt.value)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px',
                    borderRadius: '6px',
                    border: `1px solid ${selectedGoal === opt.value ? 'var(--brand)' : errors.goal ? '#D94F4F' : 'var(--border)'}`,
                    background: selectedGoal === opt.value ? 'var(--brand-surface)' : 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{opt.emoji}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: selectedGoal === opt.value ? 'var(--brand)' : 'var(--ink)' }}>
                    {opt.label}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleGoalSelect(GOAL_OPTIONS[4].value)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px',
                  borderRadius: '6px',
                  border: `1px solid ${selectedGoal === GOAL_OPTIONS[4].value ? 'var(--brand)' : errors.goal ? '#D94F4F' : 'var(--border)'}`,
                  background: selectedGoal === GOAL_OPTIONS[4].value ? 'var(--brand-surface)' : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
              >
                <span style={{ fontSize: '20px' }}>{GOAL_OPTIONS[4].emoji}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: selectedGoal === GOAL_OPTIONS[4].value ? 'var(--brand)' : 'var(--ink)' }}>
                  {GOAL_OPTIONS[4].label}
                </span>
              </button>
            </div>
            {errors.goal && <p style={{ fontSize: '12px', color: '#D94F4F', marginTop: '4px', marginBottom: '8px' }}>{errors.goal}</p>}

            {/* Target amount */}
            <div style={{ marginTop: '20px' }}>
              <p style={labelStyle}>Target amount</p>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '10px' }}>
                {AMOUNT_CHIPS.map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleAmountChange(chip.value)}
                    style={{
                      flexShrink: 0,
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: `1px solid ${targetAmount === chip.value ? 'var(--brand)' : 'var(--border)'}`,
                      background: targetAmount === chip.value ? 'var(--brand-surface)' : 'var(--surface)',
                      color: targetAmount === chip.value ? 'var(--brand)' : 'var(--ink-2)',
                      transition: 'all 0.1s',
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--muted)', userSelect: 'none' }}>₹</span>
                <input
                  type="number"
                  min={1}
                  value={targetAmount === 0 ? '' : targetAmount}
                  onChange={e => handleAmountChange(e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="Custom amount"
                  style={{ ...inputBase, paddingLeft: '26px', borderColor: errors.amount ? '#D94F4F' : 'var(--border)' }}
                />
              </div>
              {errors.amount && <p style={{ fontSize: '12px', color: '#D94F4F', marginTop: '4px' }}>{errors.amount}</p>}
            </div>

            {/* Target year */}
            <div style={{ marginTop: '16px' }}>
              {realisticYear && targetAmount > 0 && (
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                  Realistic by: <strong style={{ color: 'var(--brand)' }}>{realisticYear}</strong> · Adjust if needed
                </p>
              )}
              <label style={labelStyle}>Target year</label>
              <input
                type="number"
                min={CURRENT_YEAR + 1}
                max={CURRENT_YEAR + 30}
                value={targetYear}
                onChange={e => setTargetYear(Number(e.target.value))}
                style={inputBase}
              />
            </div>
          </div>

          {/* Subscriptions card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '32px' }}>
            <p style={sectionHeadStyle}>Subscriptions</p>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: '16px' }}>
              Select what you&apos;re subscribed to — pick the plan you&apos;re on.
            </p>
            <SubscriptionPicker onChange={handleSubsChange} />
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            style={{
              width: '100%',
              height: '36px',
              background: 'var(--brand)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading || !isFormValid ? 'not-allowed' : 'pointer',
              opacity: loading || !isFormValid ? 0.6 : 1,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!(loading || !isFormValid)) e.currentTarget.style.background = 'var(--brand-hover)' }}
            onMouseLeave={e => { if (!(loading || !isFormValid)) e.currentTarget.style.background = 'var(--brand)' }}
          >
            {loading ? 'Building your twin…' : 'Build My Financial Twin →'}
          </button>
        </form>
      </div>
    </div>
  )
}
