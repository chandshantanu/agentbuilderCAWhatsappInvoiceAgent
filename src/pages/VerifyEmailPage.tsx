/**
 * Email verification pending page.
 * Shown after signup — asks the user to check their inbox.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { useSaaS } from '@/contexts/SaaSContext';

export default function VerifyEmailPage() {
  const { config } = useSaaS();
  const { supabase, user, isAuthenticated } = useSupabaseAuth();
  const navigate = useNavigate();

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  const branding = config?.branding || {};
  const primaryColor = branding.primary_color || '#2563eb';
  const email = user?.email || '';

  // Poll for email confirmation
  useEffect(() => {
    if (!supabase) return;

    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email_confirmed_at) {
        // Refresh session to get updated JWT with confirmed email
        await supabase.auth.refreshSession();
        navigate('/checkout', { replace: true });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [supabase, navigate]);

  const handleResend = async () => {
    if (!supabase || !email) return;
    setResending(true);
    setError('');
    setResent(false);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) {
        setError(resendError.message);
      } else {
        setResent(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center">
          {/* Email icon */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <svg
              className="w-7 h-7"
              style={{ color: primaryColor }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Check your email
          </h1>
          <p className="text-sm text-gray-500 mb-1">
            We sent a verification link to
          </p>
          <p className="text-sm font-medium text-gray-900 mb-6">{email}</p>

          <p className="text-xs text-gray-400 mb-6">
            Click the link in the email to verify your account. This page will
            automatically redirect once verified.
          </p>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          {resent && (
            <div className="text-sm text-green-700 bg-green-50 rounded-lg p-3 mb-4">
              Verification email resent!
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 mb-3"
            style={{ backgroundColor: primaryColor }}
          >
            {resending ? 'Sending...' : 'Resend verification email'}
          </button>

          <p className="text-xs text-gray-400">
            Wrong email?{' '}
            <Link to="/signup" className="font-medium" style={{ color: primaryColor }}>
              Sign up again
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
