/**
 * AppShellBoard Organism
 *
 * Universal app chrome with sidebar navigation, mobile header,
 * theme toggle, and user section. Manages sidebar collapse/open state.
 *
 * Events Emitted:
 * - UI:NAV_CLICK — user clicks a navigation item, payload: { href }
 * - UI:TOGGLE_SIDEBAR — sidebar collapsed/expanded
 * - UI:TOGGLE_THEME — theme switch requested
 * - UI:SIGN_OUT — user signs out
 * - UI:USER_MENU — user avatar clicked
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Sun, Moon } from 'lucide-react';
import {
  Box,
  Sidebar,
  Header,
  Overlay,
  useEventBus,
  useEventListener,
  cn,
  type SidebarItem,
  type DisplayStateProps,
} from '@almadar/ui';
import { useTheme } from '@almadar/ui/context';
import { ProfilePopup } from './ProfilePopup/ProfilePopup';

// ThemeToggleBridge reads from @almadar/ui/context (same instance as ThemeProvider
// in providers.tsx) instead of the @almadar/ui components chunk's inlined context copy.
function ThemeToggleBridge(): React.JSX.Element {
  const { resolvedMode, toggleMode } = useTheme();
  const isDark = resolvedMode === 'dark';
  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex items-center justify-center p-2 text-[var(--color-foreground)] hover:bg-[var(--color-muted)] rounded-sm transition-colors"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

export interface AppShellNavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  href: string;
  active?: boolean;
  badge?: string | number;
}

export interface AppShellUser {
  name: string;
  email?: string;
  avatar?: string;
}

export interface AppShellEntity {
  navigationItems: AppShellNavItem[];
  user?: AppShellUser;
  logo?: React.ReactNode;
  logoSrc?: string;
  brandName?: string;
  activeRoute: string;
  theme: 'light' | 'dark';
  sidebarCollapsed?: boolean;
}

export interface AppShellBoardProps extends DisplayStateProps {
  entity?: AppShellEntity;
  children: React.ReactNode;
}

export function AppShellBoard({
  entity,
  children,
  className = '',
}: AppShellBoardProps): React.JSX.Element {
  const app = (entity && typeof entity === 'object' && !Array.isArray(entity)) ? entity as AppShellEntity : undefined;
  const { emit } = useEventBus();
  const [collapsed, setCollapsed] = useState(app?.sidebarCollapsed ?? false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (app?.sidebarCollapsed !== undefined) {
      setCollapsed(app?.sidebarCollapsed);
    }
  }, [app?.sidebarCollapsed]);

  const handleNavClick = useCallback((href: string) => {
    emit('UI:NAV_CLICK', { href });
    setMobileOpen(false);
  }, [emit]);

  // Listen for sidebar collapse events from the Sidebar organism
  useEventListener('UI:SIDEBAR_COLLAPSE', useCallback((event: { payload?: { collapsed?: boolean } }) => {
    const newCollapsed = event.payload?.collapsed ?? !collapsed;
    setCollapsed(newCollapsed);
    emit('UI:TOGGLE_SIDEBAR', { collapsed: newCollapsed });
  }, [collapsed, emit]));

  // Listen for sidebar close events (mobile)
  useEventListener('UI:SIDEBAR_CLOSE', useCallback(() => {
    setMobileOpen(false);
  }, []));

  const handleCloseMobileMenu = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleLogoClick = useCallback(() => {
    emit('UI:LOGO_CLICK', {});
  }, [emit]);

  // Listen for logo click events from the Sidebar organism
  useEventListener('UI:SIDEBAR_LOGO', handleLogoClick);

  const sidebarItems: SidebarItem[] = (app?.navigationItems ?? []).map((item: AppShellNavItem) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    badge: item.badge,
    active: item.active ?? item.href === app?.activeRoute,
    onClick: () => handleNavClick(item.href),
  }));

  const userInitials = app?.user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  const userSection = app?.user ? (
    <ProfilePopup
      userName={app.user.name}
      userEmail={app.user.email}
      userAvatar={app.user.avatar}
      trigger={
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity',
            !collapsed ? 'w-full text-left' : 'justify-center'
          )}
        >
          {app.user.avatar ? (
            <img
              src={app.user.avatar}
              alt={app.user.name}
              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <span className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
              {userInitials}
            </span>
          )}
          {!collapsed && (
            <span className="text-sm text-[var(--color-muted-foreground)] truncate max-w-[120px]">
              {app.user.name}
            </span>
          )}
        </button>
      }
      position="top-right"
    />
  ) : undefined;

  const footerContent = (
    <Box className="flex flex-col gap-2 w-full">
      <ThemeToggleBridge />
    </Box>
  );

  return (
    <Box className={cn('flex h-screen bg-[var(--color-background)]', className)}>
      {/* Desktop sidebar */}
      <Box className="hidden lg:flex flex-shrink-0">
        <Sidebar
          logo={app?.logo}
          logoSrc={app?.logoSrc}
          brandName={app?.brandName ?? 'KFlow'}
          items={sidebarItems}
          collapsed={collapsed}
          collapseChangeEvent="UI:SIDEBAR_COLLAPSE"
          userSection={userSection}
          footerContent={footerContent}
          logoClickEvent="UI:SIDEBAR_LOGO"
        />
      </Box>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <Box className="lg:hidden fixed inset-0 z-40">
          <Overlay onClick={handleCloseMobileMenu} />
          <Box className="absolute left-0 top-0 bottom-0 w-64 z-50">
            <Sidebar
              logo={app?.logo}
              logoSrc={app?.logoSrc}
              brandName={app?.brandName ?? 'KFlow'}
              items={sidebarItems}
              userSection={userSection}
              footerContent={footerContent}
              showCloseButton
              closeEvent="UI:SIDEBAR_CLOSE"
              logoClickEvent="UI:SIDEBAR_LOGO"
            />
          </Box>
        </Box>
      )}

      {/* Main content area */}
      <Box className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <Header
          brandName={app?.brandName ?? 'KFlow'}
          logo={app?.logo}
          logoSrc={app?.logoSrc}
          isMenuOpen={mobileOpen}
          onMenuToggle={() => setMobileOpen(!mobileOpen)}
          onLogoClick={handleLogoClick}
          actions={
            <ThemeToggleBridge />
          }
        />

        {/* Page content */}
        <Box className="flex-1 overflow-y-auto">
          {children}
        </Box>
      </Box>
    </Box>
  );
}

AppShellBoard.displayName = 'AppShellBoard';
