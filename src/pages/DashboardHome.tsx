/**
 * DashboardHome — renders the tab-based widget grid from dashboard config.
 *
 * Each tab contains a list of widgets rendered via WidgetRenderer.
 * Layout is controlled by LayoutSelector (sidebar or topbar).
 * Tab switches use framer-motion AnimatePresence for smooth transitions.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfig } from '@/config/ConfigProvider';
import LayoutSelector from '@/layouts/LayoutSelector';
import WidgetRenderer from '@/widgets/WidgetRenderer';

export default function DashboardHome() {
  const { dashboardConfig } = useConfig();
  const tabs = dashboardConfig?.tabs || [];
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

  // Listen for tab navigation events dispatched by widgets (e.g. DashboardOverview action items)
  useEffect(() => {
    function handleNavigate(e: Event) {
      const tabId = (e as CustomEvent<{ tabId: string }>).detail?.tabId;
      if (tabId && tabs.some((t) => t.id === tabId)) {
        setActiveTab(tabId);
      }
    }
    window.addEventListener('dashboard:navigate-tab', handleNavigate);
    return () => window.removeEventListener('dashboard:navigate-tab', handleNavigate);
  }, [tabs]);

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        <p>No dashboard tabs configured for this agent.</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <LayoutSelector tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">{currentTab?.label}</h2>
          <p className="text-xs text-muted-foreground hidden sm:block">{today}</p>
        </div>

        {/* Tab content with animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-5"
          >
            {currentTab?.widgets.map((widget, i) => (
              <motion.div
                key={`${currentTab.id}-${widget.type}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
              >
                <WidgetRenderer widget={widget} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </LayoutSelector>
  );
}
