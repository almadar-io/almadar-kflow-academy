/**
 * AppLayoutTemplate Component
 * 
 * Shared layout template that encapsulates common layout elements used across templates.
 * Includes sidebar, mobile header, flexbox structure, profile popup, and theme toggle.
 * 
 * This template eliminates code duplication and ensures consistent layout behavior
 * across all templates in the component library.
 * 
 * @example
 * ```tsx
 * <AppLayoutTemplate
 *   navigationItems={[
 *     { id: '1', label: 'Dashboard', icon: Home, active: true }
 *   ]}
 *   user={{ name: 'John Doe', email: 'john@example.com' }}
 *   onLogout={() => console.log('Logout')}
 * >
 *   <div>Your content here</div>
 * </AppLayoutTemplate>
 * ```
 */

import React, { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Header } from '../../organisms/Header';
import { Sidebar } from '../../organisms/Sidebar';
import { ProfilePopup } from '../../molecules/ProfilePopup/ProfilePopup';
import { Avatar } from '../../atoms/Avatar';
import ThemeToggle from '../../ThemeToggle';
import { cn } from '../../../utils/theme';

export interface AppLayoutTemplateProps {
  /**
   * Main content to display
   */
  children: React.ReactNode;
  
  /**
   * Navigation items for sidebar
   */
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;
  
  /**
   * User information
   */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  
  /**
   * On logout handler (enables ProfilePopup)
   */
  onLogout?: () => void;
  
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  
  /**
   * Logo image source
   */
  logoSrc?: string;
  
  /**
   * Brand name
   * @default 'KFlow'
   */
  brandName?: string;
  
  /**
   * On logo click
   */
  onLogoClick?: () => void;
  
  /**
   * Mobile header actions (right side)
   */
  mobileHeaderActions?: React.ReactNode;
  
  /**
   * Custom sidebar footer content (defaults to ThemeToggle)
   */
  sidebarFooterContent?: React.ReactNode;
  
  /**
   * Custom sidebar user section (overrides default ProfilePopup)
   */
  sidebarUserSection?: React.ReactNode;
  
  /**
   * Initial sidebar collapsed state
   * @default false
   */
  defaultSidebarCollapsed?: boolean;
  
  /**
   * Hide sidebar completely
   * @default false
   */
  hideSidebar?: boolean;
  
  /**
   * Hide mobile header
   * @default false
   */
  hideMobileHeader?: boolean;
  
  /**
   * Custom page header (desktop, shown above content)
   */
  pageHeader?: React.ReactNode;
  
  /**
   * Content padding
   * @default true
   */
  contentPadding?: boolean;
  
  /**
   * Custom content wrapper className
   */
  contentClassName?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const AppLayoutTemplate: React.FC<AppLayoutTemplateProps> = ({
  children,
  navigationItems = [],
  user,
  onLogout,
  logo,
  logoSrc,
  brandName = 'KFlow',
  onLogoClick,
  mobileHeaderActions,
  sidebarFooterContent,
  sidebarUserSection,
  defaultSidebarCollapsed = false,
  hideSidebar = false,
  hideMobileHeader = false,
  pageHeader,
  contentPadding = true,
  contentClassName,
  className,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(!defaultSidebarCollapsed);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate user initials
  const userInitials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  // Default sidebar footer (ThemeToggle)
  const defaultFooterContent = sidebarFooterContent ?? <ThemeToggle />;

  // Default sidebar user section (ProfilePopup if onLogout provided)
  const defaultUserSection = sidebarUserSection ?? (
    user && onLogout ? (
      <ProfilePopup
        userName={user.name}
        userEmail={user.email}
        userAvatar={user.avatar}
        onLogout={onLogout}
        trigger={
          <button
            type="button"
            className={cn(
              'flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity',
              sidebarOpen ? 'w-full text-left' : 'justify-center'
            )}
          >
            <Avatar
              src={user.avatar}
              initials={userInitials}
              size="sm"
            />
            {sidebarOpen && (
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                {user.name}
              </span>
            )}
          </button>
        }
        position="top-right"
      />
    ) : user ? (
      sidebarOpen ? (
        <div className="flex items-center gap-2">
          <Avatar
            src={user.avatar}
            initials={userInitials}
            size="sm"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
            {user.name}
          </span>
        </div>
      ) : (
        <Avatar
          src={user.avatar}
          initials={userInitials}
          size="sm"
        />
      )
    ) : null
  );

  // Mobile header actions (default includes ThemeToggle and ProfilePopup)
  const defaultMobileHeaderActions = mobileHeaderActions ?? (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      {user && onLogout && (
        <ProfilePopup
          userName={user.name}
          userEmail={user.email}
          userAvatar={user.avatar}
          onLogout={onLogout}
          trigger={
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-700 transition-all cursor-pointer"
            >
              {user.avatar ? (
                <Avatar src={user.avatar} initials={userInitials} size="sm" />
              ) : (
                userInitials
              )}
            </button>
          }
        />
      )}
    </div>
  );

  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900 flex', className)}>
      {/* Mobile Overlay */}
      {!hideSidebar && mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {!hideSidebar && (
        <aside
          className={cn(
            'fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-[60]',
            'transition-all duration-300 ease-in-out',
            sidebarOpen ? 'lg:w-64' : 'lg:w-20',
            mobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <Sidebar
            logo={logo}
            logoSrc={logoSrc}
            brandName={brandName}
            items={navigationItems.map(item => ({
              id: item.id,
              label: item.label,
              icon: item.icon,
              href: item.href,
              onClick: () => {
                item.onClick?.();
                if (isMobile) {
                  setMobileSidebarOpen(false);
                }
              },
              badge: item.badge,
              active: item.active,
            }))}
            userSection={defaultUserSection}
            footerContent={defaultFooterContent}
            collapsed={!sidebarOpen}
            onCollapseChange={(collapsed) => setSidebarOpen(!collapsed)}
            showCloseButton={mobileSidebarOpen}
            onClose={() => setMobileSidebarOpen(false)}
            onLogoClick={onLogoClick}
          />
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        {!hideMobileHeader && (
          <Header
            brandName={brandName}
            logo={logo}
            logoSrc={logoSrc}
            isMenuOpen={mobileSidebarOpen}
            onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            variant="mobile"
            sticky={true}
            actions={defaultMobileHeaderActions}
            onLogoClick={onLogoClick}
          />
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {/* Custom page header (desktop) */}
          {pageHeader && (
            <header className="hidden lg:block sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                  {pageHeader}
                </div>
              </div>
            </header>
          )}

          {/* Content */}
          <div
            className={cn(
              contentPadding && 'p-2 sm:p-4 lg:p-6',
              contentClassName
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

AppLayoutTemplate.displayName = 'AppLayoutTemplate';
