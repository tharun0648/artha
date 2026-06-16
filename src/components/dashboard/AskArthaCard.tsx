// NOTE: not currently used
'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

const SUGGESTED = [
  'Why am I short?',
  'Is my rent too high?',
  'Cut my subscriptions?',
]

export default function AskArthaCard() {
  const [input, setInput] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function ask(question: string) {
    const q = question.trim()
    if (!q) return
    setLoading(true)
    setAnswer(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: q }] }),
      })
      const data = await res.json()
      setAnswer(data.reply ?? 'Something went wrong.')
    } catch {
      setAnswer('Could not reach Artha. Please try again.')
    } finally {
      setLoading(false)
      setInput('')
    }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
      <p className="eyebrow" style={{ marginBottom: '14px' }}>Ask Artha</p>

      {/* Suggested chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {SUGGESTED.map(prompt => (
          <button
            key={prompt}
            type="button"
            disabled={loading}
            onClick={() => {
              setInput(prompt)
              inputRef.current?.focus()
            }}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '13px',
              color: 'var(--ink-2)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font)',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input + submit */}
      <form
        onSubmit={e => { e.preventDefault(); ask(input) }}
        style={{ display: 'flex', gap: '8px' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything about your finances…"
          disabled={loading}
          style={{
            flex: 1,
            height: '36px',
            padding: '0 12px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            fontSize: '14px',
            outline: 'none',
            fontFamily: 'var(--font)',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            height: '36px',
            padding: '0 16px',
            background: 'var(--brand)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !input.trim() ? 0.6 : 1,
            fontFamily: 'var(--font)',
            flexShrink: 0,
          }}
        >
          {loading ? '…' : 'Ask →'}
        </button>
      </form>

      {/* Answer block */}
      {answer && (
        <div style={{ marginTop: '12px' }}>
          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r)',
            padding: '14px 16px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-text)', marginBottom: '6px', letterSpacing: '0.04em' }}>
              Artha
            </p>
            <p style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.65, margin: 0 }}>
              {answer}
            </p>
          </div>
          <Link
            href="/decision-lab"
            style={{
              display: 'inline-block',
              marginTop: '10px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--ink-2)',
              textDecoration: 'none',
            }}
          >
            Continue this conversation →
          </Link>
        </div>
      )}
    </div>
  )
}
