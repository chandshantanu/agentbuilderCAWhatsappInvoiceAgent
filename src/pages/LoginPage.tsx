/**
 * Login page for SaaS mode.
 * Premium design matching the landing/checkout pages.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { ArrowLeft, Loader2 } from 'lucide-react';

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
      navigate('/checkout');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200/60">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-8 w-auto" />
            )}
            <span className="font-semibold text-[17px] text-gray-900 tracking-[-0.01em]">
              {branding.brand_name || 'Welcome back'}
            </span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-gray-900 tracking-[-0.02em]">
              Welcome back
            </h1>
            <p className="text-sm text-gray-500 mt-1.5">
              Log in to your account to continue
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-7 space-y-5"
            style={{
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as any}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium hover:underline"
                  style={{ color: primary }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as any}
                placeholder="Your password"
              />
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

          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-medium hover:underline"
              style={{ color: primary }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
