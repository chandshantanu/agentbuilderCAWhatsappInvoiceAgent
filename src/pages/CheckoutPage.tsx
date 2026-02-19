/**
 * Checkout page for SaaS mode.
 * Premium design matching the landing page aesthetic.
 * Shows pricing, features, coupon input, and Razorpay checkout.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { saasApi } from '@/services/saasApiService';
import {
  Shield,
  Check,
  Tag,
  ArrowLeft,
  Sparkles,
  Lock,
  CreditCard,
  Loader2,
  X,
  Zap,
  BarChart3,
  FileText,
  Users,
  Clock,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function lightenColor(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const FEATURE_ICONS = [Zap, Shield, BarChart3, FileText, Users, Clock];

export default function CheckoutPage() {
  const { config, subdomain } = useSaaS();
  const { user } = useSupabaseAuth();
  const { hasSubscription, refetch } = useSubscription();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const couponAutoApplied = useRef(false);

  // Redirect if already subscribed
  useEffect(() => {
    if (hasSubscription) {
      navigate('/onboarding');
    }
  }, [hasSubscription, navigate]);

  // Auto-fill and validate coupon from ?coupon= URL param
  useEffect(() => {
    if (couponAutoApplied.current) return;
    const urlCoupon = searchParams.get('coupon');
    if (urlCoupon && subdomain && !couponCode) {
      couponAutoApplied.current = true;
      const code = urlCoupon.toUpperCase();
      setCouponCode(code);
      setCouponLoading(true);
      saasApi.validateCoupon(subdomain, code)
        .then((result) => setCouponResult(result.data))
        .catch((err: any) => setCouponError(err.message || 'Invalid coupon'))
        .finally(() => setCouponLoading(false));
    }
  }, [searchParams, subdomain, couponCode]);

  // Load Razorpay script
  useEffect(() => {
    if (document.getElementById('razorpay-script')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  if (!config || !subdomain) return null;

  const { branding, pricing, landing_page } = config;
  const primary = branding.primary_color || '#2563eb';
  const rgb = hexToRgb(primary);
  const amount = couponResult ? couponResult.final_amount : pricing.monthly_price;
  const currency = pricing.currency || 'INR';
  const currencySymbol = currency === 'INR' ? '\u20B9' : '$';
  const displayPrice = pricing.display_price || pricing.monthly_price;
  const features: Array<{ title: string; description: string }> =
    landing_page?.features || [];
  const discount = couponResult ? couponResult.discount : 0;

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    setCouponLoading(true);
    try {
      const result = await saasApi.validateCoupon(subdomain, couponCode.trim());
      setCouponResult(result.data);
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon');
      setCouponResult(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponResult(null);
    setCouponError('');
    couponAutoApplied.current = false;
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      const orderResp = await saasApi.createOrder(
        subdomain,
        couponResult ? couponCode : undefined,
      );
      const order = orderResp.data;

      const options = {
        key: order.key_id,
        amount: order.amount * 100,
        currency: order.currency,
        name: order.brand_name || branding.brand_name || subdomain,
        description: 'Monthly Subscription',
        order_id: order.order_id,
        prefill: {
          email: user?.email || '',
        },
        theme: {
          color: primary,
        },
        handler: async (response: any) => {
          try {
            await saasApi.verifyPayment(subdomain, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await refetch();
            navigate('/onboarding');
          } catch (err: any) {
            setError(err.message || 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200/60">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-8 w-auto" />
            )}
            <span className="font-semibold text-[17px] text-gray-900 tracking-[-0.01em]">
              {branding.brand_name || subdomain}
            </span>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">

          {/* Left: Features + trust signals */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">
              What's included
            </h2>
            <div className="space-y-4">
              {(features.length > 0 ? features : [
                { title: 'AI-Powered Automation', description: 'Smart conversations that convert' },
                { title: '24/7 Availability', description: 'Never miss a lead again' },
                { title: 'Analytics Dashboard', description: 'Track performance in real-time' },
              ]).slice(0, 6).map((f, i) => {
                const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: `rgba(${rgb}, 0.08)` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: primary }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{f.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trust signals */}
            <div className="mt-8 pt-6 border-t border-gray-200 space-y-3">
              <div className="flex items-center gap-2.5 text-sm text-gray-500">
                <Lock className="w-4 h-4" />
                <span>256-bit SSL encrypted payments</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-500">
                <CreditCard className="w-4 h-4" />
                <span>Powered by Razorpay — PCI DSS compliant</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-500">
                <Shield className="w-4 h-4" />
                <span>Cancel anytime — no questions asked</span>
              </div>
            </div>
          </div>

          {/* Right: Pricing card + checkout */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div
              className="relative bg-white rounded-2xl p-7 sm:p-8"
              style={{
                border: `1.5px solid rgba(${rgb}, 0.15)`,
                boxShadow: `0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(${rgb}, 0.06)`,
              }}
            >
              {/* Trial badge */}
              {pricing.trial_days > 0 && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 h-[26px] px-4 rounded-full text-xs font-semibold text-white flex items-center gap-1 shadow-md"
                  style={{
                    backgroundColor: primary,
                    boxShadow: `0 2px 12px rgba(${rgb}, 0.4)`,
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  {pricing.trial_days}-day free trial
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-5 flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Plan info */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-2">Monthly subscription</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-lg font-medium text-gray-400">{currencySymbol}</span>
                  <span className="text-5xl font-extrabold text-gray-900 tracking-tight leading-none">
                    {displayPrice}
                  </span>
                  <span className="text-gray-400 text-base font-medium">/mo</span>
                </div>
                {user?.email && (
                  <p className="text-xs text-gray-400 mt-2">
                    for {user.email}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 mb-6" />

              {/* Pricing breakdown */}
              <div
                className="rounded-xl p-4 mb-5 space-y-2.5"
                style={{ backgroundColor: `rgba(${rgb}, 0.03)` }}
              >
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Monthly plan</span>
                  <span className="font-medium text-gray-900">
                    {currencySymbol}{displayPrice}
                  </span>
                </div>
                {couponResult && (
                  <div className="flex justify-between items-center text-sm text-emerald-600">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Coupon ({couponCode})
                    </span>
                    <span className="font-medium">-{currencySymbol}{discount}</span>
                  </div>
                )}
                <div className="border-t border-gray-200/60 pt-2.5 flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total due today</span>
                  <span
                    className="text-xl font-bold"
                    style={{ color: couponResult ? '#059669' : primary }}
                  >
                    {currencySymbol}{amount}
                  </span>
                </div>
              </div>

              {/* Coupon section */}
              {couponResult ? (
                <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-4 py-3 mb-5">
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <Check className="w-4 h-4" />
                    <span className="font-medium">{couponCode}</span> applied — you save {currencySymbol}{discount}
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-emerald-600 hover:text-emerald-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="mb-5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          if (couponError) setCouponError('');
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleValidateCoupon()}
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                        style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as any}
                        placeholder="Coupon code"
                      />
                    </div>
                    <button
                      onClick={handleValidateCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-5 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {couponLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <X className="w-3 h-3" /> {couponError}
                    </p>
                  )}
                </div>
              )}

              {/* Checkout button */}
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full h-[52px] rounded-xl text-white font-semibold text-[15px] disabled:opacity-50 flex items-center justify-center gap-2.5 transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.99]"
                style={{
                  background: `linear-gradient(135deg, ${primary}, ${lightenColor(primary, 0.12)})`,
                  boxShadow: `0 4px 16px rgba(${rgb}, 0.3)`,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Pay {currencySymbol}{amount}/month
                  </>
                )}
              </button>

              <p className="text-xs text-gray-400 text-center mt-4">
                Secure payment powered by Razorpay. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
