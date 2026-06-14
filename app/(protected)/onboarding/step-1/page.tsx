'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StepIndicator from '@/components/onboarding/StepIndicator'
import { CompanyType, RiskAppetite } from '@/types/twin'

const CITIES = [
  { city: 'Bengaluru', state: 'Karnataka' },
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Delhi', state: 'Delhi' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Kolkata', state: 'West Bengal' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Vijayawada', state: 'Andhra Pradesh' },
  { city: 'Surat', state: 'Gujarat' },
  { city: 'Lucknow', state: 'Uttar Pradesh' },
  { city: 'Nagpur', state: 'Maharashtra' },
  { city: 'Indore', state: 'Madhya Pradesh' },
  { city: 'Bhopal', state: 'Madhya Pradesh' },
  { city: 'Coimbatore', state: 'Tamil Nadu' },
  { city: 'Kochi', state: 'Kerala' },
  { city: 'Chandigarh', state: 'Punjab' },
  { city: 'Noida', state: 'Uttar Pradesh' },
  { city: 'Gurugram', state: 'Haryana' },
]

const COMPANY_TYPES: { value: CompanyType; label: string; desc: string }[] = [
  { value: 'startup', label: 'Startup', desc: 'High growth, higher risk' },
  { value: 'mnc', label: 'MNC', desc: 'Global corp, structured' },
  { value: 'psu', label: 'PSU', desc: 'Government undertaking' },
  { value: 'other', label: 'Other', desc: 'Self-employed / freelance' },
]

const RISK_OPTIONS: { value: RiskAppetite; label: string; desc: string }[] = [
  { value: 'conservative', label: 'Conservative', desc: 'I prefer safety over returns' },
  { value: 'moderate', label: 'Moderate', desc: 'I want balance between growth and safety' },
  { value: 'aggressive', label: 'Aggressive', desc: 'I can handle market ups and downs for higher returns' },
]

export default function Step1Page() {
  const router = useRouter()
  const [age, setAge] = useState<number | ''>('')
  const [city, setCity] = useState('')
  const [companyType, setCompanyType] = useState<CompanyType | ''>('')
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!age || age < 18 || age > 60) {
      setError('Age must be between 18 and 60.')
      return
    }
    if (!city) {
      setError('Please select your city.')
      return
    }
    if (!companyType) {
      setError('Please select your company type.')
      return
    }
    if (!riskAppetite) {
      setError('Please select your risk appetite.')
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
      risk_appetite: riskAppetite,
    })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    router.push('/onboarding/step-2')
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff] py-10 px-4">
      <div className="max-w-lg mx-auto">
        <StepIndicator currentStep={1} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Your Profile</h2>
          <p className="text-sm text-gray-500 mb-6">Tell us a bit about yourself to personalise your twin.</p>

          <form onSubmit={handleNext} className="space-y-6">
            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="age">
                Age
              </label>
              <input
                id="age"
                type="number"
                min={18}
                max={60}
                required
                value={age}
                onChange={e => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e1847]/30 focus:border-[#1e1847] transition"
                placeholder="e.g. 27"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="city">
                City
              </label>
              <select
                id="city"
                required
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e1847]/30 focus:border-[#1e1847] transition"
              >
                <option value="">Select your city</option>
                {CITIES.map(c => (
                  <option key={c.city} value={c.city}>
                    {c.city}, {c.state}
                  </option>
                ))}
              </select>
            </div>

            {/* Company type */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Company type</p>
              <div className="grid grid-cols-2 gap-3">
                {COMPANY_TYPES.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCompanyType(opt.value)}
                    className={`text-left px-4 py-3 rounded-xl border-2 transition ${
                      companyType === opt.value
                        ? 'border-[#1e1847] bg-[#1e1847]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${companyType === opt.value ? 'text-[#1e1847]' : 'text-gray-800'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Risk appetite */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Risk appetite</p>
              <div className="space-y-2">
                {RISK_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRiskAppetite(opt.value)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${
                      riskAppetite === opt.value
                        ? 'border-[#1e1847] bg-[#1e1847]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${riskAppetite === opt.value ? 'text-[#1e1847]' : 'text-gray-800'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e1847] text-white font-medium py-2.5 rounded-lg hover:bg-[#2d2568] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Saving…' : 'Next →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
