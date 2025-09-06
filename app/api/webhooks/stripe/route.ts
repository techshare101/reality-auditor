import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripeClient';
import { headers } from 'next/headers';
import { db } from '@/lib/firebase-admin';
import { sendUsageResetEmail } from '@/lib/email';
import type { Stripe } from 'stripe';

// Helper functions
function getSubscriptionPeriodEnd(subscription: any): Date {
  if (subscription?.current_period_end) {
    return new Date(subscription.current_period_end * 1000);
  }
  // Default to end of current month
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

function getPlanFromPriceId(priceId: string): string {
  const priceMap: Record<string, string> = {
    [process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID || '']: 'basic',
    [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '']: 'pro',
    [process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID || '']: 'team',
  };
  return priceMap[priceId] || 'basic';
}

function getAuditLimitForPlan(plan: string): number {
  const limits: Record<string, number> = {
    free: 5,
    basic: 30,
    pro: 100,
    team: 500,
  };
  return limits[plan] || 5;
}

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
  const stripe = getStripe();

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
        
        // CRITICAL: Get the Firebase UID from metadata
        const userId = (session.metadata as any)?.userId || (session.metadata as any)?.uid;
        const userEmail = session.customer_details?.email;
        
        if (!userId) {
          console.error('❌ No userId found in session metadata!');
          // Try to find by email as fallback
          if (userEmail) {
            const usersSnapshot = await db.collection('users')
              .where('email', '==', userEmail)
              .limit(1)
              .get();
            
            if (!usersSnapshot.empty) {
              const foundUserId = usersSnapshot.docs[0].id;
              await handleSubscriptionCreated({
                userId: foundUserId,
                customerId: session.customer as string,
                subscriptionId: session.subscription as string,
                customerEmail: userEmail,
                sessionId: session.id,
              });
            }
          }
        } else {
          // We have userId from metadata - this is the preferred path
          await handleSubscriptionCreated({
            userId,
            customerId: session.customer as string,
            subscriptionId: session.subscription as string,
            customerEmail: userEmail,
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
        const subscription = event.data.object as any;
        console.log('🔄 Subscription updated:', subscription.id);
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('❌ Subscription cancelled:', subscription.id);
        await handleSubscriptionCancelled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('✅ Invoice paid:', invoice.id);
        
        // Reset usage for recurring payments (not first payment)
        if ((invoice as any).subscription && invoice.billing_reason === 'subscription_cycle') {
          await handleUsageReset(invoice);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('⚠️ Invoice payment failed:', invoice.id);
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

// Updated helper function to properly handle subscription creation
async function handleSubscriptionCreated({
  userId,
  customerId,
  subscriptionId,
  customerEmail,
  sessionId,
}: {
  userId: string;
  customerId: string;
  subscriptionId: string;
  customerEmail?: string | null;
  sessionId: string;
}) {
  try {
    console.log(`📝 Processing subscription for userId: ${userId}`);
    
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product']
    }) as any;
    
    const priceId = subscription.items.data[0]?.price.id;
    const plan = getPlanFromPriceId(priceId);
    const auditLimit = getAuditLimitForPlan(plan);
    const periodEnd = getSubscriptionPeriodEnd(subscription);
    
    // Update ALL relevant collections to ensure consistency
    const batch = db.batch();
    
    // 1. Update main subscriptions collection (by UID)
    const subscriptionRef = db.collection('subscriptions').doc(userId);
    batch.set(subscriptionRef, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      plan,
      status: 'active',
      currentPeriodEnd: periodEnd,
      sessionId,
      email: customerEmail,
      updatedAt: new Date()
    }, { merge: true });
    
    // 2. CRITICAL: Update user_subscription_status (used by some queries)
    const userStatusRef = db.collection('user_subscription_status').doc(userId);
    batch.set(userStatusRef, {
      plan: plan === 'basic' || plan === 'pro' ? 'pro' : plan, // Map basic to pro for simplicity
      status: 'active',
      isActive: true,
      stripeSubscriptionId: subscriptionId,
      currentPeriodEnd: periodEnd,
      updatedAt: new Date()
    }, { merge: true });
    
    // 3. Update usage record
    const usageRef = db.collection('usage').doc(userId);
    batch.set(usageRef, {
      plan,
      audit_limit: auditLimit,
      audits_used: 0, // Reset on new subscription
      updatedAt: new Date()
    }, { merge: true });
    
    // 4. Store Stripe customer mapping for future lookups
    const customerMappingRef = db.collection('stripe_customers').doc(customerId);
    batch.set(customerMappingRef, {
      userId,
      email: customerEmail,
      updatedAt: new Date()
    });
    
    // 5. If email exists, also update by email (for backward compatibility)
    if (customerEmail) {
      const emailSubscriptionRef = db.collection('subscriptions').doc(customerEmail);
      batch.set(emailSubscriptionRef, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        plan,
        status: 'active',
        currentPeriodEnd: periodEnd,
        linkedToUid: userId,
        updatedAt: new Date()
      }, { merge: true });
    }
    
    await batch.commit();
    
    console.log(`✅ Subscription created and all collections updated for user: ${userId}`);
    console.log(`   - Plan: ${plan} (${auditLimit} audits/month)`);
    console.log(`   - Status: active`);
    console.log(`   - Period ends: ${periodEnd.toISOString()}`);
  } catch (error) {
    console.error('❌ Error handling subscription creation:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    const customerId = subscription.customer;
    
    // Look up user by customer ID
    const customerDoc = await db.collection('stripe_customers').doc(customerId).get();
    if (!customerDoc.exists) {
      console.error(`❌ No user found for customer ID: ${customerId}`);
      return;
    }
    
    const userId = customerDoc.data()?.userId;
    if (!userId) {
      console.error(`❌ No userId in customer mapping for: ${customerId}`);
      return;
    }
    
    const priceId = subscription.items?.data[0]?.price?.id;
    const plan = getPlanFromPriceId(priceId);
    const auditLimit = getAuditLimitForPlan(plan);
    const periodEnd = getSubscriptionPeriodEnd(subscription);
    
    const batch = db.batch();
    
    // Update all relevant collections
    const subscriptionRef = db.collection('subscriptions').doc(userId);
    batch.update(subscriptionRef, {
      plan,
      status: subscription.status,
      currentPeriodEnd: periodEnd,
      updatedAt: new Date()
    });
    
    const userStatusRef = db.collection('user_subscription_status').doc(userId);
    batch.update(userStatusRef, {
      plan: plan === 'basic' || plan === 'pro' ? 'pro' : plan,
      status: subscription.status,
      isActive: subscription.status === 'active',
      currentPeriodEnd: periodEnd,
      updatedAt: new Date()
    });
    
    const usageRef = db.collection('usage').doc(userId);
    const usageDoc = await usageRef.get();
    const currentUsage = usageDoc.data()?.audits_used || 0;
    
    batch.update(usageRef, {
      plan,
      audit_limit: auditLimit,
      audits_used: Math.min(currentUsage, auditLimit),
      updatedAt: new Date()
    });
    
    await batch.commit();
    
    console.log(`✅ Subscription updated for user: ${userId}, new plan: ${plan}`);
  } catch (error) {
    console.error('❌ Error handling subscription update:', error);
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  try {
    const customerId = subscription.customer;
    
    // Look up user by customer ID
    const customerDoc = await db.collection('stripe_customers').doc(customerId).get();
    if (!customerDoc.exists) {
      console.error(`❌ No user found for customer ID: ${customerId}`);
      return;
    }
    
    const userId = customerDoc.data()?.userId;
    if (!userId) {
      console.error(`❌ No userId in customer mapping for: ${customerId}`);
      return;
    }
    
    const batch = db.batch();
    
    // Update all collections to reflect cancellation
    const subscriptionRef = db.collection('subscriptions').doc(userId);
    batch.update(subscriptionRef, {
      status: 'cancelled',
      plan: 'free',
      updatedAt: new Date()
    });
    
    const userStatusRef = db.collection('user_subscription_status').doc(userId);
    batch.update(userStatusRef, {
      plan: 'free',
      status: 'cancelled',
      isActive: false,
      updatedAt: new Date()
    });
    
    const usageRef = db.collection('usage').doc(userId);
    batch.update(usageRef, {
      plan: 'free',
      audit_limit: 5,
      updatedAt: new Date()
    });
    
    await batch.commit();
    
    console.log(`✅ Subscription cancelled, user reverted to free plan: ${userId}`);
  } catch (error) {
    console.error('❌ Error handling subscription cancellation:', error);
  }
}

// Handle monthly usage reset on successful invoice payment
async function handleUsageReset(invoice: any) {
  try {
    const customerId = invoice.customer;
    
    // Look up user by customer ID
    const customerDoc = await db.collection('stripe_customers').doc(customerId).get();
    if (!customerDoc.exists) {
      console.error(`❌ No user found for customer ID: ${customerId}`);
      return;
    }
    
    const userId = customerDoc.data()?.userId;
    if (!userId) {
      console.error(`❌ No userId in customer mapping for: ${customerId}`);
      return;
    }
    
    const userData = await db.collection('subscriptions').doc(userId).get();
    const plan = userData.data()?.plan || 'basic';
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
  } catch (error) {
    console.error('❌ Error handling usage reset:', error);
  }
}
