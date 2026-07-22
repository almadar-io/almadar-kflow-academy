/**
 * TopNavShell — conventional top navigation chrome.
 *
 * Replaces the left sidebar with: a top bar (hamburger + brand + profile,
 * top-right) that collapses on scroll-down and reveals on scroll-up, plus a
 * slide-in Drawer for the nav items. The bar is in normal flow (not fixed):
 * it collapses via max-height so the content area reflows to fill the space.
 *
 * Composed entirely from @almadar/ui primitives (Button, Drawer, Avatar,
 * Popover, Box, Stack, Typography) + the kflow ProfilePopup. RTL-aware via
 * logical properties; all labels run through useTranslate.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Menu, Settings, Languages, Palette, Sun, Moon, Check, type LucideIcon } from 'lucide-react';
import {
  Avatar,
  Box,
  Button,
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
import { DrawerPathItem } from './DrawerPathItem';
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

/** Shape of a pinned drawer item (carries a seed-concept label for its Iconify logo). */
export interface TopNavPathItem {
  id: string;
  label: string;
  iconLabel?: string;
  active?: boolean;
  onClick: () => void;
}

export interface TopNavShellProps {
  brandName?: string;
  logo?: React.ReactNode;
  navigationItems: TopNavItem[];
  user?: TopNavUser;
  onLogoClick?: () => void;
  /** Click handler for the settings gear (top-right cluster). */
  onSettingsClick?: () => void;
  /** Secondary “pinned” items rendered below a divider (recent learning paths). */
  pinnedItems?: TopNavPathItem[];
  /** Optional desktop page header rendered above the content slot. */
  pageHeader?: React.ReactNode;
  contentPadding?: boolean;
  contentClassName?: string;
  className?: string;
  children: React.ReactNode;
}

/** Collapse the bar once the user scrolls past this many px. */
const SCROLL_THRESHOLD = 8;

// Shared Button overrides for the top-bar icon cluster: square, muted, subtle hover.
const iconBtnClass =
  'h-8 w-8 p-0 rounded-md border-transparent text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:border-transparent';
// Shared Button overrides for full-width menu/list rows inside popovers + drawer.
const rowBtnBase =
  'w-full justify-start px-3 py-2 font-normal border-transparent rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:border-transparent';

export const TopNavShell: React.FC<TopNavShellProps> = ({
  brandName = 'KFlow',
  logo,
  navigationItems,
  user,
  onLogoClick,
  onSettingsClick,
  pinnedItems = [],
  pageHeader,
  contentPadding = true,
  contentClassName,
  className,
  children,
}) => {
  const { t, locale, direction } = useTranslate();
  const { emit } = useEventBus();
  const { theme, setTheme, availableThemes, resolvedMode, toggleMode } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const lastScrollTop = useRef(0);

  // Drawer position is physical (left/right) in @almadar/ui — resolve from the
  // reactive text direction so the drawer slides in from the same edge as the
  // hamburger (left in LTR, right in RTL).
  const drawerPosition = direction === 'rtl' ? 'right' : 'left';

  // Hide-on-scroll-down / reveal-on-scroll-up. Attached to the scrolling
  // content area (onScroll), not window — the content box owns the scroll.
  // IMPORTANT: when the bar collapses (max-height transition), the scroll
  // container's clientHeight grows; at the bottom the browser clamps scrollTop
  // down, firing a scroll event with negative delta that would instantly
  // re-reveal the bar → flicker loop. We detect reflow-induced events by a
  // clientHeight change and ignore them (they're layout, not user intent).
  const lastClientHeight = useRef(0);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const y = el.scrollTop;
    const delta = y - lastScrollTop.current;
    // Ignore scroll events caused by the bar collapsing/expanding (reflow), not
    // by the user actually scrolling — these drive the flicker feedback loop.
    if (el.clientHeight !== lastClientHeight.current) {
      lastScrollTop.current = y;
      lastClientHeight.current = el.clientHeight;
      return;
    }
    lastScrollTop.current = y;
    if (y < SCROLL_THRESHOLD) {
      setCollapsed(false);
    } else if (delta > 2) {
      setCollapsed(true);
    } else if (delta < -2) {
      setCollapsed(false);
    }
  }, []);

  const handleItemClick = useCallback((item: TopNavItem) => {
    item.onClick();
    setDrawerOpen(false);
  }, []);

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

  // Theme presets (wireframe, minimalist, kflow, …) for the hover-reveal menu.
  // Pruned: game themes + trait-wars aren't relevant here.
  const themeOptions = availableThemes.filter(
    (th) => !th.name.startsWith('game-') && th.name !== 'trait-wars',
  );
  const handleSelectTheme = useCallback(
    (name: string) => {
      setTheme(name);
    },
    [setTheme],
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
            <Button
              variant="ghost"
              size="sm"
              icon={Menu}
              aria-label={drawerOpen ? t('aria.closeMenu') : t('aria.openMenu')}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((v) => !v)}
              className={iconBtnClass}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogoClick}
              className="gap-2 rounded-md border-transparent px-2 text-[var(--color-foreground)] hover:bg-[var(--color-muted)] hover:border-transparent"
            >
              {logo ?? (
                <img
                  src={resolvedMode === 'dark' ? kflowLogoWhite : kflowLogo}
                  alt=""
                  className="h-6 w-6 flex-shrink-0"
                />
              )}
              <Typography variant="h6" weight="bold" as="span">
                {brandName}
              </Typography>
            </Button>
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
                    <Button
                      key={opt.code}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectLocale(opt.code)}
                      className={cn(
                        rowBtnBase,
                        'justify-between',
                        locale === opt.code
                          ? 'bg-[var(--color-primary-muted)] font-medium text-[var(--color-foreground)]'
                          : '',
                      )}
                    >
                      <span>{opt.label}</span>
                      {locale === opt.code && <Check size={14} className="text-[var(--color-primary)]" />}
                    </Button>
                  ))}
                </VStack>
              }
            >
              <Button
                variant="ghost"
                size="sm"
                icon={Languages}
                aria-label={t('aria.changeLanguage')}
                title={`${t('aria.changeLanguage')} (${locale.toUpperCase()})`}
                className={iconBtnClass}
              />
            </Popover>
            <Popover
              trigger="hover"
              position="bottom"
              showArrow={false}
              className="p-1"
              content={
                <VStack gap="none" className="min-w-[10rem]">
                  {themeOptions.map((th) => (
                    <Button
                      key={th.name}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectTheme(th.name)}
                      className={cn(
                        rowBtnBase,
                        'justify-between',
                        theme === th.name
                          ? 'bg-[var(--color-primary-muted)] font-medium text-[var(--color-foreground)]'
                          : '',
                      )}
                    >
                      <span>{th.displayName}</span>
                      {theme === th.name && <Check size={14} className="text-[var(--color-primary)]" />}
                    </Button>
                  ))}
                </VStack>
              }
            >
              <Button
                variant="ghost"
                size="sm"
                icon={Palette}
                aria-label={t('aria.changeTheme')}
                title={t('aria.changeTheme')}
                className={iconBtnClass}
              />
            </Popover>
            <Button
              variant="ghost"
              size="sm"
              icon={resolvedMode === 'dark' ? Sun : Moon}
              aria-label={resolvedMode === 'dark' ? t('aria.switchToLight') : t('aria.switchToDark')}
              title={resolvedMode === 'dark' ? t('aria.switchToLight') : t('aria.switchToDark')}
              onClick={toggleMode}
              className={iconBtnClass}
            />
            {onSettingsClick && (
              <Button
                variant="ghost"
                size="sm"
                icon={Settings}
                aria-label={t('aria.settings')}
                title={t('aria.settings')}
                onClick={onSettingsClick}
                className={iconBtnClass}
              />
            )}
            {user && (
              <ProfilePopup
                userName={user.name}
                userEmail={user.email}
                userAvatar={user.avatar}
                position="bottom-right"
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={user.name}
                    className="h-8 w-8 rounded-full border-transparent p-0 hover:bg-transparent hover:opacity-80 hover:border-transparent"
                  >
                    {user.avatar ? (
                      <Avatar src={user.avatar} initials={userInitials} size="xs" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-[0.625rem] font-bold text-[var(--color-primary-foreground)]">
                        {userInitials}
                      </span>
                    )}
                  </Button>
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
        title={
          logo ?? (
            <span className="flex items-center gap-2">
              <img
                src={resolvedMode === 'dark' ? kflowLogoWhite : kflowLogo}
                alt=""
                className="h-6 w-6 flex-shrink-0"
              />
              <span>{brandName}</span>
            </span>
          )
        }
        position={drawerPosition}
        width="sm"
        showCloseButton
      >
        <VStack gap="xs" className="py-2">
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              icon={item.icon}
              onClick={() => handleItemClick(item)}
              className={cn(
                rowBtnBase,
                'py-2.5',
                item.active
                  ? 'bg-[var(--color-primary-muted)] font-medium text-[var(--color-foreground)]'
                  : '',
              )}
            >
              <span className="flex-1 truncate text-start">{item.label}</span>
              {item.badge !== undefined && (
                <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-xs font-bold text-[var(--color-primary-foreground)]">
                  {item.badge}
                </span>
              )}
            </Button>
          ))}
        </VStack>
        {pinnedItems.length > 0 && (
          <>
            <Box className="my-2 border-t border-[var(--color-border)]" />
            <VStack gap="xs">
              {pinnedItems.map((item) => (
                <DrawerPathItem
                  key={item.id}
                  label={item.label}
                  iconLabel={item.iconLabel}
                  active={item.active}
                  onClick={item.onClick}
                />
              ))}
            </VStack>
          </>
        )}
      </Drawer>
    </Box>
  );
};

TopNavShell.displayName = 'TopNavShell';
