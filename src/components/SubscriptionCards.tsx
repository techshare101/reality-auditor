"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase';
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
  Sparkles,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { getUserUsage } from '@/lib/usage';
import MissionBanner from '@/components/MissionBanner';

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

function getPlanDisplayName(planType: string): string {
  switch (planType) {
    case 'free': return 'Free Plan';
    case 'basic': return 'Basic Plan';
    case 'pro': return 'Pro Plan';
    case 'enterprise': return 'Enterprise Plan';
    default: return 'Unknown Plan';
  }
}

const SubscriptionCards = React.memo(function SubscriptionCards() {
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Set default state to free plan while loading
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

    // First fetch subscription data from API
    fetchSubscriptionData().then(() => {
      // Only set up real-time listener after initial data is fetched
      const unsubscribe = onSnapshot(
        doc(clientDb, 'user_subscription_status', user.uid),
        {
          includeMetadataChanges: true,
        },
        (snapshot) => {
          if (!snapshot.exists()) return;

          console.log('🔄 Real-time subscription update received');
          const data = snapshot.data();
          
          // Map Firestore data to component state format
          const currentPeriodEnd = data.currentPeriodEnd?.toDate();
          const usagePercentage = data.auditsLimit > 0 ? (data.auditsUsed / data.auditsLimit) * 100 : 0;
          
          setSubscriptionData({
            planType: data.planType || 'free',
            planDisplayName: getPlanDisplayName(data.planType || 'free'),
            auditsUsed: data.auditsUsed || 0,
            auditsLimit: data.auditsLimit || 5,
            auditsRemaining: Math.max(0, (data.auditsLimit || 5) - (data.auditsUsed || 0)),
            usagePercentage,
            isNearLimit: (Math.max(0, (data.auditsLimit || 5) - (data.auditsUsed || 0))) <= Math.ceil((data.auditsLimit || 5) * 0.1),
            isActive: data.status === 'active' || data.planType === 'free',
            subscriptionStatus: data.status || 'free',
            currentPeriodEnd,
            nextBillingDate: currentPeriodEnd?.toISOString(),
          });
        },
        (error: any) => {
          console.error('❌ Real-time subscription listener error:', error);
          setError(error?.message || 'Permission denied');
          // Don't clear existing data on error, just log it
        }
      );
      
      return () => unsubscribe();
    });
  }, [user]);

  // Auto-refresh subscription data when usage might have changed
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'audit-completed') {
        console.log('🔄 Audit completed detected, refreshing subscription data...');
        refreshSubscriptionData();
      }
    };
    
    // Also listen for custom events for same-window updates
    const handleAuditCompleted = () => {
      console.log('🔄 Audit completed event detected, refreshing subscription data...');
      setTimeout(() => {
        refreshSubscriptionData();
      }, 1000); // Small delay to ensure backend has updated
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('audit-completed', handleAuditCompleted as any);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('audit-completed', handleAuditCompleted as any);
    };
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

      if (!response.ok) {
        throw new Error(`Failed to fetch subscription data: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Subscription data received:`, {
        planType: data.planType,
        auditsUsed: data.auditsUsed,
        auditsLimit: data.auditsLimit,
        auditsRemaining: data.auditsRemaining
      });

      if (!data.planType) {
        throw new Error('Invalid subscription data received');
      }

      // Don't update state if component is unmounted
      setSubscriptionData({
        planType: data.planType,
        planDisplayName: getPlanDisplayName(data.planType),
        auditsUsed: data.auditsUsed || 0,
        auditsLimit: data.auditsLimit || 5,
        auditsRemaining: data.auditsRemaining || 5,
        usagePercentage: data.usagePercentage || 0,
        isNearLimit: data.isNearLimit || false,
        isActive: data.isActive || data.planType === 'free',
        subscriptionStatus: data.subscriptionStatus || 'free',
        nextBillingDate: data.nextBillingDate,
        currentPeriodEnd: data.currentPeriodEnd
      });
    } catch (error) {
      console.error('❌ Error fetching subscription data:', error);
      setError((error as any)?.message || 'Failed to load subscription');
      // Set default free plan data as fallback
      if (!subscriptionData) {
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
        let errorDetails = '';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
            if (errorData.details) {
              errorDetails = errorData.details;
              console.error('Checkout error details:', errorDetails);
            }
            if (errorData.priceId) {
              console.error('Price ID that failed:', errorData.priceId);
            }
          }
        } catch (e) {
          // errorText is not JSON, use as-is
          console.error('Non-JSON error response:', errorText);
        }
        
        // Show full error in console for debugging
        console.error('Full checkout error:', { errorMessage, errorDetails, status: response.status });
        
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

  // Show error state with free plan fallback
  if (!subscriptionData) {
    // Default to free plan data even on error
    const defaultData = {
      planType: 'free',
      planDisplayName: 'Free Plan',
      auditsUsed: 0,
      auditsLimit: 5,
      auditsRemaining: 5,
      usagePercentage: 0,
      isNearLimit: false,
      isActive: true,
      subscriptionStatus: 'free'
    };

    return (
      <div className="space-y-4">
        <Card className="bg-red-500/10 border-red-500/20 backdrop-blur-xl rounded-3xl shadow-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-200">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <p className="font-medium">Subscription Check Failed</p>
                <p className="text-sm text-red-300/80">Defaulting to free plan features</p>
              </div>
            </div>
            <Button 
              onClick={refreshSubscriptionData}
              disabled={refreshing}
              className="mt-4 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30"
              size="sm"
            >
              {refreshing ? 'Refreshing...' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const PlanIcon = getPlanIcon(subscriptionData.planType);

  const showErrorBanner = error ? (
    <Card className="bg-red-500/10 border-red-500/20 backdrop-blur-xl rounded-3xl shadow-2xl mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm">Subscription access error. Falling back to Free plan.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ) : null;

  return (
    <div className="space-y-6">
      {showErrorBanner}
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
                    onClick={() => handleUpgrade('price_1S2KmxGRxp9eu0DJrdcrLLNR')}
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
                {subscriptionData.planType === 'free' ? 'Free Plan Includes' : 'Plan Benefits'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Dynamic Mission Banner */}
              <MissionBanner 
                planType={subscriptionData.planType}
                isNearLimit={subscriptionData.isNearLimit}
              />
              
              {/* Show plan features below the mission banner */}
              {subscriptionData.planType === 'free' && (
                <div className="mt-2">
                  <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                    <li>5 free audits / month</li>
                    <li>Basic bias detection</li>
                    <li>Cache-accelerated results</li>
                  </ul>
                </div>
              )}
              
              {subscriptionData.planType === 'pro' && (
                <div className="mt-2">
                  <ul className="list-disc list-inside text-sm text-emerald-300 space-y-1">
                    <li>Unlimited audits</li>
                    <li>Advanced bias analysis</li>
                    <li>Priority processing</li>
                    <li>Detailed fact-checking</li>
                  </ul>
                </div>
              )}

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
                  onClick={() => handleUpgrade('price_1S2KmxGRxp9eu0DJrdcrLLNR')}
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

      {/* Quick Upgrade Card for Free users */}
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
                      <span>Unlimited audits</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-purple-300/70 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-slate-900/95 border border-purple-500/20">
                            <p className="text-xs text-purple-100">
                              Fair Use Policy applies — Reality Auditor reserves the right to prevent abuse by automated or excessive audit requests.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                  onClick={() => handleUpgrade('price_1S2KmxGRxp9eu0DJrdcrLLNR')}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 hover:scale-105 transition-all"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Start Pro Plan – $19/mo
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Thank You Card for Pro users */}
      {subscriptionData.planType === 'pro' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Card className="bg-gradient-to-br from-green-500/20 via-emerald-600/15 to-teal-700/20 border-green-500/40 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden group hover:shadow-green-500/20 transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-green-500/20 border border-green-500/30">
                  <Sparkles className="w-5 h-5 text-green-400" />
                </div>
                <span className="bg-gradient-to-r from-green-200 to-emerald-200 bg-clip-text text-transparent">
                  Thank You!
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-green-200 text-sm mb-3">
                    Thanks for being a Pro member!
                  </p>
                  
                  <div className="space-y-2 text-sm text-green-100/90">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Unlimited audits active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Advanced features unlocked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Priority support included</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-green-200">
                    Need help? Contact us at{' '}
                    <a href="mailto:support@realityauditor.com" className="underline hover:text-green-100">
                      support@realityauditor.com
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      </div>
    </div>
  );
});

export default SubscriptionCards;
