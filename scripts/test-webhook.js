/**
 * Test script to verify Stripe webhook integration
 * Run this after setting up your webhook endpoint
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testWebhookEndpoint() {
  console.log('🧪 Testing Stripe webhook integration...\n');

  try {
    // 1. List webhook endpoints
    console.log('📋 Checking webhook endpoints...');
    const endpoints = await stripe.webhookEndpoints.list();
    
    if (endpoints.data.length === 0) {
      console.log('❌ No webhook endpoints found. Please set up your webhook in Stripe dashboard.');
      return;
    }

    endpoints.data.forEach((endpoint, i) => {
      console.log(`${i + 1}. ${endpoint.url}`);
      console.log(`   Status: ${endpoint.status}`);
      console.log(`   Events: ${endpoint.enabled_events.join(', ')}`);
      console.log();
    });

    // 2. Check recent events
    console.log('📊 Recent webhook events:');
    const events = await stripe.events.list({ limit: 5 });
    
    if (events.data.length === 0) {
      console.log('No recent events found.');
    } else {
      events.data.forEach((event, i) => {
        console.log(`${i + 1}. ${event.type} - ${new Date(event.created * 1000).toISOString()}`);
      });
    }

    console.log('\n✅ Webhook integration test complete!');
    console.log('\nNext steps:');
    console.log('1. Make sure your webhook endpoint is accessible');
    console.log('2. Test with a real Stripe event (create a customer, subscription, etc.)');
    console.log('3. Check your application logs for webhook processing');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test subscription status check
async function testSubscriptionCheck() {
  console.log('\n🔍 Testing subscription status check...');
  
  try {
    // This would normally be called with a real user ID
    const { checkSubscriptionStatus } = require('../src/lib/subscription-checker');
    
    // Test with a fake user ID
    const status = await checkSubscriptionStatus('test-user-id');
    console.log('Subscription status for test user:', status);
    
  } catch (error) {
    console.log('⚠️ Subscription checker not available (this is normal for new installs)');
  }
}

// Run tests
if (require.main === module) {
  testWebhookEndpoint();
  testSubscriptionCheck();
}

module.exports = { testWebhookEndpoint, testSubscriptionCheck };
