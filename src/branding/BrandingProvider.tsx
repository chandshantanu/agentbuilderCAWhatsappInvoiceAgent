/**
 * BrandingProvider — applies BrandingConfig as CSS custom properties.
 *
 * Adapted from portal-templates/instagram-dm-portal/frontend/src/hooks/useBranding.tsx
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useConfig } from '@/config/ConfigProvider';
import type { BrandingConfig } from '@/config/types';

interface BrandingState {
  branding: BrandingConfig;
  showPoweredBy: boolean;
}

const defaultBranding: BrandingConfig = {
  brand_name: 'Agent Dashboard',
  primary_color: '#8B5CF6',
  secondary_color: '#6366F1',
  background_color: '#FFFFFF',
  text_color: '#1F2937',
  font_family: 'Inter',
  show_powered_by: true,
};

const BrandingContext = createContext<BrandingState>({
  branding: defaultBranding,
  showPoweredBy: true,
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { dashboardConfig } = useConfig();
  const branding = { ...defaultBranding, ...dashboardConfig?.branding };

  useEffect(() => {
    const root = document.documentElement;

    if (branding.primary_color) root.style.setProperty('--color-primary', branding.primary_color);
    if (branding.secondary_color) root.style.setProperty('--color-secondary', branding.secondary_color);
    if (branding.background_color) root.style.setProperty('--color-background', branding.background_color);
    if (branding.text_color) root.style.setProperty('--color-text', branding.text_color);
    if (branding.font_family) root.style.setProperty('--font-family', branding.font_family);

    // Derived tokens — set defaults if branding doesn't override
    if (!branding.custom_css?.includes('--color-border')) {
      root.style.setProperty('--color-border', '#E5E7EB');
    }
    if (!branding.custom_css?.includes('--color-surface-raised')) {
      root.style.setProperty('--color-surface-raised', '#F9FAFB');
    }

    if (branding.brand_name) document.title = branding.brand_name;

    if (branding.favicon_url) {
      const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (favicon) favicon.href = branding.favicon_url;
    }

    // Inject custom CSS (sanitized — no <script> tags)
    if (branding.custom_css) {
      const sanitized = branding.custom_css
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/@import\s+url\s*\([^)]+\)/gi, '');

      const styleId = 'custom-branding-css';
      let styleEl = document.getElementById(styleId) as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = sanitized;
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, showPoweredBy: branding.show_powered_by !== false }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
