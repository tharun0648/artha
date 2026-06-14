export type PlanVariant = { label: string; amount: number }
export type ServiceDef = { id: string; name: string; plans: PlanVariant[] }
export type CategoryDef = { key: string; label: string; services: ServiceDef[] }

export const SUBSCRIPTION_CATEGORIES: CategoryDef[] = [
  {
    key: 'entertainment',
    label: 'Entertainment',
    services: [
      { id: 'netflix', name: 'Netflix', plans: [{ label: 'Mobile', amount: 149 }, { label: 'Standard', amount: 499 }, { label: 'Premium', amount: 649 }] },
      { id: 'hotstar', name: 'Disney+ Hotstar', plans: [{ label: 'Mobile', amount: 149 }, { label: 'Super', amount: 299 }, { label: 'Premium', amount: 499 }] },
      { id: 'amazon-prime', name: 'Amazon Prime', plans: [{ label: 'Monthly', amount: 299 }, { label: 'Annual (÷12)', amount: 125 }] },
    ],
  },
  {
    key: 'music_audio',
    label: 'Music & Audio',
    services: [
      { id: 'spotify', name: 'Spotify', plans: [{ label: 'Individual', amount: 119 }, { label: 'Family', amount: 179 }] },
      { id: 'youtube-premium', name: 'YouTube Premium', plans: [{ label: 'Individual', amount: 149 }, { label: 'Family', amount: 299 }] },
    ],
  },
  {
    key: 'food_dining',
    label: 'Food & Dining',
    services: [
      { id: 'swiggy-one', name: 'Swiggy One', plans: [{ label: 'Lite', amount: 99 }, { label: 'Basic', amount: 299 }] },
      { id: 'zomato-gold', name: 'Zomato Gold', plans: [{ label: 'Monthly', amount: 175 }, { label: 'Quarterly', amount: 349 }] },
    ],
  },
  {
    key: 'productivity_cloud',
    label: 'Productivity & AI',
    services: [
      { id: 'google-one', name: 'Google One', plans: [{ label: '100GB', amount: 130 }, { label: '2TB', amount: 650 }] },
      { id: 'chatgpt-plus', name: 'ChatGPT Plus', plans: [{ label: 'Plus', amount: 1950 }] },
    ],
  },
  {
    key: 'telecom',
    label: 'Telecom',
    services: [
      { id: 'jio-postpaid', name: 'Jio Postpaid', plans: [{ label: '₹399', amount: 399 }, { label: '₹599', amount: 599 }] },
      { id: 'airtel-postpaid', name: 'Airtel Postpaid', plans: [{ label: '₹399', amount: 399 }, { label: '₹499', amount: 499 }] },
    ],
  },
]
