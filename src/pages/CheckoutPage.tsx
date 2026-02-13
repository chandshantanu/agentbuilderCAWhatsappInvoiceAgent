/**
 * Checkout page for SaaS mode.
 * Shows pricing summary and launches Razorpay checkout.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { saasApi } from '@/services/saasApiService';
import { Shield, Check } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const { config, subdomain } = useSaaS();
  const { user } = useSupabaseAuth();
  const { hasSubscription, refetch } = useSubscription();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already subscribed
  useEffect(() => {
    if (hasSubscription) {
      navigate('/onboarding');
    }
  }, [hasSubscription, navigate]);

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

  const { branding, pricing } = config;
  const primaryColor = branding.primary_color || '#2563eb';
  const amount = couponResult ? couponResult.final_amount : pricing.monthly_price;
  const currency = pricing.currency || 'INR';
  const currencySymbol = currency === 'INR' ? '\u20B9' : '$';

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    try {
      const result = await saasApi.validateCoupon(subdomain, couponCode.trim());
      setCouponResult(result.data);
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon');
      setCouponResult(null);
    }
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
          color: primaryColor,
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {branding.logo_url && (
            <img
              src={branding.logo_url}
              alt=""
              className="h-10 w-auto mx-auto mb-3"
            />
          )}
          <h1 className="text-xl font-semibold text-gray-900">
            Subscribe to {branding.brand_name || subdomain}
          </h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Pricing summary */}
          <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Monthly plan</span>
              <span className="font-medium text-gray-900">
                {currencySymbol}{pricing.display_price || pricing.monthly_price}
              </span>
            </div>
            {couponResult && (
              <div className="flex justify-between items-center text-green-600 text-sm">
                <span>Coupon discount</span>
                <span>-{currencySymbol}{couponResult.discount}</span>
              </div>
            )}
            <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center">
              <span className="font-medium text-gray-900">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {currencySymbol}{amount}
              </span>
            </div>
            {pricing.trial_days > 0 && (
              <p className="text-xs text-green-600 mt-2">
                Includes {pricing.trial_days}-day free trial
              </p>
            )}
          </div>

          {/* Coupon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Have a coupon?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter code"
              />
              <button
                onClick={handleValidateCoupon}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Apply
              </button>
            </div>
            {couponError && (
              <p className="text-xs text-red-500 mt-1">{couponError}</p>
            )}
            {couponResult && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" /> Coupon applied
              </p>
            )}
          </div>

          {/* Checkout button */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Pay {currencySymbol}{amount}/month
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Secure payment powered by Razorpay. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
