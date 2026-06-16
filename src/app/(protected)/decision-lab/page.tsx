// Decision Lab: simulation, spend-check, credit card, and chat panels.
// Demo mode: all API calls include twinOverride/profileOverride from the active persona,
// so the server never reads Aarav's DB data when a demo persona is selected.
'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SimulationCard from '@/components/decision-lab/SimulationCard'
import SpendCheckCard from '@/components/decision-lab/SpendCheckCard'
import type { SimulationResult, SpendCheckResult, VerdictOutput } from '@/types/analysis'
import type { CreditCard } from '@/types/reference'
import type { FinancialTwin } from '@/types/twin'
import { fmt } from '@/lib/format'
import { DEMO_PERSONAS } from '@/lib/demo-personas'

// ── Types ─────────────────────────────────────────────────────────────────────

type PanelId = 'mba' | 'home' | 'job-switch' | 'spend' | 'cc' | 'chat'
type ScenarioType = 'sim' | 'spend' | 'cc'
type ChatMessage = { role: 'user' | 'assistant'; content: string }

const SCENARIOS: Array<{ id: PanelId; label: string; desc: string; type: ScenarioType }> = [
  { id: 'mba',        label: 'Should I do an MBA?',          desc: 'See if the ROI makes sense for you',   type: 'sim'   },
  { id: 'home',       label: 'Can I afford to buy a flat?',  desc: 'Model down payment + EMI impact',      type: 'sim'   },
  { id: 'job-switch', label: 'What if I switch jobs?',       desc: 'Run a career-change scenario',         type: 'sim'   },
  { id: 'spend',      label: 'Should I buy something?',      desc: 'Check if a purchase fits your plan',   type: 'spend' },
  { id: 'cc',         label: 'Which credit card suits me?',  desc: 'Matched to your spending',             type: 'cc'    },
]

const GOAL_LABELS: Record<string, string> = {
  home: 'Home', wealth: 'Wealth', safety: 'Safety net', retirement: 'Retirement', education: 'Education',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function probabilityColor(p: number): string {
  if (p >= 70) return 'var(--brand)'
  if (p >= 40) return 'var(--accent)'
  return 'var(--negative)'
}

function healthColor(h: number): string {
  if (h >= 70) return 'var(--brand)'
  if (h >= 45) return 'var(--accent)'
  return 'var(--negative)'
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

// ── Scenario icons ────────────────────────────────────────────────────────────

function ScenarioIcon({ id }: { id: PanelId }) {
  const p = {
    width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'var(--brand-text)', strokeWidth: 2,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  if (id === 'mba') return (
    <svg {...p}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
  if (id === 'home') return (
    <svg {...p}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
  if (id === 'job-switch') return (
    <svg {...p}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
  if (id === 'spend') return (
    <svg {...p}>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
  if (id === 'cc') return (
    <svg {...p}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
  return (
    <svg {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

// ── Twin card ─────────────────────────────────────────────────────────────────

function TwinCard({ twin, verdict, firstName }: {
  twin: FinancialTwin
  verdict: VerdictOutput | null
  firstName: string
}) {
  const surplus = twin.monthly_income - twin.total_monthly_expenses
  const healthTotal = verdict?.health_score.total ?? null

  const summaryRows: Array<{ label: string; value: string; color: string }> = [
    { label: 'Income',  value: `${fmt(twin.monthly_income)}/mo`, color: 'var(--ink)' },
    { label: 'Surplus', value: `${surplus >= 0 ? '' : '−'}${fmt(Math.abs(surplus))}/mo`, color: surplus >= 0 ? 'var(--brand)' : 'var(--negative)' },
  ]
  if (twin.primary_goal) {
    const goalAmt = twin.goal_target_amount > 0 ? ` · ${fmt(twin.goal_target_amount)}` : ''
    summaryRows.push({
      label: 'Goal',
      value: `${GOAL_LABELS[twin.primary_goal] ?? twin.primary_goal}${goalAmt} · ${twin.goal_target_year}`,
      color: 'var(--ink)',
    })
  }
  if (healthTotal !== null) {
    summaryRows.push({ label: 'Health', value: `${healthTotal}/100`, color: healthColor(healthTotal) })
  }
  if (verdict) {
    const p = verdict.goal_probability
    const label = p >= 85 ? 'well on track' : p >= 65 ? 'on track' : p >= 40 ? 'reachable' : 'at risk'
    summaryRows.push({ label: 'Outlook', value: label, color: probabilityColor(p) })
  }

  function expFmt(v: number | null | undefined): string {
    if (!v || v === 0) return '—'
    return `${fmt(v)}/mo`
  }

  const expenseRows: Array<{ label: string; value: string }> = [
    { label: 'Rent / mo',      value: expFmt(twin.monthly_rent) },
    { label: 'Total EMI / mo', value: expFmt(twin.total_monthly_emi) },
    { label: 'Food / mo',      value: expFmt(twin.monthly_food) },
    { label: 'Entertainment',  value: expFmt(twin.monthly_entertainment) },
  ]

  return (
    <div style={{
      background: 'linear-gradient(160deg, var(--brand-surface), var(--surface))',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      padding: '18px',
      marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div className="pulse-dot" />
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-text)', margin: 0 }}>
          {firstName}&apos;s twin
        </p>
      </div>

      {summaryRows.map((row, i) => (
        <div key={row.label}>
          {i > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '9px 0' }} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: row.color, fontVariantNumeric: 'tabular-nums' }}>
              {row.value}
            </span>
          </div>
        </div>
      ))}

      {/* Expense group */}
      <div style={{ height: 1, background: 'var(--border)', margin: '12px 0 10px' }} />
      <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', margin: '0 0 8px' }}>
        EXPENSES
      </p>
      {expenseRows.map((row, i) => (
        <div key={row.label}>
          {i > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '7px 0' }} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{row.label}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {row.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Scenario buttons ──────────────────────────────────────────────────────────

function ScenarioButtons({ activePanel, onSelect, disabled }: {
  activePanel: PanelId | null
  onSelect: (id: PanelId, type: ScenarioType) => void
  disabled: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {SCENARIOS.map((s) => {
        const isActive = activePanel === s.id
        return (
          <div key={s.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(s.id, s.type)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '9px 11px',
                background: isActive ? 'var(--brand-surface)' : 'var(--surface)',
                border: `1px solid ${isActive ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 'var(--r-sm)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.55 : 1,
                transition: 'border-color 0.14s, background 0.14s, transform 0.14s, box-shadow 0.14s',
                textAlign: 'left',
                fontFamily: 'var(--font)',
              }}
              onMouseEnter={e => {
                if (disabled || isActive) return
                e.currentTarget.style.borderColor = 'var(--brand)'
                e.currentTarget.style.boxShadow = 'var(--sh-sm)'
                e.currentTarget.style.transform = 'translateX(2px)'
              }}
              onMouseLeave={e => {
                if (disabled || isActive) return
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'none'
              }}
            >
              <div style={{
                width: 34, height: 34,
                background: isActive ? 'var(--brand-surface-2)' : 'var(--brand-surface)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <ScenarioIcon id={s.id} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: isActive ? 'var(--brand-text)' : 'var(--ink)', lineHeight: 1.2, margin: 0 }}>
                  {s.label}
                </p>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, lineHeight: 1.3, margin: '2px 0 0' }}>
                  {s.desc}
                </p>
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Result wrapper (dismiss button + fade-in) ─────────────────────────────────

function ResultWrapper({ onDismiss, children }: { onDismiss: () => void; children: React.ReactNode }) {
  return (
    <div style={{ animation: 'rise 0.35s ease both' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          onClick={onDismiss}
          style={{
            width: 32, height: 32,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-xs)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, lineHeight: 1,
            color: 'var(--muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            transition: 'color 0.14s, border-color 0.14s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  )
}

// ── Default panel ─────────────────────────────────────────────────────────────

function DefaultPanel({ twin, verdict, onQuickAsk, spendDismissMsg }: { twin: FinancialTwin; verdict: VerdictOutput | null; onQuickAsk: (text: string) => void; spendDismissMsg?: string }) {
  const [quickInput, setQuickInput] = useState('')

  function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = quickInput.trim()
    if (!text) return
    setQuickInput('')
    onQuickAsk(text)
  }
  const surplus = twin.monthly_income - twin.total_monthly_expenses
  const savingsRate = twin.monthly_income > 0 ? Math.round((surplus / twin.monthly_income) * 100) : 0
  const runway = twin.total_monthly_expenses > 0 ? Math.round(twin.current_savings / twin.total_monthly_expenses) : 0
  const goalLabel = GOAL_LABELS[twin.primary_goal ?? ''] ?? twin.primary_goal ?? 'goal'
  const gap = twin.goal_target_amount - twin.current_savings

  let sentence: string
  if (twin.primary_goal && twin.goal_target_amount > 0) {
    if (gap > 0) {
      sentence = `You're ${fmt(gap)} short of your ${goalLabel} goal. Here's what's standing in the way.`
    } else {
      sentence = `You're ${fmt(Math.abs(gap))} ahead of your ${goalLabel} target. Here's how to stay on track.`
    }
  } else if (verdict) {
    sentence = "Your twin is ready. Pick a scenario to see the impact on your numbers."
  } else {
    sentence = "Your financial twin is set up. Simulate any decision on the left."
  }

  const topFactors = (verdict?.causal_attribution ?? [])
    .slice()
    .sort((a, b) => b.contribution_pct - a.contribution_pct)
    .slice(0, 3)

  const stats: Array<{ label: string; value: string; color?: string }> = [
    { label: 'Income',       value: `${fmt(twin.monthly_income)}/mo` },
    { label: 'Surplus',      value: `${fmt(Math.abs(surplus))}/mo`, color: surplus >= 0 ? 'var(--brand)' : 'var(--negative)' },
    { label: 'Savings rate', value: `${savingsRate}%`, color: savingsRate >= 20 ? 'var(--brand)' : savingsRate >= 10 ? 'var(--accent)' : 'var(--negative)' },
    { label: 'Runway',       value: runway > 0 ? `${runway} mo` : '—' },
  ]

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px' }}>
      {/* Quick ask bar */}
      <form onSubmit={handleQuickSubmit} style={{ display: 'flex', gap: 8, marginBottom: spendDismissMsg ? 8 : 20 }}>
        <input
          className="input"
          type="text"
          value={quickInput}
          onChange={e => setQuickInput(e.target.value)}
          placeholder="Ask anything about your finances..."
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={!quickInput.trim()} className="btn btn-primary btn-sm">
          Ask →
        </button>
      </form>
      {spendDismissMsg && (
        <p style={{ fontSize: 13, color: 'var(--positive)', fontStyle: 'italic', marginBottom: 20 }}>
          {spendDismissMsg}
        </p>
      )}

      <p className="eyebrow" style={{ marginBottom: 12 }}>Your financial twin</p>

      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.35, color: 'var(--ink)', margin: '0 0 22px' }}>
        {sentence}
      </p>

      {topFactors.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          {topFactors.map(f => (
            <div key={f.rank}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{f.factor}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-text)', fontVariantNumeric: 'tabular-nums' }}>
                  {f.contribution_pct}%
                </span>
              </div>
              <div style={{ height: 3, background: 'var(--brand-surface)', borderRadius: 2 }}>
                <div style={{ height: 3, width: `${f.contribution_pct}%`, background: 'var(--brand)', borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'var(--surface-2)', padding: '12px 14px' }}>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '0 0 4px', fontWeight: 500 }}>{s.label}</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: s.color ?? 'var(--ink)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
        Pick a scenario on the left to simulate the impact on these numbers.
      </p>
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
    width: '100%', height: '36px', padding: '8px 12px',
    borderRadius: '6px', border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--ink)',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
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
              type="text" value={item} onChange={e => setItem(e.target.value)}
              placeholder="e.g. iPhone 16, MacBook, Vacation"
              autoFocus style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', letterSpacing: '0.02em', display: 'block', marginBottom: '6px' }}>
              Amount (₹)
            </label>
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 80000" min={1} style={inputStyle}
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

// ── Credit card results ───────────────────────────────────────────────────────

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
    <div style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: '400px', maxHeight: '560px', padding: 0 }}>
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
              maxWidth: '85%', borderRadius: '8px', padding: '8px 12px',
              fontSize: '14px', lineHeight: 1.5,
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
          type="text" value={input} onChange={e => setInput(e.target.value)}
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
  const searchParams = useSearchParams()
  const [twin, setTwin] = useState<FinancialTwin | null>(null)
  const [verdict, setVerdict] = useState<VerdictOutput | null>(null)
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('Your')

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
  const pendingChatRef = useRef<string | null>(null)

  const [activePanel, setActivePanel] = useState<PanelId | null>(null)
  const [spendDismissMsg, setSpendDismissMsg] = useState('')

  useEffect(() => {
    async function load() {
      // Demo persona override
      const demoIdxRaw = sessionStorage.getItem('demoPersonaIdx')
      if (demoIdxRaw !== null) {
        const idx = parseInt(demoIdxRaw, 10)
        const persona = DEMO_PERSONAS[idx]
        if (persona) {
          setFirstName(persona.firstName)
          setTwin(persona.twin)
          setVerdict(persona.verdict)
          setLoading(false)
          return
        }
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const fullName = user.user_metadata?.full_name
      const fn = typeof fullName === 'string' ? fullName.split(' ')[0] : undefined
      if (fn) setFirstName(fn)
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

  // Handle ?panel=chat&q= query params
  useEffect(() => {
    if (loading) return
    const panel = searchParams.get('panel')
    const q = searchParams.get('q')
    if (panel === 'chat') {
      setActivePanel('chat')
      if (q) {
        pendingChatRef.current = decodeURIComponent(q)
      }
    }
  }, [loading, searchParams])

  const runSimulation = useCallback(async (scenario: string) => {
    setSimLoading(true)
    setSimResult(null)
    setActiveScenario(scenario)
    setSpendResult(null)
    setCcResult(null)
    setSimError(null)
    try {
      const demoIdxRaw = sessionStorage.getItem('demoPersonaIdx')
      const demoOverrides = demoIdxRaw !== null
        ? (() => {
            const persona = DEMO_PERSONAS[parseInt(demoIdxRaw, 10)]
            return persona ? { twinOverride: persona.twin, profileOverride: persona.profile } : {}
          })()
        : {}

      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, ...demoOverrides }),
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
      const demoIdxRaw = sessionStorage.getItem('demoPersonaIdx')
      const demoOverrides = demoIdxRaw !== null
        ? (() => {
            const persona = DEMO_PERSONAS[parseInt(demoIdxRaw, 10)]
            return persona ? { twinOverride: persona.twin, profileOverride: persona.profile } : {}
          })()
        : {}

      const res = await fetch('/api/spend-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, amount, ...demoOverrides }),
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
      const demoIdxRaw = sessionStorage.getItem('demoPersonaIdx')
      const body = demoIdxRaw !== null
        ? (() => {
            const persona = DEMO_PERSONAS[parseInt(demoIdxRaw, 10)]
            return persona
              ? JSON.stringify({ twinOverride: persona.twin, subsOverride: persona.subscriptionDetails })
              : undefined
          })()
        : undefined

      const res = await fetch('/api/credit-card', {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      })
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
      const demoIdxRaw = sessionStorage.getItem('demoPersonaIdx')
      const demoOverrides = demoIdxRaw !== null
        ? (() => {
            const persona = DEMO_PERSONAS[parseInt(demoIdxRaw, 10)]
            return persona ? {
              twinOverride: persona.twin,
              profileOverride: persona.profile,
              subsOverride: persona.subscriptionDetails,
              verdictOverride: persona.verdict,
            } : {}
          })()
        : {}

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, ...demoOverrides }),
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? 'Something went wrong.' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Could not reach Artha. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }, [chatMessages])

  // Fire pending chat message after ChatPanel renders
  useEffect(() => {
    if (activePanel !== 'chat' || !pendingChatRef.current) return
    const msg = pendingChatRef.current
    pendingChatRef.current = null
    const timer = setTimeout(() => { sendChat(msg) }, 300)
    return () => clearTimeout(timer)
  }, [activePanel, sendChat])

  const handleQuickAsk = useCallback((text: string) => {
    setActivePanel('chat')
    pendingChatRef.current = text
  }, [])

  const handleScenarioSelect = useCallback((id: PanelId, type: ScenarioType) => {
    setActivePanel(id)
    if (type === 'sim') runSimulation(id)
    else if (type === 'spend') setSpendModalOpen(true)
    else if (type === 'cc') runCreditCards()
  }, [runSimulation, runCreditCards])

  const resetPanel = useCallback(() => {
    setActivePanel(null)
    setSimResult(null)
    setSpendResult(null)
    setCcResult(null)
    setSimError(null)
    setSpendError(null)
    setCcError(null)
  }, [])

  const handleSpendDismiss = useCallback((msg: string) => {
    setSpendResult(null)
    setActivePanel(null)
    setSpendDismissMsg(msg)
    setTimeout(() => setSpendDismissMsg(''), 3000)
  }, [])

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

  function renderRightPanel() {
    if (activePanel === 'chat') {
      return <ChatPanel messages={chatMessages} onSend={sendChat} loading={chatLoading} />
    }
    if (anyLoading) {
      return (
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px' }}>
          <div className="w-5 h-5 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
          <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0 }}>
            {simLoading ? 'Simulating your scenario…' : spendLoading ? 'Checking your purchase…' : 'Finding best cards…'}
          </p>
        </div>
      )
    }
    const error = simError ?? spendError ?? ccError
    if (error) {
      return (
        <ResultWrapper onDismiss={resetPanel}>
          <div style={{ ...card, borderColor: 'var(--negative)' }}>
            <p style={{ fontSize: 14, color: 'var(--negative)', margin: 0 }}>{error}</p>
          </div>
        </ResultWrapper>
      )
    }
    if (simResult && !simLoading) {
      return (
        <ResultWrapper onDismiss={resetPanel}>
          <SimulationCard result={simResult} scenario={activeScenario ?? undefined} />
        </ResultWrapper>
      )
    }
    if (spendResult && !spendLoading) {
      return (
        <ResultWrapper onDismiss={resetPanel}>
          <SpendCheckCard result={spendResult} onDismiss={resetPanel} onDismissWithMsg={handleSpendDismiss} />
        </ResultWrapper>
      )
    }
    if (ccResult && !ccLoading) {
      return (
        <ResultWrapper onDismiss={resetPanel}>
          <CreditCardResults cards={ccResult} />
        </ResultWrapper>
      )
    }
    return <DefaultPanel twin={twin!} verdict={verdict} onQuickAsk={handleQuickAsk} spendDismissMsg={spendDismissMsg} />
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

      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>Decision Lab</h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', margin: 0, lineHeight: 1.6 }}>
          Ask the hard money questions. Get answers based on your actual numbers.
        </p>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
        {([
          { label: 'Dashboard', href: '/dashboard', active: false },
          { label: 'Decision Lab', href: '/decision-lab', active: true },
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

      <div className="lab-grid">
        {/* Left sidebar */}
        <aside>
          <TwinCard twin={twin} verdict={verdict} firstName={firstName} />
          <ScenarioButtons activePanel={activePanel} onSelect={handleScenarioSelect} disabled={anyLoading} />
        </aside>

        {/* Right panel */}
        <main>
          {renderRightPanel()}
        </main>
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
