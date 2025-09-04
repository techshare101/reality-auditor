#!/usr/bin/env node

/**
 * Test script for Stripe webhook events
 * Run: node scripts/test-stripe-webhook.js
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createTestCustomer() {
  console.log('🧑 Creating test customer...');
  const customer = await stripe.customers.create({
    email: 'test@reality-auditor.com',
    metadata: {
      userId: 'test-user-123',
    },
  });
  console.log('✅ Customer created:', customer.id);
  return customer;
}

async function createTestSubscription(customerId) {
  console.log('📦 Creating test subscription...');
  
  // First, create a test product and price
  const product = await stripe.products.create({
    name: 'Reality Auditor Pro - Test',
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 999, // $9.99
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
    nickname: 'pro',
  });

  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{
      price: price.id,
    }],
    metadata: {
      plan: 'pro',
    },
  });

  console.log('✅ Subscription created:', subscription.id);
  return subscription;
}

async function createCheckoutSession(customerId) {
  console.log('🛒 Creating checkout session...');
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Reality Auditor Pro',
        },
        unit_amount: 999,
        recurring: {
          interval: 'month',
        },
      },
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: 'http://localhost:3000/success',
    cancel_url: 'http://localhost:3000/cancel',
    metadata: {
      userId: 'test-user-123',
      plan: 'pro',
    },
  });

  console.log('✅ Checkout session created:', session.id);
  console.log('🔗 Checkout URL:', session.url);
  return session;
}

async function triggerWebhookLocally() {
  console.log('\n📡 To test webhook locally:');
  console.log('1. Install Stripe CLI: https://stripe.com/docs/stripe-cli');
  console.log('2. Run: stripe login');
  console.log('3. In one terminal: stripe listen --forward-to localhost:3000/api/stripe/webhook');
  console.log('4. In another terminal, trigger test events:');
  console.log('   - stripe trigger checkout.session.completed');
  console.log('   - stripe trigger customer.subscription.updated');
  console.log('   - stripe trigger invoice.payment_succeeded');
}

async function main() {
  try {
    console.log('🚀 Starting Stripe webhook test...\n');
    
    const customer = await createTestCustomer();
    await createTestSubscription(customer.id);
    const session = await createCheckoutSession(customer.id);
    
    console.log('\n📋 Summary:');
    console.log('Customer ID:', customer.id);
    console.log('Customer Email:', customer.email);
    console.log('Checkout URL:', session.url);
    
    await triggerWebhookLocally();
    
    console.log('\n✅ Test setup complete! Check your Stripe Dashboard for events.');
    console.log('🔍 Also check Firebase/Firestore for updated user records.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
