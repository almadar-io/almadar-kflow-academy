import React, { useState, useEffect, useCallback } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApolloProvider } from '@apollo/client';
import { I18nProvider, createTranslate, useEventListener, NotifyListener } from '@almadar/ui';
import type { I18nContextValue } from '@almadar/ui';
import { EventBusProvider } from '@almadar/ui/providers';
import { ThemeProvider } from '@almadar/ui/context';
import { store } from './store';
import { queryClient } from './queryClient';
import { apolloClient } from '../features/knowledge-graph';
import { AuthProvider } from '../features/auth';
import ErrorHandlerInitializer from './ErrorHandlerInitializer';
import type { JsonValue } from '@almadar-io/knowledge';
import enMessagesRaw from '../locales/en.json';
import arMessagesRaw from '../locales/ar.json';
import slMessagesRaw from '../locales/sl.json';

type SupportedLocale = 'en' | 'ar' | 'sl';

function filterMessages(raw: Record<string, JsonValue>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' && !k.startsWith('$')) out[k] = v;
  }
  return out;
}

const messagesByLocale: Record<SupportedLocale, Record<string, string>> = {
  en: filterMessages(enMessagesRaw as Record<string, JsonValue>),
  ar: filterMessages(arMessagesRaw as Record<string, JsonValue>),
  sl: filterMessages(slMessagesRaw as Record<string, JsonValue>),
};

const metaByLocale: Record<SupportedLocale, { direction: 'ltr' | 'rtl' }> = {
  en: { direction: 'ltr' },
  ar: { direction: 'rtl' },
  sl: { direction: 'ltr' },
};

function buildI18nValue(locale: SupportedLocale): I18nContextValue {
  return {
    locale,
    direction: metaByLocale[locale].direction,
    t: createTranslate(messagesByLocale[locale]),
  };
}

function getInitialLocale(): SupportedLocale {
  const stored = localStorage.getItem('kflow-locale');
  if (stored === 'ar' || stored === 'sl' || stored === 'en') return stored;
  return 'en';
}

interface ProvidersProps {
  children: React.ReactNode;
}

function I18nController({ children }: ProvidersProps): React.JSX.Element {
  const [locale, setLocale] = useState<SupportedLocale>(getInitialLocale);
  const [i18nValue, setI18nValue] = useState<I18nContextValue>(() => buildI18nValue(getInitialLocale()));

  const handleSetLocale = useCallback((event: { payload?: { locale?: string } }) => {
    const next = event.payload?.locale;
    if (next !== 'en' && next !== 'ar' && next !== 'sl') return;
    localStorage.setItem('kflow-locale', next);
    setLocale(next);
    setI18nValue(buildI18nValue(next));
  }, []);

  useEventListener('UI:SET_LOCALE', handleSetLocale);

  useEffect(() => {
    document.documentElement.dir = metaByLocale[locale].direction;
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nProvider value={i18nValue}>
      {children}
    </I18nProvider>
  );
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <EventBusProvider>
      <NotifyListener />
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApolloProvider client={apolloClient}>
            <I18nController>
              <ThemeProvider
                themes={[{ name: 'kflow', displayName: 'KFlow', hasLightMode: true, hasDarkMode: true }]}
                defaultTheme="kflow"
                defaultMode="dark"
              >
                <ErrorHandlerInitializer />
                <AuthProvider>
                  {children}
                </AuthProvider>
              </ThemeProvider>
            </I18nController>
          </ApolloProvider>
        </QueryClientProvider>
      </Provider>
    </EventBusProvider>
  );
};
