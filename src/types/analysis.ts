// Output types for all three analysis routes: verdict, simulation, and spend-check.

export interface CausalFactor {
  rank: number
  factor: string
  contribution_pct: number
  impact: 'high' | 'medium' | 'low'
  specific_finding: string
  one_action: string
}

export interface HealthScore {
  total: number
  emergency_buffer: number
  emi_discipline: number
  insurance_coverage: number
  investment_habit: number
  lifestyle_control: number
}

export interface SubscriptionInsight {
  monthly_total: number
  annual_total: number
  ten_year_opportunity_cost: number
}

export interface VerdictOutput {
  goal_probability: number
  confidence: number
  verdict: string
  causal_attribution: CausalFactor[]
  health_score: HealthScore
  subscription_insight: SubscriptionInsight
}

export interface FinancialPath {
  net_worth_5yr: number
  net_worth_10yr: number
  goal_achieved_year: number | null
}

export interface SimulationResult {
  scenario: string
  assumption_note: string
  current_path: FinancialPath
  scenario_path: FinancialPath & {
    break_even_year: number | null
    monthly_surplus_after: number
  }
  goal_impact: string
  verdict: string
  key_risks: string[]
  key_opportunities: string[]
}

export interface SpendCheckResult {
  purchase_summary: string
  emi_ceiling_breach: boolean
  goal_impact_statement: string
  opportunity_cost_10yr: number
  verdict_tone: 'caution' | 'warning' | 'neutral'
  one_insight: string
  options: ['Buy now', 'Wait 48 hours', 'Skip it']
  buy_smart?: string | null
}
