"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  UserCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: Error | null | undefined;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, loading, error] = useAuthState(auth);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!loading) setInitialized(true);
  }, [loading]);

  // Ensure usage record exists for authenticated users
  useEffect(() => {
    if (!user) return;

    const setupUsageRecord = async () => {
      const usageRef = doc(db, 'usage', user.uid);
      try {
        const usageSnap = await getDoc(usageRef);
        
        if (!usageSnap.exists()) {
          await setDoc(usageRef, {
            audits_used: 0,
            audit_limit: 5,
            plan: 'free',
            created_at: new Date().toISOString(),
            last_reset: new Date().toISOString()
          });
          console.log('✅ Created missing usage record for user:', user.uid);
        }
      } catch (error) {
        console.error('Error checking/creating usage record:', error);
      }
    };

    setupUsageRecord();
  }, [user]);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user) {
        const usageRef = doc(db, 'usage', result.user.uid);
        try {
          const usageSnap = await getDoc(usageRef);
          if (!usageSnap.exists()) {
            await setDoc(usageRef, {
              audits_used: 0,
              audit_limit: 5,
              plan: 'free',
              created_at: new Date().toISOString(),
              last_reset: new Date().toISOString()
            });
            console.log('✅ Created missing usage record for user:', result.user.uid);
          }
        } catch (err) {
          console.error('Error ensuring usage record:', err);
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        throw new Error('Invalid email or password');
      } else if (err.code === 'auth/invalid-email') {
        throw new Error('Invalid email format');
      } else if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many sign-in attempts. Please try again later.');
      }
      throw err;
    }
  };

  const signUp = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    if (userCredential.user) {
      const userId = userCredential.user.uid;
      const usageRef = doc(db, 'usage', userId);
      
      try {
        await setDoc(usageRef, {
          audits_used: 0,
          audit_limit: 5,
          plan: 'free',
          created_at: new Date().toISOString(),
          last_reset: new Date().toISOString()
        });
        console.log('✅ Created usage record for new user:', userId);
      } catch (error) {
        console.error('Failed to create usage record:', error);
      }
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    if (result.user) {
      const usageRef = doc(db, 'usage', result.user.uid);
      try {
        const usageSnap = await getDoc(usageRef);
        
        if (!usageSnap.exists()) {
          await setDoc(usageRef, {
            audits_used: 0,
            audit_limit: 5,
            plan: 'free',
            created_at: new Date().toISOString(),
            last_reset: new Date().toISOString()
          });
          console.log('✅ Created usage record for Google user:', result.user.uid);
        }
      } catch (error) {
        console.error('Failed to create usage record:', error);
      }
    }
    
    return result;
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.clear();
    sessionStorage.clear();
    console.log('🧽 Cleared local storage on logout');
  };

  const value = {
    user,
    loading: !initialized || loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
