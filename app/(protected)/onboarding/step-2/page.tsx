'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
}: {
  id: string
  label: string
  sublabel?: string
  optional?: boolean
  value: number
  onChange: (v: number) => void
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
            borderColor: 'var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>
    </div>
  )
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

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const surplus = monthlyIncome - rent - food - other - emi
  const surplusPositive = surplus >= 0

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (monthlyIncome <= 0) {
      setError('Monthly income must be greater than 0.')
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
        // goal fields — defaults until step 3
        primary_goal: 'wealth',
        goal_target_amount: 0,
        goal_target_year: new Date().getFullYear() + 10,
      },
      { onConflict: 'user_id' }
    )

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div>
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
            <div className="space-y-4">
              <RupeeInput
                id="income"
                label="Monthly take-home salary"
                value={monthlyIncome}
                onChange={setMonthlyIncome}
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
            <div className="space-y-4">
              <RupeeInput
                id="rent"
                label="Total rent & housing"
                value={rent}
                onChange={setRent}
              />
              <RupeeInput
                id="food"
                label="Food, dining & groceries"
                value={food}
                onChange={setFood}
              />
              <RupeeInput
                id="other"
                label="Everything else"
                sublabel="transport, entertainment, subscriptions, other"
                value={other}
                onChange={setOther}
              />
              <RupeeInput
                id="emi"
                label="Total EMIs"
                value={emi}
                onChange={setEmi}
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
            <div className="space-y-4">
              <RupeeInput
                id="savings"
                label="Savings & FD"
                value={savings}
                onChange={setSavings}
              />
              <RupeeInput
                id="equity"
                label="Investments"
                sublabel="stocks, mutual funds"
                value={equity}
                onChange={setEquity}
              />
              <RupeeInput
                id="epf"
                label="EPF balance"
                optional
                value={epf}
                onChange={setEpf}
              />
            </div>
          </section>

          {error && (
            <p
              className="text-sm rounded-xl px-3 py-2"
              style={{ color: 'var(--risk-high)', background: '#FDF2F0' }}
            >
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
            {loading ? 'Saving…' : 'Save & continue →'}
          </button>
        </form>
      </div>
    </div>
  )
}
