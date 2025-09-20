const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Load Firebase config from environment
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
if (!serviceAccountBase64) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is required");
  process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString());

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const STRIPE_PRICES = {
  basic_monthly: "price_1S2KmxGRxp9eu0DJrdcrLLNR",
};

// Old IDs to replace
const oldIds = [
  "price_1S1tnbGnOgSIwPZhYfV3aFXe",
  "price_151tnbGnOgSlwPZhYfV3aFXe",
];
const newId = STRIPE_PRICES.basic_monthly;

async function fixPlans() {
  const plansRef = db.collection("plans");
  const snapshot = await plansRef.get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (oldIds.includes(data.stripe_price_id)) {
      console.log(`🔄 Fixing ${doc.id}: ${data.stripe_price_id} → ${newId}`);
      await doc.ref.update({ stripe_price_id: newId });
    }
  }

  console.log("✅ Plans cleaned up");
}

async function fixUsers() {
  const usersRef = db.collection("users");
  const snapshot = await usersRef.get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (oldIds.includes(data.stripe_price_id)) {
      console.log(`🔄 Fixing ${doc.id}: ${data.stripe_price_id} → ${newId}`);
      await doc.ref.update({ stripe_price_id: newId });
    }
  }

  console.log("✅ Users cleaned up");
}

(async () => {
  try {
    console.log("🔧 Starting price ID fix...");
    await fixPlans();
    await fixUsers();
    console.log("✅ All fixes completed!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
  process.exit(0);
})();