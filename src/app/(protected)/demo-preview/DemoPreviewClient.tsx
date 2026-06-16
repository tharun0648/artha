// Demo preview client: persona selector and snapshot card.
// Writes demoPersonaIdx to sessionStorage and dispatches 'demo-persona-change' events
// so the nav bar and other components update reactively without a page reload.
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fmt } from '@/lib/format'
import { DEMO_PERSONAS } from '@/lib/demo-personas'

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

export default function DemoPreviewClient() {
  const router = useRouter()
  const [selected, setSelected] = useState(1)
  const persona = DEMO_PERSONAS[selected]

  function selectPersona(idx: number) {
    setSelected(idx)
    sessionStorage.setItem('demoPersonaIdx', String(idx))
    window.dispatchEvent(new CustomEvent('demo-persona-change', { detail: idx }))
  }

  function goToDashboard() {
    sessionStorage.setItem('demoPersonaIdx', String(selected))
    router.push('/dashboard')
  }

  // Set default on mount so navbar shows the right name immediately
  useEffect(() => {
    if (!sessionStorage.getItem('demoPersonaIdx')) {
      sessionStorage.setItem('demoPersonaIdx', String(selected))
      window.dispatchEvent(new CustomEvent('demo-persona-change', { detail: selected }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Persona selector */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {DEMO_PERSONAS.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => selectPersona(i)}
            style={{
              flex: 1,
              minWidth: '140px',
              padding: '16px',
              background: selected === i ? 'var(--brand-surface)' : 'var(--surface)',
              border: `1px solid ${selected === i ? 'var(--brand)' : 'var(--border)'}`,
              borderRadius: 'var(--r-lg)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '4px' }}>{p.label}</p>
            <p style={{ fontSize: '11px', color: 'var(--muted)' }}>{fmt(p.income)}/mo</p>
          </button>
        ))}
      </div>

      {/* Snapshot card */}
      <div className="card">
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>
          Financial Snapshot · {persona.firstName}
        </h2>

        <DataRow label="Monthly income" value={fmt(persona.income)} />
        <DataRow label="Monthly surplus" value={fmt(persona.surplus)} />
        <DataRow label="Emergency runway" value={persona.runway} />
        <DataRow label="Primary goal" value={persona.goal} />
        <DataRow label="Target amount" value={persona.goal_amount} />
        <DataRow label="Target year" value={String(persona.goal_year)} />
        <DataRow
          label="Subscriptions"
          value={persona.subscriptions.join(', ')}
          last
        />

        <button
          type="button"
          onClick={goToDashboard}
          className="btn btn-primary btn-block"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '20px' }}
        >
          See {persona.firstName}&apos;s dashboard →
        </button>
      </div>
    </div>
  )
}
