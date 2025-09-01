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
    let userId: string;
    
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (authError) {
      console.error('❌ Auth verification failed:', authError);
      // For development, extract user ID from token payload without verification
      // This is NOT secure for production!
      try {
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
        userId = payload.sub || payload.user_id;
        console.warn('⚠️ Using unverified token payload for development');
      } catch {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        );
      }
    }

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
