import { Check } from 'lucide-react'

const STEPS = [
  { label: 'Profile' },
  { label: 'Money Model' },
  { label: 'Goal & Subscriptions' },
]

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0 w-full max-w-sm mx-auto mb-8">
      {STEPS.map((step, idx) => {
        const stepNum = idx + 1
        const isCompleted = stepNum < currentStep
        const isActive = stepNum === currentStep

        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-[#1e1847] text-white'
                    : isActive
                    ? 'bg-[#1e1847] text-white ring-4 ring-[#1e1847]/20'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isCompleted ? <Check size={14} strokeWidth={2.5} /> : stepNum}
              </div>
              <span
                className={`text-xs mt-1 font-medium whitespace-nowrap ${
                  isActive ? 'text-[#1e1847]' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${
                  stepNum < currentStep ? 'bg-[#1e1847]' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
