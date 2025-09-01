import { NextResponse } from 'next/server';
import { STRIPE_API_VERSION } from '@/lib/stripe';

export async function GET() {
  const hasStripeKey = Boolean(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY);
  return NextResponse.json({
    hasStripeKey,
    stripeApiVersion: STRIPE_API_VERSION,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
    nodeEnv: process.env.NODE_ENV || null,
  });
}

