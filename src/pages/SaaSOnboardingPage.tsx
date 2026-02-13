/**
 * SaaS Onboarding Page.
 * After payment, guides the CA through agent configuration
 * (e.g. connecting WhatsApp via Embedded Signup).
 *
 * Reuses the existing OnboardingFlow component but in SaaS context,
 * calling the SaaS runtime proxy instead of the direct runtime API.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSubscription } from '@/hooks/useSubscription';
import { saasApi } from '@/services/saasApiService';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

interface ConfigField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
  options?: Array<{ label: string; value: string }>;
}

export default function SaaSOnboardingPage() {
  const { config, subdomain } = useSaaS();
  const { isConfigured, refetch } = useSubscription();
  const navigate = useNavigate();

  const [fields, setFields] = useState<ConfigField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already configured
  useEffect(() => {
    if (isConfigured) {
      navigate('/dashboard');
    }
  }, [isConfigured, navigate]);

  // Load configuration schema
  useEffect(() => {
    if (!config || !subdomain) return;

    const schema = config.configuration_schema;
    if (schema?.required_fields) {
      setFields(schema.required_fields);
    } else {
      // Default: WhatsApp-only onboarding
      setFields([
        {
          key: 'whatsapp_business_name',
          label: 'Business Name',
          type: 'text',
          placeholder: 'e.g. Sharma Tax Consultants',
          required: true,
          description: 'Your business name as it appears to clients',
        },
        {
          key: 'whatsapp_phone',
          label: 'WhatsApp Business Number',
          type: 'text',
          placeholder: '+91 9876543210',
          required: true,
          description: 'The phone number connected to WhatsApp Business',
        },
      ]);
    }
    setLoading(false);
  }, [config, subdomain]);

  if (!config || !subdomain) return null;

  const branding = config.branding || {};
  const primaryColor = branding.primary_color || '#2563eb';
  const totalSteps = fields.length;
  const currentField = fields[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = async () => {
    if (!currentField) return;

    const value = values[currentField.key]?.trim();
    if (currentField.required && !value) {
      setError(`${currentField.label} is required`);
      return;
    }

    setError('');

    if (isLastStep) {
      // Save all config and mark complete
      setSaving(true);
      try {
        await saasApi.updateConfig(subdomain, values);
        await saasApi.completeConfig(subdomain);
        await refetch();
        navigate('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Failed to save configuration');
      } finally {
        setSaving(false);
      }
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setError('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (totalSteps === 0) {
    // No configuration needed, auto-complete
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            All set!
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Your agent is ready to use.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 rounded-lg text-white font-medium"
            style={{ backgroundColor: primaryColor }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / totalSteps) * 100}%`,
                backgroundColor: primaryColor,
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {currentField.label}
          </h2>
          {currentField.description && (
            <p className="text-sm text-gray-500 mb-4">
              {currentField.description}
            </p>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          {/* Field input */}
          {currentField.type === 'select' && currentField.options ? (
            <select
              value={values[currentField.key] || ''}
              onChange={(e) =>
                setValues((v) => ({ ...v, [currentField.key]: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              {currentField.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : currentField.type === 'textarea' ? (
            <textarea
              value={values[currentField.key] || ''}
              onChange={(e) =>
                setValues((v) => ({ ...v, [currentField.key]: e.target.value }))
              }
              placeholder={currentField.placeholder}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <input
              type={currentField.type || 'text'}
              value={values[currentField.key] || ''}
              onChange={(e) =>
                setValues((v) => ({ ...v, [currentField.key]: e.target.value }))
              }
              placeholder={currentField.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-6">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : isLastStep ? (
                <>
                  Complete Setup <CheckCircle2 className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
