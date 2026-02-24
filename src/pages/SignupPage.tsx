/**
 * Signup page for SaaS mode.
 * Premium design matching the login/checkout pages.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { ArrowLeft, Loader2, Check } from 'lucide-react';

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

export default function SignupPage() {
  const { config } = useSaaS();
  const { signUp } = useSupabaseAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const branding = config?.branding || {};
  const primary = branding.primary_color || '#2563eb';
  const rgb = hexToRgb(primary);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, fullName);
      navigate('/verify-email');
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = password.length >= 8 ? 'strong' : password.length >= 6 ? 'ok' : 'weak';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#070B14', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Aurora bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[10%] w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-10%] left-[5%] w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>
      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-8 w-auto" />
            )}
            <span className="font-semibold text-[17px] text-slate-200 tracking-[-0.01em]">
              {branding.brand_name || 'Get Started'}
            </span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-slate-100 tracking-[-0.02em]">Create your account</h1>
            <p className="text-sm text-slate-400 mt-1.5">Get started with {branding.brand_name || 'us'} in minutes</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl p-7 space-y-5"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          >
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 border border-red-500/20">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-white/10 bg-white/5 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
                placeholder="Your full name"
              />
            </div>

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

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
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
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: passwordStrength === 'strong' ? '100%' : passwordStrength === 'ok' ? '60%' : '30%',
                        backgroundColor: passwordStrength === 'strong' ? '#34d399' : passwordStrength === 'ok' ? '#fbbf24' : '#f87171',
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {passwordStrength === 'strong' ? 'Strong' : passwordStrength === 'ok' ? 'OK' : 'Weak'}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</> : 'Create Account'}
            </button>

            <p className="text-xs text-slate-500 text-center">By signing up, you agree to our terms of service</p>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-violet-400 hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
