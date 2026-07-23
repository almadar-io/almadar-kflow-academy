import React from 'react';
import { Box, useTranslate, useEventBus } from '@almadar/ui';
import { AppLayoutTemplate } from '@design-system/templates/AppLayoutTemplate';
import { CompanionChat } from '@design-system/organisms/CompanionChat';
import { CompanionBell } from '@design-system/organisms/CompanionBell';
import { useAuthContext } from '../features/auth/AuthContext';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import { useNavigateEvent } from '../hooks/useNavigateEvent';
import { useLocation } from 'react-router';

export const CompanionPage: React.FC = () => {
  const navigate = useNavigateEvent();
  const location = useLocation();
  const { user } = useAuthContext();
  const { t } = useTranslate();
  const { emit } = useEventBus();

  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));

  const templateUser = getUserForTemplate(user);
  const handleLogoClick = () => emit('UI:LOGO_CLICK', {});

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={templateUser}
      brandName="KFlow"
      contentPadding={true}
      actionsSlot={<CompanionBell />}
      pageHeader={
        <span className="text-lg font-semibold text-[var(--color-foreground)]">
          {t('companion.chat.pageTitle')}
        </span>
      }
      onLogoClick={handleLogoClick}
    >
      <Box className="h-[calc(100vh-8rem)]">
        <CompanionChat />
      </Box>
    </AppLayoutTemplate>
  );
};
