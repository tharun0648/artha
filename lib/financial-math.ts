import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { FinancialTwin, Profile } from '@/types/twin'
import { MarketInstrument } from '@/types/reference'

// ── Pure math (no DB) ─────────────────────────────────────

export function compoundGrowth(principal: number, rate: number, years: number): number {
  return principal * Math.pow(1 + rate, years)
}

export function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  const r = annualRate / 12
  return (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1)
}

export function sipFutureValue(monthly: number, annualRate: number, years: number): number {
  const r = annualRate / 12
  const n = years * 12
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
}

export function emergencyFundRunway(savings: number, monthlyExpenses: number): number {
  if (monthlyExpenses === 0) return 999
  return savings / monthlyExpenses
}

// ── Instrument selector ───────────────────────────────────

export function getRecommendedInstrument(
  age: number,
  risk: 'conservative' | 'moderate' | 'aggressive'
): MarketInstrument {
  if (risk === 'aggressive') return age < 30 ? 'nifty_midcap_150' : 'nifty50'
  if (risk === 'moderate') return age < 35 ? 'large_midcap' : 'aggressive_hybrid'
  return age < 40 ? 'nifty50' : 'fd_avg'
}

// ── DB-dependent functions ────────────────────────────────

export async function getMarketReturn(
  instrument: MarketInstrument,
  periodYears: number
): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data } = await supabase
    .from('market_returns')
    .select('cagr_pct')
    .eq('instrument', instrument)
    .eq('period_years', periodYears)
    .single()
  if (!data) {
    const { data: fallback } = await supabase
      .from('market_returns')
      .select('cagr_pct')
      .eq('instrument', instrument)
      .order('period_years', { ascending: false })
      .limit(1)
      .single()
    return fallback?.cagr_pct ?? 0.10
  }
  return data.cagr_pct
}

export async function requiredCorpus(
  goalAmount: number,
  yearsToGoal: number,
  city: string
): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data } = await supabase
    .from('city_inflation')
    .select('annual_cpi_pct')
    .eq('city', city)
    .order('year', { ascending: false })
    .limit(1)
    .single()
  const inflationRate = data?.annual_cpi_pct ?? 0.06
  return compoundGrowth(goalAmount, inflationRate, yearsToGoal)
}

export async function projectedSavingsAtGoal(
  twin: FinancialTwin,
  yearsToGoal: number,
  city: string,
  risk: 'conservative' | 'moderate' | 'aggressive' = 'moderate',
  age: number = 30
): Promise<number> {
  const instrument = getRecommendedInstrument(age, risk)
  const returnRate = await getMarketReturn(instrument, Math.min(yearsToGoal, 10))
  const monthlySurplus = twin.monthly_income - twin.total_monthly_expenses
  const currentCorpus = twin.current_savings + twin.equity_investments + twin.epf_balance
  const sipValue = sipFutureValue(Math.max(monthlySurplus, 0), returnRate, yearsToGoal)
  const lumpSumValue = compoundGrowth(currentCorpus, returnRate, yearsToGoal)
  return sipValue + lumpSumValue
}

export async function causalAttribution(
  twin: FinancialTwin,
  profile: Profile,
  projectedSavings: number,
  requiredCorpusAmount: number
): Promise<Array<{ factor: string; contribution_pct: number; finding: string }>> {
  const gap = Math.max(requiredCorpusAmount - projectedSavings, 0)
  if (gap === 0) return []

  const income = twin.monthly_income
  const expenses = twin.total_monthly_expenses
  const surplus = income - expenses
  const savingsRate = income > 0 ? surplus / income : 0
  const emiRatio = income > 0 ? twin.total_monthly_emi / income : 0
  const lifestyleInflation = twin.income_growth_rate > 0
    ? Math.max(0, (expenses / (twin.last_year_income || income)) - twin.income_growth_rate)
    : 0
  const emergencyRunway = emergencyFundRunway(twin.current_savings, expenses)

  const factors: Array<{ factor: string; raw_score: number; finding: string }> = []

  if (savingsRate < 0.20) {
    factors.push({
      factor: 'Low savings rate',
      raw_score: (0.20 - savingsRate) * 3,
      finding: `You save ${(savingsRate * 100).toFixed(0)}% of income — target is 20%+. That's ₹${Math.round((income * 0.20) - surplus).toLocaleString('en-IN')}/month short.`
    })
  }

  if (emiRatio > 0.30) {
    factors.push({
      factor: 'High EMI burden',
      raw_score: (emiRatio - 0.30) * 2.5,
      finding: `EMIs consume ${(emiRatio * 100).toFixed(0)}% of income — safe ceiling is 30%. You're paying ₹${twin.total_monthly_emi.toLocaleString('en-IN')}/month.`
    })
  }

  if (lifestyleInflation > 0.05) {
    factors.push({
      factor: 'Lifestyle inflation',
      raw_score: lifestyleInflation * 2,
      finding: `Your expenses grew faster than income. Lifestyle inflation is absorbing ₹${Math.round(income * lifestyleInflation).toLocaleString('en-IN')}/month of your raise.`
    })
  }

  if (emergencyRunway < 3) {
    factors.push({
      factor: 'Insufficient emergency fund',
      raw_score: (3 - emergencyRunway) * 0.8,
      finding: `You have ${emergencyRunway.toFixed(1)} months of expenses saved. Minimum is 3 months — that's ₹${Math.round(expenses * 3).toLocaleString('en-IN')}.`
    })
  }

  if (twin.equity_investments < twin.monthly_income * 3) {
    factors.push({
      factor: 'Under-invested in equity',
      raw_score: 0.8,
      finding: `Equity investments of ₹${twin.equity_investments.toLocaleString('en-IN')} are low relative to income. Missing compounding upside.`
    })
  }

  if (factors.length === 0) {
    factors.push({
      factor: 'Goal timeline too short',
      raw_score: 1,
      finding: `Your current trajectory falls short of ₹${requiredCorpusAmount.toLocaleString('en-IN')} by the target year.`
    })
  }

  const totalScore = factors.reduce((s, f) => s + f.raw_score, 0)
  return factors
    .map(f => ({
      factor: f.factor,
      contribution_pct: parseFloat(((f.raw_score / totalScore) * 100).toFixed(0)),
      finding: f.finding,
    }))
    .sort((a, b) => b.contribution_pct - a.contribution_pct)
}

export async function futurePropertyPrice(
  currentPrice: number,
  city: string,
  years: number
): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data } = await supabase
    .from('property_appreciation')
    .select('annual_appreciation_pct')
    .eq('city', city)
    .single()
  const rate = data?.annual_appreciation_pct ?? 0.085
  return compoundGrowth(currentPrice, rate, years)
}

export async function termInsuranceRecommendation(
  monthlyIncome: number,
  age: number,
  gender: 'male' | 'female'
): Promise<{ recommended_cover_cr: number; annual_premium: number }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const annualIncome = monthlyIncome * 12
  const recommendedCover = Math.ceil((annualIncome * 12) / 10000000)
  const coverCr = Math.min(Math.max(recommendedCover, 1), 5)

  const { data } = await supabase
    .from('term_premiums')
    .select('annual_premium_inr')
    .eq('gender', gender)
    .eq('smoker', false)
    .eq('cover_amount_cr', coverCr)
    .gte('age_years', age - 2)
    .lte('age_years', age + 2)
    .order('age_years', { ascending: true })
    .limit(1)
    .single()

  return {
    recommended_cover_cr: coverCr,
    annual_premium: data?.annual_premium_inr ?? 0,
  }
}

export async function opportunityCost10yr(
  amount: number,
  city: string
): Promise<number> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data } = await supabase
    .from('market_returns')
    .select('cagr_pct')
    .eq('instrument', 'nifty50')
    .eq('period_years', 10)
    .single()
  const rate = data?.cagr_pct ?? 0.122
  return compoundGrowth(amount, rate, 10) - amount
}
