'use client'

import { useState, useEffect } from 'react'
import { SUBSCRIPTION_CATEGORIES } from '@/lib/subscriptions-data'

export type SubscriptionRow = { name: string; monthly_amount: number; category: string }

interface Props {
  onChange: (subs: SubscriptionRow[]) => void
}

// Pick the single primary plan for each service: lowest non-zero amount
function primaryPlan(plans: { label: string; amount: number }[]): { label: string; amount: number } | null {
  const nonZero = plans.filter(p => p.amount > 0)
  if (!nonZero.length) return null
  return nonZero.reduce((min, p) => p.amount < min.amount ? p : min)
}

export default function SubscriptionPicker({ onChange }: Props) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['entertainment']))
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const totalMonthly = Array.from(selected).reduce((sum, serviceId) => {
    for (const cat of SUBSCRIPTION_CATEGORIES) {
      const svc = cat.services.find(s => s.id === serviceId)
      if (svc) {
        const plan = primaryPlan(svc.plans)
        return sum + (plan?.amount ?? 0)
      }
    }
    return sum
  }, 0)

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
    onChange(subs)
  }, [selected, onChange])

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

  return (
    <div>
      <div className="space-y-1">
        {SUBSCRIPTION_CATEGORIES.map(cat => {
          const isExpanded = expandedCategories.has(cat.key)
          const selectedCount = cat.services.filter(s => selected.has(s.id)).length
          const validServices = cat.services.filter(s => primaryPlan(s.plans))

          if (!validServices.length) return null

          return (
            <div key={cat.key} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => toggleCategory(cat.key)}
                className="w-full flex items-center justify-between px-4 py-3"
                style={{ background: 'var(--bg-surface)' }}
              >
                <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  {cat.label}
                  {selectedCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                      {selectedCount}
                    </span>
                  )}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{isExpanded ? '▲' : '▶'}</span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-3 space-y-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                  {validServices.map(svc => {
                    const plan = primaryPlan(svc.plans)!
                    const isSelected = selected.has(svc.id)
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleService(svc.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors text-left"
                        style={{
                          borderColor: isSelected ? 'var(--brand)' : 'var(--border)',
                          background: isSelected ? 'var(--brand-soft)' : 'var(--bg-surface)',
                        }}
                      >
                        <span className="text-sm font-medium" style={{ color: isSelected ? 'var(--brand)' : 'var(--text-primary)' }}>
                          {isSelected && <span className="mr-1">✓</span>}
                          {svc.name}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          ₹{plan.amount}/mo
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
        Showing primary plans — expanded plan list available post-launch.
      </p>

      {totalMonthly > 0 && (
        <div className="rounded-xl p-4 mt-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Total: ₹{totalMonthly.toLocaleString('en-IN')}/month
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            ₹{(totalMonthly * 12).toLocaleString('en-IN')}/year
            {' · '}₹{opportunityCost10yr.toLocaleString('en-IN')} in 10yr if invested
          </p>
        </div>
      )}
    </div>
  )
}
