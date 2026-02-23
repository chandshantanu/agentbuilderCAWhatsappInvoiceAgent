/**
 * LayoutSelector — picks the appropriate layout based on dashboard config.
 * Sidebar layout features collapsible sidebar with framer-motion animations,
 * mobile sheet overlay, and icon support via iconMap.
 *
 * Visual: dark glassmorphism / liquid glass aesthetic.
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

/* ─── Aurora background blobs ────────────────────────────── */

function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* Deep base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(99,102,241,0.18) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,0.12) 0%, transparent 60%), ' +
            'linear-gradient(180deg, #070B14 0%, #0A0F1E 100%)',
        }}
      />
      {/* Blob 1 — violet */}
      <div
        className="absolute animate-aurora"
        style={{
          top: '-15%',
          left: '-10%',
          width: '55%',
          height: '55%',
          background:
            'radial-gradient(ellipse at center, rgba(139,92,246,0.28) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Blob 2 — blue */}
      <div
        className="absolute animate-aurora-slow"
        style={{
          top: '10%',
          right: '-15%',
          width: '50%',
          height: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(59,130,246,0.2) 0%, transparent 65%)',
          filter: 'blur(70px)',
          animationDelay: '-6s',
        }}
      />
      {/* Blob 3 — pink */}
      <div
        className="absolute animate-aurora-drift"
        style={{
          bottom: '-10%',
          left: '20%',
          width: '45%',
          height: '45%',
          background:
            'radial-gradient(ellipse at center, rgba(236,72,153,0.16) 0%, transparent 65%)',
          filter: 'blur(80px)',
          animationDelay: '-11s',
        }}
      />
      {/* Subtle noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />
    </div>
  );
}

/* ─── Sidebar Nav Item ─────────────────────────────────────── */

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
        'group relative w-full flex items-center gap-3 rounded-xl text-base font-medium transition-all duration-200',
        isCollapsed ? 'justify-center px-2 py-3.5' : 'px-3 py-3',
        isActive
          ? 'text-primary'
          : 'text-muted hover:text-foreground',
      )}
      style={
        isActive
          ? {
              background: 'rgba(167,139,250,0.12)',
              border: '1px solid rgba(167,139,250,0.2)',
              boxShadow: '0 0 16px rgba(167,139,250,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
            }
          : {
              background: 'transparent',
              border: '1px solid transparent',
            }
      }
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background =
            'rgba(255,255,255,0.05)';
          (e.currentTarget as HTMLButtonElement).style.border =
            '1px solid rgba(255,255,255,0.08)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.border =
            '1px solid transparent';
        }
      }}
    >
      {Icon && (
        <Icon
          className={cn(
            'shrink-0 transition-colors duration-200',
            isCollapsed ? 'h-6 w-6' : 'h-5 w-5',
            isActive
              ? 'text-primary drop-shadow-[0_0_6px_rgba(167,139,250,0.7)]'
              : 'text-muted-foreground group-hover:text-foreground',
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
      {/* Active indicator — left glow bar */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
          style={{
            background: 'linear-gradient(180deg, #A78BFA 0%, #22D3EE 100%)',
            boxShadow: '0 0 8px rgba(167,139,250,0.8), 0 0 16px rgba(167,139,250,0.4)',
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
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

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  if (isCollapsed) {
    return (
      <Tooltip content="Log out" side="right">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center p-2.5 rounded-xl text-muted-foreground transition-all duration-200"
          style={{ background: 'transparent', border: '1px solid transparent' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#FB7185';
            (e.currentTarget as HTMLButtonElement).style.background =
              'rgba(251,113,133,0.1)';
            (e.currentTarget as HTMLButtonElement).style.border =
              '1px solid rgba(251,113,133,0.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.border =
              '1px solid transparent';
          }}
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
        <p
          className="text-xs truncate px-1"
          style={{ color: 'rgba(148,163,184,0.6)' }}
          title={user.email}
        >
          {user.email}
        </p>
      )}
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-base text-muted-foreground transition-all duration-200"
        style={{ background: 'transparent', border: '1px solid transparent' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = '#FB7185';
          (e.currentTarget as HTMLButtonElement).style.background =
            'rgba(251,113,133,0.1)';
          (e.currentTarget as HTMLButtonElement).style.border =
            '1px solid rgba(251,113,133,0.2)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = '';
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.border =
            '1px solid transparent';
        }}
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
          'flex items-center',
          isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-4',
        )}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            {branding.logo_url && (
              <img
                src={branding.logo_url}
                alt=""
                className="h-8 w-8 rounded-lg shrink-0"
                style={{ boxShadow: '0 0 12px rgba(167,139,250,0.3)' }}
              />
            )}
            <span
              className="font-bold text-lg truncate"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #22D3EE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {branding.brand_name || 'Dashboard'}
            </span>
          </div>
        )}
        {isCollapsed && branding.logo_url && (
          <img
            src={branding.logo_url}
            alt=""
            className="h-7 w-7 rounded-lg"
            style={{ boxShadow: '0 0 10px rgba(167,139,250,0.3)' }}
          />
        )}
        {isCollapsed && !branding.logo_url && (
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, #A78BFA 0%, #22D3EE 100%)',
              boxShadow: '0 0 12px rgba(167,139,250,0.4)',
            }}
          >
            D
          </div>
        )}
        {showToggle && (
          <button
            onClick={onToggle}
            className={cn(
              'p-1.5 rounded-lg text-muted-foreground transition-all duration-200',
              isCollapsed && 'mt-1',
            )}
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#E2E8F0';
              (e.currentTarget as HTMLButtonElement).style.background =
                'rgba(255,255,255,0.08)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.div>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto py-3 space-y-1',
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
        className={cn(isCollapsed ? 'px-2 py-3' : 'px-3 py-3')}
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
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
              className="text-[11px] mt-2 px-1 transition-colors block"
              style={{ color: 'rgba(100,116,139,0.7)' }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color =
                  'rgba(148,163,184,0.9)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color =
                  'rgba(100,116,139,0.7)')
              }
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
  return {
    isOpen,
    open:  () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}

/* ─── Desktop Sidebar Layout ─────────────────────────────── */

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

  /* ── Mobile ─── */
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen" style={{ background: '#070B14' }}>
        <AuroraBackground />

        {/* Mobile header — frosted glass */}
        <header
          className="relative z-10 flex items-center justify-between px-4 py-3"
          style={{
            background: 'rgba(7,11,20,0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 1px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={mobileSheet.open}
              className="p-1.5 rounded-lg text-muted-foreground transition-all duration-200"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#E2E8F0';
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span
              className="font-bold text-base"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #22D3EE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {branding.brand_name || 'Dashboard'}
            </span>
          </div>
          <button
            onClick={handleMobileLogout}
            className="p-1.5 rounded-lg text-muted-foreground transition-all duration-200"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#FB7185';
              (e.currentTarget as HTMLButtonElement).style.background =
                'rgba(251,113,133,0.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <Sheet open={mobileSheet.isOpen} onClose={mobileSheet.close} side="left">
          {/* Sheet panel gets glass sidebar styling */}
          <div className="glass-sidebar h-full">
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
          </div>
        </Sheet>

        <main className="relative z-10 flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    );
  }

  /* ── Desktop ─── */
  return (
    <div className="flex h-screen" style={{ background: '#070B14' }}>
      <AuroraBackground />

      {/* Collapsible glass sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-20 shrink-0 flex flex-col overflow-hidden glass-sidebar"
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

      <main className="relative z-10 flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

/* ─── Topbar Layout ───────────────────────────────────────── */

function TopbarLayout({ children, tabs, activeTab, onTabChange }: LayoutProps) {
  const { branding, showPoweredBy } = useBranding();
  const { signOut, user } = useSupabaseAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen" style={{ background: '#070B14' }}>
      <AuroraBackground />
      <header
        className="relative z-10"
        style={{
          background: 'rgba(7,11,20,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 1px 24px rgba(0,0,0,0.4)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-7 w-7 rounded-lg" />
            )}
            <h1
              className="font-bold text-base"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #22D3EE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {branding.brand_name || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {showPoweredBy && (
              <a
                href="https://chatslytics.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] transition-colors"
                style={{ color: 'rgba(100,116,139,0.7)' }}
              >
                Powered by chatslytics.com
              </a>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground transition-all duration-200"
              style={{ border: '1px solid transparent' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#FB7185';
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(251,113,133,0.1)';
                (e.currentTarget as HTMLButtonElement).style.border =
                  '1px solid rgba(251,113,133,0.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.border =
                  '1px solid transparent';
              }}
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
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-all duration-200',
                  isActive
                    ? 'font-medium'
                    : 'border-transparent text-muted hover:text-foreground',
                )}
                style={
                  isActive
                    ? {
                        borderBottomColor: '#A78BFA',
                        color: '#A78BFA',
                        textShadow: '0 0 12px rgba(167,139,250,0.5)',
                      }
                    : {}
                }
              >
                {Icon && <Icon className="h-4 w-4" />}
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>
      <main className="relative z-10 max-w-7xl mx-auto p-6">{children}</main>
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
