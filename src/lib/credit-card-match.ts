// No-LLM credit card recommender — scores cards from the DB against the user's
// actual spend profile and subscription categories, returns top 3 ranked matches.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FinancialTwin, Subscription } from '@/types/twin'
import type { CreditCard } from '@/types/reference'

// Maps twin spend fields to card reward category keywords
const SPEND_TO_REWARD: Array<{ field: keyof FinancialTwin; keywords: string[] }> = [
  { field: 'monthly_food', keywords: ['dining', 'food', 'restaurant', 'swiggy', 'zomato'] },
  { field: 'monthly_transport', keywords: ['fuel', 'travel', 'transport', 'cab', 'metro'] },
  { field: 'monthly_entertainment', keywords: ['entertainment', 'movies', 'ott', 'streaming'] },
  { field: 'monthly_rent', keywords: ['rent', 'utilities', 'bill'] },
]

const SUB_CATEGORY_TO_REWARD: Record<string, string[]> = {
  entertainment: ['entertainment', 'ott', 'movies', 'streaming'],
  music_audio: ['entertainment', 'streaming'],
  food_dining: ['dining', 'food', 'restaurant'],
  grocery_quick_commerce: ['grocery', 'shopping', 'online'],
  ecommerce: ['shopping', 'online'],
  fitness_health: ['wellness', 'health'],
  mobility: ['travel', 'fuel', 'transport'],
  telecom: ['utilities', 'bill'],
}

function scoreCard(card: CreditCard, twin: FinancialTwin, subscriptions: Subscription[]): number {
  let score = 0

  const annualIncome = twin.monthly_income * 12
  if (annualIncome >= 1_500_000 && card.tier === 'premium') score += 3
  else if (annualIncome >= 800_000 && card.tier === 'mid') score += 2
  else if (annualIncome < 800_000 && card.tier === 'entry') score += 1

  const hasLounge = (card.lounge_access_domestic ?? 0) > 0 || (card.lounge_access_international ?? 0) > 0
  if (hasLounge && twin.monthly_income > 60_000) score += 2

  if (twin.monthly_income > 100_000 &&
      card.best_for_categories.some(c => c.toLowerCase().includes('travel'))) {
    score += 2
  }

  const cardCatsLower = card.best_for_categories.map(c => c.toLowerCase())

  // Score all active subscription categories (not just dominant)
  const allCategories = [...new Set(subscriptions.map(s => s.category))]
  for (const cat of allCategories) {
    const keywords = SUB_CATEGORY_TO_REWARD[cat] ?? []
    if (keywords.some(kw => cardCatsLower.some(cc => cc.includes(kw)))) score += 1
  }

  if (card.is_lifetime_free || card.annual_fee_inr < twin.monthly_income * 0.01) score += 2

  // Weight spend score by monthly amount (1 pt per ₹5k, capped at 3)
  for (const { field, keywords } of SPEND_TO_REWARD) {
    const spendAmount = twin[field] as number
    if (spendAmount > 0 && keywords.some(kw => cardCatsLower.some(cc => cc.includes(kw)))) {
      score += Math.min(3, Math.floor(spendAmount / 5000))
    }
  }

  return score
}

export async function matchCreditCards(
  twin: FinancialTwin,
  subscriptions: Subscription[],
  supabase: SupabaseClient
): Promise<CreditCard[]> {
  const annualIncome = twin.monthly_income * 12
  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('is_active', true)

  if (error || !data) return []

  const eligible = (data as CreditCard[]).filter(card =>
    !card.min_annual_income_inr || card.min_annual_income_inr <= annualIncome
  )

  return eligible
    .map(card => ({ card, score: scoreCard(card, twin, subscriptions) }))
    .sort((a, b) => b.score - a.score || a.card.annual_fee_inr - b.card.annual_fee_inr)
    .slice(0, 3)
    .map(({ card }) => card)
}
