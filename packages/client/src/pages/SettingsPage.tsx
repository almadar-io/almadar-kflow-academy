import React, { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router';
import {
  Box,
  Card,
  Select,
  Typography,
  useEventBus,
  useTranslate,
  type SelectOption,
} from '@almadar/ui';
import { AppShellTemplate } from '@design-system/templates/AppShellTemplate';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import { useAuthContext } from '../features/auth/AuthContext';
import kflowLogo from '../assets/kflow-logo.svg';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthContext();
  const location = useLocation();
  const { emit } = useEventBus();
  const { t } = useTranslate();

  const templateUser = getUserForTemplate(user);

  const navItems = useMemo(
    () => getNavigationItems(location.pathname, mainNavItems),
    [location.pathname]
  );

  const localeOptions: SelectOption[] = [
    { value: 'en', label: t('locale.en') },
    { value: 'ar', label: t('locale.ar') },
    { value: 'sl', label: t('locale.sl') },
  ];

  const handleLocaleChange = useCallback((value: string | string[]) => {
    const next = Array.isArray(value) ? value[0] : value;
    emit('UI:SET_LOCALE', { locale: next });
  }, [emit]);

  const shellEntity = {
    navigationItems: navItems.map(item => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
      href: item.href,
      active: item.active,
    })),
    user: templateUser,
    logoSrc: kflowLogo,
    brandName: 'KFlow',
    activeRoute: location.pathname,
    theme: 'light' as const,
  };

  return (
    <AppShellTemplate entity={shellEntity}>
      <Box className="p-6 max-w-lg">
        <Typography variant="h2" className="mb-6">{t('nav.settings')}</Typography>
        <Card className="p-6">
          <Typography variant="h4" className="mb-4">Language</Typography>
          <Select
            options={localeOptions}
            value={typeof window !== 'undefined' ? (localStorage.getItem('kflow-locale') ?? 'en') : 'en'}
            onValueChange={handleLocaleChange}
            className="w-full"
          />
        </Card>
      </Box>
    </AppShellTemplate>
  );
};

SettingsPage.displayName = 'SettingsPage';
