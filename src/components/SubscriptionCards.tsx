"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  TrendingUp, 
  Zap, 
  Shield, 
  ArrowUpRight, 
  Settings,
  Crown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionData {
  planType: 'free' | 'basic' | 'pro' | 'enterprise';
  planDisplayName: string;
  auditsUsed: number;
  auditsLimit: number;
  auditsRemaining: number;
  usagePercentage: number;
  isNearLimit: boolean;
  isActive: boolean;
  subscriptionStatus: string;
  nextBillingDate?: string;
  currentPeriodEnd?: string;
}

export default function SubscriptionCards() {
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    }
  }, [user]);

  // Auto-refresh subscription data when usage might have changed
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'audit-completed') {
        console.log('🔄 Audit completed detected, refreshing subscription data...');
        refreshSubscriptionData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const refreshSubscriptionData = async () => {
    setRefreshing(true);
    await fetchSubscriptionData();
    setRefreshing(false);
  };

  const fetchSubscriptionData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log(`📊 Fetching subscription data for user: ${user.email}`);
      
      const token = await user.getIdToken();
      const response = await fetch('/api/subscription-status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Subscription data received:`, {
          planType: data.planType,
          auditsUsed: data.auditsUsed,
          auditsLimit: data.auditsLimit,
          auditsRemaining: data.auditsRemaining
        });
        setSubscriptionData(data);
      } else {
        console.error('❌ Failed to fetch subscription data:', response.status);
        // Set default free plan data as fallback
        setSubscriptionData({
          planType: 'free',
          planDisplayName: 'Free Plan',
          auditsUsed: 0,
          auditsLimit: 5,
          auditsRemaining: 5,
          usagePercentage: 0,
          isNearLimit: false,
          isActive: true,
          subscriptionStatus: 'free'
        });
      }
    } catch (error) {
      console.error('❌ Error fetching subscription data:', error);
      // Set default free plan data as fallback
      setSubscriptionData({
        planType: 'free',
        planDisplayName: 'Free Plan', 
        auditsUsed: 0,
        auditsLimit: 5,
        auditsRemaining: 5,
        usagePercentage: 0,
        isNearLimit: false,
        isActive: true,
        subscriptionStatus: 'free'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!user) {
      alert('Please log in to manage your subscription.');
      return;
    }

    setBillingLoading(true);
    try {
      console.log(`🏦️ Opening billing portal for user: ${user.email}`);
      console.log(`🔍 User object details:`, {
        email: user.email,
        uid: user.uid,
        emailVerified: user.emailVerified
      });
      
      // Get fresh Firebase ID token
      console.log(`🔑 Attempting to get Firebase ID token...`);
      const token = await user.getIdToken(true); // Force refresh
      console.log(`🔑 Firebase token obtained:`, !!token);
      console.log(`🔑 Token length:`, token?.length || 0);
      
      console.log(`📡 Making API request to /api/stripe/billing-portal...`);
      
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(`📊 Billing portal response status:`, response.status);

      if (response.ok) {
        const { url } = await response.json();
        console.log(`✅ Billing portal URL received: ${url}`);
        window.open(url, '_blank');
      } else {
        const errorText = await response.text();
        console.error(`❌ Billing portal failed with status ${response.status}:`, errorText);
        
        let errorData: any = {};
        let errorMessage = 'Unable to open billing portal.';
        
        try {
          errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // errorText is not JSON, use as-is
        }
        
        // Handle specific error cases
        if (response.status === 401) {
          alert('Authentication failed. Please try logging out and back in, then try again.');
        } else if (response.status === 404 && errorData.error === 'no_subscription') {
          // 🎆 Graceful fallback for users without subscriptions
          const shouldUpgrade = confirm(
            `${errorData.message || 'No active subscription found. Please upgrade to a paid plan to access the billing portal.'}\n\nWould you like to upgrade to a paid plan now?`
          );
          if (shouldUpgrade) {
            window.location.href = errorData.upgrade_url || '/pricing';
          }
        } else if (response.status === 500 && errorMessage.includes('Firebase')) {
          alert('Billing portal is temporarily unavailable. Please contact support at support@realityauditor.com for subscription management.');
        } else {
          alert(`${errorMessage} Please contact support if this issue persists.`);
        }
      }
    } catch (error) {
      console.error('❌ Billing portal error:', error);
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // More user-friendly error message
      alert(`Failed to create billing portal session. Please contact support if this issue persists.\n\nError details logged to console for debugging.`);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleUpgrade = async (priceId: string) => {
    try {
      console.log(`🛒 Starting checkout for Price ID: ${priceId}`);
      console.log(`👤 User authenticated:`, !!user);
      console.log(`📧 User email:`, user?.email);
      
      const token = user ? await user.getIdToken() : null;
      console.log(`🔑 Auth token obtained:`, !!token);
      
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      
      console.log(`📡 Making request to /api/stripe/checkout with headers:`, Object.keys(headers));

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ priceId }),
      });

      console.log(`📊 Response status:`, response.status);
      console.log(`📊 Response ok:`, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Checkout response data:`, data);
        
        if (data.url) {
          console.log(`🔗 Redirecting to Stripe checkout: ${data.url}`);
          window.location.href = data.url;
        } else {
          console.error('❌ No checkout URL in response:', data);
          alert('Failed to get checkout URL. Please try again.');
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ Checkout failed with status ${response.status}:`, errorText);
        
        let errorMessage = 'Failed to start checkout. Please try again.';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // errorText is not JSON, use as-is
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'enterprise': return 'from-purple-500 to-indigo-600';
      case 'pro': return 'from-blue-500 to-cyan-600';
      case 'basic': return 'from-green-500 to-emerald-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'enterprise': return Crown;
      case 'pro': return Zap;
      case 'basic': return Shield;
      default: return CheckCircle;
    }
  };

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white/10 border-white/15 backdrop-blur-xl rounded-3xl shadow-2xl">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-white/20 rounded w-3/4"></div>
                <div className="h-8 bg-white/20 rounded"></div>
                <div className="h-4 bg-white/20 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <Card className="bg-white/10 border-white/15 backdrop-blur-xl rounded-3xl shadow-2xl">
        <CardContent className="p-6 text-center">
          <p className="text-white/70">Failed to load subscription data</p>
          <Button 
            onClick={refreshSubscriptionData}
            disabled={refreshing}
            className="mt-4 bg-gradient-to-r from-purple-500 to-indigo-600"
          >
            {refreshing ? 'Refreshing...' : 'Retry'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const PlanIcon = getPlanIcon(subscriptionData.planType);

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className={`bg-gradient-to-br ${getPlanColor(subscriptionData.planType)}/20 border-white/15 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden group hover:shadow-purple-500/10 transition-all duration-300`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className={`p-2 rounded-xl bg-gradient-to-r ${getPlanColor(subscriptionData.planType)}/20 border border-white/20`}>
                <PlanIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  {subscriptionData.planDisplayName}
                </span>
                <Badge 
                  className={`ml-2 ${
                    subscriptionData.planType === 'free' 
                      ? 'bg-gray-500/20 text-gray-300' 
                      : 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-200 border-green-500/30'
                  }`}
                >
                  {subscriptionData.subscriptionStatus === 'active' ? 'Active' : 'Free'}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-white">
                  {subscriptionData.auditsLimit} 
                  <span className="text-lg font-normal text-white/70 ml-1">audits/month</span>
                </p>
              </div>

              {subscriptionData.nextBillingDate && (
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Clock className="w-4 h-4" />
                  <span>Next billing: {new Date(subscriptionData.nextBillingDate).toLocaleDateString()}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleManageBilling}
                  disabled={billingLoading}
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white"
                  title="Manage your subscription (requires subscription setup)"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  {billingLoading ? 'Loading...' : 'Manage'}
                </Button>
                
                {subscriptionData.planType === 'free' && (
                  <Button
                    onClick={() => handleUpgrade('price_1S1tnbGnOgSIwPZhYfV3aFXe')}
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-105 transition-transform"
                  >
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    Upgrade
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Usage Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
      >
        <Card className={`bg-white/10 border-white/15 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden group hover:shadow-blue-500/10 transition-all duration-300 ${
          subscriptionData.isNearLimit ? 'ring-2 ring-amber-500/50' : ''
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className={`p-2 rounded-xl ${
                subscriptionData.isNearLimit 
                  ? 'bg-amber-500/20 border border-amber-500/30' 
                  : 'bg-blue-500/20 border border-blue-500/30'
              }`}>
                <TrendingUp className={`w-5 h-5 ${
                  subscriptionData.isNearLimit ? 'text-amber-300' : 'text-blue-400'
                }`} />
              </div>
              <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Usage This Month
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-2xl font-bold text-white">
                    {subscriptionData.auditsUsed}
                  </span>
                  <span className="text-white/70">
                    of {subscriptionData.auditsLimit}
                  </span>
                </div>
                
                <Progress 
                  value={subscriptionData.usagePercentage} 
                  className={`h-3 ${
                    subscriptionData.isNearLimit 
                      ? 'bg-amber-500/20' 
                      : 'bg-white/10'
                  }`}
                />
                
                <div className="flex justify-between text-sm text-white/70 mt-2">
                  <span>{subscriptionData.auditsRemaining} remaining</span>
                  <span>{Math.round(subscriptionData.usagePercentage)}% used</span>
                </div>
              </div>

              {subscriptionData.isNearLimit && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-200">
                    You're running low on audits. Consider upgrading your plan.
                  </p>
                </motion.div>
              )}

              {subscriptionData.auditsRemaining === 0 && (
                <Button
                  onClick={() => handleUpgrade('price_1S1tnbGnOgSIwPZhYfV3aFXe')}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-105 transition-transform"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Upgrade for More Audits
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Upgrade Card */}
      {subscriptionData.planType === 'free' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/20 via-indigo-600/15 to-blue-700/20 border-purple-500/40 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden group hover:shadow-purple-500/20 transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
                  <Crown className="w-5 h-5 text-purple-400" />
                </div>
                <span className="bg-gradient-to-r from-purple-200 to-indigo-200 bg-clip-text text-transparent">
                  Upgrade Available
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-purple-200 text-sm mb-3">
                    Unlock advanced features and more audits
                  </p>
                  
                  <div className="space-y-2 text-sm text-purple-100/90">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-400" />
                      <span>50+ audits per month</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-400" />
                      <span>Advanced analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-400" />
                      <span>Priority support</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleUpgrade('price_1S1tnbGnOgSIwPZhYfV3aFXe')}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 hover:scale-105 transition-all"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Start Basic Plan - $19/mo
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
