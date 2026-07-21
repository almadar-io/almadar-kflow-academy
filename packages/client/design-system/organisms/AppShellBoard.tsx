/**
 * AppShellBoard Organism
 *
 * Universal app chrome. Now renders the TopNavShell (top bar + slide-in nav
 * drawer) instead of a left sidebar. Keeps the same entity contract and event
 * emissions so pages/NavigationHandler are unaffected.
 *
 * Events Emitted:
 * - UI:NAV_CLICK — user clicks a navigation item, payload: { href }
 * - UI:LOGO_CLICK — user clicks the brand
 * - UI:TOGGLE_THEME — theme switch requested (via ThemeToggle)
 * - UI:SIGN_OUT — user signs out (via ProfilePopup)
 */

import React, { useCallback } from "react";
import { type LucideIcon } from "lucide-react";
import { useEventBus, useTranslate, type DisplayStateProps } from "@almadar/ui";
import { TopNavShell, type TopNavItem } from "./TopNavShell/TopNavShell";

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
  theme: "light" | "dark";
  sidebarCollapsed?: boolean;
}

export interface AppShellBoardProps extends DisplayStateProps {
  entity?: AppShellEntity;
  children: React.ReactNode;
}

export function AppShellBoard({
  entity,
  children,
  className = "",
}: AppShellBoardProps): React.JSX.Element {
  const app =
    entity && typeof entity === "object" && !Array.isArray(entity)
      ? (entity as AppShellEntity)
      : undefined;
  const { emit } = useEventBus();
  const { t } = useTranslate();

  const handleNavClick = useCallback(
    (href: string) => {
      emit("UI:NAV_CLICK", { href });
    },
    [emit],
  );

  const handleLogoClick = useCallback(() => {
    emit("UI:LOGO_CLICK", {});
  }, [emit]);

  const handleSettingsClick = useCallback(() => {
    emit("UI:NAV_CLICK", { href: "/settings" });
  }, [emit]);

  const navItems: TopNavItem[] = (app?.navigationItems ?? []).map(
    (item: AppShellNavItem) => ({
      id: item.id,
      label: t(item.label),
      icon: item.icon,
      badge: item.badge,
      active: item.active ?? item.href === app?.activeRoute,
      onClick: () => handleNavClick(item.href),
    }),
  );

  return (
    <TopNavShell
      brandName={app?.brandName ?? "KFlow"}
      logo={app?.logo}
      navigationItems={navItems}
      user={app?.user}
      onLogoClick={handleLogoClick}
      onSettingsClick={handleSettingsClick}
      className={className}
    >
      {children}
    </TopNavShell>
  );
}

AppShellBoard.displayName = "AppShellBoard";
