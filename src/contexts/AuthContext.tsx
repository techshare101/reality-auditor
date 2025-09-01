"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔥 AuthProvider: Setting up auth state listener');
    
    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log('🔥 Auth state changed:', user ? 'User logged in' : 'No user');
        setUser(user);
        
        // Ensure usage record exists for all authenticated users
        if (user) {
          const usageRef = doc(db, 'usage', user.uid);
          try {
            const usageSnap = await getDoc(usageRef);
            
            if (!usageSnap.exists()) {
              // Create usage record if it doesn't exist (for existing users)
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
            // Don't block auth flow for usage record errors
          }
        }
        
        setLoading(false);
        setError(null);
      }, (error) => {
        console.error('🔥 Auth state error:', error);
        setError(error.message);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('🔥 Failed to setup auth listener:', error);
      setError('Failed to initialize authentication');
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create initial usage record for new user
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
        // Don't throw - let signup succeed even if usage creation fails
      }
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    // Clear all local storage to prevent ghost data
    localStorage.clear();
    sessionStorage.clear();
    console.log('🧽 Cleared local storage on logout');
  };

  const value = {
    user,
    loading,
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
