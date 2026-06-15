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
  if (p >= 70) return 'var(--brand)'
  if (p >= 40) return 'var(--accent)'
  return '#D94F4F'
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '16px',
}

const nested: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
}

// ── Twin sidebar ──────────────────────────────────────────────────────────────

function TwinSidebar({ twin, verdict }: { twin: FinancialTwin; verdict: VerdictOutput | null }) {
  const surplus = twin.monthly_income - twin.total_monthly_expenses
  return (
    <div style={card}>
      <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px' }}>Your Twin</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Income</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{fmt(twin.monthly_income)}/mo</p>
        </div>
        <div>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Surplus</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: surplus >= 0 ? 'var(--brand)' : '#D94F4F' }}>
            {fmt(Math.abs(surplus))}/mo
          </p>
        </div>
      </div>
      {twin.primary_goal && (
        <div style={{ marginBottom: '10px' }}>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Goal</p>
          <p style={{ fontSize: '14px', color: 'var(--ink)' }}>
            {GOAL_LABELS[twin.primary_goal] ?? twin.primary_goal} · {fmt(twin.goal_target_amount)} by {twin.goal_target_year}
          </p>
        </div>
      )}
      {verdict && (
        <div style={{ ...nested, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <p style={{ fontSize: '40px', fontWeight: 700, color: probabilityColor(verdict.goal_probability), lineHeight: 1 }}>
            {verdict.goal_probability}%
          </p>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>goal probability</p>
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '36px',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!item.trim() || !amt || amt <= 0) return
    onSubmit(item.trim(), amt)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="sm:items-center"
    >
      <div style={{ width: '100%', maxWidth: '360px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>Check a purchase</p>
          <button type="button" onClick={onClose} style={{ fontSize: '18px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', letterSpacing: '0.02em', display: 'block', marginBottom: '6px' }}>
              What are you buying?
            </label>
            <input
              type="text"
              value={item}
              onChange={e => setItem(e.target.value)}
              placeholder="e.g. iPhone 16, MacBook, Vacation"
              autoFocus
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', letterSpacing: '0.02em', display: 'block', marginBottom: '6px' }}>
              Amount (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 80000"
              min={1}
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={!item.trim() || !amount || loading}
            style={{
              width: '100%', height: '36px',
              background: 'var(--brand)', color: '#fff',
              border: 'none', borderRadius: '6px',
              fontSize: '14px', fontWeight: 500,
              cursor: !item.trim() || !amount || loading ? 'not-allowed' : 'pointer',
              opacity: !item.trim() || !amount || loading ? 0.4 : 1,
            }}
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
      <div style={card}>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>No matching cards found for your income range.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
        Recommended cards
      </p>
      {cards.map(c => (
        <div key={c.card_id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{c.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{c.issuer} · {c.tier}</p>
            </div>
            {c.is_lifetime_free ? (
              <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--brand)', background: 'var(--brand-surface)', borderRadius: '4px', padding: '2px 8px', flexShrink: 0 }}>
                Free forever
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--muted)', flexShrink: 0 }}>₹{c.annual_fee_inr}/yr</span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {c.best_for_categories.slice(0, 4).map(cat => (
              <span key={cat} style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ink-2)', background: 'var(--surface-2)', borderRadius: '4px', padding: '2px 8px' }}>
                {cat}
              </span>
            ))}
          </div>
          {c.trap_warning && (
            <p style={{ fontSize: '12px', color: 'var(--accent)' }}>⚠ {c.trap_warning}</p>
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
    <div style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: '280px', maxHeight: '420px', padding: 0 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>Ask Artha</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
        {messages.length === 0 && (
          <p style={{ fontSize: '14px', color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>Ask anything about your finances.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '14px',
              lineHeight: 1.5,
              background: m.role === 'user' ? 'var(--brand)' : 'var(--surface-2)',
              color: m.role === 'user' ? '#fff' : 'var(--ink)',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ borderRadius: '8px', padding: '8px 12px', fontSize: '14px', background: 'var(--surface-2)', color: 'var(--muted)' }}>
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your finances…"
          style={{
            flex: 1, height: '36px', padding: '8px 12px',
            background: 'var(--surface-2)', color: 'var(--ink)',
            border: '1px solid var(--border)', borderRadius: '6px',
            fontSize: '14px', outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          style={{
            height: '36px', padding: '0 16px',
            background: 'var(--brand)', color: '#fff',
            border: 'none', borderRadius: '6px',
            fontSize: '14px', fontWeight: 500,
            cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            opacity: !input.trim() || loading ? 0.4 : 1,
          }}
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

  const [scenarioInput, setScenarioInput] = useState('')
  const [simLoading, setSimLoading] = useState(false)
  const [simResult, setSimResult] = useState<SimulationResult | null>(null)
  const [simError, setSimError] = useState<string | null>(null)
  const [activeScenario, setActiveScenario] = useState<string | null>(null)

  const [spendModalOpen, setSpendModalOpen] = useState(false)
  const [spendLoading, setSpendLoading] = useState(false)
  const [spendResult, setSpendResult] = useState<SpendCheckResult | null>(null)
  const [spendError, setSpendError] = useState<string | null>(null)

  const [ccLoading, setCcLoading] = useState(false)
  const [ccResult, setCcResult] = useState<CreditCard[] | null>(null)
  const [ccError, setCcError] = useState<string | null>(null)

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
    setActiveScenario(scenario)
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!twin || twin.monthly_income === 0) {
    return (
      <div style={{ ...card, textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>Complete onboarding first</p>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: '16px' }}>The Decision Lab needs your income and goal data to run simulations.</p>
        <a href="/onboarding/step-2" style={{
          display: 'inline-flex', alignItems: 'center',
          height: '36px', padding: '0 16px',
          background: 'var(--brand)', color: '#fff',
          borderRadius: '6px', fontSize: '14px', fontWeight: 500,
          textDecoration: 'none',
        }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>Decision Lab</h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginTop: '4px', lineHeight: 1.6 }}>Simulate life decisions against your financial twin.</p>
        </div>

        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-5">
          <div className="mb-5 lg:mb-0">
            <TwinSidebar twin={twin} verdict={verdict} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Chips + custom input */}
            <div style={card}>
              <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '10px' }}>Quick scenarios</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
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
                    style={{
                      height: '36px', padding: '0 14px',
                      background: 'var(--surface)', border: '1px solid var(--border-strong)',
                      borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                      color: 'var(--ink)', cursor: anyLoading ? 'not-allowed' : 'pointer',
                      opacity: anyLoading ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (!anyLoading) e.currentTarget.style.background = 'var(--surface-2)' }}
                    onMouseLeave={e => { if (!anyLoading) e.currentTarget.style.background = 'var(--surface)' }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={e => { e.preventDefault(); const v = scenarioInput.trim(); if (v) { setScenarioInput(''); runSimulation(v) } }}
                style={{ display: 'flex', gap: '8px' }}
              >
                <input
                  type="text"
                  value={scenarioInput}
                  onChange={e => setScenarioInput(e.target.value)}
                  placeholder="Describe your scenario…"
                  style={{
                    flex: 1, height: '36px', padding: '8px 12px',
                    background: 'var(--surface-2)', color: 'var(--ink)',
                    border: '1px solid var(--border)', borderRadius: '6px',
                    fontSize: '14px', outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={!scenarioInput.trim() || anyLoading}
                  style={{
                    height: '36px', padding: '0 16px',
                    background: 'var(--brand)', color: '#fff',
                    border: 'none', borderRadius: '6px',
                    fontSize: '14px', fontWeight: 500,
                    cursor: !scenarioInput.trim() || anyLoading ? 'not-allowed' : 'pointer',
                    opacity: !scenarioInput.trim() || anyLoading ? 0.4 : 1,
                  }}
                >
                  Run
                </button>
              </form>
            </div>

            {/* Loading */}
            {anyLoading && (
              <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="w-5 h-5 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
                <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
                  {simLoading ? 'Simulating your scenario…' : spendLoading ? 'Checking your purchase…' : 'Finding best cards…'}
                </p>
              </div>
            )}

            {/* Errors */}
            {(simError || spendError || ccError) && !anyLoading && (
              <div style={{ ...card, borderColor: '#D94F4F' }}>
                <p style={{ fontSize: '14px', color: '#D94F4F' }}>{simError ?? spendError ?? ccError}</p>
              </div>
            )}

            {/* Results */}
            {simResult && !simLoading && <SimulationCard result={simResult} scenario={activeScenario ?? undefined} />}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Loading…</p>
      </div>
    }>
      <DecisionLabContent />
    </Suspense>
  )
}
