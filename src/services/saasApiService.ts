/**
 * SaaS API service — handles CA-facing API calls to core-api.
 * Used in SaaS mode for subscription, payment, and config operations.
 */

const PLATFORM_API_URL =
  (import.meta.env.VITE_PLATFORM_API_URL as string) || 'https://agentsapi.chatslytics.com';

function getToken(): string | null {
  // In SaaS mode, we use the Supabase session token
  // This is set by the SupabaseAuthContext
  return (window as any).__SAAS_AUTH_TOKEN__ || null;
}

export function setSaaSAuthToken(token: string | null) {
  (window as any).__SAAS_AUTH_TOKEN__ = token;
}

async function apiCall<T = any>(
  method: string,
  path: string,
  body?: any,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resp = await fetch(`${PLATFORM_API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.detail || data.message || `API error ${resp.status}`);
  }
  return data;
}

export const saasApi = {
  // Get public config for subdomain
  getConfig: (subdomain: string) =>
    apiCall('GET', `/api/v1/saas/config/${subdomain}`),

  // Create Razorpay order
  createOrder: (subdomain: string, couponCode?: string) =>
    apiCall('POST', `/api/v1/saas/subscribe/${subdomain}`, {
      coupon_code: couponCode || null,
    }),

  // Verify payment
  verifyPayment: (
    subdomain: string,
    data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ) => apiCall('POST', `/api/v1/saas/subscribe/${subdomain}/verify`, data),

  // Validate coupon
  validateCoupon: (subdomain: string, couponCode: string) =>
    apiCall('POST', `/api/v1/saas/subscribe/${subdomain}/validate-coupon`, {
      coupon_code: couponCode,
    }),

  // Get subscription status
  getSubscription: (subdomain: string) =>
    apiCall('GET', `/api/v1/saas/my-subscription/${subdomain}`),

  // Get config status (is WhatsApp connected etc.)
  getConfigStatus: (subdomain: string) =>
    apiCall('GET', `/api/v1/saas/runtime/${subdomain}/config/status`),

  // Get dashboard config
  getDashboardConfig: (subdomain: string) =>
    apiCall('GET', `/api/v1/saas/runtime/${subdomain}/config/dashboard`),

  // Update CA config
  updateConfig: (subdomain: string, configuration: Record<string, any>) =>
    apiCall('POST', `/api/v1/saas/runtime/${subdomain}/config/update`, {
      configuration,
    }),

  // Mark config complete
  completeConfig: (subdomain: string) =>
    apiCall('POST', `/api/v1/saas/runtime/${subdomain}/config/complete`),

  // Exchange WhatsApp Embedded Signup auth code for credentials
  exchangeWhatsAppCode: (subscriptionId: string, code: string) =>
    apiCall('POST', `/api/v1/whatsapp/embedded-signup/exchange-code`, {
      code,
      subscription_id: subscriptionId,
    }),

  // Get WhatsApp connection status for a subdomain
  getWhatsAppStatus: (subdomain: string) =>
    apiCall('GET', `/api/v1/saas/runtime/${subdomain}/whatsapp/status`),

  // Connect Instagram via OAuth code (Instagram Login flow)
  connectInstagram: (subdomain: string, code: string, redirectUri: string) =>
    apiCall('POST', `/api/v1/saas/runtime/${subdomain}/instagram/connect`, {
      code,
      redirect_uri: redirectUri,
    }),

  // Get Instagram connection status for a subdomain
  getInstagramStatus: (subdomain: string) =>
    apiCall('GET', `/api/v1/saas/runtime/${subdomain}/instagram/status`),

  // Get available phones from seller's pool for CA to select
  getAvailablePhones: (subdomain: string) =>
    apiCall<{ success: boolean; data: Array<{
      phone_number_id: string;
      display_phone_number: string;
      verified_name: string;
      quality_rating: string;
    }> }>('GET', `/api/v1/saas/runtime/${subdomain}/whatsapp/available-phones`),

  // CA selects a phone number from the seller's pool
  selectPhone: (subdomain: string, phoneNumberId: string) =>
    apiCall('POST', `/api/v1/saas/runtime/${subdomain}/whatsapp/select-phone`, {
      phone_number_id: phoneNumberId,
    }),

  // Request phone registration on seller's WABA + SMS code
  requestPhoneOTP: (
    subdomain: string,
    data: { phone_number: string; country_code: string; verified_name: string },
  ) =>
    apiCall<{
      success: boolean;
      data: {
        phone_number_id: string;
        message: string;
        already_verified?: boolean;
        display_phone_number?: string;
        verified_name?: string;
      };
    }>(
      'POST',
      `/api/v1/saas/runtime/${subdomain}/whatsapp/request-code`,
      data,
    ),

  // Verify SMS code with Meta + register for Cloud API
  verifyPhoneOTP: (
    subdomain: string,
    data: { code: string },
  ) =>
    apiCall<{
      success: boolean;
      data: {
        phone_number_id?: string;
        display_phone_number: string;
        verified_name: string;
      };
    }>('POST', `/api/v1/saas/runtime/${subdomain}/whatsapp/verify-code`, data),
};
