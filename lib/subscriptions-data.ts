export type PlanVariant = { label: string; amount: number }
export type ServiceDef = { id: string; name: string; plans: PlanVariant[] }
export type CategoryDef = { key: string; label: string; services: ServiceDef[] }

export const SUBSCRIPTION_CATEGORIES: CategoryDef[] = [
  {
    key: 'entertainment',
    label: 'Entertainment',
    services: [
      { id: 'netflix', name: 'Netflix', plans: [{ label: 'Mobile', amount: 149 }, { label: 'Basic', amount: 199 }, { label: 'Standard', amount: 499 }, { label: 'Premium (4K)', amount: 649 }] },
      { id: 'hotstar', name: 'Disney+ Hotstar', plans: [{ label: 'Mobile (3 Months)', amount: 149 }, { label: 'Super (Annual)', amount: 899 }, { label: 'Premium (Annual)', amount: 1499 }, { label: 'Premium (Monthly)', amount: 299 }] },
      { id: 'amazon-prime', name: 'Amazon Prime', plans: [{ label: 'Monthly', amount: 299 }, { label: 'Shopping Edition (Annual)', amount: 399 }, { label: 'Prime Lite (Annual)', amount: 999 }, { label: 'Annual', amount: 1499 }] },
      { id: 'sony-liv', name: 'SonyLIV', plans: [{ label: 'Mobile (Annual)', amount: 599 }, { label: 'Premium (Monthly)', amount: 299 }, { label: 'Premium (Annual)', amount: 999 }] },
      { id: 'jio-cinema', name: 'JioCinema', plans: [{ label: 'Premium (Monthly)', amount: 29 }, { label: 'Family (Monthly)', amount: 89 }, { label: 'Premium (Annual)', amount: 299 }] },
      { id: 'zee5', name: 'ZEE5', plans: [{ label: 'Premium HD (Annual)', amount: 699 }, { label: 'Premium 4K (Annual)', amount: 1199 }] },
      { id: 'apple-tv', name: 'Apple TV+', plans: [{ label: 'Monthly', amount: 99 }] },
      { id: 'crunchyroll', name: 'Crunchyroll', plans: [{ label: 'Fan (Monthly)', amount: 79 }, { label: 'Mega Fan (Monthly)', amount: 99 }] },
    ],
  },
  {
    key: 'music_audio',
    label: 'Music & Audio',
    services: [
      { id: 'spotify', name: 'Spotify', plans: [{ label: 'Student', amount: 59 }, { label: 'Individual', amount: 119 }, { label: 'Duo', amount: 149 }, { label: 'Family', amount: 179 }] },
      { id: 'apple-music', name: 'Apple Music', plans: [{ label: 'Student', amount: 59 }, { label: 'Individual', amount: 99 }, { label: 'Family', amount: 149 }] },
      { id: 'youtube-premium', name: 'YouTube Premium', plans: [{ label: 'Lite', amount: 89 }, { label: 'Student', amount: 89 }, { label: 'Individual', amount: 149 }, { label: 'Family', amount: 299 }] },
      { id: 'amazon-music', name: 'Amazon Music', plans: [{ label: 'Included with Prime', amount: 0 }] },
      { id: 'audible', name: 'Audible', plans: [{ label: 'Standard (Monthly)', amount: 199 }] },
    ],
  },
  {
    key: 'food_dining',
    label: 'Food Delivery & Dining',
    services: [
      { id: 'swiggy-one', name: 'Swiggy One', plans: [{ label: 'Lite (3 Months)', amount: 99 }, { label: 'Basic (3 Months)', amount: 299 }, { label: 'BLCK (6 Months)', amount: 599 }] },
      { id: 'zomato-gold', name: 'Zomato Gold', plans: [{ label: '3 Months', amount: 349 }, { label: '6 Months', amount: 999 }] },
      { id: 'eazydiner-prime', name: 'EazyDiner Prime', plans: [{ label: '1 Month', amount: 295 }, { label: 'Annual', amount: 2395 }] },
    ],
  },
  {
    key: 'grocery_quick_commerce',
    label: 'Grocery & Quick Commerce',
    services: [
      { id: 'zepto-pass', name: 'Zepto Pass', plans: [{ label: 'Monthly', amount: 39 }] },
      { id: 'bbstar', name: 'BigBasket bbstar', plans: [{ label: '6 Months', amount: 299 }] },
    ],
  },
  {
    key: 'ecommerce',
    label: 'E-Commerce',
    services: [
      { id: 'flipkart-vip', name: 'Flipkart VIP', plans: [{ label: 'Annual', amount: 499 }] },
    ],
  },
  {
    key: 'fitness_health',
    label: 'Fitness & Health',
    services: [
      { id: 'cult-fit', name: 'Cult.fit', plans: [{ label: 'Pro (Monthly eq.)', amount: 1000 }, { label: 'Elite (Monthly eq.)', amount: 1500 }] },
      { id: 'healthifyme', name: 'HealthifyMe', plans: [{ label: 'Smart Plan (Monthly)', amount: 999 }, { label: 'Pro Plan (Monthly)', amount: 1499 }] },
      { id: 'strava', name: 'Strava', plans: [{ label: 'Premium (Monthly)', amount: 249 }] },
    ],
  },
  {
    key: 'productivity_cloud',
    label: 'Productivity, AI & Cloud',
    services: [
      { id: 'icloud', name: 'iCloud+', plans: [{ label: '50GB', amount: 75 }, { label: '200GB', amount: 219 }, { label: '2TB', amount: 749 }] },
      { id: 'google-one', name: 'Google One', plans: [{ label: 'Basic 100GB', amount: 130 }, { label: 'Standard 200GB', amount: 210 }, { label: 'Premium 2TB', amount: 650 }] },
      { id: 'microsoft-365', name: 'Microsoft 365', plans: [{ label: 'Personal (Monthly)', amount: 489 }, { label: 'Family (Monthly)', amount: 619 }] },
      { id: 'notion', name: 'Notion', plans: [{ label: 'Plus (Monthly)', amount: 830 }] },
      { id: 'canva-pro', name: 'Canva Pro', plans: [{ label: 'Individual (Monthly)', amount: 499 }, { label: 'Annual (÷12)', amount: 333 }] },
      { id: 'chatgpt-plus', name: 'ChatGPT Plus', plans: [{ label: 'Plus (Monthly)', amount: 1950 }] },
    ],
  },
  {
    key: 'dating',
    label: 'Dating',
    services: [
      { id: 'tinder', name: 'Tinder', plans: [{ label: 'Plus (Monthly)', amount: 249 }, { label: 'Gold (Monthly)', amount: 499 }, { label: 'Platinum (Monthly)', amount: 699 }] },
      { id: 'bumble', name: 'Bumble', plans: [{ label: 'Premium (Weekly)', amount: 449 }, { label: 'Premium (Monthly)', amount: 999 }] },
    ],
  },
  {
    key: 'mobility',
    label: 'Mobility',
    services: [
      { id: 'uber-one', name: 'Uber One', plans: [{ label: 'Monthly', amount: 149 }] },
    ],
  },
  {
    key: 'telecom',
    label: 'Telecom',
    services: [
      { id: 'jio-postpaid', name: 'Jio Postpaid Plus', plans: [{ label: '₹399 Plan', amount: 399 }, { label: '₹599 Plan', amount: 599 }, { label: '₹699 Plan', amount: 699 }] },
      { id: 'airtel-postpaid', name: 'Airtel Postpaid', plans: [{ label: '₹399 Plan', amount: 399 }, { label: '₹499 Plan', amount: 499 }, { label: '₹599 Plan', amount: 599 }] },
      { id: 'vi-postpaid', name: 'Vi Postpaid', plans: [{ label: '₹401 Plan', amount: 401 }, { label: '₹501 Plan', amount: 501 }] },
    ],
  },
]

export type SubscriptionCategory = (typeof SUBSCRIPTION_CATEGORIES)[number]['key']
