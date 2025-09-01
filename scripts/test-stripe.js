/**
 * Test script to verify your Stripe integration
 * Run: node scripts/test-stripe.js
 */

require('dotenv').config({ path: '.env.local' });

async function testStripeIntegration() {
  console.log('🧪 Testing Reality Auditor Stripe Integration...\n');

  // Test 1: Verify environment variables
  console.log('📋 Environment Variables:');
  console.log('✅ STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Present' : '❌ Missing');
  console.log('✅ STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'Present' : '❌ Missing');
  console.log('✅ NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  console.log();

  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('❌ Missing STRIPE_SECRET_KEY. Please add it to .env.local');
    return;
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  try {
    // Test 2: Verify your Price ID exists
    console.log('💰 Testing your actual Price ID...');
    const priceId = 'price_1S1tnbGnOgSIwPZhYfV3aFXe';
    
    const price = await stripe.prices.retrieve(priceId);
    console.log('✅ Price found:', {
      id: price.id,
      amount: `$${price.unit_amount / 100}`,
      currency: price.currency.toUpperCase(),
      interval: price.recurring?.interval,
      product: price.product
    });
    console.log();

    // Test 3: Check webhook endpoints
    console.log('🔗 Webhook Endpoints:');
    const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    
    if (endpoints.data.length === 0) {
      console.log('⚠️ No webhook endpoints configured');
      console.log('👉 Add this endpoint in your Stripe Dashboard:');
      console.log('   URL: https://reality-auditor-g0pnkiggw-valentin2v2000s-projects.vercel.app/api/stripe/webhook');
      console.log('   Events: checkout.session.completed, customer.*, customer.subscription.*, invoice.payment_succeeded');
    } else {
      endpoints.data.forEach((endpoint, i) => {
        console.log(`${i + 1}. ${endpoint.url}`);
        console.log(`   Status: ${endpoint.status}`);
        console.log(`   Events: ${endpoint.enabled_events.length} configured`);
        
        const requiredEvents = [
          'checkout.session.completed',
          'customer.created',
          'customer.updated',
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
          'invoice.payment_succeeded'
        ];
        
        const missing = requiredEvents.filter(event => !endpoint.enabled_events.includes(event));
        if (missing.length > 0) {
          console.log(`   ⚠️ Missing events: ${missing.join(', ')}`);
        } else {
          console.log('   ✅ All required events configured');
        }
        console.log();
      });
    }

    // Test 4: Create a test checkout session (don't complete it)
    console.log('🛒 Testing checkout session creation...');
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        metadata: {
          source: 'test_script',
        },
      });

      console.log('✅ Checkout session created successfully:', session.id);
      console.log('   URL:', session.url);
      console.log('   Status:', session.status);
      console.log();
    } catch (error) {
      console.log('❌ Failed to create checkout session:', error.message);
    }

    // Test 5: Recent events
    console.log('📊 Recent Stripe Events (last 5):');
    const events = await stripe.events.list({ limit: 5 });
    
    if (events.data.length === 0) {
      console.log('No recent events found');
    } else {
      events.data.forEach((event, i) => {
        const date = new Date(event.created * 1000).toLocaleString();
        console.log(`${i + 1}. ${event.type} - ${date}`);
      });
    }
    console.log();

    console.log('🎉 Stripe Integration Test Complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. Fix Firebase Auth (enable Email/Password in Firebase Console)');
    console.log('2. Sign up → Dashboard → Test the upgrade flow');
    console.log('3. Complete a test purchase to verify webhook processing');
    console.log('4. Check Vercel logs for webhook delivery confirmations');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'resource_missing') {
      console.log('\n💡 This usually means:');
      console.log('- Wrong Price ID');
      console.log('- Using test key with live Price ID (or vice versa)');
      console.log('- Price was deleted from Stripe Dashboard');
    }
  }
}

// Run the test
testStripeIntegration().catch(console.error);
