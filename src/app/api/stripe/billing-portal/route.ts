import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
    console.log('🏦️ Billing portal route called');
    console.log('🔍 Environment check:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
      appUrl: process.env.NEXT_PUBLIC_APP_URL
    });
    
    // Verify authentication header exists
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ No authorization header provided');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Extract user email from Firebase JWT token (temporary solution)
    let userEmail: string | null = null;
    
    try {
      // Decode Firebase JWT token to get email
      const tokenParts = idToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        userEmail = payload.email;
        console.log(`🔑 User email from token: ${userEmail}`);
      }
    } catch (decodeError) {
      console.error('❌ Token decode failed:', decodeError);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Unable to determine user email from token' },
        { status: 400 }
      );
    }

    console.log(`🏦️ Looking up Stripe customer for: ${userEmail}`);

    // Look up existing Stripe customer by email
    const customers = await stripe.customers.list({ 
      email: userEmail, 
      limit: 1 
    });
    
    let stripeCustomer = customers.data[0];
    
    if (!stripeCustomer) {
      // ⚠️ Graceful fallback for users without subscriptions
      console.log(`🤷 No Stripe customer found for ${userEmail}`);
      return NextResponse.json(
        { 
          error: 'no_subscription',
          message: 'No active subscription found. Please upgrade to a paid plan to access the billing portal.',
          upgrade_url: '/pricing'
        },
        { status: 404 }
      );
    }

    console.log(`✅ Found Stripe customer: ${stripeCustomer.id}`);

    // Check if customer has any subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomer.id,
      limit: 1
    });
    
    if (subscriptions.data.length === 0) {
      // ⚠️ Graceful fallback for customers without active subscriptions
      console.log(`📋 No active subscriptions for customer ${stripeCustomer.id}`);
      return NextResponse.json(
        { 
          error: 'no_subscription',
          message: 'No active subscription found. Please upgrade to a paid plan to access the billing portal.',
          upgrade_url: '/pricing'
        },
        { status: 404 }
      );
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomer.id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    console.log(`✅ Billing portal session created: ${session.id}`);

    return NextResponse.json({
      url: session.url,
      customerId: stripeCustomer.id,
    });

  } catch (error: any) {
    console.error('❌ Billing portal error:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack?.slice(0, 500) // First 500 chars of stack
    });
    
    // Handle specific Stripe errors
    if (error.type === 'StripeError') {
      console.error('❌ Stripe Error Details:', {
        type: error.type,
        code: error.code,
        decline_code: error.decline_code,
        param: error.param,
        statusCode: error.statusCode,
        requestId: error.requestId
      });
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to create billing portal session',
        details: error.message,
        errorType: error.name || 'Unknown',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
