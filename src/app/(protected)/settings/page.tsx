// Settings page: read-only view of profile, financial model, and goal/subscriptions.
// Demo mode: reads sessionStorage('demoPersonaIdx') first and skips DB calls.
// Converted to client component so it can access sessionStorage on mount.
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { fmt } from '@/lib/format'
import { DEMO_PERSONAS } from '@/lib/demo-personas'
import type { FinancialTwin, Profile, Subscription } from '@/types/twin'

const GOAL_LABELS: Record<string, string> = {
  home: 'Home',
  wealth: 'Wealth',
  safety: 'Safety net',
  retirement: 'Retirement',
  education: 'Education',
}

function DataRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{value}</span>
    </div>
  )
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [twin, setTwin] = useState<FinancialTwin | null>(null)
  const [subscriptions, setSubscriptions] = useState<Pick<Subscription, 'name' | 'monthly_amount' | 'category'>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Demo persona override
      const demoIdxRaw = sessionStorage.getItem('demoPersonaIdx')
      if (demoIdxRaw !== null) {
        const idx = parseInt(demoIdxRaw, 10)
        const persona = DEMO_PERSONAS[idx]
        if (persona) {
          setProfile(persona.profile)
          setTwin(persona.twin)
          setSubscriptions(persona.subscriptionDetails)
          setLoading(false)
          return
        }
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, twinRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('financial_twin').select('*').eq('user_id', user.id).single(),
        supabase.from('subscriptions').select('name,monthly_amount,category').eq('user_id', user.id).eq('is_active', true),
      ])

      setProfile(profileRes.data as Profile | null)
      setTwin(twinRes.data as FinancialTwin | null)
      setSubscriptions((subsRes.data ?? []) as Pick<Subscription, 'name' | 'monthly_amount' | 'category'>[])
      setLoading(false)
    }
    load()
  }, [])

  const monthlySubTotal = subscriptions.reduce((s, sub) => s + sub.monthly_amount, 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
             style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>Settings</h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginTop: '4px', lineHeight: 1.6 }}>
          Your financial twin data. Edit via onboarding steps.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
      }}>
        {/* Card 1: Profile */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
              Profile
            </span>
            <Link href="/onboarding/step-1" style={{ fontSize: '11px', color: 'var(--brand-text)', textDecoration: 'none' }}>
              Edit →
            </Link>
          </div>
          {profile ? (
            <>
              <DataRow label="Age" value={profile.age ? `${profile.age} years` : '—'} />
              <DataRow label="City" value={profile.city ?? '—'} />
              <DataRow label="Company type" value={profile.company_type ?? '—'} />
              <DataRow label="Risk appetite" value={profile.risk_appetite ?? '—'} last />
            </>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              No profile yet.{' '}
              <Link href="/onboarding/step-1" style={{ color: 'var(--brand)' }}>Complete step 1 →</Link>
            </p>
          )}
        </div>

        {/* Card 2: Financial Model */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
              Financial Model
            </span>
            <Link href="/onboarding/step-2" style={{ fontSize: '11px', color: 'var(--brand-text)', textDecoration: 'none' }}>
              Edit →
            </Link>
          </div>
          {twin && twin.monthly_income > 0 ? (
            <>
              <DataRow label="Monthly income" value={fmt(twin.monthly_income)} />
              <DataRow label="Monthly expenses" value={fmt(twin.total_monthly_expenses)} />
              <DataRow label="Monthly surplus" value={fmt(twin.monthly_income - twin.total_monthly_expenses)} />
              <DataRow label="Savings / liquid" value={fmt(twin.current_savings)} />
              <DataRow label="Equity / MF" value={fmt(twin.equity_investments)} />
              <DataRow label="EPF balance" value={fmt(twin.epf_balance)} />
              <DataRow label="Total EMI" value={fmt(twin.total_monthly_emi)} last />
            </>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              No financial data yet.{' '}
              <Link href="/onboarding/step-2" style={{ color: 'var(--brand)' }}>Add money model →</Link>
            </p>
          )}
        </div>

        {/* Card 3: Goal & Subscriptions */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
              Goal &amp; Subscriptions
            </span>
            <Link href="/onboarding/step-3" style={{ fontSize: '11px', color: 'var(--brand-text)', textDecoration: 'none' }}>
              Edit →
            </Link>
          </div>
          {twin?.primary_goal ? (
            <>
              <DataRow label="Goal" value={GOAL_LABELS[twin.primary_goal] ?? twin.primary_goal} />
              <DataRow label="Target amount" value={fmt(twin.goal_target_amount)} />
              <DataRow
                label="Target year"
                value={String(twin.goal_target_year)}
                last={subscriptions.length === 0}
              />
            </>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: subscriptions.length > 0 ? '8px' : 0 }}>
              No goal set yet.{' '}
              <Link href="/onboarding/step-3" style={{ color: 'var(--brand)' }}>Set goal →</Link>
            </p>
          )}
          {subscriptions.length > 0 && (
            <>
              <DataRow label="Subscriptions total" value={`${fmt(monthlySubTotal)}/mo`} last />
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {subscriptions.map((sub, i) => (
                  <span key={i} style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-xs)',
                    padding: '2px 8px',
                    color: 'var(--ink-2)',
                  }}>
                    {sub.name} · ₹{sub.monthly_amount}/mo
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
