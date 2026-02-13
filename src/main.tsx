import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SaaSProvider } from '@/contexts/SaaSContext';
import { AuthProvider } from '@/auth/AuthContext';
import { ConfigProvider } from '@/config/ConfigProvider';
import { BrandingProvider } from '@/branding/BrandingProvider';
import App from './App';
import './index.css';

// ─── Expose shared libs for dynamic (CDN-loaded) widgets ────────
// The import map in index.html points bare specifiers (e.g. "react")
// to /vendor/*.esm.js shims that read from these window globals.
// This ensures dynamic widgets share the same React instance as the host.
(window as any).__SHARED_REACT__ = React;
(window as any).__SHARED_REACT_DOM__ = ReactDOM;

// Lazy-load optional shared libs — only assigned when first needed
import('recharts').then(m => { (window as any).__SHARED_RECHARTS__ = m; }).catch(() => {});
import('lucide-react').then(m => { (window as any).__SHARED_LUCIDE_REACT__ = m; }).catch(() => {});
import('axios').then(m => { (window as any).__SHARED_AXIOS__ = m.default || m; }).catch(() => {});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SaaSProvider>
        <AuthProvider>
          <ConfigProvider>
            <BrandingProvider>
              <App />
            </BrandingProvider>
          </ConfigProvider>
        </AuthProvider>
      </SaaSProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
