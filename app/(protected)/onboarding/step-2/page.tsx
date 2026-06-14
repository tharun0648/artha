'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StepIndicator from '@/components/onboarding/StepIndicator'

function RupeeInput({
  id,
  label,
  sublabel,
  value,
  onChange,
}: {
  id: string
  label: string
  sublabel?: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={id}>
        {label}
        {sublabel && <span className="text-xs text-gray-400 font-normal ml-1">— {sublabel}</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium select-none">₹</span>
        <input
          id={id}
          type="number"
          min={0}
          value={value === 0 ? '' : value}
          onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e1847]/30 focus:border-[#1e1847] transition"
          placeholder="0"
        />
      </div>
    </div>
  )
}

export default function Step2Page() {
  const router = useRouter()

  // Income
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [lastYearIncome, setLastYearIncome] = useState(0)

  // Expenses
  const [rent, setRent] = useState(0)
  const [food, setFood] = useState(0)
  const [transport, setTransport] = useState(0)
  const [entertainment, setEntertainment] = useState(0)
  const [other, setOther] = useState(0)
  const [emi, setEmi] = useState(0)

  // Assets
  const [savings, setSavings] = useState(0)
  const [equity, setEquity] = useState(0)
  const [epf, setEpf] = useState(0)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const totalExpenses = rent + food + transport + entertainment + other + emi
  const surplus = monthlyIncome - totalExpenses

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
        monthly_transport: transport,
        monthly_entertainment: entertainment,
        monthly_other: other,
        total_monthly_emi: emi,
        current_savings: savings,
        equity_investments: equity,
        epf_balance: epf,
        // goal fields — defaults (will be set in step 3)
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

    router.push('/onboarding/step-3')
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff] py-10 px-4">
      <div className="max-w-lg mx-auto">
        <StepIndicator currentStep={2} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Money Model</h2>
          <p className="text-sm text-gray-500 mb-6">Your income, spending, and assets — be honest, this is just for you.</p>

          <form onSubmit={handleNext} className="space-y-8">
            {/* Income */}
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Income</h3>
              <div className="space-y-4">
                <RupeeInput id="income" label="Monthly take-home salary" value={monthlyIncome} onChange={setMonthlyIncome} />
                <RupeeInput id="last-income" label="Last year's monthly income" sublabel="What was your monthly income last year?" value={lastYearIncome} onChange={setLastYearIncome} />
              </div>
            </section>

            {/* Expenses */}
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Monthly Expenses</h3>
              <div className="space-y-4">
                <RupeeInput id="rent" label="Rent" value={rent} onChange={setRent} />
                <RupeeInput id="food" label="Food & dining" value={food} onChange={setFood} />
                <RupeeInput id="transport" label="Transport" value={transport} onChange={setTransport} />
                <RupeeInput id="entertainment" label="Entertainment" value={entertainment} onChange={setEntertainment} />
                <RupeeInput id="other" label="Other expenses" value={other} onChange={setOther} />
                <RupeeInput id="emi" label="Total EMIs" sublabel="Total of all current loan EMIs" value={emi} onChange={setEmi} />
              </div>
            </section>

            {/* Live surplus */}
            <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${surplus >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <span className="text-sm font-medium text-gray-700">Monthly surplus</span>
              <span className={`text-base font-bold ${surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {surplus >= 0 ? '+' : ''}₹{surplus.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Assets */}
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Assets</h3>
              <div className="space-y-4">
                <RupeeInput id="savings" label="Current savings & FD" value={savings} onChange={setSavings} />
                <RupeeInput id="equity" label="Equity & mutual fund investments" value={equity} onChange={setEquity} />
                <RupeeInput id="epf" label="EPF balance" value={epf} onChange={setEpf} />
              </div>
            </section>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e1847] text-white font-medium py-2.5 rounded-lg hover:bg-[#2d2568] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Saving…' : 'Next →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
