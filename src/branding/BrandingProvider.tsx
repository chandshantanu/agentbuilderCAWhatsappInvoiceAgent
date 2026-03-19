/**
 * BrandingProvider — applies BrandingConfig as CSS custom properties.
 *
 * Adapted from portal-templates/instagram-dm-portal/frontend/src/hooks/useBranding.tsx
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useConfig } from '@/config/ConfigProvider';
import { useSaaS } from '@/contexts/SaaSContext';
import type { BrandingConfig } from '@/config/types';

interface BrandingState {
  branding: BrandingConfig;
  showPoweredBy: boolean;
}

const defaultBranding: BrandingConfig = {
  brand_name: 'Agent Dashboard',
  primary_color: '#8B5CF6',
  secondary_color: '#6366F1',
  background_color: '#0c0e14',
  text_color: '#e2e8f0',
  font_family: 'Outfit',
  show_powered_by: true,
};

const BrandingContext = createContext<BrandingState>({
  branding: defaultBranding,
  showPoweredBy: true,
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { dashboardConfig } = useConfig();
  const { config: saasConfig } = useSaaS();
  // SaaS branding (from platform) takes priority over runtime dashboard config branding
  const branding = { ...defaultBranding, ...dashboardConfig?.branding, ...saasConfig?.branding };

  useEffect(() => {
    const root = document.documentElement;

    if (branding.primary_color) root.style.setProperty('--color-primary', branding.primary_color);
    if (branding.secondary_color) root.style.setProperty('--color-secondary', branding.secondary_color);
    if (branding.background_color) root.style.setProperty('--color-background', branding.background_color);
    if (branding.text_color) root.style.setProperty('--color-text', branding.text_color);
    if (branding.font_family) root.style.setProperty('--font-family', branding.font_family);

    // Derived tokens — only set light-mode defaults when background is explicitly light
    // (avoid overriding the dark theme defined in index.css)
    const bg = (branding.background_color || '').toLowerCase().trim();
    // Parse hex luminance: treat colors with low luminance as dark
    const hexToLum = (hex: string) => {
      const h = hex.replace('#', '');
      if (h.length < 6) return 0;
      const r = parseInt(h.slice(0,2), 16) / 255;
      const g = parseInt(h.slice(2,4), 16) / 255;
      const b = parseInt(h.slice(4,6), 16) / 255;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const lum = bg.startsWith('#') ? hexToLum(bg) : 1;
    const isLightBg = lum > 0.3;
    if (isLightBg) {
      if (!branding.custom_css?.includes('--color-border')) {
        root.style.setProperty('--color-border', '#E5E7EB');
      }
      if (!branding.custom_css?.includes('--color-surface-raised')) {
        root.style.setProperty('--color-surface-raised', '#F9FAFB');
      }
    }

    // Only set title from branding if the page hasn't set a more specific one
    if (branding.brand_name && (!document.title || document.title === 'Agent Dashboard')) {
      document.title = branding.brand_name;
    }

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
