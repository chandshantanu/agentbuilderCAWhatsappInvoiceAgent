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
    <div className="min-h-screen" style={{ background: '#070B14' }}>
      {/* Aurora blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>
      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-slate-200">{agentName}</span>
          <Link
            to="/"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
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

          <h1 className="text-3xl font-bold text-slate-100 mb-3">{title}</h1>
          <p className="text-lg text-slate-400 max-w-md mx-auto">{subtitle}</p>
        </div>

        {/* What you get card */}
        <div className="rounded-2xl overflow-hidden mb-8" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div className="p-6 border-b border-white/10" style={{ backgroundColor: `${primaryColor}12` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Monthly subscription</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-bold text-slate-100">{formatPrice(price)}</span>
                  <span className="text-slate-400">/mo</span>
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
            <p className="text-sm font-medium text-slate-300 mb-4">Everything included:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <feature.icon className="w-4 h-4" style={{ color: primaryColor }} />
                  </div>
                  <span className="text-sm text-slate-300">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 pb-6">
            {resumeError && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 mb-4 text-center border border-red-500/20">
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
            <p className="text-center text-xs text-slate-500 mt-3">
              Secure payment via Razorpay · Cancel anytime
            </p>
          </div>
        </div>

        {/* Data safety notice */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-300">Your data is safe</p>
            <p className="text-sm text-emerald-400/80 mt-0.5">
              All your conversations, leads, products, and settings are preserved.
              Subscribe to pick up right where you left off.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
