import { type NextRequest } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebaseAdmin";

initFirebaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');

    if (!uid) {
      return Response.json(
        { error: "Missing user ID" },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return Response.json({
        isProUser: false,
        used: 0
      });
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription;
    const isProUser = subscription?.status === 'active';

    // Get usage data
    const usageDoc = await db.collection('usage').doc(uid).get();
    const usage = usageDoc.exists ? usageDoc.data() : {};

    return Response.json({
      isProUser,
      plan: usage?.plan || 'free',
      used: usage?.audits_used || 0,
      lastReset: usage?.last_reset,
      canAudit: isProUser || (usage?.audits_used || 0) < 5,
      showPaywall: !isProUser && (usage?.audits_used || 0) >= 5
    });
  } catch (error) {
    console.error('Failed to fetch audit access:', error);
    return Response.json(
      { error: "Failed to fetch audit access" },
      { status: 500 }
    );
  }
}
