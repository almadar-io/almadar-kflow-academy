/**
 * Shared Navigation Configuration
 * 
 * Used by all templates that include Header/Sidebar.
 * This ensures consistent navigation across the app.
 */

import {
  LayoutDashboard,
  Brain,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: string | number;
}

/**
 * Main navigation items for authenticated users
 */
export const mainNavItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/home' },
  { id: 'learn', label: 'Learn', icon: Brain, href: '/learn' },
];

/**
 * Public navigation items (for unauthenticated users)
 */
export const publicNavItems: NavigationItem[] = [
  // Public navigation items can be added here when needed
];

/**
 * Get navigation items with active state based on current path
 */
export function getNavigationItems(
  currentPath: string,
  items: NavigationItem[] = mainNavItems
): Array<NavigationItem & { active: boolean }> {
  return items.map(item => ({
    ...item,
    active: currentPath === item.href || currentPath.startsWith(item.href + '/'),
  }));
}

/**
 * Transform user data for template consumption
 */
export function getUserForTemplate(user: { 
  displayName?: string | null; 
  email?: string | null;
  photoURL?: string | null;
} | null) {
  if (!user) return undefined;
  
  return {
    name: user.displayName || user.email || 'User',
    email: user.email || undefined,
    avatar: user.photoURL || undefined,
  };
}
