'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CompanyType, RiskAppetite } from '@/types/twin'
import StepIndicator from '@/components/onboarding/StepIndicator'

const COMPANY_TYPES: { value: CompanyType; label: string }[] = [
  { value: 'startup', label: 'Startup' },
  { value: 'mnc', label: 'MNC' },
  { value: 'psu', label: 'PSU' },
  { value: 'other', label: 'Other' },
]

const RISK_LABELS: Record<number, { label: string; desc: string }> = {
  0: { label: 'Conservative', desc: 'Safety over returns' },
  1: { label: 'Moderate', desc: 'Balanced growth' },
  2: { label: 'Aggressive', desc: 'Maximum long-term growth' },
}

const RISK_VALUES: RiskAppetite[] = ['conservative', 'moderate', 'aggressive']

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
}

type FieldErrors = {
  age?: string
  city?: string
  companyType?: string
}

function validate(age: number | '', city: string, companyType: CompanyType | ''): FieldErrors {
  const e: FieldErrors = {}
  if (age === '' || typeof age !== 'number' || age < 18 || age > 60) {
    e.age = 'Age must be between 18 and 60'
  }
  if (!city) e.city = 'Please select your city'
  if (!companyType) e.companyType = 'Please select your company type'
  return e
}

export default function Step1Form({ cities }: { cities: string[] }) {
  const router = useRouter()
  const [age, setAge] = useState<number | ''>('')
  const [city, setCity] = useState('')
  const [companyType, setCompanyType] = useState<CompanyType | ''>('')
  const [riskIndex, setRiskIndex] = useState(1)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [attempted, setAttempted] = useState(false)
  const [loading, setLoading] = useState(false)

  const errs = validate(age, city, companyType)
  const isFormValid = Object.keys(errs).length === 0

  const revalidate = useCallback(
    (nextAge: number | '', nextCity: string, nextCompanyType: CompanyType | '') => {
      if (attempted) setErrors(validate(nextAge, nextCity, nextCompanyType))
    },
    [attempted]
  )

  function handleAgeChange(val: number | '') {
    setAge(val)
    revalidate(val, city, companyType)
  }

  function handleCityChange(val: string) {
    setCity(val)
    revalidate(age, val, companyType)
  }

  function handleCompanyTypeChange(val: CompanyType) {
    setCompanyType(val)
    revalidate(age, city, val)
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    setAttempted(true)
    const errs = validate(age, city, companyType)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error: dbError } = await supabase.from('profiles').upsert({
      id: user.id,
      age,
      city,
      company_type: companyType,
      risk_appetite: RISK_VALUES[riskIndex],
    })

    if (dbError) {
      setErrors({ age: dbError.message })
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div>
      <StepIndicator currentStep={1} />
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Your Profile
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Tell us a bit about yourself to personalise your twin.
        </p>
      </div>

      <div
        className="rounded-2xl border p-6"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
      >
        <form onSubmit={handleNext} className="space-y-6">

          {/* Age + City side by side */}
          <div className="flex gap-3">
            <div style={{ width: '90px', flexShrink: 0 }}>
              <label style={labelStyle} htmlFor="age">Age</label>
              <input
                id="age"
                type="number"
                min={18}
                max={60}
                value={age}
                onChange={e => handleAgeChange(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="27"
                style={{
                  ...inputStyle,
                  borderColor: errors.age ? '#ef4444' : 'var(--border)',
                }}
              />
              {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle} htmlFor="city">City</label>
              <select
                id="city"
                value={city}
                onChange={e => handleCityChange(e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: errors.city ? '#ef4444' : 'var(--border)',
                }}
              >
                <option value="">Select city</option>
                {cities.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
            </div>
          </div>

          {/* Company type — 2×2 pill grid */}
          <div>
            <p style={labelStyle}>Company type</p>
            <div className="grid grid-cols-2 gap-2">
              {COMPANY_TYPES.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleCompanyTypeChange(opt.value)}
                  className="rounded-xl border font-medium text-sm transition-colors"
                  style={{
                    height: '44px',
                    borderColor: companyType === opt.value ? 'var(--brand)' : errors.companyType ? '#ef4444' : 'var(--border)',
                    background: companyType === opt.value ? 'var(--brand)' : 'var(--bg-surface)',
                    color: companyType === opt.value ? '#fff' : 'var(--text-primary)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.companyType && <p className="text-red-500 text-sm mt-1">{errors.companyType}</p>}
          </div>

          {/* Risk appetite — slider */}
          <div>
            <p style={labelStyle}>Risk appetite</p>
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={riskIndex}
              onChange={e => setRiskIndex(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--brand)' }}
            />
            <div className="mt-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {RISK_LABELS[riskIndex].label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {RISK_LABELS[riskIndex].desc}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full text-white font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'var(--brand)', height: '52px', borderRadius: '12px' }}
            onMouseOver={e => !(loading || !isFormValid) && ((e.target as HTMLElement).style.background = 'var(--brand-hover)')}
            onMouseOut={e => !(loading || !isFormValid) && ((e.target as HTMLElement).style.background = 'var(--brand)')}
          >
            {loading ? 'Saving…' : 'Build my Twin →'}
          </button>
        </form>
      </div>
    </div>
  )
}
