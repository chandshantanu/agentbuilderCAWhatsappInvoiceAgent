/**
 * Reset Password page for SaaS mode.
 * User lands here from the email reset link.
 * Supabase restores the session from the URL hash (implicit flow).
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';

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

  const branding = config?.branding || {};
  const primaryColor = branding.primary_color || '#2563eb';

  // Wait for recovery session from URL hash
  // Supabase processes the hash fragment asynchronously via onAuthStateChange.
  // getSession() may return null initially — wait for the PASSWORD_RECOVERY event.
  useEffect(() => {
    if (authLoading) return;
    if (session) {
      setSessionReady(true);
      setError('');
      return;
    }
    // Give Supabase enough time to process the hash fragment
    // (config fetch + createClient + hash processing can take several seconds)
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

  // Show loading while waiting for session
  if (authLoading || (!sessionReady && !error)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Verifying recovery link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {branding.logo_url && (
            <img src={branding.logo_url} alt="" className="h-10 w-auto mx-auto mb-3" />
          )}
          <h1 className="text-xl font-semibold text-gray-900">
            Set new password
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter your new password below
          </p>
        </div>

        {success ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Password updated</h2>
            <p className="text-sm text-gray-500">
              Redirecting to login...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4"
          >
            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                {error}
                {error.includes('expired') && (
                  <Link
                    to="/forgot-password"
                    className="block mt-2 font-medium underline"
                  >
                    Request new reset link
                  </Link>
                )}
              </div>
            )}

            {sessionReady && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm your new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </>
            )}
          </form>
        )}

        <p className="text-center mt-6">
          <Link to="/login" className="text-sm text-gray-400 hover:text-gray-600">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
