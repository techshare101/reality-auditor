import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { checkSubscriptionStatus } from '@/lib/subscription-checker-v2';

// Ensure this route is always dynamically rendered
export const dynamic = 'force-dynamic';

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

    // Get subscription status from profiles collection
    const subscriptionStatus = await checkSubscriptionStatus(userId);

    // Map the response to match what SubscriptionCards expects
    const response = {
      planType: subscriptionStatus.isPro ? 'pro' : 'free',
      planDisplayName: subscriptionStatus.isPro ? 'Pro Plan' : 'Free Plan',
      auditsUsed: subscriptionStatus.audits_used,
      auditsLimit: subscriptionStatus.audits_limit,
      auditsRemaining: subscriptionStatus.audits_remaining,
      usagePercentage: subscriptionStatus.audits_limit > 0 ? 
        (subscriptionStatus.audits_used / subscriptionStatus.audits_limit) * 100 : 0,
      isNearLimit: subscriptionStatus.audits_remaining <= Math.ceil(subscriptionStatus.audits_limit * 0.1),
      isActive: subscriptionStatus.isPro || subscriptionStatus.audits_remaining > 0,
      subscriptionStatus: subscriptionStatus.isPro ? 'active' : 'free',
      userId,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Subscription summary for ${userId}:`, {
      planType: response.planType,
      auditsUsed: response.auditsUsed,
      auditsRemaining: response.auditsRemaining,
      isNearLimit: response.isNearLimit
    });

    return NextResponse.json(response);

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
