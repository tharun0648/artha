export interface SubscriptionTemplate {
  id: string
  name: string
  category: string
  monthly_amount: number
}

export const INDIAN_SUBSCRIPTIONS: SubscriptionTemplate[] = [
  // Entertainment
  { id: 'netflix', name: 'Netflix', category: 'entertainment', monthly_amount: 649 },
  { id: 'hotstar', name: 'Disney+ Hotstar', category: 'entertainment', monthly_amount: 299 },
  { id: 'amazon-prime', name: 'Amazon Prime', category: 'entertainment', monthly_amount: 179 },
  { id: 'sony-liv', name: 'SonyLIV', category: 'entertainment', monthly_amount: 299 },
  { id: 'zee5', name: 'ZEE5', category: 'entertainment', monthly_amount: 199 },
  { id: 'jio-cinema', name: 'JioCinema Premium', category: 'entertainment', monthly_amount: 100 },
  { id: 'apple-tv', name: 'Apple TV+', category: 'entertainment', monthly_amount: 99 },
  // Music
  { id: 'spotify', name: 'Spotify Premium', category: 'music', monthly_amount: 119 },
  { id: 'apple-music', name: 'Apple Music', category: 'music', monthly_amount: 99 },
  { id: 'youtube-premium', name: 'YouTube Premium', category: 'music', monthly_amount: 139 },
  // Food
  { id: 'zomato-gold', name: 'Zomato Gold', category: 'food', monthly_amount: 200 },
  { id: 'swiggy-one', name: 'Swiggy One', category: 'food', monthly_amount: 183 },
  // Shopping / Lifestyle
  { id: 'cred', name: 'CRED', category: 'lifestyle', monthly_amount: 0 },
  { id: 'tata-neu', name: 'Tata Neu Plus', category: 'lifestyle', monthly_amount: 150 },
  // Fitness
  { id: 'cult-fit', name: 'Cult.fit', category: 'fitness', monthly_amount: 1500 },
  { id: 'gym-local', name: 'Gym membership', category: 'fitness', monthly_amount: 1000 },
  // Productivity
  { id: 'icloud', name: 'iCloud Storage', category: 'productivity', monthly_amount: 75 },
  { id: 'google-one', name: 'Google One', category: 'productivity', monthly_amount: 130 },
  { id: 'notion', name: 'Notion', category: 'productivity', monthly_amount: 165 },
  { id: 'microsoft-365', name: 'Microsoft 365', category: 'productivity', monthly_amount: 160 },
  // News
  { id: 'times-prime', name: 'Times Prime', category: 'news', monthly_amount: 199 },
  { id: 'the-ken', name: 'The Ken', category: 'news', monthly_amount: 500 },
  // Telecom
  { id: 'jio', name: 'Jio Postpaid Plus', category: 'telecom', monthly_amount: 601 },
  { id: 'airtel', name: 'Airtel Postpaid', category: 'airtel', monthly_amount: 499 },
]

export const SUBSCRIPTION_CATEGORIES = [
  'entertainment',
  'music',
  'food',
  'lifestyle',
  'fitness',
  'productivity',
  'news',
  'telecom',
] as const

export type SubscriptionCategory = typeof SUBSCRIPTION_CATEGORIES[number]
