/**
 * OnboardingFlow — shown when the agent is not yet configured.
 *
 * Reads configuration_schema from /config/schema and renders
 * a step-by-step wizard for the user to fill in required fields.
 */

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useConfig } from '@/config/ConfigProvider';
import type { ConfigField } from '@/config/types';

export default function OnboardingFlow() {
  const { configStatus, refetch } = useConfig();
  const [schema, setSchema] = useState<ConfigField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/config/schema')
      .then((resp) => {
        const fields = resp.data?.configuration_schema?.required_fields || [];
        setSchema(fields);
      })
      .catch((err) => console.error('Failed to load schema:', err));
  }, []);

  const missingFields = configStatus?.missing_fields || schema;
  const field = missingFields[currentStep];

  const handleSaveField = async () => {
    if (!field) return;
    const value = values[field.key];
    if (!value) {
      setError(`${field.label} is required`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/config/update', { [field.key]: value });

      if (currentStep < missingFields.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        // All fields filled, mark as configured
        await apiClient.post('/config/complete');
        await refetch();
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  if (missingFields.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {missingFields.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i <= currentStep ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
          Step {currentStep + 1} of {missingFields.length}
        </p>

        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          {field?.label || 'Setup'}
        </h2>

        {field?.setup_type === 'oauth' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This step requires connecting to an external service.
              Please use the configuration panel for OAuth setup.
            </p>
            <input
              type="text"
              value={values[field.key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              placeholder={`Enter ${field.label}...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        ) : (
          <input
            type={field?.sensitive ? 'password' : 'text'}
            value={values[field?.key || ''] || ''}
            onChange={(e) =>
              setValues((v) => ({ ...v, [field?.key || '']: e.target.value }))
            }
            placeholder={`Enter ${field?.label || ''}...`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Back
          </button>
          <button
            onClick={handleSaveField}
            disabled={submitting}
            className="px-6 py-2 bg-primary text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting
              ? 'Saving...'
              : currentStep === missingFields.length - 1
                ? 'Complete Setup'
                : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
