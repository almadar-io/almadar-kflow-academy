import React from 'react';
import { useLocation } from 'react-router';
import { useAuthContext } from '../features/auth/AuthContext';
import { AppLayoutTemplate } from '@design-system/templates/AppLayoutTemplate';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import { useNavigateEvent } from '../hooks/useNavigateEvent';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigateEvent();
  const location = useLocation();
  const { user } = useAuthContext();

  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));

  const templateUser = getUserForTemplate(user);

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={templateUser}
      brandName="KFlow"
      contentPadding={true}
    >
      {children}
    </AppLayoutTemplate>
  );
};
