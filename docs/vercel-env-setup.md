# Vercel Environment Variables Setup

## Required Environment Variables

Add these to your Vercel project settings (Settings → Environment Variables):

### Firebase Client (Public)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=reality-auditor.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=reality-auditor
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=reality-auditor.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Firebase Admin (Private)
```
FIREBASE_ADMIN_PROJECT_ID=reality-auditor
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@reality-auditor.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Stripe (Private)
```
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Stripe (Public)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
NEXT_PUBLIC_STRIPE_PRICE_ID=price_your_price_id
```

### App Configuration
```
NEXT_PUBLIC_APP_URL=https://reality-auditor.vercel.app
```

### Optional Services
```
OPENAI_API_KEY=sk-proj-your_openai_key
TAVILY_API_KEY=tvly-your_tavily_key
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

## Important Notes

1. **Firebase Admin Private Key**: Must include the `\n` characters in the string. Copy exactly from your service account JSON file.

2. **Environment Variable Scopes**: 
   - Production: Apply to main branch deployments
   - Preview: Apply to all preview deployments
   - Development: Local development only

3. **Sensitive Values**: Never commit these to Git. Use Vercel's environment variables interface.

## How to Add in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with appropriate values
4. Select appropriate environments (Production, Preview, Development)
5. Save changes

## Debugging

If you see "Could not load the default credentials" error:
- Ensure FIREBASE_ADMIN_PRIVATE_KEY is properly formatted with \n
- Check that all three Firebase Admin variables are set
- Verify the service account email matches your Firebase project
