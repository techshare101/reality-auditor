import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Load your service account key
initializeApp({
  credential: cert(require("./serviceAccountKey.json")),
});

const db = getFirestore();

// Old IDs to replace
import { STRIPE_PRICES } from '../lib/stripe-config';

const oldIds = [
  "price_1S1tnbGnOgSIwPZhYfV3aFXe",
  "price_151tnbGnOgSlwPZhYfV3aFXe",
];
const newId = STRIPE_PRICES.basic_monthly; // Using the centralized config

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
  await fixPlans();
  await fixUsers();
  process.exit(0);
})();