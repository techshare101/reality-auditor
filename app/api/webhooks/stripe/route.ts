import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripeClient';
import { db } from '@/lib/firebase-admin';
import { sendUsageResetEmail } from '@/lib/email';
import { getFirestore } from 'firebase-admin/firestore';
import type { Stripe } from 'stripe';
import { PLAN_AUDIT_LIMITS } from '@/lib/stripe-config';

// Helper functions
function getAuditLimit(plan: string) {
  return PLAN_AUDIT_LIMITS[plan as keyof typeof PLAN_AUDIT_LIMITS] || PLAN_AUDIT_LIMITS.free;
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

        const { customer: customerId, subscription: subscriptionId } = session;
        if (!customerId || !subscriptionId) {
          throw new Error('Missing customer or subscription ID in session');
        }

        const userId = session.metadata?.userId || session.metadata?.uid;
        if (!userId) {
          throw new Error('No userId found in session metadata');
        }

        // Update Firestore with new subscription data
        await updateFirestoreSubscription({
          userId,
          customerId: customerId as string,
          subscriptionId: subscriptionId as string,
          plan: "pro",
          status: "active",
          periodEnd: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)),
        });
        
        logWebhookEvent(event, {
          userId,
          success: "Subscription created and Firestore updated"
        });
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as any;
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
        const subscription = event.data.object;
        console.log('🔄 Subscription updated:', subscription.id);
        
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
          status: subscription.status as string,
          periodEnd: new Date((subscription as any).current_period_end * 1000)
        });

        logWebhookEvent(event, {
          userId,
          success: "Subscription updated"
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('❌ Subscription cancelled:', subscription.id);
        
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
          plan: "free",
          status: "cancelled",
          periodEnd: new Date()
        });

        logWebhookEvent(event, {
          userId,
          success: "Subscription cancelled"
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('✅ Invoice paid:', invoice.id);
        
        if ((invoice as any).subscription && invoice.billing_reason === 'subscription_cycle') {
          const customerDoc = await getFirestore()
            .collection('stripe_customers')
            .doc(invoice.customer as string)
            .get();

          if (customerDoc.exists) {
            const userId = customerDoc.data()?.userId;
            if (userId) {
              // Reset usage count
              await getFirestore().collection('usage').doc(userId).update({
                audits_used: 0,
                last_reset: new Date(),
                updatedAt: new Date()
              });

              try {
                await sendUsageResetEmail(userId, 'pro', getAuditLimit('pro'));
              } catch (error) {
                console.warn('Failed to send usage reset email:', error);
              }
            }
          }
        }
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

// Helper function to update Firestore subscription data
async function updateFirestoreSubscription(data: {
  userId: string;
  customerId: string;
  subscriptionId: string;
  plan: string;
  status: string;
  periodEnd: Date;
}) {
  const { userId, customerId, subscriptionId, plan, status, periodEnd } = data;
  const now = new Date();
  
  const batch = getFirestore().batch();
  
  // 1. Main subscription record
  const subRef = getFirestore().collection('subscriptions').doc(userId);
  batch.set(subRef, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    plan,
    status,
    currentPeriodEnd: periodEnd,
    updatedAt: now,
  }, { merge: true });
  
  // 2. User subscription status
  const statusRef = getFirestore().collection('user_subscription_status').doc(userId);
  batch.set(statusRef, {
    plan,
    status,
    isActive: status === 'active',
    stripeSubscriptionId: subscriptionId,
    currentPeriodEnd: periodEnd,
    updatedAt: now,
  }, { merge: true });
  
  // 3. Usage limits
  const usageRef = getFirestore().collection('usage').doc(userId);
  batch.set(usageRef, {
    plan,
    audit_limit: getAuditLimit(plan),
    audits_used: 0, // Reset on subscription change
    updatedAt: now,
  }, { merge: true });
  
  // 4. Customer mapping
  const customerRef = getFirestore().collection('stripe_customers').doc(customerId);
  batch.set(customerRef, {
    userId,
    updatedAt: now,
  }, { merge: true });
  
  await batch.commit();
}