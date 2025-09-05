import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    console.log('🔍 Debug: Checking audits in Firestore...');
    
    // Get all audits
    const auditsSnapshot = await db.collection('audits').get();
    console.log(`✅ Total audits in database: ${auditsSnapshot.size}`);

    const audits: any[] = [];
    auditsSnapshot.forEach(doc => {
      const data = doc.data();
      audits.push({
        id: doc.id,
        userId: data.userId,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        url: data.url,
        hasResult: !!data.result,
        hasMetadata: !!data.metadata,
        resultSummary: data.result?.summary?.substring(0, 50) || 'No summary'
      });
    });

    // Group by user
    const userGroups: Record<string, any[]> = {};
    audits.forEach(audit => {
      const userId = audit.userId || 'no-user-id';
      if (!userGroups[userId]) {
        userGroups[userId] = [];
      }
      userGroups[userId].push(audit);
    });

    return NextResponse.json({
      success: true,
      totalAudits: auditsSnapshot.size,
      uniqueUsers: Object.keys(userGroups).length,
      userGroups: Object.entries(userGroups).map(([userId, audits]) => ({
        userId,
        auditCount: audits.length,
        recentAudits: audits
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
      }))
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
