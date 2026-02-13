/**
 * LayoutSelector — picks the appropriate layout based on dashboard config.
 * Sidebar layout features collapsible sidebar with framer-motion animations,
 * mobile sheet overlay, and icon support via iconMap.
 */

import React, { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Menu, LogOut } from 'lucide-react';
import { useConfig } from '@/config/ConfigProvider';
import { useBranding } from '@/branding/BrandingProvider';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { useSidebarState } from '@/hooks/useSidebarState';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { getIcon } from '@/lib/iconMap';
import { Sheet } from '@/components/ui/sheet';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TabConfig } from '@/config/types';

interface LayoutProps {
  children: ReactNode;
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

/* ─── Sidebar Nav Item ─────────────────────────────── */

function NavItem({
  tab,
  isActive,
  isCollapsed,
  onClick,
}: {
  tab: TabConfig;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}) {
  const Icon = getIcon(tab.icon);

  const button = (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200',
        isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
        isActive
          ? 'bg-primary/10 text-primary shadow-xs'
          : 'text-muted hover:bg-surface-raised hover:text-foreground',
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            'shrink-0 transition-colors duration-200',
            isCollapsed ? 'h-5 w-5' : 'h-4 w-4',
            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
          )}
        />
      )}
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="truncate whitespace-nowrap"
          >
            {tab.label}
          </motion.span>
        )}
      </AnimatePresence>
      {/* Active indicator bar */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
    </button>
  );

  if (isCollapsed && tab.label) {
    return <Tooltip content={tab.label} side="right">{button}</Tooltip>;
  }
  return button;
}

/* ─── Logout Button ─────────────────────────────────── */

function LogoutButton({ isCollapsed }: { isCollapsed: boolean }) {
  const { signOut, user } = useSupabaseAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  if (isCollapsed) {
    return (
      <Tooltip content="Log out" side="right">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center p-2.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-1">
      {user?.email && (
        <p className="text-[11px] text-muted-foreground truncate px-1" title={user.email}>
          {user.email}
        </p>
      )}
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>Log out</span>
      </button>
    </div>
  );
}

/* ─── Sidebar Content (shared between desktop aside & mobile sheet) ─── */

function SidebarContent({
  tabs,
  activeTab,
  onTabChange,
  isCollapsed,
  onToggle,
  showToggle,
}: {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isCollapsed: boolean;
  onToggle?: () => void;
  showToggle: boolean;
}) {
  const { branding, showPoweredBy } = useBranding();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn('flex items-center border-b border-border/50', isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3')}>
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-7 w-7 rounded-md shrink-0" />
            )}
            <span className="font-semibold text-foreground truncate text-[15px]">
              {branding.brand_name || 'Dashboard'}
            </span>
          </div>
        )}
        {isCollapsed && branding.logo_url && (
          <img src={branding.logo_url} alt="" className="h-7 w-7 rounded-md" />
        )}
        {showToggle && (
          <button
            onClick={onToggle}
            className={cn(
              'p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors',
              isCollapsed && 'mt-1',
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronLeft className="h-4 w-4" />
            </motion.div>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto py-3 space-y-0.5', isCollapsed ? 'px-2' : 'px-3')}>
        {tabs.map((tab) => (
          <NavItem
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            isCollapsed={isCollapsed}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </nav>

      {/* Logout + Footer */}
      <div className={cn('border-t border-border/50', isCollapsed ? 'px-2 py-3' : 'px-3 py-3')}>
        <LogoutButton isCollapsed={isCollapsed} />
        <AnimatePresence>
          {showPoweredBy && !isCollapsed && (
            <motion.a
              href="https://chatslytics.com"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-muted-foreground mt-2 px-1 hover:text-foreground transition-colors block"
            >
              Powered by chatslytics.com
            </motion.a>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Mobile Sheet Hook ──────────────────────────── */

function useMobileSheet() {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}

/* ─── Desktop Sidebar Layout ─────────────────────── */

function SidebarLayout({ children, tabs, activeTab, onTabChange }: LayoutProps) {
  const { isCollapsed, toggle } = useSidebarState();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { branding } = useBranding();
  const { signOut } = useSupabaseAuth();
  const mobileSheet = useMobileSheet();

  const handleMobileLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  // Mobile: hamburger + sheet overlay
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-surface-raised">
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-border/50">
          <div className="flex items-center gap-3">
            <button
              onClick={mobileSheet.open}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-semibold text-foreground text-[15px]">
              {branding.brand_name || 'Dashboard'}
            </span>
          </div>
          <button
            onClick={handleMobileLogout}
            className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <Sheet open={mobileSheet.isOpen} onClose={mobileSheet.close} side="left">
          <SidebarContent
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(tabId) => {
              onTabChange(tabId);
              mobileSheet.close();
            }}
            isCollapsed={false}
            showToggle={false}
          />
        </Sheet>

        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    );
  }

  // Desktop: collapsible sidebar
  return (
    <div className="flex h-screen bg-surface-raised">
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="shrink-0 bg-white border-r border-border/50 flex flex-col overflow-hidden"
      >
        <SidebarContent
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          isCollapsed={isCollapsed}
          onToggle={toggle}
          showToggle
        />
      </motion.aside>

      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

/* ─── Topbar Layout (minor polish) ───────────────── */

function TopbarLayout({ children, tabs, activeTab, onTabChange }: LayoutProps) {
  const { branding, showPoweredBy } = useBranding();
  const { signOut, user } = useSupabaseAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-surface-raised">
      <header className="bg-white border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {branding.logo_url && <img src={branding.logo_url} alt="" className="h-7 w-7 rounded-md" />}
            <h1 className="font-semibold text-foreground text-[15px]">{branding.brand_name || 'Dashboard'}</h1>
          </div>
          <div className="flex items-center gap-3">
            {showPoweredBy && (
              <a
                href="https://chatslytics.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Powered by chatslytics.com
              </a>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
              title={user?.email || 'Log out'}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1 -mb-px">
          {tabs.map((tab) => {
            const Icon = getIcon(tab.icon);
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted hover:text-foreground',
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">{children}</main>
    </div>
  );
}

/* ─── Selector ────────────────────────────────────── */

export default function LayoutSelector(props: LayoutProps) {
  const { dashboardConfig } = useConfig();
  const navigation = dashboardConfig?.navigation || 'sidebar';

  if (navigation === 'topbar') return <TopbarLayout {...props} />;
  return <SidebarLayout {...props} />;
}
