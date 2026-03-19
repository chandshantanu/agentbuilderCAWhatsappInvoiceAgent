/**
 * LayoutSelector — sidebar or topbar layout.
 * Light mode only — warm paper palette, DM Serif Display headings, clean surfaces.
 */

import React, { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Menu, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

/* ─── Nav Item ───────────────────────────────────────────── */

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
        isCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5',
        isActive
          ? 'bg-white/[0.07] text-slate-100 border border-white/[0.1]'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent',
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            'shrink-0 transition-colors duration-200',
            isCollapsed ? 'h-5 w-5' : 'h-4 w-4',
            isActive ? 'text-rose-400' : 'text-slate-500 group-hover:text-slate-300',
          )}
        />
      )}
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18 }}
            className="truncate whitespace-nowrap"
          >
            {tab.label}
          </motion.span>
        )}
      </AnimatePresence>
      {isActive && !isCollapsed && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-rose-500"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </button>
  );

  if (isCollapsed && tab.label) {
    return (
      <Tooltip content={tab.label} side="right">
        {button}
      </Tooltip>
    );
  }
  return button;
}

/* ─── Logout Button ──────────────────────────────────────── */

function LogoutButton({ isCollapsed }: { isCollapsed: boolean }) {
  const { signOut, user } = useSupabaseAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  if (isCollapsed) {
    return (
      <div className="space-y-1">
        <Tooltip content="Account Settings" side="right">
          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center justify-center p-2.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all duration-200"
            aria-label="Account Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip content="Log out" side="right">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {user?.email && (
        <p className="text-xs text-slate-500 truncate px-1" title={user.email}>
          {user.email}
        </p>
      )}
      <button
        onClick={() => navigate('/settings')}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all duration-200"
      >
        <Settings className="h-4 w-4 shrink-0" />
        <span>Account Settings</span>
      </button>
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>Log out</span>
      </button>
    </div>
  );
}

/* ─── Sidebar Content ────────────────────────────────────── */

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
      <div
        className={cn(
          'flex items-center border-b border-white/[0.07]',
          isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-4',
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            {branding.logo_url ? (
              <img
                src={branding.logo_url}
                alt=""
                className="h-8 w-8 rounded-lg shrink-0 object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg shrink-0 bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-xs font-bold font-display">
                  {(branding.brand_name || 'D')[0].toUpperCase()}
                </span>
              </div>
            )}
            <span className="font-display text-base font-normal text-slate-200 truncate">
              {branding.brand_name || 'Dashboard'}
            </span>
          </div>
        )}
        {isCollapsed && branding.logo_url && (
          <img src={branding.logo_url} alt="" className="h-7 w-7 rounded-lg object-cover" />
        )}
        {isCollapsed && !branding.logo_url && (
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center shadow-md">
            <span className="text-white text-xs font-bold">
              {(branding.brand_name || 'D')[0].toUpperCase()}
            </span>
          </div>
        )}
        {showToggle && (
          <button
            onClick={onToggle}
            className={cn(
              'p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all duration-200',
              isCollapsed && 'mt-1',
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.div>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto py-3 space-y-0.5',
          isCollapsed ? 'px-2' : 'px-3',
        )}
      >
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
      <div
        className={cn(
          'border-t border-white/[0.07]',
          isCollapsed ? 'px-2 py-3' : 'px-3 py-3',
        )}
      >
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
              className="text-[11px] mt-2 px-1 text-slate-600 hover:text-slate-400 transition-colors block"
            >
              Powered by chatslytics.com
            </motion.a>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Mobile Sheet Hook ───────────────────────────────────── */

function useMobileSheet() {
  const [isOpen, setIsOpen] = useState(false);
  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}

/* ─── Desktop Sidebar Layout ─────────────────────────────── */

function SidebarLayout({ children, tabs, activeTab, onTabChange }: LayoutProps) {
  const { isCollapsed, toggle } = useSidebarState();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { branding } = useBranding();
  const { signOut } = useSupabaseAuth();
  const mobileSheet = useMobileSheet();

  const navigate = useNavigate();
  const handleMobileLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  /* ── Mobile ─── */
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen" style={{ background: 'var(--color-background)' }}>
        {/* Mobile header */}
        <header className="flex items-center justify-between px-4 py-3 border-b" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={mobileSheet.open}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all duration-200"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display text-base text-slate-200">
              {branding.brand_name || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/settings')}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all duration-200"
              aria-label="Account Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={handleMobileLogout}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <Sheet open={mobileSheet.isOpen} onClose={mobileSheet.close} side="left">
          <div className="sidebar-surface h-full">
            <SidebarContent
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tabId) => { onTabChange(tabId); mobileSheet.close(); }}
              isCollapsed={false}
              showToggle={false}
            />
          </div>
        </Sheet>

        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    );
  }

  /* ── Desktop ─── */
  return (
    <div className="flex h-screen" style={{ background: 'var(--color-background)' }}>
      {/* Collapsible sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-20 shrink-0 flex flex-col overflow-hidden sidebar-surface"
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

/* ─── Topbar Layout ───────────────────────────────────────── */

function TopbarLayout({ children, tabs, activeTab, onTabChange }: LayoutProps) {
  const { branding, showPoweredBy } = useBranding();
  const { signOut, user } = useSupabaseAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <header className="border-b" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-7 w-7 rounded-lg object-cover" />
            )}
            <h1 className="font-display text-base text-slate-200">
              {branding.brand_name || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {showPoweredBy && (
              <a
                href="https://chatslytics.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors mr-1"
              >
                Powered by chatslytics.com
              </a>
            )}
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all duration-200"
              title={user?.email ? `Account Settings (${user.email})` : 'Account Settings'}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
              title={user?.email || 'Log out'}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {tabs.map((tab) => {
            const Icon = getIcon(tab.icon);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-all duration-200',
                  isActive
                    ? 'font-medium text-rose-400 border-rose-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600',
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

/* ─── Selector ────────────────────────────────────────────── */

export default function LayoutSelector(props: LayoutProps) {
  const { dashboardConfig } = useConfig();
  const navigation = dashboardConfig?.navigation || 'sidebar';
  if (navigation === 'topbar') return <TopbarLayout {...props} />;
  return <SidebarLayout {...props} />;
}
