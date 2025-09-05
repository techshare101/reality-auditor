import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';
import { getStripe, stripeHelpers } from '@/lib/stripeClient';
import type Stripe from 'stripe';

// Plan mapping with your actual Stripe Price IDs
const PRICE_PLANS: Record<string, string> = {
  basic_monthly: 'price_1S2KmxGRxp9eu0DJrdcrLLNR', // Your actual $19/month Basic plan live price ID
  
  // Placeholders for future plans (replace when you create them in Stripe)
  basic_yearly: 'price_basic_yearly_placeholder',
  pro_monthly: 'price_pro_monthly_placeholder', 
  pro_yearly: 'price_pro_yearly_placeholder',
  enterprise_monthly: 'price_enterprise_monthly_placeholder',
  enterprise_yearly: 'price_enterprise_yearly_placeholder',
};

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Stripe checkout route called');
    console.log('🔧 Environment check:', {
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: process.env.NODE_ENV
    });
    
    const body = await request.json();
    console.log('📦 Request body:', body);
    const { priceId } = body;

    console.log('💰 Available Price IDs:', PRICE_PLANS);
    console.log('🎯 Requested Price ID:', priceId);
    
    if (!priceId || !Object.values(PRICE_PLANS).includes(priceId)) {
      console.error('❌ Invalid price ID provided:', priceId);
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Verify authentication (optional - can allow anonymous checkout)
    let userId: string | null = null;
    let userEmail: string | null = null;
    let stripeCustomerId: string | null = null;

    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        userId = decodedToken.uid;
        userEmail = decodedToken.email || null;

        console.log(`🛒 Creating checkout session for user: ${userId}`);

        // Try to get existing customer ID if Firestore is available
        try {
          const customerDoc = await db.collection('customers').doc(userId).get();
          if (customerDoc.exists) {
            stripeCustomerId = customerDoc.data()?.stripeCustomerId;
            console.log(`🔍 Found existing Stripe customer: ${stripeCustomerId}`);
          }
        } catch (firestoreError) {
          console.warn('⚠️ Firestore unavailable, proceeding without customer lookup');
        }
      } catch (authError) {
        console.warn('⚠️ Auth failed for checkout, proceeding with anonymous checkout:', authError instanceof Error ? authError.message : String(authError));
      }
    }

    // Step 2: Ensure a Stripe customer exists for authenticated users (simplified for now)
    if (userId && userEmail && !stripeCustomerId) {
      console.log(`🆕 Creating new Stripe customer for user: ${userId}`);
      // Create a new Stripe customer
      const stripe = getStripe();
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          firebaseUid: userId,
          source: 'reality_auditor_upgrade',
        },
      });
      stripeCustomerId = customer.id;

      // TODO: Save mapping to Firestore once credentials are configured
      // For now, we'll let the webhook handle the customer linking
      console.log(`✅ Created Stripe customer: ${customer.id}`);
    }

    // Prepare checkout session configuration (NO customer_creation in subscription mode)
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=cancelled`,
      // automatic_tax: { enabled: true }, // Disabled for test mode - enable when business address is set in Stripe Dashboard
      billing_address_collection: 'auto',
      metadata: {
        userId: userId || 'anonymous',
        firebaseUid: userId || 'anonymous',
        priceId: priceId,
        source: 'reality_auditor_upgrade',
      },
    };

    // Step 3: Tie checkout to Stripe customer (or auto-create one)
    if (stripeCustomerId) {
      // Use existing customer
      sessionConfig.customer = stripeCustomerId;
      console.log(`🔗 Using existing Stripe customer: ${stripeCustomerId}`);
    } else if (userEmail) {
      // Pre-fill email for authenticated users (Stripe will auto-create customer)
      sessionConfig.customer_email = userEmail;
      console.log(`📧 Pre-filling email for auto-customer creation: ${userEmail}`);
    } else {
      // Anonymous checkout - Stripe will create customer after payment
      console.log(`👤 Anonymous checkout - customer will be created by Stripe`);
    }

    // Add subscription metadata
    sessionConfig.subscription_data = {
      metadata: {
        userId: userId || 'anonymous',
        firebaseUid: userId || 'anonymous',
        plan: priceId,
      },
    };

    if (!process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_TEST_SECRET_KEY) {
      console.error('❌ Stripe secret key not configured');
      return NextResponse.json({ error: 'Stripe not configured on server' }, { status: 500 });
    }

    const session = await stripeHelpers.createCheckoutSession(sessionConfig);

    console.log(`✅ Checkout session created: ${session.id}`);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('❌ Checkout session error:', error);
    
    // More detailed error handling
    let errorMessage = 'Failed to create checkout session';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
      
      // Specific Stripe error handling
      if ('type' in error && error.type === 'StripeInvalidRequestError') {
        if (error.message.includes('price')) {
          return NextResponse.json(
            { 
              error: 'Invalid pricing configuration',
              details: error.message
            },
            { status: 400 }
          );
        }
      }
      
      // Log full error details
      console.error('Full error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        type: 'type' in error ? error.type : 'unknown',
        code: 'code' in error ? error.code : 'unknown',
      });
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : 'Check server logs for details'
      },
      { status: 500 }
    );
  }
}

// Get available plans (for frontend)
export async function GET() {
  return NextResponse.json({
    plans: {
      basic: {
        monthly: PRICE_PLANS.basic_monthly, // Your actual $19/month Price ID
        yearly: PRICE_PLANS.basic_yearly,   // Placeholder
        name: 'Basic Plan',
        price: 19, // $19/month
        audits: 50,
        features: ['50 audits/month', 'Advanced analysis', 'Email support', 'Priority processing']
      },
      pro: {
        monthly: PRICE_PLANS.pro_monthly,   // Placeholder
        yearly: PRICE_PLANS.pro_yearly,     // Placeholder
        name: 'Pro Plan',
        price: 49, // Future pricing
        audits: 200,
        features: ['200 audits/month', 'Advanced analysis', 'Priority support', 'API access']
      },
      enterprise: {
        monthly: PRICE_PLANS.enterprise_monthly, // Placeholder
        yearly: PRICE_PLANS.enterprise_yearly,   // Placeholder
        name: 'Enterprise Plan',
        price: 99, // Future pricing
        audits: 1000,
        features: ['1000 audits/month', 'White-label options', 'Custom integrations', 'Dedicated support']
      }
    },
    // Available for immediate purchase
    available: {
      basic_monthly: {
        priceId: PRICE_PLANS.basic_monthly,
        name: 'Basic Plan',
        price: 19,
        currency: 'USD',
        interval: 'month',
        audits: 50
      }
    }
  });
}
