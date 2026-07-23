import React from 'react';
import { useLocation } from 'react-router';
import { useAuthContext } from '../features/auth/AuthContext';
import { AppLayoutTemplate } from '@design-system/templates/AppLayoutTemplate';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import { useNavigateEvent } from '../hooks/useNavigateEvent';
import { useLearningPaths } from '../features/knowledge-graph/hooks/useLearningPaths';
import { useCompanion } from '../features/companion/hooks/useCompanion';
import { useCompanionPersona } from '../features/companion/hooks/useCompanionPersona';
import { CompanionBell } from '@design-system/organisms/CompanionBell';

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

  // Companion: gated behind auth + having at least one learning path.
  // Lifted to the shell so the bell is available on every page.
  const { learningPaths } = useLearningPaths();
  const hasPaths = learningPaths.length > 0;
  const companionEnabled = !!user && hasPaths;
  const companion = useCompanion(companionEnabled);
  const { persona } = useCompanionPersona(companionEnabled);

  const actionsSlot = companionEnabled ? (
    <CompanionBell
      persona={persona}
      suggestions={companion.suggestions}
      events={companion.events}
      loading={companion.loading}
      replying={companion.replying}
      onAccept={companion.accept}
      onDismiss={companion.dismiss}
      onReply={companion.reply}
    />
  ) : undefined;

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={templateUser}
      brandName="KFlow"
      contentPadding={true}
      actionsSlot={actionsSlot}
    >
      {children}
    </AppLayoutTemplate>
  );
};
