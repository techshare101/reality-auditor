#!/bin/bash

# Stripe Subscription Testing Script
# Make sure Stripe CLI is logged in:
#   stripe login

echo "🚀 Starting Stripe webhook test sequence..."
echo ""

# Function to pause between tests
pause() {
    echo ""
    echo "Press Enter to continue to next test..."
    read
}

# 1. Simulate checkout success
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Checkout Session Completed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👉 Triggering checkout.session.completed..."
stripe trigger checkout.session.completed \
    --add checkout_session:metadata.userId=test-user-123 \
    --add checkout_session:customer=cus_test123 \
    --add checkout_session:subscription=sub_test123

echo ""
echo "✅ EXPECTED RESULTS:"
echo "   - Firestore: New doc in user_subscription_status/test-user-123"
echo "   - Doc contains: status='active', plan='pro', stripeCustomerId='cus_test123'"
echo "   - UI: Green 'Pro' badge should appear"
echo "   - UI: No audit limits shown"
pause

# 2. Simulate subscription renewal/update
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Subscription Updated (Renewal)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👉 Triggering customer.subscription.updated..."
stripe trigger customer.subscription.updated \
    --add subscription:id=sub_test123 \
    --add subscription:customer=cus_test123 \
    --add subscription:status=active

echo ""
echo "✅ EXPECTED RESULTS:"
echo "   - Firestore: Doc updates with new updatedAt timestamp"
echo "   - Doc still shows: status='active'"
echo "   - UI: Still shows Green 'Pro' badge"
echo "   - UI: No changes visible to user"
pause

# 3. Simulate past due (payment failed)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Payment Failed (Past Due)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👉 Triggering subscription past_due status..."
stripe trigger customer.subscription.updated \
    --add subscription:id=sub_test123 \
    --add subscription:customer=cus_test123 \
    --add subscription:status=past_due

echo ""
echo "✅ EXPECTED RESULTS:"
echo "   - Firestore: Doc updates status='past_due'"
echo "   - UI: Yellow/Orange 'Pro (Payment Required)' badge"
echo "   - UI: May show warning about payment needed"
pause

# 4. Simulate cancellation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Subscription Canceled"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👉 Triggering customer.subscription.deleted..."
stripe trigger customer.subscription.deleted \
    --add subscription:id=sub_test123 \
    --add subscription:customer=cus_test123

echo ""
echo "✅ EXPECTED RESULTS:"
echo "   - Firestore: Doc updates status='canceled', plan='free'"
echo "   - UI: Reverts to 'Free' badge"
echo "   - UI: Shows '5 audits/month' limit"
echo "   - UI: Paywall appears after 5 audits"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Testing Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 MANUAL VERIFICATION CHECKLIST:"
echo "   □ Check Firestore Console: user_subscription_status/test-user-123"
echo "   □ Check your app UI for badge changes"
echo "   □ Check webhook logs in Stripe Dashboard"
echo "   □ Test audit limit enforcement (for free users)"
echo ""
echo "💡 TIP: Use 'stripe listen' in another terminal to see webhook events"
