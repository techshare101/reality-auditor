import { NextRequest, NextResponse } from 'next/server';

// This endpoint is a convenience wrapper for the existing /api/stripe/checkout endpoint
// It's used by the upgrade modal to create a checkout session with the default price
export async function POST(request: NextRequest) {
  try {
    // Default to the Pro plan price ID
    const DEFAULT_PRICE_ID = 'price_1S2KmxGRxp9eu0DJrdcrLLNR';
    
    // Get the authorization header if present
    const authHeader = request.headers.get('authorization');
    
    // Forward the request to the existing Stripe checkout endpoint
    const response = await fetch(new URL('/api/stripe/checkout', request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {})
      },
      body: JSON.stringify({ priceId: DEFAULT_PRICE_ID })
    });

    // Forward the response
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to create checkout session' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
