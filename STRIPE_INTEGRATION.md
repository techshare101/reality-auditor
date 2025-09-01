# 🔥 Reality Auditor - Stripe Subscription Integration

## Overview
Your Reality Auditor now has complete Stripe subscription integration that automatically syncs with Firestore and enforces usage limits on audit requests.

## 🏗️ Architecture

### Core Components
1. **Stripe Webhook Handler** (`/api/stripe/webhook.ts`)
   - Processes all subscription lifecycle events
   - Maps Stripe data to Firestore schema
   - Handles signature verification for security

2. **Subscription Checker** (`/lib/subscription-checker.ts`)
   - Validates user plan limits before audits
   - Tracks usage and enforces limits
   - Provides upgrade/downgrade logic

3. **Enhanced Audit API** (`/api/reality-audit/route.ts`)
   - Checks subscription status before processing
   - Increments usage count after successful audits
   - Returns usage information in responses

## 📊 Firestore Schema

### Users Collection
```javascript
{
  uid: string,
  email: string,
  planType: 'free' | 'basic' | 'pro' | 'enterprise',
  subscriptionStatus: string,
  stripeCustomerId?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Subscriptions Collection
```javascript
{
  userId: string, // Document ID
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  status: string,
  planId: string,
  planName: string,
  planType: 'free' | 'basic' | 'pro' | 'enterprise',
  currentPeriodStart: Timestamp,
  currentPeriodEnd: Timestamp,
  cancelAtPeriodEnd: boolean,
  auditsUsed: number,
  auditsLimit: number,
  amount: number, // in cents
  currency: string,
  interval: 'month' | 'year'
}
```

### Customers Collection
```javascript
{
  userId: string, // Document ID
  stripeCustomerId: string,
  email: string,
  name?: string,
  firebaseUid: string
}
```

## 🎯 Plan Limits

| Plan Type | Audits/Month | Price |
|-----------|--------------|-------|
| Free      | 5           | $0    |
| Basic     | 50          | TBD   |
| Pro       | 200         | TBD   |
| Enterprise| 1000        | TBD   |

## 🔄 Event Flow

### New Subscription
1. User completes Stripe checkout → `checkout.session.completed`
2. Webhook creates customer record → `customer.created` 
3. Webhook creates subscription → `customer.subscription.created`
4. Firestore updated with plan details and usage limits

### Audit Request
1. User makes audit request with auth token
2. API extracts `userId` from Firebase token
3. `checkSubscriptionStatus()` validates plan and usage
4. If within limits: process audit + `incrementUsage()`
5. If exceeded: return 402 Payment Required

### Plan Changes
1. User upgrades/downgrades → `customer.subscription.updated`
2. Webhook updates Firestore with new limits
3. Usage resets based on plan change logic

### Cancellation
1. User cancels → `customer.subscription.deleted`
2. User dropped to free plan limits
3. Usage tracked until period ends

## 🛠️ Setup Instructions

### 1. Environment Variables (.env.local)
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_G7iIR3eJtOMwJthMeBvs7aBN5soi5BJe
STRIPE_SUCCESS_URL=http://localhost:3000/success
STRIPE_CANCEL_URL=http://localhost:3000/cancel
```

### 2. Update Plan Mapping
Edit `PLAN_MAPPING` in `/api/stripe/webhook.ts` with your actual Stripe Price IDs:

```typescript
const PLAN_MAPPING = {
  'price_your_basic_monthly_id': { name: 'Basic Monthly', type: 'basic', auditsLimit: 50 },
  'price_your_basic_yearly_id': { name: 'Basic Yearly', type: 'basic', auditsLimit: 50 },
  // ... add your real price IDs
};
```

### 3. Webhook Configuration
- **Endpoint**: `https://your-domain.vercel.app/api/stripe/webhook`
- **Events**: 
  - `checkout.session.completed`
  - `customer.created`
  - `customer.updated`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`

## 🧪 Testing

### Test Webhook Locally
```bash
# Install Stripe CLI
npm install -g @stripe/stripe-cli

# Login and forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

### Test Usage Limits
```bash
node scripts/test-webhook.js
```

## 🚀 Usage Examples

### Check Subscription Status
```typescript
import { checkSubscriptionStatus } from '@/lib/subscription-checker';

const status = await checkSubscriptionStatus(userId);
console.log({
  planType: status.planType,
  auditsRemaining: status.auditsRemaining,
  isActive: status.isActive
});
```

### Frontend Usage Display
```typescript
// In your React component
const [usage, setUsage] = useState(null);

useEffect(() => {
  if (user) {
    fetch('/api/subscription-status', {
      headers: { Authorization: `Bearer ${await user.getIdToken()}` }
    })
    .then(res => res.json())
    .then(setUsage);
  }
}, [user]);

return (
  <div>
    <p>{usage?.auditsRemaining} audits remaining</p>
    <Progress value={(usage?.auditsUsed / usage?.auditsLimit) * 100} />
  </div>
);
```

## 🔐 Security Features

- ✅ Webhook signature verification
- ✅ Firebase Auth token validation  
- ✅ Transaction-safe usage counting
- ✅ Graceful error handling
- ✅ Anonymous access with free limits
- ✅ Plan downgrade protection

## 🎯 Next Steps

1. **Create Subscription Management UI**
   - Plan selection/upgrade page
   - Usage dashboard
   - Billing history

2. **Add More Payment Features**
   - Prorated upgrades
   - Payment method updates
   - Invoice downloads

3. **Advanced Usage Tracking**
   - Daily/weekly limits
   - Feature-based restrictions
   - API rate limiting

## 🐛 Troubleshooting

### Webhook Not Receiving Events
- Check endpoint URL matches exactly
- Verify webhook secret in .env.local
- Test with `stripe listen` CLI tool

### Usage Not Updating
- Check Firebase Admin SDK permissions
- Verify user authentication
- Look for transaction errors in logs

### Plan Limits Not Working
- Ensure PLAN_MAPPING has correct Price IDs
- Check subscription status in Firestore
- Verify webhook events are processing

---

🎉 **Your Reality Auditor now has production-ready subscription management!**

Each audit request will automatically check the user's plan and usage limits, ensuring your OpenAI/Tavily costs stay controlled while providing a smooth upgrade path for users who need more audits.
