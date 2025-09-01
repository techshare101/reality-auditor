import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance
export const STRIPE_API_VERSION = '2024-06-20';
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY;
if (!STRIPE_KEY) {
  // eslint-disable-next-line no-console
  console.warn('⚠️ STRIPE_SECRET_KEY not set. Stripe features will fail until configured.');
}

export const stripe = new Stripe(STRIPE_KEY || 'sk_test_placeholder', {
  apiVersion: STRIPE_API_VERSION,
  typescript: true,
});

// Client-side Stripe promise
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

// Helper function to create checkout session
export async function createCheckoutSession(priceId: string, successUrl?: string, cancelUrl?: string) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_creation: 'always',
      metadata: {
        product: 'Reality Auditor Pro',
      },
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Helper function to retrieve session
export async function retrieveSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session;
  } catch (error) {
    console.error('Error retrieving session:', error);
    throw error;
  }
}

// Helper function to get customer subscriptions
export async function getCustomerSubscriptions(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
    });
    return subscriptions.data;
  } catch (error) {
    console.error('Error getting customer subscriptions:', error);
    throw error;
  }
}
