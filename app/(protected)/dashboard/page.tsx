'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { FinancialTwin } from '@/types/twin'

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAnalyzing = searchParams.get('analyzing') === 'true'

  const [twin, setTwin] = useState<FinancialTwin | null | undefined>(undefined)
  const [userName, setUserName] = useState('there')
  const [dots, setDots] = useState('.')

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const firstName =
        user.user_metadata?.full_name?.split(' ')[0] ||
        user.email?.split('@')[0] ||
        'there'
      setUserName(firstName)

      const { data } = await supabase
        .from('financial_twin')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setTwin(data ?? null)
    }
    fetchData()
  }, [router])

  useEffect(() => {
    if (!isAnalyzing) return
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '.' : d + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [isAnalyzing])

  // Initial load
  if (twin === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const hasFinancials = twin && twin.monthly_income > 0
  const hasGoal = twin && twin.primary_goal && twin.goal_target_amount > 0

  // State C analyzing
  if (hasFinancials && hasGoal && isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'var(--brand-soft)' }}
        >
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}
          />
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Building your Financial Twin{dots}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Running causal attribution analysis on your financial data.
        </p>
      </div>
    )
  }

  // State A — no financial data yet
  if (!hasFinancials) {
    return (
      <div>
        <div className="mb-6">
          <p className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Welcome, {userName}.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Your twin is 30% complete.
          </p>
        </div>

        {/* Locked verdict card */}
        <div
          className="rounded-2xl border p-5 mb-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span>🔒</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Goal Probability</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Add your finances to unlock
          </p>
        </div>

        {/* CTA card */}
        <div
          className="rounded-2xl border p-5"
          style={{ background: 'var(--brand-soft)', borderColor: 'var(--brand)' }}
        >
          <p className="font-semibold mb-1" style={{ color: 'var(--brand)' }}>
            Add your Money Model
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Income, expenses &amp; savings · Takes 2 minutes
          </p>
          <Link
            href="/onboarding/step-2"
            className="inline-block px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--brand)' }}
          >
            Complete now →
          </Link>
        </div>
      </div>
    )
  }

  // State B — has financials, no goal
  if (!hasGoal) {
    const monthlyExpenses =
      twin.monthly_rent +
      twin.monthly_food +
      twin.monthly_transport +
      twin.monthly_entertainment +
      twin.monthly_other +
      twin.total_monthly_emi

    const surplus = twin.monthly_income - monthlyExpenses
    const savingsRate = twin.monthly_income > 0
      ? Math.round((surplus / twin.monthly_income) * 100)
      : 0
    const emergencyRunway = monthlyExpenses > 0
      ? (twin.current_savings / monthlyExpenses).toFixed(1)
      : '0'

    return (
      <div>
        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            {
              label: 'Monthly surplus',
              value: `₹${Math.abs(surplus).toLocaleString('en-IN')}`,
              valueColor: surplus >= 0 ? 'var(--success)' : 'var(--risk-high)',
            },
            {
              label: 'Savings rate',
              value: `${savingsRate}%`,
              valueColor: 'var(--text-primary)',
            },
            {
              label: 'Emergency runway',
              value: `${emergencyRunway}mo`,
              valueColor: 'var(--text-primary)',
            },
          ].map(m => (
            <div
              key={m.label}
              className="rounded-2xl border p-3"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <p className="text-xs mb-1.5 leading-tight" style={{ color: 'var(--text-muted)' }}>
                {m.label}
              </p>
              <p className="text-base font-semibold" style={{ color: m.valueColor }}>
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* Goal CTA */}
        <div
          className="rounded-2xl border p-5"
          style={{ background: 'var(--brand-soft)', borderColor: 'var(--brand)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span>🎯</span>
            <span className="font-semibold" style={{ color: 'var(--brand)' }}>Set your Goal</span>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            What are you building towards?
          </p>
          <Link
            href="/onboarding/step-3"
            className="inline-block px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--brand)' }}
          >
            Set goal →
          </Link>
        </div>
      </div>
    )
  }

  // State C — full twin complete
  return (
    <div>
      <div className="mb-4">
        <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Your Financial Twin
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Goal: {twin.primary_goal} · ₹{twin.goal_target_amount.toLocaleString('en-IN')} by {twin.goal_target_year}
        </p>
      </div>

      <div
        className="rounded-2xl border p-8 text-center"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
      >
        <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Twin is ready
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Full verdict, health score, and causal analysis coming in Phase 4.
        </p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
