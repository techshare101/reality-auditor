import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { db } from '@/lib/firebase-admin';
import { sendUsageResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('💳 Payment successful for session:', session.id);
        
        // Here you can:
        // 1. Update user subscription status in your database
        // 2. Send welcome email
        // 3. Enable pro features
        
        // Example: Update user in database
        if (session.customer && session.subscription) {
          await handleSubscriptionCreated({
            customerId: session.customer as string,
            subscriptionId: session.subscription as string,
            customerEmail: session.customer_details?.email,
            sessionId: session.id,
          });
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        console.log('🎉 Subscription created:', subscription.id);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('📝 Subscription updated:', subscription.id);
        
        // Handle subscription changes (upgrade/downgrade, billing cycle changes)
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('❌ Subscription cancelled:', subscription.id);
        
        // Handle subscription cancellation
        await handleSubscriptionCancelled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('✅ Invoice paid:', invoice.id);
        
        // Reset usage for recurring payments (not first payment)
        if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
          await handleUsageReset(invoice);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('⚠️ Invoice payment failed:', invoice.id);
        
        // Handle failed payment (send email, retry logic, etc.)
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Helper functions for subscription management
async function handleSubscriptionCreated({
  customerId,
  subscriptionId,
  customerEmail,
  sessionId,
}: {
  customerId: string;
  subscriptionId: string;
  customerEmail?: string | null;
  sessionId: string;
}) {
  try {
    // Find user by customer ID
    const usersSnapshot = await db.collection('subscriptions')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();
    
    if (!usersSnapshot.empty) {
      const userId = usersSnapshot.docs[0].id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price.product']
      });
      
      const priceId = subscription.items.data[0]?.price.id;
      const plan = getPlanFromPriceId(priceId);
      const auditLimit = getAuditLimitForPlan(plan);
      
      // Update subscription data
      await db.collection('subscriptions').doc(userId).update({
        stripeSubscriptionId: subscriptionId,
        plan,
        status: 'active',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: new Date()
      });
      
      // Update usage record
      await db.collection('usage').doc(userId).update({
        plan,
        audit_limit: auditLimit,
        audits_used: 0, // Reset on new subscription
        updatedAt: new Date()
      });
      
      console.log('✅ Subscription created and usage reset for user:', userId);
    }
  } catch (error) {
    console.error('❌ Error handling subscription creation:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    const customerId = subscription.customer;
    const usersSnapshot = await db.collection('subscriptions')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();
    
    if (!usersSnapshot.empty) {
      const userId = usersSnapshot.docs[0].id;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = getPlanFromPriceId(priceId);
      const auditLimit = getAuditLimitForPlan(plan);
      
      // Update subscription data
      await db.collection('subscriptions').doc(userId).update({
        plan,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: new Date()
      });
      
      // Update usage record with new plan limits
      const usageDoc = await db.collection('usage').doc(userId).get();
      const currentUsage = usageDoc.data()?.audits_used || 0;
      
      await db.collection('usage').doc(userId).update({
        plan,
        audit_limit: auditLimit,
        // Keep current usage unless it exceeds new limit
        audits_used: Math.min(currentUsage, auditLimit),
        updatedAt: new Date()
      });
      
      console.log('✅ Subscription updated for user:', userId, 'New plan:', plan);
    }
  } catch (error) {
    console.error('❌ Error handling subscription update:', error);
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  try {
    const customerId = subscription.customer;
    const usersSnapshot = await db.collection('subscriptions')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();
    
    if (!usersSnapshot.empty) {
      const userId = usersSnapshot.docs[0].id;
      
      // Update subscription status
      await db.collection('subscriptions').doc(userId).update({
        status: 'cancelled',
        plan: 'free',
        updatedAt: new Date()
      });
      
      // Revert to free plan limits
      await db.collection('usage').doc(userId).update({
        plan: 'free',
        audit_limit: 5,
        updatedAt: new Date()
      });
      
      console.log('✅ Subscription cancelled, user reverted to free plan:', userId);
    }
  } catch (error) {
    console.error('❌ Error handling subscription cancellation:', error);
  }
}

// Handle monthly usage reset on successful invoice payment
async function handleUsageReset(invoice: any) {
  try {
    const customerId = invoice.customer;
    const usersSnapshot = await db.collection('subscriptions')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();
    
    if (!usersSnapshot.empty) {
      const userId = usersSnapshot.docs[0].id;
      const userData = usersSnapshot.docs[0].data();
      const plan = userData.plan || 'basic';
      const auditLimit = getAuditLimitForPlan(plan);
      
      // Reset usage counter
      await db.collection('usage').doc(userId).update({
        audits_used: 0,
        last_reset: new Date(),
        updatedAt: new Date()
      });
      
      // Send usage reset email notification
      await sendUsageResetEmail(userId, plan, auditLimit);
      
      console.log(`✅ Usage reset for user ${userId} on ${plan} plan (${auditLimit} audits)`);
    }
  } catch (error) {
    console.error('❌ Error handling usage reset:', error);
  }
}

// Helper function to map Stripe price IDs to plan names
function getPlanFromPriceId(priceId: string): string {
  const priceMap: Record<string, string> = {
    [process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID || '']: 'basic',
    [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '']: 'pro',
    [process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID || '']: 'team',
  };
  return priceMap[priceId] || 'basic';
}

// Helper function to get audit limits for each plan
function getAuditLimitForPlan(plan: string): number {
  const limits: Record<string, number> = {
    free: 5,
    basic: 30,
    pro: 100,
    team: 500,
  };
  return limits[plan] || 5;
}
