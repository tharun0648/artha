'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import HealthScoreRing from '@/components/dashboard/HealthScoreRing'
import LoadingVerdict from '@/components/dashboard/LoadingVerdict'
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

function fmt(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${Math.round(n)}`
}

function probabilityColor(p: number): string {
  if (p >= 70) return 'var(--brand)'
  if (p >= 40) return 'var(--accent)'
  return '#D94F4F'
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '20px',
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
    return () => { cancelled = true; clearInterval(interval) }
  }, [isAnalyzing, twin, router, fetchVerdict])

  const hasFinancials = twin && twin.monthly_income > 0
  const hasGoal = twin && twin.primary_goal && twin.goal_target_amount > 0

  useEffect(() => {
    if (twin === undefined || !hasGoal || isAnalyzing || verdict !== null) return
    retryAnalysis()
  }, [twin, hasGoal, isAnalyzing, verdict, retryAnalysis])

  if (twin === undefined || (hasGoal && verdict === undefined)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
             style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const incompleteTwinBanner = (!twin || !twin.monthly_income) ? (
    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '14px', color: '#92400E' }}>Complete your financial profile to see your dashboard</span>
      <Link href="/onboarding/step-2" style={{ fontSize: '14px', fontWeight: 500, color: '#92400E', marginLeft: '16px' }}>→</Link>
    </div>
  ) : null

  const missingGoalBanner = (twin && twin.monthly_income && !twin.primary_goal) ? (
    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '14px', color: '#92400E' }}>Add your financial goal to get your verdict</span>
      <Link href="/onboarding/step-3" style={{ fontSize: '14px', fontWeight: 500, color: '#92400E', marginLeft: '16px' }}>→</Link>
    </div>
  ) : null

  // State A: no twin / no income
  if (!twin || !hasFinancials) {
    return (
      <div style={{ maxWidth: '480px' }}>
        {incompleteTwinBanner}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>Welcome, {userName}.</h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginTop: '4px', lineHeight: 1.6 }}>Let&apos;s build your Financial Digital Twin.</p>
        </div>

        {profile && (
          <div style={{ ...card, marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px' }}>Your Profile</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {profile.age && (
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Age</p>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{profile.age} years</p>
                </div>
              )}
              {profile.city && (
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>City</p>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{profile.city}</p>
                </div>
              )}
              {profile.company_type && (
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Work</p>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize' }}>{profile.company_type}</p>
                </div>
              )}
              {profile.risk_appetite && (
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Risk</p>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize' }}>{profile.risk_appetite}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ ...card, marginBottom: '12px' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>What&apos;s A₹tha calculating?</p>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
            To show your goal probability and what&apos;s blocking you, A₹tha needs your income, expenses, and savings.
          </p>
        </div>

        <div style={{ ...card, borderColor: 'var(--brand)', background: 'var(--brand-surface)' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brand)', marginBottom: '4px' }}>Add your Money Model</p>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginBottom: '16px' }}>Income, expenses & savings · Takes 2 minutes</p>
          <Link href="/onboarding/step-2" style={{
            display: 'inline-flex', alignItems: 'center',
            height: '36px', padding: '0 16px',
            background: 'var(--brand)', color: '#fff',
            borderRadius: '6px', fontSize: '14px', fontWeight: 500,
            textDecoration: 'none',
          }}>
            Complete now →
          </Link>
        </div>
      </div>
    )
  }

  // State B: has income, no goal
  if (!hasGoal) {
    if (!twin) return null

    const monthlyExpenses = twin.total_monthly_expenses
    const surplus = twin.monthly_income - monthlyExpenses
    const savingsRate = twin.monthly_income > 0 ? Math.round((surplus / twin.monthly_income) * 100) : 0
    const savings = twin.current_savings ?? 0
    const runwayDays = monthlyExpenses > 0 ? Math.round((savings / monthlyExpenses) * 30) : 0
    const runwayDisplay = runwayDays < 30 ? `${runwayDays} days` : `${Math.round(runwayDays / 30)} months`

    return (
      <div style={{ maxWidth: '480px' }}>
        {missingGoalBanner}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: 'Monthly surplus', value: fmt(Math.abs(surplus)), color: surplus >= 0 ? 'var(--brand)' : '#D94F4F' },
            { label: 'Savings rate', value: `${savingsRate}%`, color: 'var(--ink)' },
            { label: 'Runway', value: runwayDisplay, color: 'var(--ink)' },
          ].map(stat => (
            <div key={stat.label} style={card}>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>{stat.label}</p>
              <p style={{ fontSize: '15px', fontWeight: 600, color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
        <div style={{ ...card, borderColor: 'var(--brand)', background: 'var(--brand-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span>🎯</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brand)' }}>Set your Goal</span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginBottom: '16px' }}>What are you building towards?</p>
          <Link href="/onboarding/step-3" style={{
            display: 'inline-flex', alignItems: 'center',
            height: '36px', padding: '0 16px',
            background: 'var(--brand)', color: '#fff',
            borderRadius: '6px', fontSize: '14px', fontWeight: 500,
            textDecoration: 'none',
          }}>
            Set goal →
          </Link>
        </div>
      </div>
    )
  }

  // State C: loading verdict
  if (!verdict) {
    if (!twin) return null
    return (
      <div style={{ maxWidth: '480px' }}>
        {analysisError ? (
          <div style={card}>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginBottom: '12px' }}>{analysisError}</p>
            <button
              type="button"
              onClick={retryAnalysis}
              style={{ height: '36px', padding: '0 16px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
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

  if (!twin) return null

  // State C full verdict — two-column layout
  const sub = verdict.subscription_insight
  const monthlyExpenses = twin.total_monthly_expenses
  const surplus = twin.monthly_income - monthlyExpenses
  const savingsRate = twin.monthly_income > 0 ? Math.round((surplus / twin.monthly_income) * 100) : 0
  const savings = twin.current_savings ?? 0
  const equity = twin.equity_investments ?? 0
  const runwayDays = monthlyExpenses > 0 ? Math.round((savings / monthlyExpenses) * 30) : 0
  const runwayDisplay = runwayDays < 30 ? `${runwayDays} days` : `${Math.round(runwayDays / 30)} months`
  const goalLabel = GOAL_LABELS[twin.primary_goal] ?? twin.primary_goal
  const sorted = [...verdict.causal_attribution].sort((a, b) => b.contribution_pct - a.contribution_pct)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }} className="lg:grid-cols-[65%_35%]">

      {/* Left column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Twin card */}
        <div style={card}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>Financial Twin</p>
              <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '2px' }}>
                {goalLabel} · {fmt(twin.goal_target_amount)} by {twin.goal_target_year}
              </p>
            </div>
            <Link href="/onboarding/step-3" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-2)', textDecoration: 'none', flexShrink: 0, marginTop: '2px' }}>
              Edit goal
            </Link>
          </div>

          {/* Hero */}
          <p style={{ fontSize: '40px', fontWeight: 700, color: probabilityColor(verdict.goal_probability), lineHeight: 1, marginBottom: '8px' }}>
            {verdict.goal_probability}%
          </p>
          <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.6, color: 'var(--ink-2)', marginBottom: '16px' }}>
            {verdict.verdict}
          </p>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border)', marginBottom: '16px' }} />

          {/* Causal attribution */}
          {sorted.length > 0 && (
            <>
              <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px' }}>
                Blocking your goal
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sorted.map(f => (
                  <div key={f.rank}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', color: 'var(--ink)' }}>{f.factor}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{f.contribution_pct}%</span>
                    </div>
                    <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '3px', width: `${f.contribution_pct}%`, background: 'var(--accent)', borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Subscription insight */}
        {sub.monthly_total > 0 && (
          <div style={card}>
            <p style={{ fontSize: '14px', color: 'var(--ink)', marginBottom: '4px' }}>
              ₹{sub.monthly_total.toLocaleString('en-IN')}/mo across your subscriptions.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Invested over 10 years: ₹{sub.ten_year_opportunity_cost.toLocaleString('en-IN')}
            </p>
          </div>
        )}
      </div>

      {/* Right column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Health score */}
        <HealthScoreRing score={verdict.health_score} />

        {/* Snapshot card */}
        <div style={card}>
          <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px' }}>Snapshot</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Income', value: fmt(twin.monthly_income) + '/mo' },
              { label: 'Surplus', value: fmt(Math.abs(surplus)) + '/mo' },
              { label: 'Savings rate', value: `${savingsRate}%` },
              { label: 'Runway', value: runwayDisplay },
              { label: 'Savings', value: fmt(savings) },
              { label: 'Investments', value: fmt(equity) },
            ].map(stat => (
              <div key={stat.label}>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>{stat.label}</p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/decision-lab"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '36px',
            background: 'var(--brand)', color: '#fff',
            borderRadius: '6px', fontSize: '14px', fontWeight: 500,
            textDecoration: 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand)')}
        >
          Open Decision Lab →
        </Link>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Loading…</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
