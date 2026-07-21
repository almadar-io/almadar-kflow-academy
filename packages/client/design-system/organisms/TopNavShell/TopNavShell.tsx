/**
 * TopNavShell — conventional top navigation chrome.
 *
 * Replaces the left sidebar with: a top bar (hamburger + brand + profile,
 * top-right) that collapses on scroll-down and reveals on scroll-up, plus a
 * slide-in Drawer for the nav items. The bar is in normal flow (not fixed):
 * it collapses via max-height so the content area reflows to fill the space.
 *
 * Composed entirely from @almadar/ui primitives (Drawer, Avatar, ThemeToggle,
 * Box, Stack, Typography) + the kflow ProfilePopup. RTL-aware via logical
 * properties; all labels run through useTranslate.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Menu, Settings, Languages, Sun, Moon, Check, type LucideIcon } from 'lucide-react';
import {
  Avatar,
  Box,
  Drawer,
  HStack,
  Popover,
  Typography,
  VStack,
  cn,
  useEventBus,
  useTranslate,
} from '@almadar/ui';
import { useTheme } from '@almadar/ui/context';
import { ProfilePopup } from '../ProfilePopup/ProfilePopup';
import kflowLogo from '../../../src/assets/kflow-logo.svg';
import kflowLogoWhite from '../../../src/assets/kflow-logo-white.svg';

export interface TopNavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  active?: boolean;
  onClick: () => void;
  badge?: string | number;
}

export interface TopNavUser {
  name: string;
  email?: string;
  avatar?: string;
}

export interface TopNavShellProps {
  brandName?: string;
  logo?: React.ReactNode;
  navigationItems: TopNavItem[];
  user?: TopNavUser;
  onLogoClick?: () => void;
  /** Click handler for the settings gear (top-right cluster). */
  onSettingsClick?: () => void;
  /** Secondary “pinned” items rendered below a divider (e.g. recent learning paths). */
  pinnedItems?: TopNavItem[];
  /** Label for the pinned section. */
  pinnedSectionLabel?: string;
  /** Optional desktop page header rendered above the content slot. */
  pageHeader?: React.ReactNode;
  contentPadding?: boolean;
  contentClassName?: string;
  className?: string;
  children: React.ReactNode;
}

/** Collapse the bar once the user scrolls past this many px. */
const SCROLL_THRESHOLD = 8;

export const TopNavShell: React.FC<TopNavShellProps> = ({
  brandName = 'KFlow',
  logo,
  navigationItems,
  user,
  onLogoClick,
  onSettingsClick,
  pinnedItems = [],
  pinnedSectionLabel,
  pageHeader,
  contentPadding = true,
  contentClassName,
  className,
  children,
}) => {
  const { t, locale, direction } = useTranslate();
  const { emit } = useEventBus();
  const { resolvedMode, toggleMode } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const lastScrollTop = useRef(0);

  // Drawer position is physical (left/right) in @almadar/ui — resolve from the
  // reactive text direction so the drawer slides in from the same edge as the
  // hamburger (left in LTR, right in RTL).
  const drawerPosition = direction === 'rtl' ? 'right' : 'left';

  // Hide-on-scroll-down / reveal-on-scroll-up. Attached to the scrolling
  // content area (onScroll), not window — the content box owns the scroll.
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    const delta = y - lastScrollTop.current;
    if (y < SCROLL_THRESHOLD) {
      setCollapsed(false);
    } else if (delta > 0) {
      setCollapsed(true);
    } else if (delta < 0) {
      setCollapsed(false);
    }
    lastScrollTop.current = y;
  }, []);

  const handleItemClick = useCallback(
    (item: TopNavItem) => {
      item.onClick();
      setDrawerOpen(false);
    },
    [],
  );

  // Locale options for the hover-reveal language menu (native names — conventional for language pickers).
  const localeOptions: Array<{ code: 'en' | 'ar' | 'sl'; label: string }> = [
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'العربية' },
    { code: 'sl', label: 'Slovenščina' },
  ];

  const handleSelectLocale = useCallback(
    (code: 'en' | 'ar' | 'sl') => {
      emit('UI:SET_LOCALE', { locale: code });
    },
    [emit],
  );

  const userInitials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? 'U';

  return (
    <Box className={cn('h-screen flex flex-col bg-[var(--color-background)]', className)}>
      {/* Top bar — in-flow, collapses on scroll-down via max-height (reflows content). */}
      <header
        className={cn(
          'flex-shrink-0 overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface)]',
          'transition-all duration-normal ease-standard',
          collapsed ? 'max-h-0 opacity-0' : 'max-h-16 opacity-100',
        )}
      >
        <HStack className="h-14 items-center justify-between gap-2 px-4">
          <HStack className="items-center gap-1">
            <button
              type="button"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label={drawerOpen ? t('aria.closeMenu') : t('aria.openMenu')}
              aria-expanded={drawerOpen}
              className="flex items-center justify-center rounded-md p-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              <Menu size={20} />
            </button>
            <button
              type="button"
              onClick={onLogoClick}
              className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-[var(--color-muted)]"
            >
              {logo ?? (
                <img
                  src={resolvedMode === 'dark' ? kflowLogoWhite : kflowLogo}
                  alt=""
                  className="h-6 w-6 flex-shrink-0"
                />
              )}
              <Typography variant="h6" weight="bold" as="span" className="text-[var(--color-foreground)]">
                {brandName}
              </Typography>
            </button>
          </HStack>

          <HStack className="items-center gap-1">
            <Popover
              trigger="hover"
              position="bottom"
              showArrow={false}
              className="p-1"
              content={
                <VStack gap="none" className="min-w-[10rem]">
                  {localeOptions.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => handleSelectLocale(opt.code)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm transition-colors',
                        locale === opt.code
                          ? 'bg-[var(--color-primary-muted)] font-medium text-[var(--color-foreground)]'
                          : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                      )}
                    >
                      <span>{opt.label}</span>
                      {locale === opt.code && <Check size={14} className="text-[var(--color-primary)]" />}
                    </button>
                  ))}
                </VStack>
              }
            >
              <button
                type="button"
                aria-label={t('aria.changeLanguage')}
                title={`${t('aria.changeLanguage')} (${locale.toUpperCase()})`}
                className="flex items-center justify-center rounded-md p-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                <Languages size={20} />
              </button>
            </Popover>
            <button
              type="button"
              onClick={toggleMode}
              aria-label={resolvedMode === 'dark' ? t('aria.switchToLight') : t('aria.switchToDark')}
              title={resolvedMode === 'dark' ? t('aria.switchToLight') : t('aria.switchToDark')}
              className="flex items-center justify-center rounded-md p-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              {resolvedMode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {onSettingsClick && (
              <button
                type="button"
                onClick={onSettingsClick}
                aria-label={t('aria.settings')}
                title={t('aria.settings')}
                className="flex items-center justify-center rounded-md p-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                <Settings size={20} />
              </button>
            )}
            {user && (
              <ProfilePopup
                userName={user.name}
                userEmail={user.email}
                userAvatar={user.avatar}
                position="bottom-right"
                trigger={
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-80"
                    aria-label={user.name}
                  >
                    {user.avatar ? (
                      <Avatar src={user.avatar} initials={userInitials} size="xs" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-[0.625rem] font-bold text-[var(--color-primary-foreground)]">
                        {userInitials}
                      </span>
                    )}
                  </button>
                }
              />
            )}
          </HStack>
        </HStack>
      </header>

      {/* Optional desktop page header (sticky within the scroll area). */}
      <Box className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        {pageHeader && (
          <Box className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-card)] px-6 py-3 shadow-sm">
            {pageHeader}
          </Box>
        )}
        <Box className={cn(contentPadding && 'p-2 sm:p-4 lg:p-6', contentClassName)}>
          {children}
        </Box>
      </Box>

      {/* Nav drawer (slide-in from the inline start edge). */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={t('nav.menu')}
        position={drawerPosition}
        width="sm"
        showCloseButton
      >
        <VStack gap="xs" className="py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-start transition-colors',
                  item.active
                    ? 'bg-[var(--color-primary-muted)] text-[var(--color-foreground)] font-medium'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                )}
              >
                {Icon && <Icon size={18} className="flex-shrink-0" />}
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-xs font-bold text-[var(--color-primary-foreground)]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </VStack>
        {pinnedItems.length > 0 && (
          <>
            <Box className="my-2 border-t border-[var(--color-border)]" />
            {pinnedSectionLabel && (
              <Typography variant="small" color="muted" weight="medium" className="px-3 pb-1">
                {pinnedSectionLabel}
              </Typography>
            )}
            <VStack gap="xs">
              {pinnedItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm transition-colors',
                      item.active
                        ? 'bg-[var(--color-primary-muted)] text-[var(--color-foreground)] font-medium'
                        : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                    )}
                  >
                    {Icon && <Icon size={16} className="flex-shrink-0" />}
                    <span className="flex-1 truncate">{item.label}</span>
                  </button>
                );
              })}
            </VStack>
          </>
        )}
      </Drawer>
    </Box>
  );
};

TopNavShell.displayName = 'TopNavShell';
