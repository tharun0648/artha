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
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
          {title}
        </p>
        <Link href={editHref} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brand)', textDecoration: 'none' }}>
          Edit →
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px' }}>
      <p style={{ fontSize: '14px', color: 'var(--muted)' }}>{label}</p>
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', textAlign: 'right' }}>{value}</p>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>Settings</h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginTop: '4px', lineHeight: 1.6 }}>
          Your financial twin data. Edit via onboarding steps.
        </p>
      </div>

      <Section title="Profile" editHref="/onboarding/step-1">
        {profile ? (
          <>
            <Row label="Age" value={profile.age ? `${profile.age} years` : '—'} />
            <Row label="City" value={profile.city ?? '—'} />
            <Row label="Company type" value={profile.company_type ?? '—'} />
            <Row label="Risk appetite" value={profile.risk_appetite ?? '—'} />
          </>
        ) : (
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
            No profile yet.{' '}
            <Link href="/onboarding/step-1" style={{ color: 'var(--brand)' }}>Complete step 1 →</Link>
          </p>
        )}
      </Section>

      <Section title="Financial model" editHref="/onboarding/step-2">
        {twin && twin.monthly_income > 0 ? (
          <>
            <Row label="Monthly income" value={fmt(twin.monthly_income)} />
            <Row label="Monthly expenses" value={fmt(twin.total_monthly_expenses)} />
            <Row label="Monthly surplus" value={fmt(twin.monthly_income - twin.total_monthly_expenses)} />
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Row label="Savings / liquid" value={fmt(twin.current_savings)} />
              <Row label="Equity / MF" value={fmt(twin.equity_investments)} />
              <Row label="EPF balance" value={fmt(twin.epf_balance)} />
              <Row label="Total EMI" value={fmt(twin.total_monthly_emi)} />
            </div>
          </>
        ) : (
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
            No financial data yet.{' '}
            <Link href="/onboarding/step-2" style={{ color: 'var(--brand)' }}>Add money model →</Link>
          </p>
        )}
      </Section>

      <Section title="Goal & subscriptions" editHref="/onboarding/step-3">
        {twin?.primary_goal ? (
          <>
            <Row label="Goal" value={GOAL_LABELS[twin.primary_goal] ?? twin.primary_goal} />
            <Row label="Target amount" value={fmt(twin.goal_target_amount)} />
            <Row label="Target year" value={String(twin.goal_target_year)} />
          </>
        ) : (
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>No goal set yet.</p>
        )}

        {subscriptions.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '2px' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', letterSpacing: '0.02em', marginBottom: '8px' }}>
              Subscriptions · {fmt(monthlySubTotal)}/mo
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {subscriptions.map((sub, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>{sub.name}</p>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>₹{sub.monthly_amount}/mo</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!twin?.primary_goal && subscriptions.length === 0 && (
          <Link href="/onboarding/step-3" style={{ fontSize: '14px', color: 'var(--brand)' }}>Set goal →</Link>
        )}
      </Section>
    </div>
  )
}
