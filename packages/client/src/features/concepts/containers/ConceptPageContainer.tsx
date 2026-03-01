/**
 * Container component for ConceptPageContainer (pages/ConceptPageContainer)
 * Provides template props (user, navigationItems) to ConceptPageContainer.
 * Library pages (ConceptDetailPage, ConceptListPage) include their own templates (KnowledgeGraphTemplate),
 * so we no longer wrap with DashboardTemplate.
 */

import React, { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuthContext } from '../../auth/AuthContext';
import ConceptPageContainer from '../../../pages/ConceptPageContainer';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';

const ConceptPageContainerWrapper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthContext();

  // Logout handler
  const handleLogout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  // Navigation configuration for library pages
  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

  return (
    <ConceptPageContainer
      user={templateUser}
      navigationItems={navigationItems}
      onLogoClick={() => navigate('/home')}
      onLogout={handleLogout}
    />
  );
};

ConceptPageContainerWrapper.displayName = 'ConceptPageContainerWrapper';

export default ConceptPageContainerWrapper;
export { ConceptPageContainerWrapper };
