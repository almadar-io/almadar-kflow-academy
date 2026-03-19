/**
 * AppShellTemplate
 *
 * Pure template: universal app chrome with sidebar navigation,
 * mobile header, theme toggle, and content slot.
 * No hooks, no state - passes entity fields through to AppShellBoard.
 *
 * Events Emitted (via AppShellBoard):
 * - UI:NAV_CLICK - user clicks a navigation item
 * - UI:TOGGLE_SIDEBAR - sidebar collapsed/expanded
 * - UI:TOGGLE_THEME - theme switch requested
 * - UI:SIGN_OUT - user signs out
 * - UI:USER_MENU - user avatar clicked
 */

import React from 'react';
import { AppShellBoard } from '../organisms/AppShellBoard';
import type { AppShellEntity, AppShellNavItem } from '../organisms/AppShellBoard';

export type { AppShellEntity, AppShellNavItem, AppShellUser } from '../organisms/AppShellBoard';

export interface AppShellTemplateProps {
  entity?: AppShellEntity;
  children: React.ReactNode;
  className?: string;
  /** App name shown in sidebar header (used when entity is not provided) */
  appName?: string;
  /** Navigation items (used when entity is not provided) */
  navItems?: Array<{ label: string; href: string }>;
}

export const AppShellTemplate: React.FC<AppShellTemplateProps> = ({
  entity,
  children,
  className,
  appName,
  navItems,
}) => {
  const resolvedEntity: AppShellEntity = entity ?? {
    navigationItems: (navItems ?? []).map(
      (item, i): AppShellNavItem => ({
        id: String(i),
        label: item.label,
        href: item.href,
      }),
    ),
    brandName: appName,
    activeRoute: '',
    theme: 'light',
  };
  return (
    <AppShellBoard entity={resolvedEntity} className={className}>
      {children}
    </AppShellBoard>
  );
};

AppShellTemplate.displayName = 'AppShellTemplate';
