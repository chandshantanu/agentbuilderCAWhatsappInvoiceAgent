/**
 * Reset Password page for SaaS mode.
 * User lands here from the email reset link.
 * Supabase restores the session from the URL hash (implicit flow).
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const { config } = useSaaS();
  const { updatePassword, session, isLoading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Password strength: 0=empty, 1=weak, 2=fair, 3=strong
  const passwordStrength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[^a-zA-Z0-9]/.test(password) || /\d/.test(password)) score++;
    return score as 0 | 1 | 2 | 3;
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][passwordStrength];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#10B981'][passwordStrength];

  const branding = config?.branding || {};
  const primaryColor = branding.primary_color || '#7C3AED';

  // Wait for recovery session from URL hash
  useEffect(() => {
    if (authLoading) return;
    if (session) {
      setSessionReady(true);
      setError('');
      return;
    }
    const timer = setTimeout(() => {
      if (!session) {
        setError('Recovery link expired or invalid. Please request a new reset link.');
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [session, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const loadingScreen = (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#070B14' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-400">Verifying recovery link...</p>
      </div>
    </div>
  );

  if (authLoading || (!sessionReady && !error)) return loadingScreen;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#070B14', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Aurora bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[10%] w-[500px] h-[500px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-10%] left-[5%] w-[400px] h-[400px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)', filter: 'blur(60px)' }} />
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
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-10 w-auto mx-auto mb-3" />
            )}
            <h1 className="text-2xl font-bold text-slate-100 tracking-[-0.02em]">Set new password</h1>
            <p className="text-sm text-slate-400 mt-1.5">Enter your new password below</p>
          </div>

          {success ? (
            <div
              className="rounded-2xl p-7 text-center"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            >
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-100 mb-2">Password updated</h2>
              <p className="text-sm text-slate-400">Redirecting to login...</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl p-7 space-y-5"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            >
              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                  {error}
                  {error.includes('expired') && (
                    <Link to="/forgot-password" className="block mt-2 font-medium underline text-red-300">
                      Request new reset link
                    </Link>
                  )}
                </div>
              )}

              {sessionReady && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 border border-white/10 bg-white/5 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
                      placeholder="At least 6 characters"
                    />
                    {password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[1, 2, 3].map((level) => (
                            <div
                              key={level}
                              className="h-1 flex-1 rounded-full transition-colors duration-200"
                              style={{
                                background: passwordStrength >= level ? strengthColor : 'rgba(255,255,255,0.1)',
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-xs mt-1" style={{ color: strengthColor }}>
                          {strengthLabel}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-white/10 bg-white/5 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
                      placeholder="Confirm your new password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99]"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Updating...</> : 'Update Password'}
                  </button>
                </>
              )}
            </form>
          )}

          <p className="text-center mt-6">
            <Link to="/login" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
