'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StepIndicator from '@/components/onboarding/StepIndicator'

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--muted)',
  letterSpacing: '0.02em',
  marginBottom: '6px',
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

function RupeeInput({
  id,
  label,
  sublabel,
  optional,
  value,
  onChange,
  error,
}: {
  id: string
  label: string
  sublabel?: string
  optional?: boolean
  value: number
  onChange: (v: number) => void
  error?: string
}) {
  return (
    <div>
      <label style={labelStyle} htmlFor={id}>
        {label}
        {sublabel && (
          <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '4px' }}>
            — {sublabel}
          </span>
        )}
        {optional && (
          <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '4px' }}>
            (optional)
          </span>
        )}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--muted)', userSelect: 'none' }}>₹</span>
        <input
          id={id}
          type="number"
          min={0}
          value={value === 0 ? '' : value}
          onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          placeholder="0"
          style={{ ...inputBase, paddingLeft: '26px', borderColor: error ? '#D94F4F' : 'var(--border)' }}
        />
      </div>
      {error && <p style={{ fontSize: '12px', color: '#D94F4F', marginTop: '4px' }}>{error}</p>}
    </div>
  )
}

type FieldErrors = {
  income?: string
  rent?: string
  food?: string
  other?: string
  emi?: string
  savings?: string
}

function validateFields(
  income: number, rent: number, food: number, other: number, emi: number, savings: number
): FieldErrors {
  const e: FieldErrors = {}
  if (income <= 0) e.income = 'Monthly take-home must be greater than 0'
  if (rent < 0 || isNaN(rent)) e.rent = 'Rent must be 0 or more'
  if (food < 0 || isNaN(food)) e.food = 'Food must be 0 or more'
  if (other < 0 || isNaN(other)) e.other = 'This field must be 0 or more'
  if (emi < 0 || isNaN(emi)) e.emi = 'EMI must be 0 or more'
  if (savings < 0 || isNaN(savings)) e.savings = 'Savings must be 0 or more'
  return e
}

export default function Step2Page() {
  const router = useRouter()

  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [lastYearIncome, setLastYearIncome] = useState(0)
  const [rent, setRent] = useState(0)
  const [food, setFood] = useState(0)
  const [other, setOther] = useState(0)
  const [emi, setEmi] = useState(0)
  const [savings, setSavings] = useState(0)
  const [equity, setEquity] = useState(0)
  const [epf, setEpf] = useState(0)

  const [errors, setErrors] = useState<FieldErrors>({})
  const [attempted, setAttempted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<null | 'graduate' | 'midcareer' | 'senior'>(null)

  const PERSONAS = {
    graduate: {
      label: 'Fresh Graduate 🎓',
      description: 'Early career, building first financial habits.',
      values: { income: 45000, lastYear: 35000, rent: 12000, food: 6000, other: 8500, emi: 0, savings: 50000, equity: 0, epf: 0 },
    },
    midcareer: {
      label: 'Mid-career 💼',
      description: 'Stable income, some EMIs, building wealth.',
      values: { income: 85000, lastYear: 70000, rent: 22000, food: 8000, other: 11000, emi: 15000, savings: 300000, equity: 150000, epf: 80000 },
    },
    senior: {
      label: 'Senior 🏠',
      description: 'High income, significant EMIs, large asset base.',
      values: { income: 150000, lastYear: 130000, rent: 35000, food: 12000, other: 19000, emi: 45000, savings: 800000, equity: 500000, epf: 300000 },
    },
  } as const

  function applyPersona(key: 'graduate' | 'midcareer' | 'senior') {
    const v = PERSONAS[key].values
    setMonthlyIncome(v.income)
    setLastYearIncome(v.lastYear)
    setRent(v.rent)
    setFood(v.food)
    setOther(v.other)
    setEmi(v.emi)
    setSavings(v.savings)
    setEquity(v.equity)
    setEpf(v.epf)
    setSelectedPersona(key)
    if (attempted) setErrors(validateFields(v.income, v.rent, v.food, v.other, v.emi, v.savings))
  }

  const surplus = monthlyIncome - rent - food - other - emi
  const surplusPositive = surplus >= 0
  const isFormValid = monthlyIncome > 0

  const revalidate = useCallback(
    (inc: number, r: number, f: number, o: number, e: number, s: number) => {
      if (attempted) setErrors(validateFields(inc, r, f, o, e, s))
    },
    [attempted]
  )

  function makeHandler<T extends number>(setter: (v: T) => void, field: 'income' | 'rent' | 'food' | 'other' | 'emi' | 'savings') {
    return (v: number) => {
      setter(v as T)
      const next = {
        income: field === 'income' ? v : monthlyIncome,
        rent: field === 'rent' ? v : rent,
        food: field === 'food' ? v : food,
        other: field === 'other' ? v : other,
        emi: field === 'emi' ? v : emi,
        savings: field === 'savings' ? v : savings,
      }
      revalidate(next.income, next.rent, next.food, next.other, next.emi, next.savings)
    }
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    setAttempted(true)
    const errs = validateFields(monthlyIncome, rent, food, other, emi, savings)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error: dbError } = await supabase.from('financial_twin').upsert(
      {
        user_id: user.id,
        monthly_income: monthlyIncome,
        last_year_income: lastYearIncome,
        monthly_rent: rent,
        monthly_food: food,
        monthly_transport: 0,
        monthly_entertainment: 0,
        monthly_other: other,
        total_monthly_emi: emi,
        current_savings: savings,
        equity_investments: equity,
        epf_balance: epf,
      },
      { onConflict: 'user_id' }
    )

    if (dbError) {
      setErrors({ income: dbError.message })
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <StepIndicator currentStep={2} />

        {/* Persona quick-fill */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', letterSpacing: '0.02em', marginBottom: '10px' }}>
            Quick start — pick a profile similar to yours
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(Object.keys(PERSONAS) as Array<keyof typeof PERSONAS>).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => applyPersona(key)}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: `1px solid ${selectedPersona === key ? 'var(--brand)' : 'var(--border)'}`,
                  background: selectedPersona === key ? 'var(--brand-surface)' : 'var(--surface)',
                  color: selectedPersona === key ? 'var(--brand)' : 'var(--ink-2)',
                  transition: 'all 0.1s',
                  textAlign: 'left',
                }}
              >
                {PERSONAS[key].label}
              </button>
            ))}
          </div>
          {selectedPersona && (
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
              {PERSONAS[selectedPersona].description}
            </p>
          )}
        </div>

        {/* Form card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>Money Model</h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: '24px' }}>
            Your income, spending, and assets — be honest, this is just for you.
          </p>

          <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Income */}
            <section>
              <p style={sectionHeadStyle}>Income</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <RupeeInput id="income" label="Monthly take-home" value={monthlyIncome} onChange={makeHandler(setMonthlyIncome, 'income')} error={errors.income} />
                <RupeeInput id="last-income" label="Income 12 months ago" sublabel="growth tracking" value={lastYearIncome} onChange={setLastYearIncome} />
              </div>
            </section>

            {/* Outgoings */}
            <section>
              <p style={sectionHeadStyle}>Monthly Outgoings</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <RupeeInput id="rent" label="Rent & housing" value={rent} onChange={makeHandler(setRent, 'rent')} error={errors.rent} />
                <RupeeInput id="food" label="Food & groceries" value={food} onChange={makeHandler(setFood, 'food')} error={errors.food} />
                <div>
                  <label style={labelStyle} htmlFor="other">
                    Everything else
                    <span style={{ color: 'var(--muted)', fontWeight: 400, display: 'block', fontSize: '11px' }}>
                      transport, entertainment, other
                    </span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--muted)', userSelect: 'none' }}>₹</span>
                    <input
                      id="other"
                      type="number"
                      min={0}
                      value={other === 0 ? '' : other}
                      onChange={e => makeHandler(setOther, 'other')(e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0"
                      style={{ ...inputBase, paddingLeft: '26px', borderColor: errors.other ? '#D94F4F' : 'var(--border)' }}
                    />
                  </div>
                  {errors.other && <p style={{ fontSize: '12px', color: '#D94F4F', marginTop: '4px' }}>{errors.other}</p>}
                </div>
                <RupeeInput id="emi" label="Total EMIs" value={emi} onChange={makeHandler(setEmi, 'emi')} error={errors.emi} />
              </div>
            </section>

            {/* Live surplus */}
            <div style={{
              borderRadius: '6px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: surplusPositive ? 'var(--brand-surface)' : '#FDF2F0',
              border: `1px solid ${surplusPositive ? 'var(--brand)' : '#D94F4F'}`,
            }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-2)' }}>
                {surplusPositive ? 'You have' : 'You are short'} each month
              </span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: surplusPositive ? 'var(--brand)' : '#D94F4F' }}>
                {surplusPositive ? '' : '−'}₹{Math.abs(surplus).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Assets */}
            <section>
              <p style={sectionHeadStyle}>What You Have</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <RupeeInput id="savings" label="Savings & FD" value={savings} onChange={makeHandler(setSavings, 'savings')} error={errors.savings} />
                <RupeeInput id="equity" label="Investments" sublabel="stocks, MF" value={equity} onChange={setEquity} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <RupeeInput id="epf" label="EPF balance" optional value={epf} onChange={setEpf} />
                </div>
              </div>
            </section>

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
              {loading ? 'Saving…' : 'Save & continue →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
