/**
 * Forgot Password page for SaaS mode.
 * Sends a password reset email via Supabase.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';

export default function ForgotPasswordPage() {
  const { config } = useSaaS();
  const { resetPassword } = useSupabaseAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const branding = config?.branding || {};
  const primaryColor = branding.primary_color || '#2563eb';

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          {branding.logo_url && (
            <img src={branding.logo_url} alt="" className="h-10 w-auto mx-auto mb-3" />
          )}
          <h1 className="text-xl font-semibold text-gray-900">
            Reset your password
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {sent ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-500 mb-4">
              We sent a password reset link to <strong>{email}</strong>
            </p>
            <Link
              to="/login"
              className="text-sm font-medium"
              style={{ color: primaryColor }}
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4"
          >
            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          Remember your password?{' '}
          <Link to="/login" className="font-medium" style={{ color: primaryColor }}>
            Log in
          </Link>
        </p>

        <p className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
