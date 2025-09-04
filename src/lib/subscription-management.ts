import { auth } from "@/lib/firebase";

interface CancelSubscriptionResponse {
  success: boolean;
  subscription?: {
    id: string;
    cancel_at_period_end: boolean;
    current_period_end: number;
    canceled_at: number | null;
  };
  message?: string;
  error?: string;
  code?: string;
  retryable?: boolean;
}

export async function reactivateSubscription(
  subscriptionId: string,
  retryCount = 0
): Promise<CancelSubscriptionResponse> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    const idToken = await user.getIdToken();

    const response = await fetch("/api/subscription/reactivate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ subscriptionId }),
    });

    const data = await response.json();

    if (!response.ok) {
      // If retryable and we haven't exceeded retry limit, retry
      if (data.retryable && retryCount < 3) {
        console.log(`⏳ Retrying reactivate request (attempt ${retryCount + 1})...`);
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return reactivateSubscription(subscriptionId, retryCount + 1);
      }
      
      throw new Error(data.error || "Failed to reactivate subscription");
    }

    return data;
  } catch (error: any) {
    console.error("Reactivate subscription error:", error);
    
    // Network errors are retryable
    if (error.message.includes("fetch") && retryCount < 3) {
      console.log(`⏳ Network error, retrying (attempt ${retryCount + 1})...`);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      return reactivateSubscription(subscriptionId, retryCount + 1);
    }
    
    throw error;
  }
}

export async function cancelSubscription(
  subscriptionId: string,
  retryCount = 0
): Promise<CancelSubscriptionResponse> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    const idToken = await user.getIdToken();

    const response = await fetch("/api/subscription/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ subscriptionId }),
    });

    const data = await response.json();

    if (!response.ok) {
      // If retryable and we haven't exceeded retry limit, retry
      if (data.retryable && retryCount < 3) {
        console.log(`⏳ Retrying cancel request (attempt ${retryCount + 1})...`);
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return cancelSubscription(subscriptionId, retryCount + 1);
      }
      
      throw new Error(data.error || "Failed to cancel subscription");
    }

    return data;
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    
    // Network errors are retryable
    if (error.message.includes("fetch") && retryCount < 3) {
      console.log(`⏳ Network error, retrying (attempt ${retryCount + 1})...`);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      return cancelSubscription(subscriptionId, retryCount + 1);
    }
    
    throw error;
  }
}

// Helper to format the cancellation date
export function formatCancellationDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Helper to check if a subscription is active
export function isSubscriptionActive(subscription: any): boolean {
  if (!subscription) return false;
  
  return (
    subscription.status === 'active' || 
    subscription.status === 'trialing' ||
    (subscription.status === 'past_due' && !subscription.cancel_at_period_end)
  );
}

// Helper to get subscription status display
export function getSubscriptionStatusDisplay(subscription: any): {
  text: string;
  color: string;
  icon: string;
} {
  if (!subscription) {
    return {
      text: "No subscription",
      color: "text-gray-500",
      icon: "❌",
    };
  }

  if (subscription.cancel_at_period_end) {
    return {
      text: `Cancels on ${formatCancellationDate(subscription.current_period_end)}`,
      color: "text-orange-500",
      icon: "⏰",
    };
  }

  switch (subscription.status) {
    case 'active':
      return {
        text: "Active",
        color: "text-green-500",
        icon: "✅",
      };
    case 'trialing':
      return {
        text: "Trial",
        color: "text-blue-500",
        icon: "🎯",
      };
    case 'past_due':
      return {
        text: "Payment overdue",
        color: "text-red-500",
        icon: "⚠️",
      };
    case 'canceled':
      return {
        text: "Canceled",
        color: "text-gray-500",
        icon: "🚫",
      };
    case 'unpaid':
      return {
        text: "Unpaid",
        color: "text-red-600",
        icon: "❗",
      };
    default:
      return {
        text: subscription.status,
        color: "text-gray-500",
        icon: "❓",
      };
  }
}
