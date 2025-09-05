# ⚡ Stripe Subscription Testing Quick Reference

## 🚀 Before You Start
1. Make sure your webhook handler is updated with the new code
2. Have Firestore console open in your browser
3. Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` in a separate terminal
4. Have your app running locally

## 🎯 Running the Tests

### Windows (PowerShell):
```powershell
.\scripts\test-subscriptions.ps1
```

### Mac/Linux (Bash):
```bash
chmod +x scripts/test-subscriptions.sh
./scripts/test-subscriptions.sh
```

## 📊 What You'll See in Each Test

### Test 1: New Pro Subscription
**Firestore Document:**
```json
{
  "plan": "pro",
  "status": "active",
  "stripeCustomerId": "cus_test123",
  "subscriptionId": "sub_test123",
  "updatedAt": "2025-09-05T16:00:00Z"
}
```
**UI Change:** Free → Pro (green badge)

### Test 2: Subscription Renewal
**Firestore:** Only `updatedAt` timestamp changes
**UI Change:** No visible change (still Pro)

### Test 3: Payment Failed
**Firestore Document:**
```json
{
  "status": "past_due"  // ← This changes
  // ... rest stays same
}
```
**UI Change:** Pro → Pro (Payment Required) - yellow/orange

### Test 4: Subscription Canceled
**Firestore Document:**
```json
{
  "plan": "free",      // ← Changes
  "status": "canceled" // ← Changes
  // ... rest stays same
}
```
**UI Change:** Back to Free badge, audit limits enforced

## 🔍 Manual Testing After Script

1. **Test Real User Flow:**
   - Log in as a test user
   - Click upgrade button
   - Use test card: `4242 4242 4242 4242`
   - Verify Firestore updates with your real user ID

2. **Test Audit Limits:**
   - As a free user, try to run 6 audits
   - The 6th should trigger paywall

3. **Test Subscription Badge:**
   - Should update in real-time without page refresh
   - Check all status colors work correctly

## 🐛 Troubleshooting

### Webhook not firing?
```bash
# Check webhook is receiving events
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Firestore not updating?
1. Check webhook logs for errors
2. Verify `userId` is in checkout metadata
3. Check Firebase Admin SDK is initialized

### UI not updating?
1. Check browser console for errors
2. Verify user is authenticated
3. Check Firestore security rules aren't blocking reads

## 📝 Test User IDs Reference
- Script test user: `test-user-123`
- Your real user ID: Check Firebase Auth console
- Stripe test customer: `cus_test123`

## 💡 Pro Tips
- Keep `stripe listen` running in a separate terminal
- Use Firestore Console's real-time view to watch updates
- Test with a real user after script tests pass
- Save successful webhook payloads for debugging
