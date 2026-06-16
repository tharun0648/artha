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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--muted)',
  letterSpacing: '0.02em',
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
    <div className="page-wrap page-content">
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <StepIndicator currentStep={1} />

        {/* Form card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>Your Profile</h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: '24px' }}>
            Tell us a bit about yourself to personalise your twin.
          </p>

          <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Age + City */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ width: '90px', flexShrink: 0 }}>
                <input
                  id="age"
                  type="number"
                  min={18}
                  max={60}
                  value={age}
                  onChange={e => handleAgeChange(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Your age"
                  style={{ ...inputStyle, borderColor: errors.age ? 'var(--negative)' : 'var(--border)' }}
                />
                {errors.age && <p style={{ fontSize: '12px', color: 'var(--negative)', marginTop: '4px' }}>{errors.age}</p>}
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle} htmlFor="city">City</label>
                <select
                  id="city"
                  value={city}
                  onChange={e => handleCityChange(e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.city ? 'var(--negative)' : 'var(--border)' }}
                >
                  <option value="">Select city</option>
                  {cities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.city && <p style={{ fontSize: '12px', color: 'var(--negative)', marginTop: '4px' }}>{errors.city}</p>}
              </div>
            </div>

            {/* Company type */}
            <div>
              <p style={labelStyle}>Company type</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {COMPANY_TYPES.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleCompanyTypeChange(opt.value)}
                    style={{
                      height: '36px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: `1px solid ${companyType === opt.value ? 'var(--brand)' : errors.companyType ? 'var(--negative)' : 'var(--border)'}`,
                      background: companyType === opt.value ? 'var(--brand)' : 'var(--surface)',
                      color: companyType === opt.value ? '#fff' : 'var(--ink-2)',
                      transition: 'all 0.1s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {errors.companyType && <p style={{ fontSize: '12px', color: 'var(--negative)', marginTop: '4px' }}>{errors.companyType}</p>}
            </div>

            {/* Risk appetite */}
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
              <div style={{ marginTop: '8px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>{RISK_LABELS[riskIndex].label}</p>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{RISK_LABELS[riskIndex].desc}</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              style={{
                width: '100%',
                height: '36px',
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading || !isFormValid ? 'not-allowed' : 'pointer',
                opacity: loading || !isFormValid ? 0.6 : 1,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!(loading || !isFormValid)) e.currentTarget.style.background = 'var(--brand-hover)' }}
              onMouseLeave={e => { if (!(loading || !isFormValid)) e.currentTarget.style.background = 'var(--brand)' }}
            >
              {loading ? 'Saving…' : 'Build my Twin →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
