/**
 * AppLayout - shared sidebar layout wrapper for all pages.
 *
 * Provides the KFlow sidebar, navigation, user profile, and logout
 * so every page gets a consistent chrome.
 */

import React from 'react';
import { useLocation } from 'react-router';
import { useAuthContext } from '../features/auth/AuthContext';
import { AppLayoutTemplate } from './templates/AppLayoutTemplate';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import { useNavigateEvent } from '../hooks/useNavigateEvent';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigateEvent();
  const location = useLocation();
  const { user, signOut } = useAuthContext();

  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));

  const templateUser = getUserForTemplate(user);

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={templateUser}
      onLogout={user ? () => signOut() : undefined}
      onLogoClick={() => navigate('/home')}
      brandName="KFlow"
      contentPadding={true}
    >
      {children}
    </AppLayoutTemplate>
  );
};
