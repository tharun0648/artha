// Hardcoded demo personas used by the demo preview and all demo-mode pages.
// Client pages read sessionStorage('demoPersonaIdx') to pick the active persona.
// API routes accept twinOverride/profileOverride body fields to avoid DB reads.
import type { FinancialTwin, Profile } from '@/types/twin'
import type { VerdictOutput } from '@/types/analysis'

export interface DemoSubscription {
  name: string
  monthly_amount: number
  category: string
}

export interface DemoPersona {
  key: string
  displayName: string
  firstName: string
  label: string
  income: number
  surplus: number
  goal: string
  goal_amount: string
  goal_year: number
  runway: string
  subscriptions: string[]
  subscriptionDetails: DemoSubscription[]
  twin: FinancialTwin
  profile: Profile
  verdict: VerdictOutput
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    key: 'priya',
    displayName: 'Priya, 26 · Pune',
    firstName: 'Priya',
    label: 'Priya, 26 · Pune',
    income: 55000,
    surplus: 18000,
    goal: 'Buy a home',
    goal_amount: '₹60L',
    goal_year: 2031,
    runway: '2.1 months',
    subscriptions: ['Netflix', 'Swiggy One'],
    subscriptionDetails: [
      { name: 'Netflix', monthly_amount: 649, category: 'entertainment' },
      { name: 'Swiggy One', monthly_amount: 299, category: 'food' },
    ],
    profile: {
      id: 'demo-priya',
      age: 26,
      city: 'Pune',
      company_type: 'startup',
      risk_appetite: 'moderate',
    },
    twin: {
      id: 'demo-priya-twin',
      user_id: 'demo-priya',
      monthly_income: 55000,
      last_year_income: 50000,
      income_growth_rate: 0.1,
      monthly_rent: 14000,
      monthly_food: 8000,
      monthly_transport: 3500,
      monthly_entertainment: 3000,
      monthly_other: 5000,
      total_monthly_emi: 3500,
      total_monthly_expenses: 37000,
      current_savings: 77700,
      equity_investments: 90000,
      epf_balance: 60000,
      primary_goal: 'home',
      goal_target_amount: 6000000,
      goal_target_year: 2031,
    },
    verdict: {
      goal_probability: 42,
      confidence: 68,
      verdict: "Reachable with changes — your current savings rate needs to roughly double to reach ₹60L by 2031.",
      causal_attribution: [
        {
          rank: 1,
          factor: 'Low savings rate',
          contribution_pct: 48,
          impact: 'high',
          specific_finding: 'You save ₹18k/mo, but need ~₹34k/mo to hit ₹60L by 2031 at 10% equity returns.',
          one_action: 'Move ₹10k from monthly_other into a recurring SIP — even 2-step increases get you there.',
        },
        {
          rank: 2,
          factor: 'No equity portfolio',
          contribution_pct: 31,
          impact: 'medium',
          specific_finding: 'Bank savings alone at 3.5% won\'t compound fast enough. Equity at 11% changes the math significantly.',
          one_action: 'Open a Zerodha or Groww account this week and set up a ₹5k Nifty 50 SIP.',
        },
        {
          rank: 3,
          factor: 'EMI exposure',
          contribution_pct: 21,
          impact: 'low',
          specific_finding: 'Your ₹3,500 EMI is within safe limits but leaves less room for investment increases.',
          one_action: 'Pre-pay ₹5k toward the principal on your next payment to free up cashflow sooner.',
        },
      ],
      health_score: {
        total: 46,
        emergency_buffer: 2,
        emi_discipline: 8,
        insurance_coverage: 6,
        investment_habit: 7,
        lifestyle_control: 23,
      },
      subscription_insight: {
        monthly_total: 650,
        annual_total: 7800,
        ten_year_opportunity_cost: 124000,
      },
    },
  },
  {
    key: 'aarav',
    displayName: 'Aarav, 28 · Bengaluru',
    firstName: 'Aarav',
    label: 'Aarav, 28 · Bengaluru',
    income: 140000,
    surplus: 68000,
    goal: 'Buy a home',
    goal_amount: '₹1.6Cr',
    goal_year: 2034,
    runway: '6.3 months',
    subscriptions: ['Netflix', 'Spotify', 'Amazon Prime', 'Cult.fit', 'Zomato Gold'],
    subscriptionDetails: [
      { name: 'Netflix', monthly_amount: 649, category: 'entertainment' },
      { name: 'Spotify', monthly_amount: 119, category: 'entertainment' },
      { name: 'Amazon Prime', monthly_amount: 299, category: 'entertainment' },
      { name: 'Cult.fit', monthly_amount: 1299, category: 'fitness' },
      { name: 'Zomato Gold', monthly_amount: 149, category: 'food' },
    ],
    profile: {
      id: 'demo-aarav',
      age: 28,
      city: 'Bengaluru',
      company_type: 'startup',
      risk_appetite: 'moderate',
    },
    twin: {
      id: 'demo-aarav-twin',
      user_id: 'demo-aarav',
      monthly_income: 140000,
      last_year_income: 120000,
      income_growth_rate: 0.12,
      monthly_rent: 28000,
      monthly_food: 12000,
      monthly_transport: 6000,
      monthly_entertainment: 8000,
      monthly_other: 10000,
      total_monthly_emi: 8000,
      total_monthly_expenses: 72000,
      current_savings: 453600,
      equity_investments: 800000,
      epf_balance: 300000,
      primary_goal: 'home',
      goal_target_amount: 16000000,
      goal_target_year: 2034,
    },
    verdict: {
      goal_probability: 55,
      confidence: 78,
      verdict: "Reachable with changes for Home of ₹1.6Cr by 2034 — ₹1.5Cr short of target.",
      causal_attribution: [
        {
          rank: 1,
          factor: 'Equity investment pace',
          contribution_pct: 41,
          impact: 'high',
          specific_finding: 'Current ₹8L equity will grow to ~₹22L by 2034. You need ₹16Cr total — the gap is the equity compounding gap.',
          one_action: 'Increase your monthly SIP by ₹15k — redirect from dining and entertainment which are running 18% above your city peers.',
        },
        {
          rank: 2,
          factor: 'Lifestyle inflation',
          contribution_pct: 33,
          impact: 'medium',
          specific_finding: 'Your monthly spend grew 22% YoY while income grew 12%. This gap compounds against your goal.',
          one_action: 'Set a monthly "lifestyle budget" alert at ₹65k total expenses and automate surplus to investments first.',
        },
        {
          rank: 3,
          factor: 'Savings rate',
          contribution_pct: 26,
          impact: 'medium',
          specific_finding: 'At 49% savings rate you are strong, but Bengaluru home prices are rising ~8%/year — you need to outpace that.',
          one_action: 'Consider shifting 20% of savings to a debt fund for down payment stability.',
        },
      ],
      health_score: {
        total: 59,
        emergency_buffer: 6,
        emi_discipline: 9,
        insurance_coverage: 7,
        investment_habit: 14,
        lifestyle_control: 23,
      },
      subscription_insight: {
        monthly_total: 2300,
        annual_total: 27600,
        ten_year_opportunity_cost: 440000,
      },
    },
  },
  {
    key: 'rohan',
    displayName: 'Rohan, 32 · Mumbai',
    firstName: 'Rohan',
    label: 'Rohan, 32 · Mumbai',
    income: 220000,
    surplus: 95000,
    goal: 'Retirement',
    goal_amount: '₹5Cr',
    goal_year: 2045,
    runway: '9.2 months',
    subscriptions: ['Netflix', 'Spotify', 'Apple One'],
    subscriptionDetails: [
      { name: 'Netflix', monthly_amount: 649, category: 'entertainment' },
      { name: 'Spotify', monthly_amount: 119, category: 'entertainment' },
      { name: 'Apple One', monthly_amount: 195, category: 'entertainment' },
    ],
    profile: {
      id: 'demo-rohan',
      age: 32,
      city: 'Mumbai',
      company_type: 'mnc',
      risk_appetite: 'aggressive',
    },
    twin: {
      id: 'demo-rohan-twin',
      user_id: 'demo-rohan',
      monthly_income: 220000,
      last_year_income: 195000,
      income_growth_rate: 0.13,
      monthly_rent: 45000,
      monthly_food: 18000,
      monthly_transport: 12000,
      monthly_entertainment: 15000,
      monthly_other: 20000,
      total_monthly_emi: 15000,
      total_monthly_expenses: 125000,
      current_savings: 1150000,
      equity_investments: 2500000,
      epf_balance: 800000,
      primary_goal: 'retirement',
      goal_target_amount: 50000000,
      goal_target_year: 2045,
    },
    verdict: {
      goal_probability: 72,
      confidence: 80,
      verdict: "On track for Retirement of ₹5Cr by 2045 — strong compounding base with aggressive allocation.",
      causal_attribution: [
        {
          rank: 1,
          factor: 'Equity compounding',
          contribution_pct: 52,
          impact: 'high',
          specific_finding: 'Your ₹25L equity at 12% CAGR will compound to ~₹2.4Cr by 2045. Add ₹50k SIP/mo and you hit ₹5Cr.',
          one_action: 'Move from ₹50k/mo SIP to ₹65k/mo — you have the surplus margin and 19 years to compound.',
        },
        {
          rank: 2,
          factor: 'Mumbai lifestyle cost',
          contribution_pct: 31,
          impact: 'medium',
          specific_finding: 'Monthly expenses at ₹1.25L are 12% above MNC peers in Mumbai. A 10% cut adds ₹1.5Cr to your 2045 corpus.',
          one_action: 'Audit your dining and entertainment budget — shifting ₹8k/mo to SIP closes the gap in 4 years.',
        },
        {
          rank: 3,
          factor: 'EPF underutilization',
          contribution_pct: 17,
          impact: 'low',
          specific_finding: 'EPF at ₹8L is low for your income bracket. VPF contributions are tax-free at 8.1% — better than FD.',
          one_action: 'Increase VPF contribution by ₹5k/mo — it compounds at 8.1% tax-free, no market risk.',
        },
      ],
      health_score: {
        total: 71,
        emergency_buffer: 9,
        emi_discipline: 8,
        insurance_coverage: 10,
        investment_habit: 22,
        lifestyle_control: 22,
      },
      subscription_insight: {
        monthly_total: 1500,
        annual_total: 18000,
        ten_year_opportunity_cost: 288000,
      },
    },
  },
]
