// Stripe price configuration
export const STRIPE_PRICES = {
  // Production price IDs
  basic_monthly: "price_1S2KmxGRxp9eu0DJrdcrLLNR", // $19/month Basic plan
} as const;

// Plan metadata
export const PLAN_METADATA = {
  basic_monthly: {
    name: "Basic Plan",
    price: 19,
    currency: "USD",
    interval: "month",
    features: [
      "50 audits/month",
      "Advanced analysis",
      "Email support",
      "Priority processing"
    ]
  }
} as const;

// Helper to get audit limits by plan
export const PLAN_AUDIT_LIMITS = {
  free: 5,
  basic: 50,
  pro: 200,
  enterprise: 1000
} as const;