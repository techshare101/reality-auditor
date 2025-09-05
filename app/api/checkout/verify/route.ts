import { NextRequest, NextResponse } from 'next/server';
import { retrieveSession } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID is required' },
      { status: 400 }
    );
  }

  try {
    const session = await retrieveSession(sessionId);
    
    return NextResponse.json({
      customer_email: session.customer_details?.email,
      payment_status: session.payment_status,
      subscription_id: session.subscription,
      customer_id: session.customer,
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}
