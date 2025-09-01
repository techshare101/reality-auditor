import { notFound } from 'next/navigation';
import AuditResult from '@/components/AuditResult';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { db, auth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

interface AuditData {
  id: string;
  url?: string;
  result?: any;
  metadata?: {
    title?: string;
    outlet?: string;
    author?: string;
    date?: string;
  };
  createdAt: Date;
  userId?: string;
  [key: string]: any;
}

async function getAudit(id: string, userId: string | null): Promise<AuditData | null> {
  try {
    const docRef = db.collection('audits').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    
    // Check if the audit belongs to the current user
    if (data?.userId && userId && data.userId !== userId) {
      return null; // Don't show audits from other users
    }
    
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('Error fetching audit:', error);
    return null;
  }
}

export default async function AuditDetailPage({ params }: { params: { id: string } }) {
  // Get the current user from the session cookie
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session');
  
  let userId = null;
  if (sessionCookie?.value) {
    try {
      const decodedToken = await auth.verifySessionCookie(sessionCookie.value);
      userId = decodedToken.uid;
    } catch (error) {
      console.error('Invalid session:', error);
    }
  }
  
  const audit = await getAudit(params.id, userId);
  
  if (!audit) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        
        <div className="space-y-6">
          {/* Title and metadata */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-2">
              {audit.metadata?.title || 'Reality Audit'}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{audit.metadata?.outlet || 'Unknown source'}</span>
              {audit.url && (
                <>
                  <span>•</span>
                  <a 
                    href={audit.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-gray-200 underline"
                  >
                    View original
                  </a>
                </>
              )}
              <span>•</span>
              <span>{new Date(audit.createdAt).toLocaleString()}</span>
            </div>
          </div>
          
          {/* Render the audit result */}
          <AuditResult data={audit.result} url={audit.url} />
        </div>
      </div>
    </div>
  );
}
