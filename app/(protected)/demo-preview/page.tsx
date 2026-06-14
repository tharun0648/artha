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
    <div className="flex justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
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
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Demo data not found. Contact support.
        </p>
        <Link href="/login" className="text-sm underline" style={{ color: 'var(--brand)' }}>
          Back to login
        </Link>
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
      <div className="w-full bg-amber-50 border-b border-amber-200 py-3 px-4 flex items-center justify-between">
        <p className="text-sm text-amber-800">
          You&apos;re viewing a demo account. Sign in with Google to use Artha with your own data.
        </p>
        <Link href="/login" className="text-sm font-medium text-amber-800 underline whitespace-nowrap ml-4">
          Sign in →
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6 mt-8">
          <h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Your Financial Snapshot
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <Row label="Age & City" value={`${profile.age} · ${profile.city}`} />
            <Row label="Monthly income" value={fmt(income)} />
            <Row label="Monthly surplus" value={fmt(surplus)} />
            <Row label="Emergency runway" value={runway} />
            <Row label="Primary goal" value={GOAL_LABELS[twin.primary_goal] ?? twin.primary_goal} />
            <Row label="Goal amount" value={fmt(Number(twin.goal_target_amount))} />
          </div>

          {subscriptions.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                Subscriptions
              </p>
              <div className="space-y-2">
                {subscriptions.map((sub, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-primary)' }}>{sub.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>₹{sub.monthly_amount}/mo</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/dashboard"
            className="mt-8 w-full flex items-center justify-center py-3 rounded-md text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ background: '#4F6F52' }}
          >
            Go to my dashboard →
          </Link>
        </div>
      </div>
    </div>
  )
}
