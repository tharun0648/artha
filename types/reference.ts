export type MarketInstrument =
  | 'nifty50'
  | 'nifty_next50'
  | 'nifty_midcap_150'
  | 'nifty_smallcap_250'
  | 'flexi_cap'
  | 'large_midcap'
  | 'elss'
  | 'aggressive_hybrid'
  | 'short_duration_debt'
  | 'ppf'
  | 'epf'
  | 'fd_avg'
  | 'nsc'
  | 'sukanya'
  | 'gold'
  | 'real_estate_avg'

export interface MarketReturn {
  id: string
  instrument: MarketInstrument
  period_years: 1 | 3 | 5 | 10
  cagr_pct: number
  source: string
  as_of_date: string
}

export interface CityInflation {
  id: string
  city: string
  state: string
  annual_cpi_pct: number
  year: number
}

export interface PropertyAppreciation {
  id: string
  city: string
  state: string
  annual_appreciation_pct: number
  residex_index_current: number
  as_of_quarter: string
}

export interface TermPremium {
  id: string
  age_years: number
  cover_amount_cr: number
  annual_premium_inr: number
  gender: 'male' | 'female'
  smoker: boolean
  insurer: string
}

export interface TaxSlab {
  id: string
  regime: 'old' | 'new'
  income_min: number
  income_max: number | null
  tax_rate: number
  financial_year: string
}

export interface CreditCard {
  id: string
  card_id: string
  name: string
  issuer: string
  tier: 'entry' | 'mid' | 'premium' | 'super_premium'
  annual_fee_inr: number
  joining_fee_inr: number
  fee_waiver_condition: string | null
  reward_rate_best: number
  reward_rate_others: number
  best_for_categories: string[]
  reward_type: 'cashback' | 'points' | 'miles'
  reward_point_value_paise: number | null
  min_annual_income_inr: number
  credit_score_min: number
  employment_type: 'salaried' | 'self_employed' | 'both'
  lounge_access_domestic: number
  lounge_access_international: number
  has_fuel_surcharge_waiver: boolean
  has_movie_benefits: boolean
  insurance_benefits: string | null
  welcome_benefit_inr: number
  best_combo_with: string | null
  trap_warning: string | null
  is_lifetime_free: boolean
  network: 'visa' | 'mastercard' | 'rupay' | 'amex' | 'diners'
  is_active: boolean
}
