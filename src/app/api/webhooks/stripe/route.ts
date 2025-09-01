import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';

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
  // TODO: Implement your database logic here
  // For example, using Prisma, Supabase, or MongoDB:
  
  /*
  await db.user.upsert({
    where: { stripeCustomerId: customerId },
    update: {
      subscriptionStatus: 'active',
      stripeSubscriptionId: subscriptionId,
      planType: 'PRO',
    },
    create: {
      email: customerEmail,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: 'active',
      planType: 'PRO',
    },
  });
  */
  
  console.log('🔄 TODO: Update user subscription in database', {
    customerId,
    subscriptionId,
    customerEmail,
    sessionId,
  });
}

async function handleSubscriptionUpdated(subscription: any) {
  // TODO: Handle subscription updates
  console.log('🔄 TODO: Handle subscription update', {
    subscriptionId: subscription.id,
    status: subscription.status,
    customerId: subscription.customer,
  });
}

async function handleSubscriptionCancelled(subscription: any) {
  // TODO: Handle subscription cancellation
  console.log('🔄 TODO: Handle subscription cancellation', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
  });
}
