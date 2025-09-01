"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";

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
  const [loading, setLoading] = useState(false); // Set to false to bypass loading

  const signIn = async (email: string, password: string) => {
    console.log("Sign in called", email);
  };

  const signUp = async (email: string, password: string) => {
    console.log("Sign up called", email);
  };

  const signInWithGoogle = async () => {
    console.log("Google sign in called");
  };

  const logout = async () => {
    console.log("Logout called");
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
