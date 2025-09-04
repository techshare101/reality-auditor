"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";
import { Eye } from "lucide-react";

interface TestResults {
  emailCreate?: string;
  emailSignIn?: string;
  google?: string;
  providers?: string;
}

export default function AuthDebugPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [authState, setAuthState] = useState<string>("checking...");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [testEmail] = useState(`test${Date.now()}@test.com`);
  const [testPassword] = useState("testPassword123!");
  const [results, setResults] = useState<TestResults>({});

  useEffect(() => {
    // Check Firebase config
    if (typeof window !== 'undefined') {
      setConfig({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "✅ Set" : "❌ Missing",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "❌ Missing",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "❌ Missing",
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "✅ Set" : "❌ Missing",
      });
    }

    // Check auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState(user ? "Authenticated" : "Not authenticated");
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  const testEmailAuth = async () => {
    try {
      setResults((prev: TestResults) => ({ ...prev, emailCreate: "🔄 Testing..." }));
      
      // Try to create a test user
      const userCred = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      setResults((prev: TestResults) => ({ ...prev, emailCreate: "✅ Email/Password auth works!" }));
      
      // Sign out
      await auth.signOut();
      
      // Try to sign in
      setResults((prev: TestResults) => ({ ...prev, emailSignIn: "🔄 Testing sign in..." }));
      await signInWithEmailAndPassword(auth, testEmail, testPassword);
      setResults((prev: TestResults) => ({ ...prev, emailSignIn: "✅ Sign in works!" }));
      
      // Clean up
      await auth.signOut();
    } catch (error: any) {
      setResults((prev: TestResults) => ({
        ...prev, 
        emailCreate: `❌ ${error.code}: ${error.message}`,
        emailSignIn: error.code === "auth/email-already-in-use" ? "⚠️ User exists" : `❌ ${error.code}`
      }));
    }
  };

  const testGoogleAuth = async () => {
    try {
      setResults((prev: TestResults) => ({ ...prev, google: "🔄 Testing Google..." }));
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Log provider details
      console.log("Google Provider initialized:", provider);
      console.log("Auth instance:", auth);
      console.log("Current domain:", window.location.hostname);
      
      const result = await signInWithPopup(auth, provider);
      setResults((prev: TestResults) => ({ ...prev, google: `✅ Google auth works! User: ${result.user.email}` }));
      
      // Sign out after test
      await auth.signOut();
    } catch (error: any) {
      console.error("Google auth error:", error);
      setResults((prev: TestResults) => ({
        ...prev, 
        google: `❌ ${error.code}: ${error.message}`
      }));
      
      // Additional debugging for specific errors
      if (error.code === 'auth/invalid-credential') {
        console.log("Invalid credential details:", {
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          currentDomain: window.location.hostname,
          error: error
        });
      }
    }
  };

  const checkProviders = () => {
    try {
      // This will help identify if providers are configured
      console.log("Auth instance:", auth);
      console.log("Auth app:", auth.app);
      console.log("Auth settings:", auth.settings);
      setResults((prev: TestResults) => ({ ...prev, providers: "✅ Check console for provider details" }));
    } catch (error: any) {
      setResults((prev: TestResults) => ({ ...prev, providers: `❌ ${error.message}` }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Auth Debug Page</h1>
        </div>

        {/* Firebase Config Status */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Firebase Configuration</h2>
          <div className="space-y-2 font-mono text-sm">
            <p>API Key: {config.apiKey}</p>
            <p>Auth Domain: {config.authDomain}</p>
            <p>Project ID: {config.projectId}</p>
            <p>App ID: {config.appId}</p>
          </div>
        </div>

        {/* Current Auth State */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
          <p>Status: <span className="font-mono">{authState}</span></p>
          {currentUser && (
            <p>User: <span className="font-mono">{currentUser.email || currentUser.uid}</span></p>
          )}
        </div>

        {/* Test Buttons */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Tests</h2>
          <div className="space-y-4">
            <button
              onClick={testEmailAuth}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              Test Email/Password Auth
            </button>
            
            <button
              onClick={testGoogleAuth}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
            >
              Test Google Auth
            </button>
            
            <button
              onClick={checkProviders}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors"
            >
              Check Auth Providers
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="space-y-2 font-mono text-sm">
            {Object.entries(results).map(([key, value]) => (
              <p key={key}>{key}: {value as string}</p>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-sm text-gray-400">
          <p>💡 This page helps diagnose authentication issues.</p>
          <p>📋 Check the browser console for detailed error logs.</p>
          <p>🔐 Make sure to test on both localhost and production domains.</p>
        </div>
      </div>
    </div>
  );
}
