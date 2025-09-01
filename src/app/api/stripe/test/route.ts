import { NextResponse } from 'next/server';
import { stripe, STRIPE_API_VERSION } from '@/lib/stripe';

export async function GET() {
  try {
    // Check if Stripe is configured
    const hasKey = !!(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY);
    
    if (!hasKey) {
      return NextResponse.json({
        configured: false,
        message: 'Stripe secret key not configured',
        apiVersion: STRIPE_API_VERSION,
      });
    }

    // Try to retrieve the price to verify it exists
    const priceId = 'price_1S1tnbGnOgSIwPZhYfV3aFXe';
    
    try {
      const price = await stripe.prices.retrieve(priceId);
      
      return NextResponse.json({
        configured: true,
        priceExists: true,
        price: {
          id: price.id,
          active: price.active,
          currency: price.currency,
          unit_amount: price.unit_amount,
          type: price.type,
          recurring: price.recurring,
          product: price.product,
        },
        apiVersion: STRIPE_API_VERSION,
        environment: process.env.NODE_ENV,
      });
    } catch (priceError: any) {
      return NextResponse.json({
        configured: true,
        priceExists: false,
        priceError: priceError.message,
        priceErrorCode: priceError.code,
        priceErrorType: priceError.type,
        apiVersion: STRIPE_API_VERSION,
        environment: process.env.NODE_ENV,
        hint: 'The price ID might not exist in your Stripe account. Please check your Stripe dashboard.',
      });
    }
  } catch (error) {
    return NextResponse.json({
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      apiVersion: STRIPE_API_VERSION,
    });
  }
}
