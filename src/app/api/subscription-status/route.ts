import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { getSubscriptionSummary } from '@/lib/subscription-checker';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    console.log(`📊 Getting subscription status for user: ${userId}`);

    // Get comprehensive subscription summary
    const subscriptionSummary = await getSubscriptionSummary(userId);

    console.log(`✅ Subscription summary for ${userId}:`, {
      planType: subscriptionSummary.planType,
      auditsUsed: subscriptionSummary.auditsUsed,
      auditsRemaining: subscriptionSummary.auditsRemaining,
      isNearLimit: subscriptionSummary.isNearLimit
    });

    return NextResponse.json({
      ...subscriptionSummary,
      userId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Subscription status error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('auth')) {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}
