/**
 * Login page for SaaS mode.
 * Premium design matching the landing/checkout pages.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.substring(0, 2), 16)}, ${parseInt(h.substring(2, 4), 16)}, ${parseInt(h.substring(4, 6), 16)}`;
}

function lightenColor(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function LoginPage() {
  const { config } = useSaaS();
  const { signIn } = useSupabaseAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const branding = config?.branding || {};
  const primary = branding.primary_color || '#2563eb';
  const rgb = hexToRgb(primary);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      // Route to dashboard — RequireConfigured guard will redirect to
      // /checkout or /onboarding if needed, so this works for all states.
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#070B14', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Aurora bg blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>
      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-8 w-auto" />
            )}
            <span className="font-semibold text-[17px] text-slate-200 tracking-[-0.01em]">
              {branding.brand_name || 'Welcome back'}
            </span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-slate-100 tracking-[-0.02em]">
              Welcome back
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">
              Log in to your account to continue
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl p-7 space-y-5"
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-white/10 bg-white/5 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-400">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium hover:underline text-violet-400"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-11 border border-white/10 bg-white/5 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-300 hover:brightness-105 hover:shadow-md active:scale-[0.99]"
              style={{
                background: `linear-gradient(135deg, ${primary}, ${lightenColor(primary, 0.12)})`,
                boxShadow: `0 2px 8px rgba(${rgb}, 0.25)`,
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-violet-400 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
