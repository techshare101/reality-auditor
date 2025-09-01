import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Disable Next.js body parsing so we can verify the signature
export const config = {
  api: {
    bodyParser: false,
  },
};

interface SubscriptionData {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  planId: string;
  planName: string;
  planType: 'free' | 'basic' | 'pro' | 'enterprise';
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Timestamp | null;
  trialStart?: Timestamp | null;
  trialEnd?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Usage tracking
  auditsUsed: number;
  auditsLimit: number;
  // Billing
  amount: number; // in cents
  currency: string;
  interval: 'month' | 'year';
}

interface CustomerData {
  stripeCustomerId: string;
  email: string;
  name?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Link to Firebase Auth user
  firebaseUid?: string;
}

// Map Stripe plan IDs to your plan types
const PLAN_MAPPING: Record<string, { name: string; type: SubscriptionData['planType']; auditsLimit: number }> = {
  // Your actual Price ID - $19/month Basic plan
  'price_1S1tnbGnOgSIwPZhYfV3aFXe': { name: 'Basic Monthly', type: 'basic', auditsLimit: 50 },
  
  // Placeholders for future plans (replace with real Price IDs when created)
  'price_basic_yearly_placeholder': { name: 'Basic Yearly', type: 'basic', auditsLimit: 50 },
  'price_pro_monthly_placeholder': { name: 'Pro Monthly', type: 'pro', auditsLimit: 200 },
  'price_pro_yearly_placeholder': { name: 'Pro Yearly', type: 'pro', auditsLimit: 200 },
  'price_enterprise_monthly_placeholder': { name: 'Enterprise Monthly', type: 'enterprise', auditsLimit: 1000 },
  'price_enterprise_yearly_placeholder': { name: 'Enterprise Yearly', type: 'enterprise', auditsLimit: 1000 },
};

function getPlanInfo(priceId: string) {
  return PLAN_MAPPING[priceId] || { name: 'Unknown Plan', type: 'free' as const, auditsLimit: 5 };
}

async function findUserByStripeCustomerId(customerId: string): Promise<string | null> {
  try {
    const customersRef = db.collection('customers');
    const snapshot = await customersRef.where('stripeCustomerId', '==', customerId).limit(1).get();
    
    if (snapshot.empty) {
      console.log(`No user found for Stripe customer ID: ${customerId}`);
      return null;
    }

    const customerDoc = snapshot.docs[0];
    return customerDoc.data().firebaseUid || customerDoc.id;
  } catch (error) {
    console.error('Error finding user by Stripe customer ID:', error);
    return null;
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('🎯 Checkout session completed:', session.id);

  const { customer, subscription } = session;
  if (!customer || !subscription) {
    console.error('Missing customer or subscription in checkout session');
    return;
  }

  const customerId = typeof customer === 'string' ? customer : customer.id;
  const subscriptionId = typeof subscription === 'string' ? subscription : subscription.id;

  // Get the full subscription details
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });

  const userId = await findUserByStripeCustomerId(customerId);
  if (!userId) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  // Create/update user subscription in Firestore
  await createOrUpdateSubscription(userId, stripeSubscription);
  
  console.log(`✅ Subscription created for user ${userId}`);
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  console.log('👤 Customer created:', customer.id);

  const customerData: CustomerData = {
    stripeCustomerId: customer.id,
    email: customer.email!,
    name: customer.name || undefined,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Try to link to existing Firebase user by email
  if (customer.email) {
    try {
      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('email', '==', customer.email).limit(1).get();
      
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        customerData.firebaseUid = userDoc.id;
        
        // Update existing user with Stripe customer ID
        await userDoc.ref.update({
          stripeCustomerId: customer.id,
          updatedAt: Timestamp.now(),
        });
        
        // Create customer record
        await db.collection('customers').doc(userDoc.id).set(customerData);
        
        console.log(`✅ Linked customer ${customer.id} to user ${userDoc.id}`);
        return;
      }
    } catch (error) {
      console.error('Error linking customer to user:', error);
    }
  }

  // Create standalone customer record
  await db.collection('customers').doc(customer.id).set(customerData);
  console.log(`✅ Created standalone customer record for ${customer.id}`);
}

async function createOrUpdateSubscription(userId: string, subscription: Stripe.Subscription) {
  const price = subscription.items.data[0]?.price;
  if (!price) {
    console.error('No price found in subscription');
    return;
  }

  const planInfo = getPlanInfo(price.id);
  
  const subscriptionData: SubscriptionData = {
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    planId: price.id,
    planName: planInfo.name,
    planType: planInfo.type,
    currentPeriodStart: Timestamp.fromDate(new Date((subscription as any).current_period_start * 1000)),
    currentPeriodEnd: Timestamp.fromDate(new Date((subscription as any).current_period_end * 1000)),
    cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
    canceledAt: (subscription as any).canceled_at ? Timestamp.fromDate(new Date((subscription as any).canceled_at * 1000)) : null,
    trialStart: (subscription as any).trial_start ? Timestamp.fromDate(new Date((subscription as any).trial_start * 1000)) : null,
    trialEnd: (subscription as any).trial_end ? Timestamp.fromDate(new Date((subscription as any).trial_end * 1000)) : null,
    createdAt: Timestamp.fromDate(new Date(subscription.created * 1000)),
    updatedAt: Timestamp.now(),
    // Usage tracking - preserve existing usage or reset
    auditsUsed: 0, // This should be preserved if updating existing subscription
    auditsLimit: planInfo.auditsLimit,
    // Billing
    amount: price.unit_amount || 0,
    currency: price.currency,
    interval: (price.recurring?.interval || 'month') as 'month' | 'year',
  };

  // Check if subscription already exists to preserve usage data
  const existingDoc = await db.collection('subscriptions').doc(userId).get();
  if (existingDoc.exists) {
    const existing = existingDoc.data();
    // Preserve usage if same billing period or same plan type
    if (existing?.planType === subscriptionData.planType && 
        existing?.currentPeriodStart?.isEqual(subscriptionData.currentPeriodStart)) {
      subscriptionData.auditsUsed = existing.auditsUsed || 0;
    } else {
      // New billing period or plan change - reset usage
      subscriptionData.auditsUsed = 0;
      console.log(`🔄 Usage reset for user ${userId} - new period or plan change`);
    }
  }

  // Update subscription
  await db.collection('subscriptions').doc(userId).set(subscriptionData, { merge: true });

  // Enhanced user record update
  const userUpdate: any = {
    planType: subscriptionData.planType,
    subscriptionStatus: subscriptionData.status,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    auditsLimit: planInfo.auditsLimit,
    currentPeriodEnd: subscriptionData.currentPeriodEnd,
    updatedAt: Timestamp.now(),
  };

  // Reset audit usage on new subscription or plan upgrade/downgrade
  if (!existingDoc.exists || existingDoc.data()?.planType !== subscriptionData.planType) {
    userUpdate.auditsUsed = 0;
    console.log(`🔄 User audit usage reset for ${userId}`);
  }

  await db.collection('users').doc(userId).update(userUpdate);

  console.log(`✅ Updated subscription for user ${userId} to ${planInfo.name}`);
  console.log(`📊 User plan: ${subscriptionData.planType}, Status: ${subscriptionData.status}, Audits: ${subscriptionData.auditsUsed}/${planInfo.auditsLimit}`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('🆕 Subscription created:', subscription.id);

  const userId = await findUserByStripeCustomerId(subscription.customer as string);
  if (!userId) {
    console.error(`No user found for customer ${subscription.customer}`);
    return;
  }

  await createOrUpdateSubscription(userId, subscription);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('📝 Subscription updated:', subscription.id);

  const userId = await findUserByStripeCustomerId(subscription.customer as string);
  if (!userId) {
    console.error(`No user found for customer ${subscription.customer}`);
    return;
  }

  await createOrUpdateSubscription(userId, subscription);
  
  // Log the change
  console.log(`✅ Updated subscription ${subscription.id} for user ${userId} - Status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('❌ Subscription deleted:', subscription.id);

  const userId = await findUserByStripeCustomerId(subscription.customer as string);
  if (!userId) {
    console.error(`No user found for customer ${subscription.customer}`);
    return;
  }

  // Update subscription status to canceled
  await db.collection('subscriptions').doc(userId).update({
    status: 'canceled',
    canceledAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // Update user to free plan
  await db.collection('users').doc(userId).update({
    planType: 'free',
    subscriptionStatus: 'canceled',
    updatedAt: Timestamp.now(),
  });

  console.log(`✅ Cancelled subscription for user ${userId}`);
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  console.log('📝 Customer updated:', customer.id);

  const userId = await findUserByStripeCustomerId(customer.id);
  if (!userId) {
    console.log(`No user found for customer ${customer.id}`);
    return;
  }

  // Update customer data
  await db.collection('customers').doc(userId).update({
    email: customer.email,
    name: customer.name || null,
    updatedAt: Timestamp.now(),
  });

  // Also update user email if it changed
  if (customer.email) {
    await db.collection('users').doc(userId).update({
      email: customer.email,
      updatedAt: Timestamp.now(),
    });
  }

  console.log(`✅ Updated customer data for user ${userId}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('💰 Invoice payment succeeded:', invoice.id);

  if (!(invoice as any).subscription) {
    console.log('Invoice not associated with subscription, skipping');
    return;
  }

  const userId = await findUserByStripeCustomerId(invoice.customer as string);
  if (!userId) {
    console.error(`No user found for customer ${invoice.customer}`);
    return;
  }

  // Extend access period and reset usage if it's a new billing period
  const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
  await createOrUpdateSubscription(userId, subscription);

  // Log successful payment
  await db.collection('payments').add({
    userId,
    stripeInvoiceId: invoice.id,
    stripeCustomerId: invoice.customer,
    amount: (invoice as any).amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    paidAt: Timestamp.fromDate(new Date((invoice as any).status_transitions.paid_at! * 1000)),
    createdAt: Timestamp.now(),
  });

  console.log(`✅ Payment processed for user ${userId}: ${(invoice as any).amount_paid} ${invoice.currency}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    const signature = req.headers['stripe-signature']!;

    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(buf, signature, endpointSecret);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`🎯 Received webhook: ${event.type}`);

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`🤷 Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`❌ Error processing webhook ${event.type}:`, error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
