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
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth,
      (user) => {
        setUser(user);
        setLoading(false);
      },
      (error) => {
        console.error('Auth state error:', error);
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);
  const [user, loading, error] = useAuthState(auth);
  const [initialized, setInitialized] = useState(false);
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Wait for auth to initialize
        if (!loading) {
          console.log('✅ Firebase auth initialized', { user: !!user, loading });
          setInitialized(true);
        }
      } catch (err) {
        console.error('❌ Auth initialization error:', err);
        setAuthError(err as Error);
      }
    };

    initAuth();
  }, [loading, user]);

  // Ensure usage record exists for authenticated users
  useEffect(() => {
    if (!user) return;

    const setupUsageRecord = async () => {
      const usageRef = doc(db, 'usage', user.uid);
      try {
        const usageSnap = await getDoc(usageRef);
        
        if (!usageSnap.exists()) {
          // Create usage record if it doesn't exist
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
    };

    setupUsageRecord();
  }, [user]);

  // No longer render loading state here - let components handle their own loading states

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Create usage record if it doesn't exist
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
          // Don't block sign in for usage record error
        }
      }
    } catch (err: any) {
      // Handle Firebase auth errors
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        throw new Error('Invalid email or password');
      } else if (err.code === 'auth/invalid-email') {
        throw new Error('Invalid email format');
      } else if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many sign-in attempts. Please try again later.');
      }
      // Re-throw unknown errors
      throw err;
    }
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
    const result = await signInWithPopup(auth, provider);
    
    // Ensure usage record exists for Google sign-in users
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

  // Show error if auth failed to initialize
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-950 text-white px-6">
        <div className="text-center">
          <p className="text-red-400 mb-2">❌ Authentication Error</p>
          <p className="text-sm text-gray-400">{authError.message}</p>
        </div>
      </div>
    );
  }

  // Show nothing until Firebase auth is initialized
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-950 text-white px-6">
        <div className="text-center">
          <div className="w-16 h-16 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
