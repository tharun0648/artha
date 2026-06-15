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

function dominantSubCategory(subscriptions: Subscription[]): string | null {
  if (!subscriptions.length) return null
  const counts: Record<string, number> = {}
  for (const sub of subscriptions) {
    counts[sub.category] = (counts[sub.category] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function scoreCard(card: CreditCard, twin: FinancialTwin, subscriptions: Subscription[]): number {
  let score = 0

  const hasLounge = (card.lounge_access_domestic ?? 0) > 0 || (card.lounge_access_international ?? 0) > 0
  if (hasLounge && twin.monthly_income > 80_000) score += 3

  const dominant = dominantSubCategory(subscriptions)
  if (dominant) {
    const keywords = SUB_CATEGORY_TO_REWARD[dominant] ?? []
    const cardCats = card.best_for_categories.map(c => c.toLowerCase())
    if (keywords.some(kw => cardCats.some(cc => cc.includes(kw)))) score += 2
  }

  if (card.is_lifetime_free || card.annual_fee_inr < twin.monthly_income * 0.01) score += 2

  const cardCatsLower = card.best_for_categories.map(c => c.toLowerCase())
  for (const { field, keywords } of SPEND_TO_REWARD) {
    const spendAmount = twin[field] as number
    if (spendAmount > 0 && keywords.some(kw => cardCatsLower.some(cc => cc.includes(kw)))) {
      score += 1
    }
  }

  return score
}

export async function matchCreditCards(
  twin: FinancialTwin,
  subscriptions: Subscription[],
  supabase: SupabaseClient
): Promise<CreditCard[]> {
  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('is_active', true)
    .lte('min_annual_income_inr', twin.monthly_income * 12)

  if (error || !data) return []

  return (data as CreditCard[])
    .map(card => ({ card, score: scoreCard(card, twin, subscriptions) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ card }) => card)
}
