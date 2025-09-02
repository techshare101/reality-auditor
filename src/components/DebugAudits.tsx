"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';

export default function DebugAudits() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAudits() {
      if (!user) {
        setDebugInfo({ error: 'No user logged in' });
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Debug: Checking audits for user:', user.uid);
        
        // Get all audits (no user filter to see everything)
        const allAuditsQuery = query(
          collection(db, 'audits'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        
        const allAuditsSnapshot = await getDocs(allAuditsQuery);
        console.log('📊 Total audits found:', allAuditsSnapshot.size);
        
        const allAudits: any[] = [];
        allAuditsSnapshot.forEach((doc) => {
          const data = doc.data();
          allAudits.push({
            id: doc.id,
            userId: data.userId,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            url: data.url,
            hasResult: !!data.result,
            title: data.metadata?.title || data.result?.summary?.substring(0, 50) || 'No title'
          });
        });

        // Count audits for current user
        const userAudits = allAudits.filter(a => a.userId === user.uid);
        
        setDebugInfo({
          currentUserId: user.uid,
          totalAuditsInDb: allAuditsSnapshot.size,
          auditsForCurrentUser: userAudits.length,
          allAudits: allAudits.slice(0, 5), // Show first 5
          userAudits: userAudits.slice(0, 5), // Show user's first 5
          uniqueUserIds: [...new Set(allAudits.map(a => a.userId))]
        });
      } catch (error) {
        console.error('❌ Debug error:', error);
        setDebugInfo({ 
          error: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: error
        });
      }
      setLoading(false);
    }

    checkAudits();
  }, [user]);

  if (loading) return <div className="p-4 text-white">Loading debug info...</div>;

  return (
    <div className="p-4 bg-black/50 rounded-lg text-white text-sm font-mono">
      <h3 className="text-lg mb-2">🔍 Audit Debug Info</h3>
      <pre className="whitespace-pre-wrap overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}
