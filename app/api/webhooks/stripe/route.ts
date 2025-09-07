import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripeClient';
import { db } from '@/lib/firebase-admin';
import { sendUsageResetEmail } from '@/lib/email';
import { getFirestore } from 'firebase-admin/firestore';
import type { Stripe } from 'stripe';

// Helper to get audit limit based on plan
function getAuditLimit(plan: string) {
  return {
    free: 5,
    basic: 30,
    pro: 100,
    team: 500,
  }[plan] || 5;
}

// Enhanced logging for webhook events
function logWebhookEvent(event: any, metadata: any = {}) {
  const timestamp = new Date().toISOString();
  const eventId = event.id;
  const eventType = event.type;

  console.log(`\n🪝 [${timestamp}] Webhook event received:`);
  console.log(`   Type: ${eventType}`);
  console.log(`   ID: ${eventId}`);
  
  if (metadata.userId) {
    console.log(`   User ID: ${metadata.userId}`);
  }
  
  if (metadata.error) {
    console.error(`   ❌ Error: ${metadata.error}`);
    if (metadata.errorDetail) {
      console.error(`   Details: ${metadata.errorDetail}`);
    }
  }
  
  if (metadata.success) {
    console.log(`   ✅ Success: ${metadata.success}`);
  }
}

// Verify and extract session data
async function verifyAndExtractSession(session: any) {
  const userId = session.metadata?.userId || session.metadata?.uid;
  if (!userId) {
    throw new Error("No userId found in session metadata");
  }
  
  if (!session.customer) {
    throw new Error("No customer ID found in session");
  }
  
  if (!session.subscription) {
    throw new Error("No subscription ID found in session");
  }
  
  return { userId, customerId: session.customer, subscriptionId: session.subscription };
}

// Handle subscription updates in Firestore
async function updateFirestoreSubscription(data: any) {
  const { userId, customerId, subscriptionId, plan = "pro", status = "active" } = data;
  const now = new Date();
  const periodEnd = data.periodEnd || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
  
  const batch = getFirestore().batch();
  
  // 1. Main subscription record
  const subRef = getFirestore().collection("subscriptions").doc(userId);
  batch.set(subRef, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    plan,
    status,
    currentPeriodEnd: periodEnd,
    updatedAt: now,
  }, { merge: true });
  
  // 2. User subscription status
  const statusRef = getFirestore().collection("user_subscription_status").doc(userId);
  batch.set(statusRef, {
    plan,
    status,
    isActive: status === "active",
    stripeSubscriptionId: subscriptionId,
    currentPeriodEnd: periodEnd,
    updatedAt: now,
  }, { merge: true });
  
  // 3. Usage limits
  const usageRef = getFirestore().collection("usage").doc(userId);
  batch.set(usageRef, {
    plan,
    audit_limit: getAuditLimit(plan),
    audits_used: 0, // Reset on subscription change
    updatedAt: now,
  }, { merge: true });
  
  // 4. Customer mapping
  const customerRef = getFirestore().collection("stripe_customers").doc(customerId);
  batch.set(customerRef, {
    userId,
    updatedAt: now,
  }, { merge: true });
  
  await batch.commit();
}

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
  console.log('\n🔔 Webhook request received');
  
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    console.error('❌ Missing stripe-signature header');
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
    console.log('✅ Webhook signature verified');
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    logWebhookEvent(event);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('\n💳 Processing successful payment session:', session.id);
        
        try {
          const { userId, customerId, subscriptionId } = await verifyAndExtractSession(session);
          
          // Update Firestore with new subscription data
          await updateFirestoreSubscription({
            userId,
            customerId,
            subscriptionId,
            plan: "pro",
            status: "active",
            periodEnd: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)),
          });
          
          logWebhookEvent(event, {
            userId,
            success: "Subscription created and Firestore updated"
          });
        } catch (err) {
          console.error('\n❌ Failed to process checkout session:', err);
          logWebhookEvent(event, {
            error: "Failed to process checkout",
            errorDetail: err instanceof Error ? err.message : String(err)
          });
          throw err;
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        console.log('\n🎉 New subscription created:', subscription.id);
        
        // Find the user by customer ID
        const customerDoc = await getFirestore()
          .collection('stripe_customers')
          .doc(subscription.customer as string)
          .get();
          
        if (!customerDoc.exists) {
          throw new Error(`No user found for customer: ${subscription.customer}`);
        }
        
        const userId = customerDoc.data()?.userId;
        if (!userId) {
          throw new Error(`No userId in customer mapping: ${subscription.customer}`);
        }
        
        await updateFirestoreSubscription({
          userId,
          customerId: subscription.customer as string,
          subscriptionId: subscription.id,
          plan: "pro",
          status: subscription.status,
          periodEnd: new Date((subscription as any).current_period_end * 1000)
        });
        
        logWebhookEvent(event, {
          userId,
          success: "New subscription processed"
        });
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
