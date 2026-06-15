export interface Profile {
  id: string
  age: number
  city: string
  company_type: 'startup' | 'mnc' | 'psu' | 'other'
  risk_appetite: 'conservative' | 'moderate' | 'aggressive'
  created_at?: string
}

export interface FinancialTwin {
  id: string
  user_id: string
  monthly_income: number
  last_year_income: number
  income_growth_rate: number
  monthly_rent: number
  monthly_food: number
  monthly_transport: number
  monthly_entertainment: number
  monthly_other: number
  total_monthly_emi: number
  total_monthly_expenses: number
  current_savings: number
  equity_investments: number
  epf_balance: number
  primary_goal: 'home' | 'wealth' | 'safety' | 'retirement' | 'education'
  goal_target_amount: number
  goal_target_year: number
  updated_at?: string
}

export interface Subscription {
  id: string
  user_id: string
  name: string
  monthly_amount: number
  category: string
  is_active: boolean
  created_at?: string
}

export type GoalType = FinancialTwin['primary_goal']
export type CompanyType = Profile['company_type']
export type RiskAppetite = Profile['risk_appetite']
