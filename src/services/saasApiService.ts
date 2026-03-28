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

  // Add 15s timeout for all API calls (important for mobile/slow networks)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let resp: Response;
  try {
    resp = await fetch(`${PLATFORM_API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw new Error('Network error. Please check your connection.');
  } finally {
    clearTimeout(timeout);
  }

  // Handle 401 — session expired, redirect to login
  if (resp.status === 401) {
    setSaaSAuthToken(null);
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  // Handle 429 — rate limited
  if (resp.status === 429) {
    throw new Error('Please wait a moment before trying again.');
  }

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
  createOrder: (subdomain: string, couponCode?: string, plan?: string) =>
    apiCall('POST', `/api/v1/saas/subscribe/${subdomain}`, {
      coupon_code: couponCode || null,
      plan: plan || 'pro',
    }),

  // Verify payment
  verifyPayment: (
    subdomain: string,
    data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      plan?: string;
    },
  ) => apiCall('POST', `/api/v1/saas/subscribe/${subdomain}/verify`, data),

  // Validate coupon
  validateCoupon: (subdomain: string, couponCode: string) =>
    apiCall('POST', `/api/v1/saas/subscribe/${subdomain}/validate-coupon`, {
      coupon_code: couponCode,
    }),

  // Start cardless trial (no payment required)
  startTrial: (subdomain: string) =>
    apiCall('POST', `/api/v1/saas/start-trial/${subdomain}`),

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

  // Connect Instagram via OAuth code (Instagram Login flow) — returns preview, does NOT save
  connectInstagram: (subdomain: string, code: string, redirectUri: string) =>
    apiCall('POST', `/api/v1/saas/runtime/${subdomain}/instagram/connect`, {
      code,
      redirect_uri: redirectUri,
    }),

  // Confirm Instagram connection after user reviews the account details
  confirmInstagram: (subdomain: string, previewToken: string) =>
    apiCall('POST', `/api/v1/saas/runtime/${subdomain}/instagram/confirm`, {
      preview_token: previewToken,
    }),

  // Get Instagram connection status for a subdomain
  getInstagramStatus: (subdomain: string) =>
    apiCall('GET', `/api/v1/saas/runtime/${subdomain}/instagram/status`),

  // Disconnect Instagram account for a SaaS customer
  disconnectInstagram: (subdomain: string) =>
    apiCall('DELETE', `/api/v1/saas/runtime/${subdomain}/instagram/disconnect`),

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

  // Proxy a request to the agent runtime through the SaaS proxy
  runtimeProxy: (subdomain: string, path: string, options?: { method?: string; body?: any }) =>
    apiCall(options?.method || 'POST', `/api/v1/saas/runtime/${subdomain}/proxy${path}`, options?.body ? JSON.parse(options.body) : undefined),

  // Get Instagram token health status (🟢/🟡/🔴) for a subscription
  getInstagramTokenStatus: (subscriptionId: string) =>
    apiCall('GET', `/api/v1/instagram-oauth/token-status?subscription_id=${subscriptionId}`),

  // Create Razorpay order to resume a trial_expired subscription
  createResumeOrder: (subscriptionId: string) =>
    apiCall('POST', `/api/v1/subscriptions/create-resume-order`, { subscription_id: subscriptionId }),

  // Verify payment and reactivate a trial_expired subscription
  verifyResumePayment: (subscriptionId: string, data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => apiCall('POST', `/api/v1/subscriptions/${subscriptionId}/resume`, data),

  // Schedule account deletion with a 12-hour grace period
  deleteAccount: (subdomain: string) =>
    apiCall<{ success: boolean; deletion_scheduled_at?: string; already_scheduled?: boolean }>(
      'POST',
      `/api/v1/saas/runtime/${subdomain}/account/delete`,
    ),

  // Cancel a pending account deletion within the 12-hour grace period
  cancelDeleteAccount: (subdomain: string) =>
    apiCall<{ success: boolean; message: string }>(
      'POST',
      `/api/v1/saas/runtime/${subdomain}/account/cancel-delete`,
    ),
};
