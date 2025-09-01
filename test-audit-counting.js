#!/usr/bin/env node

/**
 * Test script to verify audit counting system is working
 * Run this with: node test-audit-counting.js
 */

// Test configuration
const TEST_ARTICLE = `
Breaking news: Scientists at MIT have developed a new artificial intelligence system that can predict weather patterns with 95% accuracy. The system, called WeatherAI, uses advanced machine learning algorithms to analyze atmospheric data from satellites and ground stations worldwide.

Dr. Sarah Johnson, the lead researcher on the project, stated that "This breakthrough could revolutionize how we forecast weather, potentially saving lives and billions of dollars in economic losses." The system has been tested over the past two years and consistently outperforms traditional weather prediction models.

However, some critics argue that the system's accuracy claims are overstated and that more independent verification is needed before widespread adoption. The research team plans to publish their findings in Nature Climate Change next month.
`;

const API_BASE = 'http://localhost:3000'; // Change this if your app runs on a different port

async function testAuditCounting() {
  console.log('🔬 Testing Reality Auditor audit counting system...\n');

  try {
    // Step 1: Test anonymous audit (should work without authentication)
    console.log('1️⃣ Testing anonymous audit...');
    const anonymousResponse = await fetch(`${API_BASE}/api/reality-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: TEST_ARTICLE,
        metadata: {
          title: 'Test Article: New AI Weather Prediction System',
          author: 'Test Author',
          outlet: 'Test Outlet',
          date: new Date().toISOString()
        }
      })
    });

    if (anonymousResponse.ok) {
      const result = await anonymousResponse.json();
      console.log('✅ Anonymous audit successful');
      console.log('📊 Truth Score:', result.truth_score);
      console.log('🔍 Citations found:', result.citations?.length || 0);
      console.log('💾 Cache status:', result.cache_status);
      console.log('⏱️ Processing time:', result.processing_time + 'ms');
      if (result.usage) {
        console.log('📈 Usage info:', result.usage);
      }
    } else {
      const error = await anonymousResponse.text();
      console.log('❌ Anonymous audit failed:', error);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 2: Test API health check
    console.log('2️⃣ Testing API health check...');
    const healthResponse = await fetch(`${API_BASE}/api/reality-audit`);
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ API is healthy');
      console.log('📋 Service:', health.service);
      console.log('🔢 Version:', health.version);
      console.log('⚡ Capabilities:', health.capabilities.join(', '));
    } else {
      console.log('❌ API health check failed');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 3: Test subscription status endpoint (without auth - should return 401)
    console.log('3️⃣ Testing subscription status endpoint (without auth)...');
    const subscriptionResponse = await fetch(`${API_BASE}/api/subscription-status`);
    
    if (subscriptionResponse.status === 401) {
      console.log('✅ Subscription endpoint correctly requires authentication (401)');
    } else {
      console.log('⚠️ Unexpected response from subscription endpoint:', subscriptionResponse.status);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 4: Test caching (run the same audit again)
    console.log('4️⃣ Testing caching (running same audit again)...');
    const cachedResponse = await fetch(`${API_BASE}/api/reality-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: TEST_ARTICLE,
        metadata: {
          title: 'Test Article: New AI Weather Prediction System',
          author: 'Test Author',
          outlet: 'Test Outlet',
          date: new Date().toISOString()
        }
      })
    });

    if (cachedResponse.ok) {
      const result = await cachedResponse.json();
      console.log('✅ Cached audit successful');
      console.log('💾 Cache status:', result.cache_status);
      console.log('📡 Cache source:', result.cache_source);
      console.log('⏱️ Processing time:', result.processing_time + 'ms (should be much faster)');
      
      if (result.cache_status === 'hit') {
        console.log('🎯 Cache is working correctly!');
      } else {
        console.log('⚠️ Cache miss - might indicate cache issues');
      }
    } else {
      console.log('❌ Cached audit failed');
    }

    console.log('\n' + '='.repeat(60) + '\n');
    console.log('✅ Test completed! Check the console for any errors or warnings.');
    console.log('📝 Note: To test authenticated features, you need to:');
    console.log('   1. Set up Firebase authentication in your browser');
    console.log('   2. Get a valid ID token');
    console.log('   3. Include Authorization: Bearer <token> header');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('🔍 Full error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your Reality Auditor app is running on http://localhost:3000');
      console.log('   Run: npm run dev');
    }
  }
}

// Instructions
console.log('🚀 Reality Auditor Audit Counting Test\n');
console.log('This script will test the audit counting system by:');
console.log('• Making anonymous audit requests');
console.log('• Testing API health checks');
console.log('• Verifying caching behavior');
console.log('• Checking authentication requirements');
console.log('\nMake sure your Reality Auditor app is running first!\n');

// Run the test
testAuditCounting().catch(console.error);
