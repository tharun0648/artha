// Main dashboard: fetches twin + verdict, shows full analysis or onboarding CTAs.
// Demo mode: reads sessionStorage('demoPersonaIdx') first and skips all DB calls.
// Local Profile type is intentionally partial (partial select, no id field).
'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LoadingVerdict from '@/components/dashboard/LoadingVerdict'
import TrajectoryCard from '@/components/dashboard/TrajectoryCard'
import type { VerdictOutput } from '@/types/analysis'
import type { FinancialTwin } from '@/types/twin'
import { fmt } from '@/lib/format'
import { DEMO_PERSONAS } from '@/lib/demo-personas'

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

const RISK_LABELS: Record<string, string> = {
  conservative: 'Conservative',
  moderate: 'Balanced',
  aggressive: 'Aggressive',
}

function probabilityColor(p: number): string {
  if (p >= 70) return 'var(--positive)'
  if (p >= 40) return 'var(--accent)'
  return 'var(--negative)'
}

function healthColor(h: number): string {
  if (h >= 75) return 'var(--positive)'
  return 'var(--accent)'
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ twin, profile, verdict, displayName }: {
  twin: FinancialTwin | null
  profile: Profile | null
  verdict: VerdictOutput | null | undefined
  displayName: string
}) {
  const surplus = twin ? twin.monthly_income - twin.total_monthly_expenses : 0
  const healthTotal = verdict?.health_score.total ?? null

  const rows: Array<{ label: string; value: string; color?: string }> = []
  if (twin?.primary_goal) {
    const goalLabel = GOAL_LABELS[twin.primary_goal] ?? twin.primary_goal
    const goalAmtStr = twin.goal_target_amount > 0 ? ` · ${fmt(twin.goal_target_amount)}` : ''
    rows.push({ label: 'Goal', value: `${goalLabel}${goalAmtStr} · ${twin.goal_target_year}` })
  }
  if (twin?.monthly_income) {
    rows.push({ label: 'Income / mo', value: fmt(twin.monthly_income) })
    rows.push({
      label: 'Surplus / mo',
      value: `${surplus >= 0 ? '' : '−'}${fmt(Math.abs(surplus))}`,
      color: surplus >= 0 ? 'var(--positive)' : 'var(--negative)',
    })
  }
  if (profile?.risk_appetite) {
    rows.push({ label: 'Risk band', value: RISK_LABELS[profile.risk_appetite] ?? profile.risk_appetite })
  }
  if (healthTotal !== null) {
    rows.push({ label: 'Health', value: `${healthTotal}/100`, color: healthColor(healthTotal) })
  }

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      padding: '20px 18px',
      margin: '24px 0 24px 24px',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 80,
      alignSelf: 'flex-start',
    }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>{displayName}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div className="pulse-dot" />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Twin synced · today</span>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {rows.map(row => (
          <div key={row.label} style={{
            borderTop: '1px solid var(--border)',
            padding: '10px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: row.color ?? 'var(--ink)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.6, marginTop: 'auto', paddingTop: 20 }}>
        Numbers computed on real Indian financial data. Narrative is AI — never the figures.
      </p>
    </aside>
  )
}

// ── Eyebrow ───────────────────────────────────────────────────────────────────

function Eyebrow({ left, right }: { left: string; right?: string }) {
  const style: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--muted)',
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <span style={style}>{left}</span>
      {right && <span style={style}>{right}</span>}
    </div>
  )
}

// ── State D: full verdict ─────────────────────────────────────────────────────

const FACTOR_QUESTIONS: Array<{ match: string[]; q: string }> = [
  { match: ['equity', 'invest'],        q: 'How do I start investing my surplus in equity?' },
  { match: ['sip', 'mutual fund'],      q: 'How much should I increase my SIP and where?' },
  { match: ['lifestyle', 'inflation'],  q: 'How do I reduce lifestyle inflation to hit my goal?' },
  { match: ['emi', 'debt', 'loan'],     q: 'How do I reduce my EMI burden?' },
  { match: ['savings rate', 'surplus'], q: 'How can I increase my monthly savings rate?' },
  { match: ['dining', 'food', 'eating', 'restaurant'], q: 'How do I cut food expenses without sacrificing quality?' },
]

function factorQuestion(factor: string, twin: FinancialTwin): string {
  const lower = factor.toLowerCase()
  for (const { match, q } of FACTOR_QUESTIONS) {
    if (match.some(m => lower.includes(m))) return q
  }
  const goalLabel = GOAL_LABELS[twin.primary_goal ?? ''] ?? 'goal'
  return `How do I reach my ${goalLabel} goal of ${fmt(twin.goal_target_amount)} by ${twin.goal_target_year}?`
}

function probabilityLabel(p: number): string {
  if (p >= 85) return 'well on track'
  if (p >= 65) return 'on track'
  if (p >= 40) return 'reachable with changes'
  return 'unlikely on current path'
}

function FullVerdictContent({ twin, verdict }: { twin: FinancialTwin; verdict: VerdictOutput }) {
  const surplus = twin.monthly_income - twin.total_monthly_expenses
  const totalAssets = twin.current_savings + twin.equity_investments + twin.epf_balance
  const gap = twin.goal_target_amount - totalAssets
  const probColor = probabilityColor(verdict.goal_probability)

  const goalLabel = GOAL_LABELS[twin.primary_goal ?? ''] ?? twin.primary_goal ?? 'goal'
  const goalAmt = fmt(twin.goal_target_amount)
  const gapStr = gap > 0
    ? `${fmt(gap)} short of target`
    : `${fmt(Math.abs(gap))} ahead of target`
  const verdictSentence = `You're ${probabilityLabel(verdict.goal_probability)} for ${goalLabel} of ${goalAmt} by ${twin.goal_target_year} — ${gapStr}.`

  const confLine =
    verdict.confidence >= 80
      ? 'High confidence · based on income, savings rate, and goal timeline'
      : verdict.confidence >= 60
      ? 'Medium confidence · some data points estimated'
      : 'Lower confidence · add more profile data for a sharper read'

  const sorted = [...verdict.causal_attribution]
    .sort((a, b) => b.contribution_pct - a.contribution_pct)
    .slice(0, 3)

  const topFactor = sorted[0] ?? null
  const askWhyHref = `/decision-lab?panel=chat&q=${encodeURIComponent('Why and how can I reach my goals')}`
  const simulateHref = topFactor
    ? `/decision-lab?panel=chat&q=${encodeURIComponent(factorQuestion(topFactor.factor, twin))}`
    : `/decision-lab?panel=chat&q=${encodeURIComponent(`How do I reach my ${goalLabel} goal of ${goalAmt} by ${twin.goal_target_year}?`)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* 1 — VERDICT BLOCK */}
      <div>
        <Eyebrow left="THE VERDICT" right="UPDATED TODAY" />
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 28,
          fontWeight: 300,
          color: probColor,
          lineHeight: 1.35,
          margin: '0 0 8px',
        }}>
          {verdictSentence}
        </p>
        <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '0 0 16px', lineHeight: 1.5 }}>
          {confLine}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/decision-lab" className="btn btn-primary btn-sm">Open Decision Lab →</Link>
          <Link href={askWhyHref} className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Ask why
          </Link>
        </div>
      </div>

      {/* 2 — STATS ROW */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
          {([
            {
              label: 'OUTLOOK',
              iconPath: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
              value: probabilityLabel(verdict.goal_probability),
              valueColor: probColor,
              sub: `by ${twin.goal_target_year}`,
            },
            {
              label: 'MONTHLY SURPLUS',
              iconPath: (
                <>
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </>
              ),
              value: `${surplus >= 0 ? '' : '−'}${fmt(Math.abs(surplus))}`,
              valueColor: surplus >= 0 ? 'var(--positive)' : 'var(--negative)',
              sub: 'per month',
            },
            {
              label: 'GAP TO GOAL',
              iconPath: (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </>
              ),
              value: gap > 0 ? fmt(gap) : 'On track',
              valueColor: gap > 0 ? 'var(--accent)' : 'var(--positive)',
              sub: gap > 0 ? `short of ${fmt(twin.goal_target_amount)}` : 'ahead of target',
            },
          ] as const).map((stat, i) => (
            <div key={stat.label} style={{
              padding: '18px 20px',
              borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {stat.iconPath}
                </svg>
                <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--muted)' }}>
                  {stat.label}
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: stat.valueColor, margin: '0 0 4px', fontVariantNumeric: 'tabular-nums' }}>
                {stat.value}
              </p>
              <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0 }}>{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3 — CHART CARD */}
      <TrajectoryCard
        twin={twin}
        goalAmount={twin.goal_target_amount}
        goalYear={twin.goal_target_year}
      />

      {/* 4 — BLOCKERS */}
      {sorted.length > 0 && (
        <div className="card">
          <Eyebrow left="WHAT'S BLOCKING IT" right="FROM MATH" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {sorted.map(f => (
              <div key={f.rank}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{f.factor}</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                    {f.contribution_pct}%
                  </span>
                </div>
                <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: 2, width: `${f.contribution_pct}%`, background: 'var(--brand)', borderRadius: 1 }} />
                </div>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>{f.specific_finding}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 — ONE MOVE */}
      {topFactor && (
        <div style={{
          background: 'var(--brand-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--r-lg)',
          padding: '20px 22px',
        }}>
          <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--brand-text)', margin: '0 0 12px' }}>
            ✦ THE ONE MOVE
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 400, color: 'var(--ink)', lineHeight: 1.5, margin: '0 0 16px' }}>
            {topFactor.one_action}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href={simulateHref} className="btn btn-primary btn-sm">Simulate it →</Link>
            <Link href={askWhyHref} className="btn btn-ghost btn-sm">Ask the twin</Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAnalyzing = searchParams.get('analyzing') === 'true'

  const [twin, setTwin] = useState<FinancialTwin | null | undefined>(undefined)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [verdict, setVerdict] = useState<VerdictOutput | null | undefined>(undefined)
  const [displayName, setDisplayName] = useState('You')
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

      // Demo persona override: if coming from demo-preview with a persona selected
      const demoIdxRaw = sessionStorage.getItem('demoPersonaIdx')
      if (demoIdxRaw !== null) {
        const idx = parseInt(demoIdxRaw, 10)
        const persona = DEMO_PERSONAS[idx]
        if (persona) {
          setDisplayName(persona.firstName)
          setTwin(persona.twin)
          setProfile(persona.profile)
          setVerdict(persona.verdict)
          return
        }
      }

      const name =
        user.user_metadata?.full_name?.split(' ')[0] ||
        user.email?.split('@')[0] ||
        'You'
      setDisplayName(name)

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

  function renderMain() {
    if (twin === undefined || (hasGoal && verdict === undefined)) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
               style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
        </div>
      )
    }

    if (!twin || !hasFinancials) {
      return (
        <div style={{ maxWidth: 480 }}>
          <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--warning-text)' }}>Complete your financial profile to see your dashboard</span>
            <Link href="/onboarding/step-2" style={{ fontSize: 14, fontWeight: 500, color: 'var(--warning-text)', marginLeft: 16 }}>→</Link>
          </div>
          <div className="card" style={{ borderColor: 'var(--brand)', background: 'var(--brand-surface)' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--brand)', marginBottom: 4 }}>Add your Money Model</p>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 16, lineHeight: 1.6 }}>Income, expenses & savings · Takes 2 minutes</p>
            <Link href="/onboarding/step-2" className="btn btn-primary btn-sm">Complete now →</Link>
          </div>
        </div>
      )
    }

    if (!hasGoal) {
      return (
        <div style={{ maxWidth: 480 }}>
          <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--warning-text)' }}>Add your financial goal to get your verdict</span>
            <Link href="/onboarding/step-3" style={{ fontSize: 14, fontWeight: 500, color: 'var(--warning-text)', marginLeft: 16 }}>→</Link>
          </div>
          <div className="card" style={{ borderColor: 'var(--brand)', background: 'var(--brand-surface)' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--brand)', marginBottom: 4 }}>Set your Goal</p>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 16 }}>What are you building towards?</p>
            <Link href="/onboarding/step-3" className="btn btn-primary btn-sm">Set goal →</Link>
          </div>
        </div>
      )
    }

    if (!verdict) {
      return (
        <div style={{ maxWidth: 480 }}>
          {analysisError ? (
            <div className="card">
              <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 12 }}>{analysisError}</p>
              <button type="button" onClick={retryAnalysis} className="btn btn-primary btn-sm">
                Run analysis →
              </button>
            </div>
          ) : (
            <LoadingVerdict onRetry={retryAnalysis} onBack={() => router.push('/onboarding/step-3')} />
          )}
        </div>
      )
    }

    return <FullVerdictContent twin={twin} verdict={verdict} />
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      margin: '-32px -24px',
      width: 'calc(100% + 48px)',
      minHeight: '100vh',
      background: 'var(--bg)',
      animation: 'rise 0.42s cubic-bezier(0.25, 0.1, 0.25, 1) both',
    }}>
      <div className="dashboard-sidebar-wrapper">
        <Sidebar twin={twin ?? null} profile={profile} verdict={verdict} displayName={displayName} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Mobile compact header */}
      {twin?.primary_goal && (
        <div className="dashboard-mobile-header">
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {displayName} · {GOAL_LABELS[twin.primary_goal] ?? twin.primary_goal}
            {twin.goal_target_amount > 0 ? ` · ${fmt(twin.goal_target_amount)}` : ''} · {twin.goal_target_year}
          </span>
        </div>
      )}
      <div style={{ padding: '28px 32px' }}>
        {/* Tab nav */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {([
            { label: 'Dashboard', href: '/dashboard', active: true },
            { label: 'Decision Lab', href: '/decision-lab', active: false },
          ] as const).map(tab => (
            <Link
              key={tab.label}
              href={tab.href}
              style={{
                fontSize: 13,
                fontWeight: tab.active ? 600 : 400,
                color: tab.active ? 'var(--brand-text)' : 'var(--ink-2)',
                padding: '0 0 10px',
                marginRight: 24,
                borderBottom: tab.active ? '2px solid var(--brand)' : '2px solid transparent',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div style={{ maxWidth: 780 }}>
          {renderMain()}
        </div>
      </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Loading…</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
