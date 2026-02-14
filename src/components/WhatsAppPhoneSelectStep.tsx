/**
 * WhatsApp Phone Select Step
 * CA picks a dedicated phone number from the seller's pre-registered pool.
 * No Facebook SDK or popup — pure REST API.
 */

import { useState, useEffect } from 'react';
import { saasApi } from '@/services/saasApiService';
import { CheckCircle2, Loader2, Phone, AlertCircle } from 'lucide-react';

interface PhoneOption {
  phone_number_id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
}

interface Props {
  subdomain: string;
  onSelected: (data: {
    phone_number_id: string;
    display_phone_number: string;
    verified_name: string;
  }) => void;
  primaryColor?: string;
}

export default function WhatsAppPhoneSelectStep({
  subdomain,
  onSelected,
  primaryColor = '#2563eb',
}: Props) {
  const [phones, setPhones] = useState<PhoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<PhoneOption | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPhones();
  }, [subdomain]);

  const loadPhones = async () => {
    try {
      setLoading(true);
      setError('');
      const resp = await saasApi.getAvailablePhones(subdomain);
      setPhones(resp.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load available numbers');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async () => {
    if (!selected) return;
    try {
      setSelecting(true);
      setError('');
      const resp = await saasApi.selectPhone(subdomain, selected);
      const data = resp.data;
      setAssigned(data);
      onSelected(data);
    } catch (err: any) {
      setError(err.message || 'Failed to assign phone number');
      // Reload in case it was taken
      loadPhones();
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading available numbers...</span>
      </div>
    );
  }

  // Already assigned
  if (assigned) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-900">WhatsApp Number Assigned</span>
        </div>
        <div className="text-sm text-green-800 space-y-1">
          <div>{assigned.display_phone_number}</div>
          {assigned.verified_name && (
            <div className="text-green-600">{assigned.verified_name}</div>
          )}
        </div>
      </div>
    );
  }

  if (phones.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <span className="text-sm text-amber-800">
            No phone numbers are currently available. Please contact support.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
      )}

      <p className="text-sm text-gray-500">
        Select a WhatsApp number for your business. This number will receive
        messages from your clients.
      </p>

      <div className="space-y-2">
        {phones.map((phone) => (
          <label
            key={phone.phone_number_id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selected === phone.phone_number_id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <input
              type="radio"
              name="whatsapp_phone"
              value={phone.phone_number_id}
              checked={selected === phone.phone_number_id}
              onChange={() => setSelected(phone.phone_number_id)}
              className="sr-only"
            />
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selected === phone.phone_number_id
                  ? 'border-blue-500'
                  : 'border-gray-300'
              }`}
              style={
                selected === phone.phone_number_id
                  ? { borderColor: primaryColor }
                  : undefined
              }
            >
              {selected === phone.phone_number_id && (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
            </div>
            <Phone className="w-4 h-4 text-gray-400" />
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900">
                {phone.display_phone_number}
              </div>
              {phone.verified_name && (
                <div className="text-xs text-gray-500">{phone.verified_name}</div>
              )}
            </div>
            {phone.quality_rating === 'GREEN' && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                Good
              </span>
            )}
          </label>
        ))}
      </div>

      <button
        onClick={handleSelect}
        disabled={!selected || selecting}
        className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ backgroundColor: primaryColor }}
      >
        {selecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Assigning...
          </>
        ) : (
          'Select This Number'
        )}
      </button>
    </div>
  );
}
