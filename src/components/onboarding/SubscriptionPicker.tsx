'use client'

import { useState, useEffect } from 'react'
import { SUBSCRIPTION_CATEGORIES } from '@/lib/subscriptions-data'
import { fmt } from '@/lib/format'

export type SubscriptionRow = { name: string; monthly_amount: number; category: string }

interface Props {
  onChange: (subs: SubscriptionRow[]) => void
}

function primaryPlan(plans: { label: string; amount: number }[]): { label: string; amount: number } | null {
  const nonZero = plans.filter(p => p.amount > 0)
  if (!nonZero.length) return null
  return nonZero.reduce((min, p) => p.amount < min.amount ? p : min)
}

export default function SubscriptionPicker({ onChange }: Props) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['entertainment']))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [customSubs, setCustomSubs] = useState<string[]>([])
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customInputValue, setCustomInputValue] = useState('')

  const totalMonthly = Array.from(selected).reduce((sum, serviceId) => {
    for (const cat of SUBSCRIPTION_CATEGORIES) {
      const svc = cat.services.find(s => s.id === serviceId)
      if (svc) {
        const plan = primaryPlan(svc.plans)
        return sum + (plan?.amount ?? 0)
      }
    }
    return sum
  }, 0) + (customSubs.length * 500)

  const opportunityCost10yr = Math.round(totalMonthly * 12 * ((Math.pow(1.125, 10) - 1) / 0.125))

  useEffect(() => {
    const subs: SubscriptionRow[] = []
    for (const cat of SUBSCRIPTION_CATEGORIES) {
      for (const svc of cat.services) {
        if (selected.has(svc.id)) {
          const plan = primaryPlan(svc.plans)
          if (plan) subs.push({ name: svc.name, monthly_amount: plan.amount, category: cat.key })
        }
      }
    }
    for (const customSub of customSubs) {
      subs.push({ name: customSub, monthly_amount: 500, category: 'custom' })
    }
    onChange(subs)
  }, [selected, customSubs, onChange])

  function toggleCategory(key: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleService(serviceId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(serviceId) ? next.delete(serviceId) : next.add(serviceId)
      return next
    })
  }

  function addCustomSubscription(name: string) {
    if (name.trim() && customSubs.length < 5) {
      setCustomSubs(prev => [...prev, name.trim()])
      setCustomInputValue('')
      setShowCustomInput(false)
    }
  }

  function removeCustomSubscription(name: string) {
    setCustomSubs(prev => prev.filter(s => s !== name))
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault()
    addCustomSubscription(customInputValue)
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {SUBSCRIPTION_CATEGORIES.map(cat => {
          const isExpanded = expandedCategories.has(cat.key)
          const selectedCount = cat.services.filter(s => selected.has(s.id)).length
          const validServices = cat.services.filter(s => primaryPlan(s.plans))

          if (!validServices.length) return null

          return (
            <div key={cat.key} style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => toggleCategory(cat.key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--surface)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {cat.label}
                  {selectedCount > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--brand)', background: 'var(--brand-surface)', borderRadius: '4px', padding: '2px 6px' }}>
                      {selectedCount}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{isExpanded ? '▲' : '▶'}</span>
              </button>

              {isExpanded && (
                <div style={{ padding: '10px 14px', paddingTop: '8px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {validServices.map(svc => {
                    const plan = primaryPlan(svc.plans)!
                    const isSelected = selected.has(svc.id)
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleService(svc.id)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${isSelected ? 'var(--brand)' : 'var(--border)'}`,
                          background: isSelected ? 'var(--brand-surface)' : 'var(--surface)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.1s',
                        }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: 500, color: isSelected ? 'var(--brand)' : 'var(--ink)' }}>
                          {isSelected && <span style={{ marginRight: '4px' }}>✓</span>}
                          {svc.name}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>₹{plan.amount}/mo</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px' }}>
        Showing primary plans — expanded plan list available post-launch.
      </p>

      {totalMonthly > 0 && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px 14px', marginTop: '10px' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
            Total: {fmt(totalMonthly)}/month
          </p>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
            {fmt(totalMonthly * 12)}/year
            {' · '}{fmt(opportunityCost10yr)} in 10yr if invested
          </p>
        </div>
      )}
    </div>
  )
}
