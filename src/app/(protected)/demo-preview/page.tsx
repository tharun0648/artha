import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { FinancialTwin, Profile } from '@/types/twin'

const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) ? '—' : n >= 10_000_000
    ? `₹${(n / 10_000_000).toFixed(1)}Cr`
    : n >= 100_000
      ? `₹${(n / 100_000).toFixed(1)}L`
      : `₹${n.toLocaleString('en-IN')}`

const GOAL_LABELS: Record<string, string> = {
  house: 'Buy a house',
  home: 'Buy a home',
  wealth: 'Build wealth',
  safety: 'Build a safety net',
  retirement: 'Retire comfortably',
  education: 'Fund education',
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}
         className="last:border-b-0">
      <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>{label}</p>
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{value}</p>
    </div>
  )
}

export default async function DemoPreviewPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  if (user?.id !== process.env.DEMO_USER_ID) {
    redirect('/dashboard')
  }

  const [profileRes, twinRes, subsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('financial_twin').select('*').eq('user_id', user!.id).single(),
    supabase.from('subscriptions').select('name, monthly_amount').eq('user_id', user!.id),
  ])

  const profile = profileRes.data as Profile | null
  const twin = twinRes.data as FinancialTwin | null
  const subscriptions = (subsRes.data ?? []) as { name: string; monthly_amount: number }[]

  if (!profile || !twin) {
    return (
      <div style={{ maxWidth: '480px', margin: '64px auto', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginBottom: '16px' }}>Demo data not found. Contact support.</p>
        <Link href="/login" style={{ fontSize: '14px', color: 'var(--brand)' }}>Back to login</Link>
      </div>
    )
  }

  const income = Number(twin.monthly_income ?? 0)
  const expenses = Number(twin.total_monthly_expenses ?? (
    (twin.monthly_rent ?? 0) +
    (twin.monthly_food ?? 0) +
    (twin.monthly_other ?? 0) +
    (twin.monthly_transport ?? 0) +
    (twin.monthly_entertainment ?? 0) +
    (twin.total_monthly_emi ?? 0)
  ))
  const surplus = income - expenses
  const runwayMonths = (twin.current_savings ?? 0) / Math.max(1, expenses)
  const runway = isNaN(runwayMonths) ? '—' : `${runwayMonths.toFixed(1)} months`

  return (
    <div>
      {/* Demo banner */}
      <div style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '14px', color: '#92400E' }}>
          You&apos;re viewing a demo account. Sign in with Google to use A₹tha with your own data.
        </p>
        <Link href="/login" style={{ fontSize: '14px', fontWeight: 500, color: '#92400E', textDecoration: 'underline', whiteSpace: 'nowrap', marginLeft: '16px' }}>
          Sign in →
        </Link>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '24px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
            Your Financial Snapshot
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '32px' }}>
            <Row label="Age & City" value={`${profile.age} · ${profile.city}`} />
            <Row label="Monthly income" value={fmt(income)} />
            <Row label="Monthly surplus" value={fmt(surplus)} />
            <Row label="Emergency runway" value={runway} />
            <Row label="Primary goal" value={GOAL_LABELS[twin.primary_goal] ?? twin.primary_goal} />
            <Row label="Goal amount" value={fmt(Number(twin.goal_target_amount))} />
          </div>

          {subscriptions.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', letterSpacing: '0.02em', marginBottom: '10px' }}>
                Subscriptions
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {subscriptions.map((sub, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: 'var(--ink)' }}>{sub.name}</span>
                    <span style={{ fontSize: '14px', color: 'var(--ink-2)' }}>₹{sub.monthly_amount}/mo</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/dashboard"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '36px', marginTop: '24px',
              background: 'var(--brand)', color: '#fff',
              borderRadius: '6px', fontSize: '14px', fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Go to my dashboard →
          </Link>
        </div>
      </div>
    </div>
  )
}
