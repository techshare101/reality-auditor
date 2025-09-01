import Stripe from 'stripe';

// Centralized Stripe client configuration
// Update API version here once, affects all routes
const stripeConfig: Stripe.StripeConfig = {
  // Let Stripe use their latest API version automatically
  // Or specify: apiVersion: '2025-08-27.basil' as const
  typescript: true,
};

// Server-side Stripe client (for API routes)
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('⚠️ STRIPE_SECRET_KEY not configured. Please set it in your environment variables.');
  }
  
  return new Stripe(secretKey, stripeConfig);
}

// Get a singleton instance (reuse same client)
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = getStripeClient();
  }
  return stripeInstance;
}

// Type-safe webhook signature verification
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  endpointSecret: string
): Stripe.Event {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
}

// Common Stripe operations as helpers
export const stripeHelpers = {
  // Create checkout session
  async createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
    const stripe = getStripe();
    return stripe.checkout.sessions.create(params);
  },

  // Retrieve session
  async retrieveSession(sessionId: string) {
    const stripe = getStripe();
    return stripe.checkout.sessions.retrieve(sessionId);
  },

  // Create billing portal session
  async createPortalSession(params: Stripe.BillingPortal.SessionCreateParams) {
    const stripe = getStripe();
    return stripe.billingPortal.sessions.create(params);
  },

  // Get subscription
  async retrieveSubscription(subscriptionId: string) {
    const stripe = getStripe();
    return stripe.subscriptions.retrieve(subscriptionId);
  },

  // List customer subscriptions
  async listSubscriptions(customerId: string) {
    const stripe = getStripe();
    return stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
    });
  },

  // Cancel subscription
  async cancelSubscription(subscriptionId: string) {
    const stripe = getStripe();
    return stripe.subscriptions.cancel(subscriptionId);
  },
};

export default getStripe;
