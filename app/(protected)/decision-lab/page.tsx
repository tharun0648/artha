'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SimulationCard from '@/components/decision-lab/SimulationCard'
import SpendCheckCard from '@/components/decision-lab/SpendCheckCard'
import type { SimulationResult, SpendCheckResult, VerdictOutput } from '@/types/analysis'
import type { CreditCard } from '@/types/reference'
import type { FinancialTwin } from '@/types/twin'

const QUICK_CHIPS = [
  { label: 'MBA', value: 'mba', type: 'sim' as const },
  { label: 'Buy a house', value: 'home', type: 'sim' as const },
  { label: 'Job switch', value: 'job-switch', type: 'sim' as const },
  { label: 'Check a purchase', value: 'spend', type: 'spend' as const },
  { label: 'Best credit cards', value: 'cc', type: 'cc' as const },
]

const GOAL_LABELS: Record<string, string> = {
  home: 'Home', wealth: 'Wealth', safety: 'Safety net', retirement: 'Retirement', education: 'Education',
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function fmt(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${n}`
}

function probabilityColor(p: number): string {
  if (p >= 70) return 'var(--success)'
  if (p >= 45) return 'var(--warning)'
  return 'var(--risk-high)'
}

// ── Twin sidebar ──────────────────────────────────────────────────────────────

function TwinSidebar({ twin, verdict }: { twin: FinancialTwin; verdict: VerdictOutput | null }) {
  const surplus = twin.monthly_income - twin.total_monthly_expenses
  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Your Twin</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Income</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(twin.monthly_income)}/mo</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Surplus</p>
          <p className="text-sm font-semibold" style={{ color: surplus >= 0 ? 'var(--success)' : 'var(--risk-high)' }}>
            {fmt(Math.abs(surplus))}/mo
          </p>
        </div>
      </div>
      {twin.primary_goal && (
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Goal</p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {GOAL_LABELS[twin.primary_goal] ?? twin.primary_goal} · {fmt(twin.goal_target_amount)} by {twin.goal_target_year}
          </p>
        </div>
      )}
      {verdict && (
        <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: 'var(--bg-surface-secondary)' }}>
          <p className="text-base font-semibold tabular-nums" style={{ color: probabilityColor(verdict.goal_probability) }}>
            {verdict.goal_probability}%
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>goal probability</p>
        </div>
      )}
    </div>
  )
}

// ── Spend-check modal ─────────────────────────────────────────────────────────

function SpendCheckModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void
  onSubmit: (item: string, amount: number) => void
  loading: boolean
}) {
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!item.trim() || !amt || amt <= 0) return
    onSubmit(item.trim(), amt)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Check a purchase</p>
          <button
            type="button"
            onClick={onClose}
            className="text-lg leading-none"
            style={{ color: 'var(--text-muted)' }}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
              What are you buying?
            </label>
            <input
              type="text"
              value={item}
              onChange={e => setItem(e.target.value)}
              placeholder="e.g. iPhone 16, MacBook, Vacation"
              autoFocus
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Amount (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 80000"
              min={1}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          <button
            type="submit"
            disabled={!item.trim() || !amount || loading}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-40"
            style={{ background: 'var(--brand)' }}
          >
            {loading ? 'Checking…' : 'Check it →'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Credit card result ────────────────────────────────────────────────────────

function CreditCardResults({ cards }: { cards: CreditCard[] }) {
  if (!cards.length) {
    return (
      <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No matching cards found for your income range.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Recommended cards
      </p>
      {cards.map(card => (
        <div
          key={card.card_id}
          className="rounded-2xl border p-4 space-y-2"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{card.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.issuer} · {card.tier}</p>
            </div>
            {card.is_lifetime_free ? (
              <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                Free forever
              </span>
            ) : (
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                ₹{card.annual_fee_inr}/yr
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {card.best_for_categories.slice(0, 4).map(cat => (
              <span
                key={cat}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                {cat}
              </span>
            ))}
          </div>
          {card.trap_warning && (
            <p className="text-xs" style={{ color: 'var(--risk-medium)' }}>⚠ {card.trap_warning}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Chat panel ────────────────────────────────────────────────────────────────

function ChatPanel({ messages, onSend, loading }: { messages: ChatMessage[]; onSend: (t: string) => void; loading: boolean }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    onSend(text)
  }

  return (
    <div
      className="rounded-2xl border flex flex-col"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', minHeight: '280px', maxHeight: '420px' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Ask Artha</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Ask anything about your finances.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
              style={m.role === 'user'
                ? { background: 'var(--brand)', color: '#fff' }
                : { background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)' }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3 py-2 text-sm" style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-muted)' }}>
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="px-3 py-3 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your finances…"
          className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          style={{ background: 'var(--brand)' }}
        >
          Send
        </button>
      </form>
    </div>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────

function DecisionLabContent() {
  const [twin, setTwin] = useState<FinancialTwin | null>(null)
  const [verdict, setVerdict] = useState<VerdictOutput | null>(null)
  const [loading, setLoading] = useState(true)

  // Simulate
  const [scenarioInput, setScenarioInput] = useState('')
  const [simLoading, setSimLoading] = useState(false)
  const [simResult, setSimResult] = useState<SimulationResult | null>(null)
  const [simError, setSimError] = useState<string | null>(null)

  // Spend check
  const [spendModalOpen, setSpendModalOpen] = useState(false)
  const [spendLoading, setSpendLoading] = useState(false)
  const [spendResult, setSpendResult] = useState<SpendCheckResult | null>(null)
  const [spendError, setSpendError] = useState<string | null>(null)

  // Credit cards
  const [ccLoading, setCcLoading] = useState(false)
  const [ccResult, setCcResult] = useState<CreditCard[] | null>(null)
  const [ccError, setCcError] = useState<string | null>(null)

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: twinData }, { data: verdictData }] = await Promise.all([
        supabase.from('financial_twin').select('*').eq('user_id', user.id).single(),
        supabase.from('twin_analyses').select('output').eq('user_id', user.id).eq('analysis_type', 'verdict')
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      setTwin(twinData ?? null)
      setVerdict((verdictData?.output as VerdictOutput | undefined) ?? null)
      setLoading(false)
    }
    load()
  }, [])

  const runSimulation = useCallback(async (scenario: string) => {
    setSimLoading(true)
    setSimResult(null)
    setSpendResult(null)
    setCcResult(null)
    setSimError(null)
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Simulation failed')
      setSimResult(await res.json())
    } catch (e) {
      setSimError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSimLoading(false)
    }
  }, [])

  const runSpendCheck = useCallback(async (item: string, amount: number) => {
    setSpendLoading(true)
    setSpendResult(null)
    setSimResult(null)
    setCcResult(null)
    setSpendError(null)
    setSpendModalOpen(false)
    try {
      const res = await fetch('/api/spend-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, amount }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Spend check failed')
      setSpendResult(await res.json())
    } catch (e) {
      setSpendError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSpendLoading(false)
    }
  }, [])

  const runCreditCards = useCallback(async () => {
    setCcLoading(true)
    setCcResult(null)
    setSimResult(null)
    setSpendResult(null)
    setCcError(null)
    try {
      const res = await fetch('/api/credit-card', { method: 'POST' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to load cards')
      const data = await res.json()
      setCcResult(data.cards ?? [])
    } catch (e) {
      setCcError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setCcLoading(false)
    }
  }, [])

  const sendChat = useCallback(async (text: string) => {
    const updated: ChatMessage[] = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(updated)
    setChatLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? 'Something went wrong.' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Could not reach Artha. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }, [chatMessages])

  const anyLoading = simLoading || spendLoading || ccLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!twin || twin.monthly_income === 0) {
    return (
      <div className="rounded-2xl border p-6 text-center" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Complete onboarding first</p>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>The Decision Lab needs your income and goal data to run simulations.</p>
        <a href="/onboarding/step-2" className="inline-block px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: 'var(--brand)' }}>
          Add money model →
        </a>
      </div>
    )
  }

  return (
    <>
      {spendModalOpen && (
        <SpendCheckModal
          onClose={() => setSpendModalOpen(false)}
          onSubmit={runSpendCheck}
          loading={spendLoading}
        />
      )}

      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Decision Lab</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Simulate life decisions against your financial twin.</p>
        </div>

        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-5">
          <div className="mb-5 lg:mb-0">
            <TwinSidebar twin={twin} verdict={verdict} />
          </div>

          <div className="space-y-5">
            {/* Chips + custom input */}
            <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Quick scenarios</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {QUICK_CHIPS.map(chip => (
                  <button
                    key={chip.value}
                    type="button"
                    disabled={anyLoading}
                    onClick={() => {
                      if (chip.type === 'sim') runSimulation(chip.value)
                      else if (chip.type === 'spend') setSpendModalOpen(true)
                      else if (chip.type === 'cc') runCreditCards()
                    }}
                    className="px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50"
                    style={{ background: 'var(--bg-surface-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={e => { e.preventDefault(); const v = scenarioInput.trim(); if (v) { setScenarioInput(''); runSimulation(v) } }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={scenarioInput}
                  onChange={e => setScenarioInput(e.target.value)}
                  placeholder="Describe your scenario…"
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                />
                <button
                  type="submit"
                  disabled={!scenarioInput.trim() || anyLoading}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  style={{ background: 'var(--brand)' }}
                >
                  Run
                </button>
              </form>
            </div>

            {/* Loading state */}
            {anyLoading && (
              <div className="rounded-2xl border p-6 flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="w-5 h-5 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {simLoading ? 'Simulating your scenario…' : spendLoading ? 'Checking your purchase…' : 'Finding best cards…'}
                </p>
              </div>
            )}

            {/* Error states */}
            {(simError || spendError || ccError) && !anyLoading && (
              <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--risk-high)' }}>
                <p className="text-sm" style={{ color: 'var(--risk-high)' }}>{simError ?? spendError ?? ccError}</p>
              </div>
            )}

            {/* Results */}
            {simResult && !simLoading && <SimulationCard result={simResult} />}
            {spendResult && !spendLoading && <SpendCheckCard result={spendResult} />}
            {ccResult && !ccLoading && <CreditCardResults cards={ccResult} />}

            {/* Chat */}
            <ChatPanel messages={chatMessages} onSend={sendChat} loading={chatLoading} />
          </div>
        </div>
      </div>
    </>
  )
}

export default function DecisionLabPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    }>
      <DecisionLabContent />
    </Suspense>
  )
}
