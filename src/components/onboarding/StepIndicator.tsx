const STEPS = [
  { label: 'Profile' },
  { label: 'Money Model' },
  { label: 'Goal & Subs' },
]

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', maxWidth: '480px', margin: '0 auto 24px' }}>
      {STEPS.map((step, idx) => {
        const stepNum = idx + 1
        const isCompleted = stepNum < currentStep
        const isActive = stepNum === currentStep
        const isLast = idx === STEPS.length - 1

        return (
          <div
            key={step.label}
            style={{ display: 'flex', alignItems: 'center', flex: isLast ? 0 : 1 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  flexShrink: 0,
                  background: isCompleted ? 'var(--brand)' : 'var(--surface)',
                  border: isCompleted ? 'none' : isActive ? '2px solid var(--brand)' : '1px solid var(--border-strong)',
                  color: isCompleted ? '#fff' : isActive ? 'var(--brand-text)' : 'var(--muted)',
                  boxShadow: isActive ? '0 0 0 4px var(--brand-surface)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {isCompleted ? '✓' : stepNum}
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 500,
                color: isActive ? 'var(--brand-text)' : 'var(--muted)',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: '1.5px',
                  background: isCompleted ? 'var(--brand)' : 'var(--border)',
                  margin: '0 8px',
                  marginBottom: '18px',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
