/**
 * Forgot Password page for SaaS mode.
 * Sends a password reset email via Supabase.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { config } = useSaaS();
  const { resetPassword } = useSupabaseAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const branding = config?.branding || {};
  const primaryColor = branding.primary_color || '#7C3AED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#070B14', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Aurora bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[15%] w-[500px] h-[500px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-8 w-auto" />
            )}
            <span className="font-semibold text-[17px] text-slate-200 tracking-[-0.01em]">
              {branding.brand_name || 'Reset Password'}
            </span>
          </Link>
          <Link to="/login" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-slate-100 tracking-[-0.02em]">Reset your password</h1>
            <p className="text-sm text-slate-400 mt-1.5">Enter your email and we'll send you a reset link</p>
          </div>

          {sent ? (
            <div
              className="rounded-2xl p-7 text-center"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            >
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-100 mb-2">Check your email</h2>
              <p className="text-sm text-slate-400 mb-4">
                We sent a password reset link to <strong className="text-slate-200">{email}</strong>
              </p>
              <Link to="/login" className="text-sm font-medium text-violet-400 hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl p-7 space-y-5"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            >
              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 border border-red-500/20">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-white/10 bg-white/5 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99]"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-slate-500 mt-5">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-violet-400 hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
