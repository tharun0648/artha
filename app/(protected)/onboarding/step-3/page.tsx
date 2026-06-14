'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, TrendingUp, Shield, Sunset, GraduationCap, Plus, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import StepIndicator from '@/components/onboarding/StepIndicator'
import { INDIAN_SUBSCRIPTIONS, SubscriptionTemplate } from '@/lib/subscriptions-data'
import { GoalType } from '@/types/twin'

const GOAL_OPTIONS: { value: GoalType; label: string; icon: React.ReactNode; emoji: string }[] = [
  { value: 'home', label: 'Buy a Home', icon: <Home size={22} />, emoji: '🏠' },
  { value: 'wealth', label: 'Build Wealth', icon: <TrendingUp size={22} />, emoji: '📈' },
  { value: 'safety', label: 'Financial Safety', icon: <Shield size={22} />, emoji: '🛡️' },
  { value: 'retirement', label: 'Early Retirement', icon: <Sunset size={22} />, emoji: '☀️' },
  { value: 'education', label: 'Education', icon: <GraduationCap size={22} />, emoji: '🎓' },
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

const CATEGORY_COLORS: Record<string, string> = {
  entertainment: 'bg-purple-100 text-purple-700',
  music: 'bg-pink-100 text-pink-700',
  food: 'bg-orange-100 text-orange-700',
  lifestyle: 'bg-blue-100 text-blue-700',
  fitness: 'bg-green-100 text-green-700',
  productivity: 'bg-yellow-100 text-yellow-700',
  news: 'bg-gray-100 text-gray-700',
  telecom: 'bg-cyan-100 text-cyan-700',
  airtel: 'bg-red-100 text-red-700',
}

type SelectedSub = SubscriptionTemplate & { custom_amount: number }

function sipFV(monthly: number): number {
  const rate = 0.125 / 12
  const n = 120
  return monthly * ((Math.pow(1 + rate, n) - 1) / rate) * (1 + rate)
}

export default function Step3Page() {
  const router = useRouter()

  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null)
  const [targetAmount, setTargetAmount] = useState(0)
  const [targetYear, setTargetYear] = useState(CURRENT_YEAR + 10)

  const [selectedSubs, setSelectedSubs] = useState<SelectedSub[]>([])
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customAmount, setCustomAmount] = useState(0)
  const [customCategory, setCustomCategory] = useState('lifestyle')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function toggleSub(sub: SubscriptionTemplate) {
    const exists = selectedSubs.find(s => s.id === sub.id)
    if (exists) {
      setSelectedSubs(prev => prev.filter(s => s.id !== sub.id))
    } else {
      setSelectedSubs(prev => [...prev, { ...sub, custom_amount: sub.monthly_amount }])
    }
  }

  function updateSubAmount(id: string, amount: number) {
    setSelectedSubs(prev => prev.map(s => s.id === id ? { ...s, custom_amount: amount } : s))
  }

  function addCustomSub() {
    if (!customName.trim() || customAmount <= 0) return
    const customSub: SelectedSub = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      category: customCategory,
      monthly_amount: customAmount,
      custom_amount: customAmount,
    }
    setSelectedSubs(prev => [...prev, customSub])
    setCustomName('')
    setCustomAmount(0)
    setShowCustomForm(false)
  }

  const totalMonthly = selectedSubs.reduce((s, sub) => s + sub.custom_amount, 0)
  const totalAnnual = totalMonthly * 12
  const total10yr = sipFV(totalMonthly)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!selectedGoal) {
      setError('Please select your primary goal.')
      return
    }
    if (!targetAmount || targetAmount <= 0) {
      setError('Please enter your target amount.')
      return
    }
    if (targetYear <= CURRENT_YEAR) {
      setError('Target year must be in the future.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Update twin with goal fields
    const { error: twinError } = await supabase.from('financial_twin').upsert(
      {
        user_id: user.id,
        primary_goal: selectedGoal,
        goal_target_amount: targetAmount,
        goal_target_year: targetYear,
      },
      { onConflict: 'user_id' }
    )

    if (twinError) {
      setError(twinError.message)
      setLoading(false)
      return
    }

    // Replace all subscriptions for user
    await supabase.from('subscriptions').delete().eq('user_id', user.id)

    if (selectedSubs.length > 0) {
      const { error: subError } = await supabase.from('subscriptions').insert(
        selectedSubs.map(sub => ({
          user_id: user.id,
          name: sub.name,
          monthly_amount: sub.custom_amount,
          category: sub.category,
          is_active: true,
        }))
      )
      if (subError) {
        setError(subError.message)
        setLoading(false)
        return
      }
    }

    // Fire-and-forget: kick off analysis
    fetch('/api/analyze-twin', { method: 'POST' }).catch(() => {})

    router.push('/dashboard?analyzing=true')
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <StepIndicator currentStep={3} />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Goal card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Your Goal</h2>
            <p className="text-sm text-gray-500 mb-5">What&apos;s the one financial goal that matters most to you right now?</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {GOAL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedGoal(opt.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                    selectedGoal === opt.value
                      ? 'border-[#1e1847] bg-[#1e1847]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`${selectedGoal === opt.value ? 'text-[#1e1847]' : 'text-gray-500'}`}>
                    {opt.icon}
                  </span>
                  <span className={`text-xs font-semibold text-center ${selectedGoal === opt.value ? 'text-[#1e1847]' : 'text-gray-700'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Target amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Target amount</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {AMOUNT_CHIPS.map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setTargetAmount(chip.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      targetAmount === chip.value
                        ? 'bg-[#1e1847] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium select-none">₹</span>
                <input
                  type="number"
                  min={1}
                  value={targetAmount === 0 ? '' : targetAmount}
                  onChange={e => setTargetAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e1847]/30 focus:border-[#1e1847] transition"
                  placeholder="Custom amount"
                />
              </div>
            </div>

            {/* Target year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="target-year">
                Target year
              </label>
              <input
                id="target-year"
                type="number"
                min={CURRENT_YEAR + 1}
                max={CURRENT_YEAR + 30}
                value={targetYear}
                onChange={e => setTargetYear(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e1847]/30 focus:border-[#1e1847] transition"
              />
            </div>
          </div>

          {/* Subscriptions card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Your Subscriptions</h2>
            <p className="text-sm text-gray-500 mb-5">Select all active subscriptions — tap to select, tap again to deselect.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {INDIAN_SUBSCRIPTIONS.map(sub => {
                const selected = selectedSubs.find(s => s.id === sub.id)
                return (
                  <div
                    key={sub.id}
                    className={`relative rounded-xl border-2 p-3 cursor-pointer transition ${
                      selected
                        ? 'border-[#1e1847] bg-[#1e1847]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleSub(sub)}
                  >
                    {selected && (
                      <span className="absolute top-2 right-2 bg-[#1e1847] rounded-full p-0.5">
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </span>
                    )}
                    <p className={`text-sm font-semibold mb-1 pr-5 ${selected ? 'text-[#1e1847]' : 'text-gray-800'}`}>
                      {sub.name}
                    </p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${CATEGORY_COLORS[sub.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {sub.category}
                    </span>
                    {selected ? (
                      <div
                        className="relative mt-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs select-none">₹</span>
                        <input
                          type="number"
                          min={0}
                          value={selected.custom_amount === 0 ? '' : selected.custom_amount}
                          onChange={e => updateSubAmount(sub.id, e.target.value === '' ? 0 : Number(e.target.value))}
                          className="w-full pl-5 pr-2 py-1 rounded-lg border border-[#1e1847]/30 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#1e1847]/30 bg-white"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">₹{sub.monthly_amount}/mo</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Custom subscription */}
            {showCustomForm ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 mb-4">
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Subscription name"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1e1847]/30 focus:border-[#1e1847]"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm select-none">₹</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Amount"
                      value={customAmount === 0 ? '' : customAmount}
                      onChange={e => setCustomAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full pl-6 pr-2 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1e1847]/30 focus:border-[#1e1847]"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e1847]/30"
                  >
                    <option value="entertainment">Entertainment</option>
                    <option value="music">Music</option>
                    <option value="food">Food</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="fitness">Fitness</option>
                    <option value="productivity">Productivity</option>
                    <option value="news">News</option>
                    <option value="telecom">Telecom</option>
                  </select>
                  <button
                    type="button"
                    onClick={addCustomSub}
                    className="px-4 py-2 bg-[#1e1847] text-white text-sm rounded-lg font-medium hover:bg-[#2d2568] transition"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="flex items-center gap-2 text-sm text-[#1e1847] font-medium hover:underline mb-4"
              >
                <Plus size={16} />
                Add custom subscription
              </button>
            )}

            {/* Running total */}
            {totalMonthly > 0 && (
              <div className="bg-amber-50 rounded-xl px-4 py-3 text-sm">
                <p className="font-semibold text-amber-900">
                  Total: ₹{totalMonthly.toLocaleString('en-IN')}/month · ₹{totalAnnual.toLocaleString('en-IN')}/year
                </p>
                <p className="text-amber-700 mt-0.5">
                  ₹{Math.round(total10yr).toLocaleString('en-IN')} in 10 years if invested at 12.5% p.a.
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e1847] text-white font-semibold py-3 rounded-xl hover:bg-[#2d2568] disabled:opacity-60 disabled:cursor-not-allowed transition text-base"
          >
            {loading ? 'Building your twin…' : 'Build My Financial Twin →'}
          </button>
        </form>
      </div>
    </div>
  )
}
