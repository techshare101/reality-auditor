# 🔧 Subscription Fix Test Guide

## What Was Fixed

The issue where users who paid for Pro still hit the paywall after their 6th audit has been resolved with a three-pronged approach:

### 1. **Improved Webhook Handler** 
- Updates ALL relevant Firestore collections (`subscriptions`, `user_subscription_status`, `usage`)
- Properly maps Stripe customers to Firebase users
- Handles edge cases like email-based lookups

### 2. **Immediate Pro Access**
- New `useImmediateProAccess` hook grants instant Pro status after payment
- No waiting for webhook processing (which can take 10-30 seconds)
- Persists in session storage for 5 minutes as a safety buffer

### 3. **Enhanced Limit Checking**
- `useHybridAuditLimit` now checks both Firestore Pro status AND immediate upgrade flag
- Pro users get 999 audits (effectively unlimited)
- Fallback to local storage if Firestore is unavailable

## How to Test

### Step 1: Clean State
1. Log out of the app
2. Clear browser localStorage and sessionStorage
3. Sign up with a new email or use an existing free account

### Step 2: Use Your 5 Free Audits
1. Paste and audit 5 different articles
2. Verify the counter shows "5 of 5 used"

### Step 3: Try 6th Audit (Should Show Paywall)
1. Try to audit a 6th article
2. Verify the upgrade prompt appears

### Step 4: Complete Stripe Payment
1. Click upgrade to Pro
2. Use test card: `4242 4242 4242 4242`
3. Complete the checkout process

### Step 5: Verify Immediate Pro Access
1. You'll be redirected to `/dashboard?upgrade=success&session_id=...`
2. Check browser console for: `🚀 IMMEDIATE PRO ACCESS GRANTED`
3. **Try auditing the 6th article again - it should work!**

### Step 6: Verify Webhook Processing (After ~30 seconds)
1. Check Firestore Console:
   - `user_subscription_status/{userId}` should show `plan: "pro"`
   - `subscriptions/{userId}` should show `status: "active"`
2. The pro badge should persist even after refreshing

## Console Logs to Look For

✅ **Success Indicators:**
- `🚀 IMMEDIATE PRO ACCESS GRANTED - User just upgraded via Stripe!`
- `✅ Found recent Pro upgrade in session storage`
- `📊 Pro status check result: { isPro: true, plan: "pro", status: "active" }`

❌ **Error Indicators:**
- `🚫 Audit limit reached`
- `isOverLimit: true`

## Troubleshooting

### Issue: Still seeing paywall after payment
1. Check sessionStorage: `reality_auditor_pro_upgrade` key should exist
2. Check console for immediate Pro access logs
3. Verify the URL has `?upgrade=success&session_id=...`

### Issue: Pro status not persisting
1. Check Firestore `user_subscription_status` collection
2. Verify webhook endpoint is configured in Stripe Dashboard
3. Check Vercel function logs for webhook processing errors

### Issue: Webhook not firing
1. In Stripe Dashboard, check webhook endpoint is active
2. Verify webhook secret is correctly set in environment variables
3. Check for failed webhook events in Stripe Dashboard

## Key Files Modified

- `/app/api/webhooks/stripe/route.ts` - Enhanced webhook handler
- `/src/hooks/useHybridAuditLimit.ts` - Added immediate Pro access check
- `/src/hooks/useImmediateProAccess.ts` - New hook for post-payment Pro status
- `/src/lib/hasPaidPlan.ts` - Improved Pro status checking logic

## Environment Variables Required

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs
NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID=price_xxx
```
