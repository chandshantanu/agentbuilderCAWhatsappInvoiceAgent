/**
 * Email verification pending page.
 * Shown after signup — asks the user to check their inbox.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { useSaaS } from '@/contexts/SaaSContext';
import { Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const { config } = useSaaS();
  const { supabase, user, isAuthenticated } = useSupabaseAuth();
  const navigate = useNavigate();

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const [timedOut, setTimedOut] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const branding = config?.branding || {};
  const primaryColor = branding.primary_color || '#7C3AED';
  const email = user?.email || '';

  // Poll for email confirmation (max 5 minutes)
  useEffect(() => {
    if (!supabase) return;

    const startTime = Date.now();
    const maxWait = 5 * 60 * 1000; // 5 minutes

    const interval = setInterval(async () => {
      if (Date.now() - startTime > maxWait) {
        clearInterval(interval);
        setTimedOut(true);
        return;
      }
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user?.email_confirmed_at) {
          clearInterval(interval);
          await supabase.auth.refreshSession();
          navigate('/onboarding', { replace: true });
        }
      } catch {
        // Network error during poll — continue
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [supabase, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!supabase || !email || resendCooldown > 0) return;
    setResending(true);
    setError('');
    setResent(false);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) {
        if (resendError.message.includes('rate') || resendError.status === 429) {
          setError('Please wait a moment before trying again.');
        } else {
          setError(resendError.message);
        }
      } else {
        setResent(true);
        setResendCooldown(60); // 60-second cooldown
        setTimedOut(false); // Reset timeout if they resend
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#070B14', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Aurora bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-[60px] flex items-center">
          <Link to="/" className="flex items-center gap-3">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-8 w-auto" />
            )}
            <span className="font-semibold text-[17px] text-slate-200 tracking-[-0.01em]">
              {branding.brand_name || 'Verify Email'}
            </span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          >
            {/* Email icon */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: `${primaryColor}20` }}
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

            <h1 className="text-xl font-semibold text-slate-100 mb-2">
              Check your email
            </h1>
            <p className="text-sm text-slate-400 mb-1">
              We sent a verification link to
            </p>
            <p className="text-sm font-medium text-slate-200 mb-6">{email}</p>

            <p className="text-xs text-slate-500 mb-6">
              Click the link in the email to verify your account. This page will
              automatically redirect once verified.
            </p>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 mb-4 border border-red-500/20">
                {error}
              </div>
            )}

            {timedOut && (
              <div className="text-sm text-yellow-400 bg-yellow-500/10 rounded-lg p-3 mb-4 border border-yellow-500/20">
                Verification link may have expired. Try resending the email.
              </div>
            )}

            {resent && (
              <div className="text-sm text-emerald-400 bg-emerald-500/10 rounded-lg p-3 mb-4 border border-emerald-500/20">
                Verification email resent!
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="w-full h-11 rounded-xl text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 mb-3 transition-all hover:opacity-90 active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
            >
              {resending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend verification email'
              )}
            </button>

            <p className="text-xs text-slate-500">
              Wrong email?{' '}
              <Link to="/signup" className="font-medium text-violet-400 hover:underline">
                Sign up again
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
