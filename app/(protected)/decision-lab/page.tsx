'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SimulationCard from '@/components/decision-lab/SimulationCard'
import type { SimulationResult, VerdictOutput } from '@/types/analysis'
import type { FinancialTwin } from '@/types/twin'

const QUICK_CHIPS = [
  { label: 'MBA', value: 'mba' },
  { label: 'Buy a house', value: 'home' },
  { label: 'Job switch', value: 'job-switch' },
]

const GOAL_LABELS: Record<string, string> = {
  home: 'Home',
  wealth: 'Wealth',
  safety: 'Safety net',
  retirement: 'Retirement',
  education: 'Education',
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

function TwinSidebar({ twin, verdict }: { twin: FinancialTwin; verdict: VerdictOutput | null }) {
  const surplus = twin.monthly_income - twin.total_monthly_expenses

  return (
    <div
      className="rounded-2xl border p-4 space-y-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Your Twin
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Income</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {fmt(twin.monthly_income)}/mo
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Surplus</p>
          <p
            className="text-sm font-semibold"
            style={{ color: surplus >= 0 ? 'var(--success)' : 'var(--risk-high)' }}
          >
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
        <div
          className="rounded-xl px-3 py-2 flex items-center gap-2"
          style={{ background: 'var(--bg-surface-secondary)' }}
        >
          <p
            className="text-base font-semibold tabular-nums"
            style={{ color: probabilityColor(verdict.goal_probability) }}
          >
            {verdict.goal_probability}%
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>goal probability</p>
        </div>
      )}
    </div>
  )
}

function ChatPanel({
  messages,
  onSend,
  loading,
}: {
  messages: ChatMessage[]
  onSend: (text: string) => void
  loading: boolean
}) {
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
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Ask Artha
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
            Ask anything about your finances.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
              style={
                m.role === 'user'
                  ? { background: 'var(--brand)', color: '#fff' }
                  : { background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)' }
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-3 py-2 text-sm"
              style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-muted)' }}
            >
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
          style={{
            background: 'var(--bg-surface-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
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

function DecisionLabContent() {
  const [twin, setTwin] = useState<FinancialTwin | null>(null)
  const [verdict, setVerdict] = useState<VerdictOutput | null>(null)
  const [loading, setLoading] = useState(true)

  const [scenarioInput, setScenarioInput] = useState('')
  const [simLoading, setSimLoading] = useState(false)
  const [simResult, setSimResult] = useState<SimulationResult | null>(null)
  const [simError, setSimError] = useState<string | null>(null)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: twinData }, { data: verdictData }] = await Promise.all([
        supabase.from('financial_twin').select('*').eq('user_id', user.id).single(),
        supabase
          .from('twin_analyses')
          .select('output')
          .eq('user_id', user.id)
          .eq('analysis_type', 'verdict')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
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
    setSimError(null)
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Simulation failed')
      }
      const data: SimulationResult = await res.json()
      setSimResult(data)
    } catch (e) {
      setSimError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSimLoading(false)
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
      const reply = data.reply ?? 'Something went wrong.'
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Could not reach Artha. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }, [chatMessages])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (!twin || twin.monthly_income === 0) {
    return (
      <div
        className="rounded-2xl border p-6 text-center"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Complete onboarding first
        </p>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          The Decision Lab needs your income and goal data to run simulations.
        </p>
        <a
          href="/onboarding/step-2"
          className="inline-block px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: 'var(--brand)' }}
        >
          Add money model →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Decision Lab
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Simulate life decisions against your financial twin.
        </p>
      </div>

      {/* Twin sidebar summary (stacks above on mobile, beside on lg+) */}
      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-5">
        <div className="mb-5 lg:mb-0">
          <TwinSidebar twin={twin} verdict={verdict} />
        </div>

        <div className="space-y-5">
          {/* Quick chips */}
          <div
            className="rounded-2xl border p-4"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
              Quick scenarios
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_CHIPS.map(chip => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => runSimulation(chip.value)}
                  disabled={simLoading}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50"
                  style={{
                    background: 'var(--bg-surface-secondary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                const val = scenarioInput.trim()
                if (val) { setScenarioInput(''); runSimulation(val) }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={scenarioInput}
                onChange={e => setScenarioInput(e.target.value)}
                placeholder="Describe your scenario…"
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  background: 'var(--bg-surface-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              />
              <button
                type="submit"
                disabled={!scenarioInput.trim() || simLoading}
                className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'var(--brand)' }}
              >
                Run
              </button>
            </form>
          </div>

          {/* Simulation result */}
          {simLoading && (
            <div
              className="rounded-2xl border p-6 flex items-center gap-3"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div
                className="w-5 h-5 rounded-full border-2 animate-spin shrink-0"
                style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}
              />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Simulating your scenario…
              </p>
            </div>
          )}

          {simError && !simLoading && (
            <div
              className="rounded-2xl border p-4"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--risk-high)' }}
            >
              <p className="text-sm" style={{ color: 'var(--risk-high)' }}>{simError}</p>
            </div>
          )}

          {simResult && !simLoading && <SimulationCard result={simResult} />}

          {/* Chat panel — always visible */}
          <ChatPanel messages={chatMessages} onSend={sendChat} loading={chatLoading} />
        </div>
      </div>
    </div>
  )
}

export default function DecisionLabPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        </div>
      }
    >
      <DecisionLabContent />
    </Suspense>
  )
}
