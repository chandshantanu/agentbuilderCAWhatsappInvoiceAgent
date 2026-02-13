/**
 * FormWidget — dynamic form rendered from a schema.
 *
 * Used for onboarding steps where the user fills in config values.
 *
 * Config:
 *   fields: Array<{key, label, type?, placeholder?, required?}>
 *   submitEndpoint: string — POST endpoint to save form data
 *   submitLabel: string — button text (default: "Save")
 */

import { useState } from 'react';
import { apiClient } from '@/lib/apiClient';

interface FormField {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'email' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
}

interface FormWidgetProps {
  config: {
    fields?: FormField[];
    submitEndpoint?: string;
    submitLabel?: string;
    onSuccess?: () => void;
  };
}

export default function FormWidget({ config }: FormWidgetProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = config.fields || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.submitEndpoint) return;

    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(config.submitEndpoint, values);
      setSuccess(true);
      config.onSuccess?.();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700 text-sm">
        Configuration saved successfully.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              value={values[field.key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              required={field.required}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          ) : field.type === 'select' ? (
            <select
              value={values[field.key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              required={field.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type || 'text'}
              value={values[field.key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? 'Saving...' : config.submitLabel || 'Save'}
      </button>
    </form>
  );
}
