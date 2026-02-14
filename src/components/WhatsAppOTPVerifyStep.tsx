/**
 * WhatsApp OTP Verify Step
 * CA enters their own phone number, receives SMS OTP from Meta, and verifies.
 * State machine: input -> sending -> otp_sent -> verifying -> verified
 */

import { useState, useRef, useEffect } from 'react';
import { saasApi } from '@/services/saasApiService';
import {
  CheckCircle2,
  Loader2,
  Phone,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

type FlowState = 'input' | 'sending' | 'otp_sent' | 'verifying' | 'verified';

interface Props {
  subdomain: string;
  onVerified: (data: {
    phone_number_id: string;
    display_phone_number: string;
    verified_name: string;
  }) => void;
  primaryColor?: string;
}

const COUNTRY_CODES = [
  { code: '91', label: 'India (+91)' },
  { code: '1', label: 'US (+1)' },
  { code: '44', label: 'UK (+44)' },
  { code: '971', label: 'UAE (+971)' },
  { code: '65', label: 'Singapore (+65)' },
  { code: '61', label: 'Australia (+61)' },
  { code: '86', label: 'China (+86)' },
  { code: '81', label: 'Japan (+81)' },
  { code: '49', label: 'Germany (+49)' },
  { code: '33', label: 'France (+33)' },
];

export default function WhatsAppOTPVerifyStep({
  subdomain,
  onVerified,
  primaryColor = '#2563eb',
}: Props) {
  const [state, setState] = useState<FlowState>('input');
  const [countryCode, setCountryCode] = useState('91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifiedData, setVerifiedData] = useState<{
    phone_number_id: string;
    display_phone_number: string;
    verified_name: string;
  } | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleRequestCode = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      setError('Please enter a valid phone number');
      return;
    }
    if (!businessName.trim()) {
      setError('Please enter your business name');
      return;
    }

    setError('');
    setState('sending');

    try {
      const resp = await saasApi.requestPhoneOTP(subdomain, {
        phone_number: cleanPhone,
        country_code: countryCode,
        verified_name: businessName.trim(),
      });
      setPhoneNumberId(resp.data.phone_number_id);
      setState('otp_sent');
      setResendCooldown(60);
      // Focus first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
      setState('input');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setState('sending');
    setOtpDigits(['', '', '', '', '', '']);

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const resp = await saasApi.requestPhoneOTP(subdomain, {
        phone_number: cleanPhone,
        country_code: countryCode,
        verified_name: businessName.trim(),
      });
      setPhoneNumberId(resp.data.phone_number_id);
      setState('otp_sent');
      setResendCooldown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
      setState('otp_sent');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length && i < 6; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    const nextEmpty = newDigits.findIndex((d) => !d);
    const focusIdx = nextEmpty === -1 ? 5 : nextEmpty;
    otpRefs.current[focusIdx]?.focus();
  };

  const handleVerify = async () => {
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    setState('verifying');

    try {
      const resp = await saasApi.verifyPhoneOTP(subdomain, {
        phone_number_id: phoneNumberId,
        code,
      });
      setVerifiedData(resp.data);
      setState('verified');
      onVerified(resp.data);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setState('otp_sent');
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  };

  // Verified state
  if (state === 'verified' && verifiedData) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-900">
            Phone Number Verified
          </span>
        </div>
        <div className="text-sm text-green-800 space-y-1">
          <div>{verifiedData.display_phone_number}</div>
          {verifiedData.verified_name && (
            <div className="text-green-600">{verifiedData.verified_name}</div>
          )}
        </div>
      </div>
    );
  }

  // Sending / Verifying spinner
  if (state === 'sending' || state === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: primaryColor }} />
        <span className="text-sm text-gray-500">
          {state === 'sending' ? 'Sending verification code...' : 'Verifying...'}
        </span>
      </div>
    );
  }

  // OTP entry state
  if (state === 'otp_sent') {
    return (
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">
            Enter the 6-digit code sent to
          </p>
          <p className="font-medium text-gray-900">
            +{countryCode} {phoneNumber}
          </p>
        </div>

        {/* OTP inputs */}
        <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
          {otpDigits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { otpRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className="w-11 h-12 text-center text-lg font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={otpDigits.some((d) => !d)}
          className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          Verify
        </button>

        {/* Resend + change number */}
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => {
              setState('input');
              setError('');
              setOtpDigits(['', '', '', '', '', '']);
            }}
            className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Change number
          </button>
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="disabled:text-gray-400"
            style={{ color: resendCooldown > 0 ? undefined : primaryColor }}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    );
  }

  // Input state (default)
  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <p className="text-sm text-gray-500">
        Enter your phone number to receive a verification code via SMS.
        This number will be registered for WhatsApp Business messaging.
      </p>

      {/* Country code + phone */}
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="w-36 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {COUNTRY_CODES.map((cc) => (
            <option key={cc.code} value={cc.code}>
              {cc.label}
            </option>
          ))}
        </select>
        <div className="flex-1 relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="8700746556"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Business name */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Business Display Name
        </label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. Sharma Tax Consultants"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          This name will appear on your WhatsApp Business profile.
        </p>
      </div>

      {/* Send code button */}
      <button
        onClick={handleRequestCode}
        className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2"
        style={{ backgroundColor: primaryColor }}
      >
        Send Verification Code
      </button>
    </div>
  );
}
