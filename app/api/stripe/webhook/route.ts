import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripeClient";
import type { Stripe } from "stripe";

// In App Router, we handle raw body directly in the function
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") as string;
  const body = await req.text();
  
  const stripe = getStripe();

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log("✅ Stripe event received:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout completed:", session.id);
        // TODO: Write to Firestore: set subscription_status = "pro"
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription updated:", subscription.id);
        // TODO: Update Firestore with new subscription_status
        break;
      }
      case "invoice.payment_failed": {
        console.log("⚠️ Payment failed");
        // TODO: downgrade Firestore subscription_status = "free"
        break;
      }
      default:
        console.log("Unhandled event:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("❌ Webhook error:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }
}
