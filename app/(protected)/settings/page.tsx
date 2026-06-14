import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import type { FinancialTwin, Profile, Subscription } from '@/types/twin'

function fmt(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${Math.round(n)}`
}

const GOAL_LABELS: Record<string, string> = {
  home: 'Home',
  wealth: 'Wealth',
  safety: 'Safety net',
  retirement: 'Retirement',
  education: 'Education',
}

function Section({
  title,
  editHref,
  children,
}: {
  title: string
  editHref: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {title}
        </p>
        <Link
          href={editHref}
          className="text-xs font-medium"
          style={{ color: 'var(--brand)' }}
        >
          Edit →
        </Link>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-medium text-right" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, twinRes, subsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('financial_twin').select('*').eq('user_id', user!.id).single(),
    supabase.from('subscriptions').select('name,monthly_amount,category').eq('user_id', user!.id).eq('is_active', true),
  ])

  const profile = profileRes.data as Profile | null
  const twin = twinRes.data as FinancialTwin | null
  const subscriptions = (subsRes.data ?? []) as Pick<Subscription, 'name' | 'monthly_amount' | 'category'>[]

  const monthlySubTotal = subscriptions.reduce((s, sub) => s + sub.monthly_amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Your financial twin data. Edit via onboarding steps.
        </p>
      </div>

      {/* Section 1: Profile */}
      <Section title="Profile" editHref="/onboarding/step-1">
        {profile ? (
          <>
            <Row label="Age" value={profile.age ? `${profile.age} years` : '—'} />
            <Row label="City" value={profile.city ?? '—'} />
            <Row label="Company type" value={profile.company_type ?? '—'} />
            <Row label="Risk appetite" value={profile.risk_appetite ?? '—'} />
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No profile yet.{' '}
            <Link href="/onboarding/step-1" style={{ color: 'var(--brand)' }}>Complete step 1 →</Link>
          </p>
        )}
      </Section>

      {/* Section 2: Financial model */}
      <Section title="Financial model" editHref="/onboarding/step-2">
        {twin && twin.monthly_income > 0 ? (
          <>
            <Row label="Monthly income" value={fmt(twin.monthly_income)} />
            <Row label="Monthly expenses" value={fmt(twin.total_monthly_expenses)} />
            <Row label="Monthly surplus" value={fmt(twin.monthly_income - twin.total_monthly_expenses)} />
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
              <Row label="Savings / liquid" value={fmt(twin.current_savings)} />
              <div className="mt-3">
                <Row label="Equity / MF" value={fmt(twin.equity_investments)} />
              </div>
              <div className="mt-3">
                <Row label="EPF balance" value={fmt(twin.epf_balance)} />
              </div>
              <div className="mt-3">
                <Row label="Total EMI" value={fmt(twin.total_monthly_emi)} />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No financial data yet.{' '}
            <Link href="/onboarding/step-2" style={{ color: 'var(--brand)' }}>Add money model →</Link>
          </p>
        )}
      </Section>

      {/* Section 3: Goal + subscriptions */}
      <Section title="Goal & subscriptions" editHref="/onboarding/step-3">
        {twin?.primary_goal ? (
          <>
            <Row label="Goal" value={GOAL_LABELS[twin.primary_goal] ?? twin.primary_goal} />
            <Row label="Target amount" value={fmt(twin.goal_target_amount)} />
            <Row label="Target year" value={String(twin.goal_target_year)} />
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No goal set yet.</p>
        )}

        {subscriptions.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Subscriptions · {fmt(monthlySubTotal)}/mo
            </p>
            <div className="space-y-2">
              {subscriptions.map((sub, i) => (
                <div key={i} className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{sub.name}</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    ₹{sub.monthly_amount}/mo
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!twin?.primary_goal && subscriptions.length === 0 && (
          <Link href="/onboarding/step-3" className="text-sm" style={{ color: 'var(--brand)' }}>
            Set goal →
          </Link>
        )}
      </Section>
    </div>
  )
}
