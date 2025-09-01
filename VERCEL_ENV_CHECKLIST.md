# 🔹 Vercel Environment Variables Checklist

## Required for Production Deployment

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

### 🔹 Stripe Configuration
```
STRIPE_SECRET_KEY=sk_live_xxx (or sk_test_xxx for testing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx (or pk_test_xxx)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 🔹 Firebase Configuration
```
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
```

### 🔹 Firebase Admin (Backend)
```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...} (full JSON)
```

### 🔹 External APIs
```
OPENAI_API_KEY=sk-xxx
TAVILY_API_KEY=tvly-xxx
```

### 🔹 App Configuration
```
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

### 🔹 Optional (Redis Cache)
```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

## ⚠️ Critical Notes:

1. **NEXT_PUBLIC_APP_URL** must match your exact Vercel domain
2. **FIREBASE_SERVICE_ACCOUNT_KEY** should be the full JSON service account
3. Use **test** keys for staging, **live** keys for production
4. After adding env vars, trigger a **redeploy**

## 🚀 After Setting Variables:

1. Go to Deployments tab
2. Click "Redeploy" on the latest deployment
3. Select "Use existing build cache: No" 
4. Click "Redeploy"
