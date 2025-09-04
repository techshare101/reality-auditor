"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, Mail, Lock, Loader2, AlertCircle } from "lucide-react";

// Particle component that's safe for SSR
const Particle = ({ index }: { index: number }) => {
  const [mounted, setMounted] = useState(false);
  const [particleData, setParticleData] = useState({
    x: [0, 0],
    y: [0, 0],
    left: 0,
    top: 0,
    duration: 20
  });

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setParticleData({
        x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
        y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: Math.random() * 15 + 15
      });
    }
  }, []);

  if (!mounted) return null;

  return (
    <motion.div
      className="absolute w-1 h-1 bg-indigo-400/20 rounded-full"
      animate={{
        x: particleData.x,
        y: particleData.y,
      }}
      transition={{
        repeat: Infinity,
        duration: particleData.duration,
        ease: "linear",
      }}
      style={{
        left: `${particleData.left}%`,
        top: `${particleData.top}%`,
      }}
    />
  );
};

// Particles container that only renders on client
const ParticlesBackground = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <Particle key={i} index={i} />
      ))}
    </div>
  );
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { signIn, signInWithGoogle, user } = useAuth();
  const router = useRouter();
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-950 text-white px-6">
      {/* Background particles */}
      <ParticlesBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl rounded-3xl p-8 relative"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
            Reality Auditor
          </span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="mt-2 text-gray-400">Sign in to audit reality</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-300 mb-2 font-medium">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2 font-medium">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold shadow-lg hover:scale-105 transition-transform disabled:hover:scale-100 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                Sign In ⚡
              </>
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-4 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors disabled:opacity-70 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? "Signing in..." : "Sign in with Google"}
          </button>
        </div>

        <p className="mt-8 text-center text-gray-400 text-sm">
          Don't have an account?{" "}
          <Link href="/signup" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
            Sign up for free
          </Link>
        </p>

        <p className="mt-4 text-center">
          <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-purple-400 transition-colors">
            Forgot your password?
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
