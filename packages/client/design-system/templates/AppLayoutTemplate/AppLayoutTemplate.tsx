/**
 * AppLayoutTemplate Component
 *
 * Shared layout template. Now renders the TopNavShell (top bar + slide-in nav
 * drawer) instead of a left sidebar. The external prop interface is preserved
 * so existing callers (FocusModeTemplate, AppLayout) are unaffected; the
 * sidebar-specific props (hideSidebar, sidebarFooterContent, …) are accepted
 * for compatibility but no longer drive layout.
 *
 * @example
 * ```tsx
 * <AppLayoutTemplate
 *   navigationItems={[{ id: '1', label: 'Home', icon: Home, onClick: goHome }]}
 *   user={{ name: 'John Doe', email: 'john@example.com' }}
 * >
 *   <div>Content</div>
 * </AppLayoutTemplate>
 * ```
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useEventBus, useTranslate } from '@almadar/ui';
import { cn } from '@utils/theme';
import { TopNavShell, type TopNavItem } from '../../organisms/TopNavShell/TopNavShell';

export interface AppLayoutTemplateProps {
  /** Main content to display */
  children: React.ReactNode;

  /** Navigation items */
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;

  /** User information */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };

  /** On logout handler (enables ProfilePopup) */
  onLogout?: () => void;

  /** Logo element */
  logo?: React.ReactNode;

  /** Logo image source */
  logoSrc?: string;

  /** Brand name @default 'KFlow' */
  brandName?: string;

  /** On logo click */
  onLogoClick?: () => void;

  /** Custom desktop page header (shown above content, sticky) */
  pageHeader?: React.ReactNode;

  /** Content padding @default true */
  contentPadding?: boolean;

  /** Custom content wrapper className */
  contentClassName?: string;

  /** Additional CSS classes */
  className?: string;

  /**
   * The remaining props are retained for backwards compatibility with existing
   * callers but no longer affect layout now that the chrome is a top nav.
   */
  mobileHeaderActions?: React.ReactNode;
  sidebarFooterContent?: React.ReactNode;
  sidebarUserSection?: React.ReactNode;
  defaultSidebarCollapsed?: boolean;
  hideSidebar?: boolean;
  hideMobileHeader?: boolean;
}

export const AppLayoutTemplate: React.FC<AppLayoutTemplateProps> = ({
  children,
  navigationItems = [],
  user,
  logo,
  brandName = 'KFlow',
  onLogoClick,
  pageHeader,
  contentPadding = true,
  contentClassName,
  className,
}) => {
  const { emit } = useEventBus();
  const { t } = useTranslate();

  const handleSettingsClick = React.useCallback(() => {
    emit('UI:NAV_CLICK', { href: '/settings' });
  }, [emit]);

  const navItems: TopNavItem[] = navigationItems.map((item) => ({
    id: item.id,
    label: t(item.label),
    icon: item.icon,
    badge: item.badge,
    active: item.active,
    onClick: () => {
      item.onClick?.();
      if (item.href) emit('UI:NAV_CLICK', { href: item.href });
    },
  }));

  return (
    <TopNavShell
      brandName={brandName}
      logo={logo}
      navigationItems={navItems}
      user={user}
      onLogoClick={onLogoClick}
      onSettingsClick={handleSettingsClick}
      pageHeader={pageHeader}
      contentPadding={contentPadding}
      contentClassName={contentClassName}
      className={cn(className)}
    >
      {children}
    </TopNavShell>
  );
};

AppLayoutTemplate.displayName = 'AppLayoutTemplate';
