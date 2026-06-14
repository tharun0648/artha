'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StepIndicator from '@/components/onboarding/StepIndicator'

const labelStyle = {
  display: 'block',
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
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px', fontSize: '12px' }}>
            — {sublabel}
          </span>
        )}
        {optional && (
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px', fontSize: '12px' }}>
            (optional)
          </span>
        )}
      </label>
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none"
          style={{ color: 'var(--text-muted)' }}
        >
          ₹
        </span>
        <input
          id={id}
          type="number"
          min={0}
          value={value === 0 ? '' : value}
          onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          placeholder="0"
          className="w-full rounded-xl border"
          style={{
            paddingLeft: '28px',
            paddingRight: '12px',
            paddingTop: '10px',
            paddingBottom: '10px',
            borderColor: error ? '#ef4444' : 'var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
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
  income: number,
  rent: number,
  food: number,
  other: number,
  emi: number,
  savings: number
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
    <div>
      <StepIndicator currentStep={2} />
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Money Model
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Your income, spending, and assets — be honest, this is just for you.
        </p>
      </div>

      <div
        className="rounded-2xl border p-6"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
      >
        <form onSubmit={handleNext} className="space-y-8">

          {/* Income */}
          <section>
            <p style={sectionHeadStyle}>Income</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RupeeInput
                id="income"
                label="Monthly take-home salary"
                value={monthlyIncome}
                onChange={makeHandler(setMonthlyIncome, 'income')}
                error={errors.income}
              />
              <RupeeInput
                id="last-income"
                label="Income 12 months ago"
                sublabel="for growth tracking"
                value={lastYearIncome}
                onChange={setLastYearIncome}
              />
            </div>
          </section>

          {/* Outgoings */}
          <section>
            <p style={sectionHeadStyle}>Monthly Outgoings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RupeeInput
                id="rent"
                label="Total rent & housing"
                value={rent}
                onChange={makeHandler(setRent, 'rent')}
                error={errors.rent}
              />
              <RupeeInput
                id="food"
                label="Food, dining & groceries"
                value={food}
                onChange={makeHandler(setFood, 'food')}
                error={errors.food}
              />
              <div>
                <label style={labelStyle} htmlFor="other">
                  Everything else
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, display: 'block', fontSize: '12px' }}>
                    transport, entertainment, other
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none"
                        style={{ color: 'var(--text-muted)' }}>₹</span>
                  <input
                    id="other"
                    type="number"
                    min={0}
                    value={other === 0 ? '' : other}
                    onChange={e => makeHandler(setOther, 'other')(e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-xl border"
                    style={{
                      paddingLeft: '28px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px',
                      borderColor: errors.other ? '#ef4444' : 'var(--border)',
                      background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
                    }}
                  />
                </div>
                {errors.other && <p className="text-red-500 text-sm mt-1">{errors.other}</p>}
              </div>
              <RupeeInput
                id="emi"
                label="Total EMIs"
                value={emi}
                onChange={makeHandler(setEmi, 'emi')}
                error={errors.emi}
              />
            </div>
          </section>

          {/* Live surplus */}
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: surplusPositive ? '#F0F7F1' : '#FDF2F0' }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {surplusPositive ? 'You have' : 'You are short'} each month
            </span>
            <span
              className="text-base font-bold"
              style={{ color: surplusPositive ? 'var(--success)' : 'var(--risk-high)' }}
            >
              {surplusPositive ? '' : '−'}₹{Math.abs(surplus).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Assets */}
          <section>
            <p style={sectionHeadStyle}>What You Have</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RupeeInput
                id="savings"
                label="Savings & FD"
                value={savings}
                onChange={makeHandler(setSavings, 'savings')}
                error={errors.savings}
              />
              <RupeeInput
                id="equity"
                label="Investments"
                sublabel="stocks, mutual funds"
                value={equity}
                onChange={setEquity}
              />
              <div className="sm:col-span-2">
                <RupeeInput
                  id="epf"
                  label="EPF balance"
                  optional
                  value={epf}
                  onChange={setEpf}
                />
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full text-white font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'var(--brand)', height: '52px', borderRadius: '12px' }}
            onMouseOver={e => !(loading || !isFormValid) && ((e.target as HTMLElement).style.background = 'var(--brand-hover)')}
            onMouseOut={e => !(loading || !isFormValid) && ((e.target as HTMLElement).style.background = 'var(--brand)')}
          >
            {loading ? 'Saving…' : 'Save & continue →'}
          </button>
        </form>
      </div>
    </div>
  )
}
