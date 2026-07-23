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
import { useTheme } from '@almadar/ui/context';
import { useFont } from '../features/theme/FontContext';
import { AppShellTemplate } from '@design-system/templates/AppShellTemplate';
import { CompanionBell } from '@design-system/organisms/CompanionBell';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import { useAuthContext } from '../features/auth/AuthContext';
import kflowLogo from '../assets/kflow-logo.svg';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthContext();
  const location = useLocation();
  const { emit } = useEventBus();
  const { t } = useTranslate();
  const { theme, setTheme, mode, setMode, resolvedMode, availableThemes } = useTheme();
  const { font, setFont, availableFonts } = useFont();

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

  const themeOptions: SelectOption[] = useMemo(
    () => availableThemes.map((t) => ({ value: t.name, label: t.displayName ?? t.name })),
    [availableThemes]
  );

  const modeOptions: SelectOption[] = useMemo(
    () => [
      { value: 'system', label: t('settings.themeSystem') },
      { value: 'light', label: t('settings.themeLight') },
      { value: 'dark', label: t('settings.themeDark') },
    ],
    [t]
  );

  const fontOptions: SelectOption[] = useMemo(
    () => availableFonts.map((f) => ({ value: f.id, label: f.displayName })),
    [availableFonts]
  );

  const handleLocaleChange = useCallback((value: string | string[]) => {
    const next = Array.isArray(value) ? value[0] : value;
    emit('UI:SET_LOCALE', { locale: next });
  }, [emit]);

  const handleThemeChange = useCallback((value: string | string[]) => {
    const next = Array.isArray(value) ? value[0] : value;
    setTheme(next);
  }, [setTheme]);

  const handleModeChange = useCallback((value: string | string[]) => {
    const next = Array.isArray(value) ? value[0] : value;
    setMode(next as 'light' | 'dark' | 'system');
  }, [setMode]);

  const handleFontChange = useCallback((value: string | string[]) => {
    const next = Array.isArray(value) ? value[0] : value;
    setFont(next);
  }, [setFont]);

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
    theme: resolvedMode,
    actionsSlot: <CompanionBell />,
  };

  return (
    <AppShellTemplate entity={shellEntity}>
      <Box className="p-6 max-w-lg">
        <Typography variant="h2" className="mb-6">{t('nav.settings')}</Typography>
        <Card className="p-6 mb-6">
          <Typography variant="h4" className="mb-4">{t('settings.language')}</Typography>
          <Select
            options={localeOptions}
            value={typeof window !== 'undefined' ? (localStorage.getItem('kflow-locale') ?? 'en') : 'en'}
            onValueChange={handleLocaleChange}
            className="w-full"
          />
        </Card>
        <Card className="p-6">
          <Typography variant="h4" className="mb-4">{t('settings.appearance')}</Typography>
          <Box className="mb-4">
            <Typography variant="body2" className="mb-2">{t('settings.themeStyle')}</Typography>
            <Select
              options={themeOptions}
              value={theme}
              onValueChange={handleThemeChange}
              className="w-full"
            />
          </Box>
          <Box className="mb-4">
            <Typography variant="body2" className="mb-2">{t('settings.colorMode')}</Typography>
            <Select
              options={modeOptions}
              value={mode}
              onValueChange={handleModeChange}
              className="w-full"
            />
          </Box>
          <Box>
            <Typography variant="body2" className="mb-2">{t('settings.font')}</Typography>
            <Select
              options={fontOptions}
              value={font.id}
              onValueChange={handleFontChange}
              className="w-full"
            />
          </Box>
        </Card>
      </Box>
    </AppShellTemplate>
  );
};

SettingsPage.displayName = 'SettingsPage';
