"use client";

import React, { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function FirebaseDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  useEffect(() => {
    // Check Firebase configuration
    const config = auth.app.options;
    
    const debug = {
      firebaseConfig: {
        apiKey: config.apiKey ? '✅ Present' : '❌ Missing',
        authDomain: config.authDomain ? '✅ Present' : '❌ Missing',
        projectId: config.projectId ? '✅ Present' : '❌ Missing',
        storageBucket: config.storageBucket ? '✅ Present' : '❌ Missing',
        messagingSenderId: config.messagingSenderId ? '✅ Present' : '❌ Missing',
        appId: config.appId ? '✅ Present' : '❌ Missing',
      },
      authReady: auth ? '✅ Auth initialized' : '❌ Auth not initialized',
      environment: process.env.NODE_ENV,
    };
    
    setDebugInfo(debug);
    
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setDebugInfo((prev: any) => ({
        ...prev,
        currentUser: user ? `✅ Signed in as ${user.email}` : '❌ Not signed in',
        authState: user ? 'authenticated' : 'unauthenticated'
      }));
    });
    
    return () => unsubscribe();
  }, []);
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">🔥 Firebase Debug Info</h3>
      
      <div className="space-y-1">
        <p><strong>Environment:</strong> {debugInfo.environment}</p>
        <p><strong>Auth Status:</strong> {debugInfo.authReady}</p>
        <p><strong>User Status:</strong> {debugInfo.currentUser || 'Checking...'}</p>
      </div>
      
      <div className="mt-2">
        <p className="font-semibold">Config Status:</p>
        {debugInfo.firebaseConfig && Object.entries(debugInfo.firebaseConfig).map(([key, value]) => (
          <p key={key} className="ml-2">
            <span className="font-mono">{key}:</span> {String(value)}
          </p>
        ))}
      </div>
      
      <div className="mt-2 text-xs opacity-75">
        <p>Project ID: {auth?.app?.options?.projectId || 'Not found'}</p>
        <p>Auth Domain: {auth?.app?.options?.authDomain || 'Not found'}</p>
      </div>
    </div>
  );
}
