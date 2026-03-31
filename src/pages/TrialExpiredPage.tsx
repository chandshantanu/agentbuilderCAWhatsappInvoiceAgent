/**
 * Trial Expired / Subscription Ended page.
 * Shown when the user's trial or subscription has expired.
 * Provides clear messaging and a CTA to subscribe or renew.
 */

import { useState } from 'react';
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
  Tag,
  X,
} from 'lucide-react';

declare global {
  interface Window { Razorpay: any; }
}

const PLAN_META = {
  starter: { name: 'Starter', price: 999,  color: '#64748b', nextPlan: 'pro'    as const },
  pro:     { name: 'Pro',     price: 2999, color: '#7C3AED', nextPlan: 'agency' as const },
  agency:  { name: 'Agency',  price: 5999, color: '#0ea5e9', nextPlan: null               },
} as const;
type PlanKey = keyof typeof PLAN_META;

export default function TrialExpiredPage() {
  const navigate = useNavigate();
  const { config, subdomain } = useSaaS();
  const { trialExpired, expiryReason, subscriptionId, plan, refetch } = useSubscription();
  const { user } = useSupabaseAuth();
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ discount: number; final_amount: number; original_amount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Lazy-load Razorpay only when needed (avoids preload warning on every page visit)
  const loadRazorpay = (): Promise<boolean> => new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const existing = document.getElementById('razorpay-script') as HTMLScriptElement | null;
    if (existing) {
      existing.onload = () => resolve(true);
      existing.onerror = () => resolve(false);
      return;
    }
    const s = document.createElement('script');
    s.id = 'razorpay-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const agentName = config?.branding?.brand_name || config?.landing_page?.hero_title || 'Agent';
  const currency = config?.pricing?.currency || 'INR';
  const primaryColor = config?.branding?.primary_color || '#6366f1';

  const currentPlanKey: PlanKey = (plan as PlanKey) || 'pro';
  const currentPlanMeta = PLAN_META[currentPlanKey];
  const nextPlanKey = currentPlanMeta.nextPlan;
  const nextPlanMeta = nextPlanKey ? PLAN_META[nextPlanKey] : null;
  const price = currentPlanMeta.price;

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    setCouponLoading(true);
    try {
      const result = await saasApi.validateCoupon(subdomain || '', couponCode.trim().toUpperCase(), currentPlanKey);
      setCouponResult(result.data);
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
      setCouponResult(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const effectivePrice = couponResult ? couponResult.final_amount : price;

  // Resume flow: re-activates existing subscription + pod
  const handleResumeClick = async () => {
    if (!subscriptionId) {
      navigate('/checkout');
      return;
    }
    setResumeLoading(true);
    setResumeError('');
    const razorpayReady = await loadRazorpay();
    if (!razorpayReady) {
      navigate('/checkout');
      return;
    }
    try {
      const orderResp = await saasApi.createResumeOrder(
        subscriptionId,
        couponResult ? couponCode.trim().toUpperCase() : undefined
      );
      const order = orderResp.data;
      // Full coupon — backend already activated the subscription, no payment needed
      if (order.free_activation) {
        await refetch();
        navigate('/dashboard');
        return;
      }
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        order_id: order.order_id,
        name: config?.branding?.brand_name || 'Agent',
        description: `Resume ${currentPlanMeta.name} subscription`,
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

  const title = `Your ${currentPlanMeta.name} Trial Has Ended`;
  const subtitle = `Your 14-day ${currentPlanMeta.name} trial is over, but your data is safe. Subscribe to pick up right where you left off.`;

  const formatPrice = (amount: number) => {
    if (currency === 'INR') return `₹${amount.toLocaleString('en-IN')}`;
    return `$${amount}`;
  };

  // Detect agent type for correct feature list
  const agentType = (() => {
    const name = (config?.branding?.brand_name || '').toLowerCase();
    const tagline = (config?.branding?.tagline || '').toLowerCase();
    const agentId = (config?.agent_id || '').toLowerCase();
    if (name.includes('instagram') || tagline.includes('instagram') || tagline.includes('dm') || agentId.includes('instagram')) return 'instagram';
    if (name.includes('invoice') || name.includes('ca ') || tagline.includes('tally') || tagline.includes('gst')) return 'ca';
    return 'generic';
  })();

  const features = agentType === 'instagram' ? [
    { icon: MessageSquare, text: 'Unlimited AI-powered DM responses' },
    { icon: Zap, text: 'Chain-of-thought sales reasoning' },
    { icon: Users, text: 'Lead scoring & CRM dashboard' },
    { icon: BarChart3, text: 'Full analytics & conversion metrics' },
    { icon: Shield, text: 'Brand protection & quality gate' },
    { icon: Sparkles, text: 'Automated follow-ups & comment-to-DM' },
  ] : [
    { icon: MessageSquare, text: 'Unlimited WhatsApp automation' },
    { icon: Zap, text: 'Intelligent document processing' },
    { icon: Users, text: 'Client management dashboard' },
    { icon: BarChart3, text: 'Full analytics & reporting' },
    { icon: Shield, text: 'Secure data handling' },
    { icon: Sparkles, text: 'Automated reminders & follow-ups' },
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
                <p className="text-sm font-medium text-slate-400">{currentPlanMeta.name} Plan</p>
                <div className="flex items-baseline gap-1 mt-1">
                  {couponResult ? (
                    <>
                      <span className="text-4xl font-bold text-slate-100">{formatPrice(effectivePrice)}</span>
                      <span className="text-slate-500 line-through text-xl ml-1">{formatPrice(price)}</span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-slate-100">{formatPrice(price)}</span>
                  )}
                  <span className="text-slate-400">/mo</span>
                </div>
              </div>
              <div
                className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: currentPlanMeta.color }}
              >
                {currentPlanMeta.name}
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
            {/* Coupon code input */}
            <div className="mb-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponResult(null);
                      setCouponError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleValidateCoupon()}
                    placeholder="Coupon code"
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white/20"
                  />
                </div>
                <button
                  onClick={handleValidateCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/15 text-slate-300 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              </div>
              {couponError && (
                <p className="text-xs text-red-400 mt-1.5">{couponError}</p>
              )}
              {couponResult && (
                <div className="flex items-center gap-2 mt-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-emerald-400">
                    {couponResult.discount > 0
                      ? `₹${couponResult.discount.toLocaleString('en-IN')} off applied`
                      : 'Coupon applied'}
                  </p>
                  <button
                    onClick={() => { setCouponResult(null); setCouponCode(''); setCouponError(''); }}
                    className="ml-auto"
                  >
                    <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                  </button>
                </div>
              )}
            </div>
            {resumeError && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 mb-4 text-center border border-red-500/20">
                {resumeError}
              </p>
            )}
            <button
              onClick={handleResumeClick}
              disabled={resumeLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-60"
              style={{ backgroundColor: currentPlanMeta.color }}
            >
              {resumeLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
              ) : (
                <>Resume {currentPlanMeta.name} — {formatPrice(effectivePrice)}/mo<ArrowRight className="w-5 h-5" /></>
              )}
            </button>
            {nextPlanMeta && (
              <button
                onClick={() => navigate(`/checkout?plan=${nextPlanKey}`)}
                className="w-full h-10 mt-3 rounded-lg text-sm text-slate-400 hover:text-slate-200 border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
              >
                Upgrade to {nextPlanMeta.name} — {formatPrice(nextPlanMeta.price)}/mo
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
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
