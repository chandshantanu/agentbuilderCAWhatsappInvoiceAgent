/**
 * Trial Expired / Subscription Ended page.
 * Shown when the user's trial or subscription has expired.
 * Provides clear messaging and a CTA to subscribe or renew.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { saasApi } from '@/services/saasApiService';
import {
  Clock,
  ArrowRight,
  Check,
  Shield,
  Sparkles,
  Zap,
  BarChart3,
  MessageSquare,
  Users,
  Loader2,
} from 'lucide-react';

declare global {
  interface Window { Razorpay: any; }
}

export default function TrialExpiredPage() {
  const navigate = useNavigate();
  const { config } = useSaaS();
  const { trialExpired, expiryReason, subscriptionId, refetch } = useSubscription();
  const { user } = useSupabaseAuth();
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState('');

  // Load Razorpay script
  useEffect(() => {
    if (document.getElementById('razorpay-script')) return;
    const s = document.createElement('script');
    s.id = 'razorpay-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const agentName = config?.branding?.brand_name || config?.landing_page?.hero_title || 'Agent';
  const price = config?.pricing?.monthly_price || config?.pricing?.base_price || 8999;
  const currency = config?.pricing?.currency || 'INR';
  const primaryColor = config?.branding?.primary_color || '#6366f1';

  const isTrialEnd = trialExpired || expiryReason === 'trial_ended';

  // For trial_expired users: use resume flow (re-activates existing subscription + pod)
  // For other expired: navigate to checkout (new subscription)
  const handleSubscribeClick = async () => {
    if (!isTrialEnd || !subscriptionId) {
      navigate('/checkout');
      return;
    }
    if (!window.Razorpay) {
      navigate('/checkout');
      return;
    }
    setResumeLoading(true);
    setResumeError('');
    try {
      const orderResp = await saasApi.createResumeOrder(subscriptionId);
      const order = orderResp.data;
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        order_id: order.order_id,
        name: config?.branding?.brand_name || 'Agent',
        description: 'Resume subscription',
        prefill: { email: user?.email || '' },
        theme: { color: primaryColor },
        handler: async (response: any) => {
          try {
            await saasApi.verifyResumePayment(subscriptionId, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await refetch();
            navigate('/dashboard');
          } catch (err: any) {
            setResumeError(err.message || 'Payment verification failed');
          }
        },
        modal: { ondismiss: () => setResumeLoading(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (r: any) => {
        setResumeError(r.error?.description || 'Payment failed');
        setResumeLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setResumeError(err.message || 'Failed to create order');
      setResumeLoading(false);
    }
  };
  const title = isTrialEnd ? 'Your Free Trial Has Ended' : 'Subscription Expired';
  const subtitle = isTrialEnd
    ? 'Your 14-day trial is over, but your data is safe. Subscribe to pick up right where you left off.'
    : 'Your subscription has expired. Renew to regain full access to your dashboard and agent.';

  const formatPrice = (amount: number) => {
    if (currency === 'INR') return `₹${amount.toLocaleString('en-IN')}`;
    return `$${amount}`;
  };

  const features = [
    { icon: MessageSquare, text: 'Unlimited AI-powered DM responses' },
    { icon: Zap, text: 'Chain-of-thought sales reasoning' },
    { icon: Users, text: 'Lead scoring & CRM dashboard' },
    { icon: BarChart3, text: 'Full analytics & conversion metrics' },
    { icon: Shield, text: 'Brand protection & quality gate' },
    { icon: Sparkles, text: 'Automated follow-ups & comment-to-DM' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">{agentName}</span>
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Expired Icon */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <Clock className="w-10 h-10" style={{ color: primaryColor }} />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">{title}</h1>
          <p className="text-lg text-gray-500 max-w-md mx-auto">{subtitle}</p>
        </div>

        {/* What you get card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100" style={{ backgroundColor: `${primaryColor}08` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Monthly subscription</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-bold text-gray-900">{formatPrice(price)}</span>
                  <span className="text-gray-500">/mo</span>
                </div>
              </div>
              <div
                className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Full Access
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm font-medium text-gray-700 mb-4">Everything included:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${primaryColor}12` }}
                  >
                    <feature.icon className="w-4 h-4" style={{ color: primaryColor }} />
                  </div>
                  <span className="text-sm text-gray-700">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 pb-6">
            {resumeError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4 text-center">
                {resumeError}
              </p>
            )}
            <button
              onClick={handleSubscribeClick}
              disabled={resumeLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
            >
              {resumeLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
              ) : (
                <>{isTrialEnd ? 'Resume Subscription' : 'Subscribe Now'}<ArrowRight className="w-5 h-5" /></>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              Secure payment via Razorpay · Cancel anytime
            </p>
          </div>
        </div>

        {/* Data safety notice */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-900">Your data is safe</p>
            <p className="text-sm text-green-700 mt-0.5">
              All your conversations, leads, products, and settings are preserved.
              Subscribe to pick up right where you left off.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
