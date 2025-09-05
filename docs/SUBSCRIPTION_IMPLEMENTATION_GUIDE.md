# 🚀 Reality Auditor Subscription Implementation Guide

## Overview
This guide walks you through implementing the complete subscription system with Stripe webhooks, Firestore real-time updates, and secure access control.

## 1. Webhook Implementation 

### Step 1: Update your existing webhook handler
Copy the functions from `src/app/api/webhooks/stripe/route.patch.ts` into your existing webhook at `src/app/api/webhooks/stripe/route.ts`:

```typescript
// In your switch statement, replace these cases:
case 'checkout.session.completed': {
  const session = event.data.object;
  await handleCheckoutSessionCompleted(session);
  break;
}

case 'customer.subscription.updated': {
  const subscription = event.data.object;
  await handleSubscriptionUpdated(subscription);
  break;
}

case 'customer.subscription.deleted': {
  const subscription = event.data.object;
  await handleSubscriptionDeleted(subscription);
  break;
}
```

### Step 2: Ensure userId is in checkout metadata
When creating checkout sessions, always include the userId:

```typescript
const session = await stripe.checkout.sessions.create({
  // ... other config
  metadata: {
    userId: currentUser.uid, // Firebase auth user ID
  },
});
```

## 2. Firestore Security Rules

Deploy the security rules from `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

This ensures:
- Users can only read their own subscription status
- Only your server/webhooks can write subscription data
- No client-side manipulation possible

## 3. Client-Side Implementation

### Basic Subscription Status
Use `useUserSubscription` hook for simple Pro/Free badge:

```typescript
import { useUserSubscription } from '@/hooks/useUserSubscription';
import SubscriptionBadge from '@/components/SubscriptionBadge';

export function Navbar() {
  return (
    <nav>
      {/* Your nav content */}
      <SubscriptionBadge />
    </nav>
  );
}
```

### With Audit Limits and Paywall
Use `useSubscriptionWithAudits` for full paywall functionality:

```typescript
import { useSubscriptionWithAudits } from '@/hooks/useSubscriptionWithAudits';

export function AuditForm() {
  const { isPro, canAudit, isOverLimit, auditStats } = useSubscriptionWithAudits();

  const handleSubmit = async () => {
    if (!canAudit) {
      // Show upgrade modal
      return;
    }
    
    // Process audit...
  };

  return (
    <div>
      {!isPro && (
        <div className="mb-4 p-4 bg-orange-50 rounded-lg">
          <p>Audits used: {auditStats.count} / {auditStats.limit}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-orange-500 h-2 rounded-full"
              style={{ width: `${auditStats.percentUsed}%` }}
            />
          </div>
        </div>
      )}
      
      <button 
        onClick={handleSubmit}
        disabled={isOverLimit}
        className={isOverLimit ? 'opacity-50 cursor-not-allowed' : ''}
      >
        {isOverLimit ? 'Upgrade to Continue' : 'Analyze Article'}
      </button>
    </div>
  );
}
```

## 4. Testing the System

### Local Testing with Stripe CLI
```bash
# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed --add checkout_session:metadata.userId=testuser123
```

### Manual Testing in Firestore
1. Go to Firestore Console
2. Create document in `user_subscription_status/{userId}`:
```json
{
  "plan": "pro",
  "status": "active",
  "stripeCustomerId": "cus_test123",
  "updatedAt": "September 5, 2025 at 3:00:00 PM UTC+2"
}
```

## 5. Migration for Existing Users

If you have existing pro users to migrate:

```javascript
// One-time migration script
const migrateProUsers = async () => {
  const proEmails = ['user1@example.com', 'user2@example.com'];
  
  for (const email of proEmails) {
    const userQuery = await db.collection('users')
      .where('email', '==', email)
      .get();
    
    if (!userQuery.empty) {
      const userId = userQuery.docs[0].id;
      await db.collection('user_subscription_status').doc(userId).set({
        plan: 'pro',
        status: 'active',
        email: email,
        updatedAt: FieldValue.serverTimestamp(),
        migrated: true
      });
    }
  }
};
```

## 6. Monitoring & Debugging

### Check user subscription status:
```typescript
// In browser console on your site
const checkSub = async (email) => {
  const users = await firebase.firestore()
    .collection('users')
    .where('email', '==', email)
    .get();
  
  if (!users.empty) {
    const uid = users.docs[0].id;
    const sub = await firebase.firestore()
      .collection('user_subscription_status')
      .doc(uid)
      .get();
    
    console.log('Subscription:', sub.data());
  }
};

checkSub('user@example.com');
```

### Common Issues:
1. **User shows as Free but paid**: Check webhook logs, ensure userId is in checkout metadata
2. **Webhook not firing**: Verify webhook endpoint URL in Stripe Dashboard
3. **Security rules blocking reads**: Ensure user is authenticated and reading their own doc

## 7. Production Checklist

- [ ] Deploy updated webhook code
- [ ] Deploy Firestore security rules
- [ ] Add Stripe webhook secret to environment variables
- [ ] Test full payment flow in production
- [ ] Monitor first few real subscriptions
- [ ] Set up error alerting for webhook failures

## That's it! 🎉

Your subscription system is now:
- ✅ Automatically synced with Stripe
- ✅ Real-time updated in the UI
- ✅ Secure from client manipulation
- ✅ Integrated with audit limits
