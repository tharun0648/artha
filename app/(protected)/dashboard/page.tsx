'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import CausalBars from '@/components/dashboard/CausalBars'
import HealthScoreRing from '@/components/dashboard/HealthScoreRing'
import LoadingVerdict from '@/components/dashboard/LoadingVerdict'
import VerdictCard from '@/components/dashboard/VerdictCard'
import type { VerdictOutput } from '@/types/analysis'
import { FinancialTwin } from '@/types/twin'

type Profile = {
  age: number | null
  city: string | null
  company_type: string | null
  risk_appetite: string | null
}

const GOAL_LABELS: Record<string, string> = {
  home: 'Home',
  wealth: 'Wealth',
  safety: 'Safety net',
  retirement: 'Retirement',
  education: 'Education',
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAnalyzing = searchParams.get('analyzing') === 'true'

  const [twin, setTwin] = useState<FinancialTwin | null | undefined>(undefined)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [verdict, setVerdict] = useState<VerdictOutput | null | undefined>(undefined)
  const [userName, setUserName] = useState('there')
  const [dots, setDots] = useState('.')
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const fetchVerdict = useCallback(async (userId: string): Promise<VerdictOutput | null> => {
    const supabase = createClient()
    const { data } = await supabase
      .from('twin_analyses')
      .select('output')
      .eq('user_id', userId)
      .eq('analysis_type', 'verdict')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return (data?.output as VerdictOutput | undefined) ?? null
  }, [])

  const retryAnalysis = useCallback(() => {
    setAnalysisError(null)
    setVerdict(undefined)
    router.push('/dashboard?analyzing=true')
    fetch('/api/analyze-twin', { method: 'POST' }).catch(() => {
      setAnalysisError('Could not start analysis. Please try again.')
    })
  }, [router])

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

      const [{ data: twinData }, { data: profileData }] = await Promise.all([
        supabase.from('financial_twin').select('*').eq('user_id', user.id).single(),
        supabase.from('profiles').select('age,city,company_type,risk_appetite').eq('id', user.id).single(),
      ])

      setTwin(twinData ?? null)
      setProfile(profileData ?? null)

      if (twinData?.primary_goal && twinData.goal_target_amount > 0) {
        const cached = await fetchVerdict(user.id)
        setVerdict(cached)
      } else {
        setVerdict(null)
      }
    }
    fetchData()
  }, [router, fetchVerdict])

  useEffect(() => {
    if (!isAnalyzing) return

    const dotInterval = setInterval(() => {
      setDots(d => d.length >= 3 ? '.' : d + '.')
    }, 500)

    return () => clearInterval(dotInterval)
  }, [isAnalyzing])

  useEffect(() => {
    if (!isAnalyzing || twin === undefined) return

    let cancelled = false
    let attempts = 0
    const maxAttempts = 30

    async function poll() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const result = await fetchVerdict(user.id)
      if (result) {
        setVerdict(result)
        setAnalysisError(null)
        router.replace('/dashboard')
        return
      }

      attempts += 1
      if (attempts >= maxAttempts) {
        setAnalysisError('Analysis is taking longer than expected. Please refresh in a moment.')
        router.replace('/dashboard')
      }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [isAnalyzing, twin, router, fetchVerdict])

  const hasFinancials = twin && twin.monthly_income > 0
  const hasGoal = twin && twin.primary_goal && twin.goal_target_amount > 0

  useEffect(() => {
    if (twin === undefined || !hasGoal || isAnalyzing || verdict !== null) return
    retryAnalysis()
  }, [twin, hasGoal, isAnalyzing, verdict, retryAnalysis])

  if (twin === undefined || (hasGoal && verdict === undefined)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
             style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const incompleteTwinBanner = (!twin || !twin.monthly_income) ? (
    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm mb-6 flex items-center justify-between">
      <span>Complete your financial profile to see your dashboard</span>
      <Link href="/onboarding/step-2" className="text-amber-700 font-medium ml-4 shrink-0">→</Link>
    </div>
  ) : null

  const missingGoalBanner = (twin && twin.monthly_income && !twin.primary_goal) ? (
    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm mb-6 flex items-center justify-between">
      <span>Add your financial goal to get your verdict</span>
      <Link href="/onboarding/step-3" className="text-amber-700 font-medium ml-4 shrink-0">→</Link>
    </div>
  ) : null

  // State A: no twin or no income → profile card + step-2 CTA
  if (!twin || !hasFinancials) {
    return (
      <div className="space-y-4">
        {incompleteTwinBanner}
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Welcome, {userName}.
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Let&apos;s build your Financial Digital Twin.
          </p>
        </div>

        {profile && (
          <div className="rounded-2xl border p-5 space-y-3"
               style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide"
               style={{ color: 'var(--text-muted)' }}>Your Profile</p>
            <div className="grid grid-cols-2 gap-3">
              {profile.age && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Age</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{profile.age} years</p>
                </div>
              )}
              {profile.city && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>City</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{profile.city}</p>
                </div>
              )}
              {profile.company_type && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Work</p>
                  <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{profile.company_type}</p>
                </div>
              )}
              {profile.risk_appetite && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Risk profile</p>
                  <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{profile.risk_appetite}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="rounded-2xl border p-5"
             style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            What&apos;s A₹tha calculating?
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            To show your goal probability and what&apos;s blocking you, A₹tha needs your income,
            expenses, and savings. This takes 2 minutes and stays private on your device.
          </p>
        </div>

        <div className="rounded-2xl border p-5"
             style={{ background: 'var(--brand-soft)', borderColor: 'var(--brand)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--brand)' }}>
            Add your Money Model
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Income, expenses &amp; savings · Takes 2 minutes
          </p>
          <Link
            href="/onboarding/step-2"
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: 'var(--brand)' }}
          >
            Complete now →
          </Link>
        </div>
      </div>
    )
  }

  // State B: has income, no goal → metrics + step-3 CTA
  if (!hasGoal) {
    if (!twin) return null

    const monthlyExpenses = twin.total_monthly_expenses
    const surplus = twin.monthly_income - monthlyExpenses
    const savingsRate = twin.monthly_income > 0
      ? Math.round((surplus / twin.monthly_income) * 100)
      : 0

    const savings = twin.current_savings ?? 0
    const runwayDays = monthlyExpenses > 0
      ? Math.round((savings / monthlyExpenses) * 30)
      : 0
    const runwayDisplay = runwayDays < 30
      ? `${runwayDays} days`
      : `${Math.round(runwayDays / 30)} months`
    const runwayColor = runwayDays < 30
      ? 'var(--risk-high)'
      : runwayDays < 90
        ? 'var(--risk-medium)'
        : 'var(--text-primary)'

    return (
      <div>
        {missingGoalBanner}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-2xl border p-3"
               style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <p className="text-xs mb-1.5 leading-tight" style={{ color: 'var(--text-muted)' }}>
              Monthly surplus
            </p>
            <p className="text-base font-semibold"
               style={{ color: surplus >= 0 ? 'var(--success)' : 'var(--risk-high)' }}>
              ₹{Math.abs(surplus).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="rounded-2xl border p-3"
               style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <p className="text-xs mb-1.5 leading-tight" style={{ color: 'var(--text-muted)' }}>
              Savings rate
            </p>
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {savingsRate}%
            </p>
          </div>
          <div className="rounded-2xl border p-3"
               style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <p className="text-xs mb-1.5 leading-tight" style={{ color: 'var(--text-muted)' }}>
              Emergency runway
            </p>
            <p className="text-base font-semibold" style={{ color: runwayColor }}>
              {runwayDisplay}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border p-5"
             style={{ background: 'var(--brand-soft)', borderColor: 'var(--brand)' }}>
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

  // State C: has goal → verdict/loading UI
  if (!verdict) {
    if (!twin) return null

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Your Financial Twin
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Goal: {GOAL_LABELS[twin.primary_goal] ?? twin.primary_goal} · ₹{twin.goal_target_amount.toLocaleString('en-IN')} by {twin.goal_target_year}
            </p>
          </div>
          <Link href="/onboarding/step-3" className="text-xs shrink-0 mt-1" style={{ color: 'var(--text-muted)' }}>
            Edit goal
          </Link>
        </div>
        {analysisError ? (
          <div className="rounded-2xl border p-5 space-y-3"
               style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{analysisError}</p>
            <button
              type="button"
              onClick={retryAnalysis}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: 'var(--brand)' }}
            >
              Run analysis →
            </button>
          </div>
        ) : (
          <LoadingVerdict dots={dots} />
        )}
      </div>
    )
  }

  const sub = verdict.subscription_insight

  if (!twin) return null

  // State C full verdict render
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Your Financial Twin
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Goal: {GOAL_LABELS[twin.primary_goal] ?? twin.primary_goal} · ₹{twin.goal_target_amount.toLocaleString('en-IN')} by {twin.goal_target_year}
          </p>
        </div>
        <Link href="/onboarding/step-3" className="text-xs shrink-0 mt-1" style={{ color: 'var(--text-muted)' }}>
          Edit goal
        </Link>
      </div>

      <VerdictCard verdict={verdict} />
      <HealthScoreRing score={verdict.health_score} />
      <CausalBars factors={verdict.causal_attribution} />

      {sub.monthly_total > 0 && (
        <div className="rounded-2xl border p-4"
             style={{ background: 'var(--bg-surface-secondary)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Subscription spend
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            ₹{sub.monthly_total.toLocaleString('en-IN')}/mo across your subscriptions.
            Invested instead, that could grow to ₹{sub.ten_year_opportunity_cost.toLocaleString('en-IN')} in 10 years.
          </p>
        </div>
      )}

      <Link
        href="/decision-lab"
        className="block text-center rounded-2xl border p-4 text-sm font-medium transition-colors"
        style={{ background: 'var(--brand-soft)', borderColor: 'var(--brand)', color: 'var(--brand)' }}
      >
        Open Decision Lab →
      </Link>
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
