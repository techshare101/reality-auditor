# Stripe Subscription Testing Script (PowerShell)
# Make sure Stripe CLI is logged in:
#   stripe login

Write-Host "🚀 Starting Stripe webhook test sequence..." -ForegroundColor Green
Write-Host ""

# Function to pause between tests
function Pause-Test {
    Write-Host ""
    Write-Host "Press Enter to continue to next test..." -ForegroundColor Yellow
    Read-Host
}

# 1. Simulate checkout success
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 1: Checkout Session Completed" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "👉 Triggering checkout.session.completed..."
stripe trigger checkout.session.completed `
    --add checkout_session:metadata.userId=test-user-123 `
    --add checkout_session:customer=cus_test123 `
    --add checkout_session:subscription=sub_test123

Write-Host ""
Write-Host "✅ EXPECTED RESULTS:" -ForegroundColor Green
Write-Host "   - Firestore: New doc in user_subscription_status/test-user-123"
Write-Host "   - Doc contains: status='active', plan='pro', stripeCustomerId='cus_test123'"
Write-Host "   - UI: Green 'Pro' badge should appear"
Write-Host "   - UI: No audit limits shown"
Pause-Test

# 2. Simulate subscription renewal/update
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 2: Subscription Updated (Renewal)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "👉 Triggering customer.subscription.updated..."
stripe trigger customer.subscription.updated `
    --add subscription:id=sub_test123 `
    --add subscription:customer=cus_test123 `
    --add subscription:status=active

Write-Host ""
Write-Host "✅ EXPECTED RESULTS:" -ForegroundColor Green
Write-Host "   - Firestore: Doc updates with new updatedAt timestamp"
Write-Host "   - Doc still shows: status='active'"
Write-Host "   - UI: Still shows Green 'Pro' badge"
Write-Host "   - UI: No changes visible to user"
Pause-Test

# 3. Simulate past due (payment failed)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 3: Payment Failed (Past Due)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "👉 Triggering subscription past_due status..."
stripe trigger customer.subscription.updated `
    --add subscription:id=sub_test123 `
    --add subscription:customer=cus_test123 `
    --add subscription:status=past_due

Write-Host ""
Write-Host "✅ EXPECTED RESULTS:" -ForegroundColor Green
Write-Host "   - Firestore: Doc updates status='past_due'"
Write-Host "   - UI: Yellow/Orange 'Pro (Payment Required)' badge"
Write-Host "   - UI: May show warning about payment needed"
Pause-Test

# 4. Simulate cancellation
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 4: Subscription Canceled" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "👉 Triggering customer.subscription.deleted..."
stripe trigger customer.subscription.deleted `
    --add subscription:id=sub_test123 `
    --add subscription:customer=cus_test123

Write-Host ""
Write-Host "✅ EXPECTED RESULTS:" -ForegroundColor Green
Write-Host "   - Firestore: Doc updates status='canceled', plan='free'"
Write-Host "   - UI: Reverts to 'Free' badge"
Write-Host "   - UI: Shows '5 audits/month' limit"
Write-Host "   - UI: Paywall appears after 5 audits"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host "🎯 Testing Complete!" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""
Write-Host "📋 MANUAL VERIFICATION CHECKLIST:" -ForegroundColor Yellow
Write-Host "   □ Check Firestore Console: user_subscription_status/test-user-123"
Write-Host "   □ Check your app UI for badge changes"
Write-Host "   □ Check webhook logs in Stripe Dashboard"
Write-Host "   □ Test audit limit enforcement (for free users)"
Write-Host ""
Write-Host "💡 TIP: Use 'stripe listen' in another terminal to see webhook events" -ForegroundColor Cyan
