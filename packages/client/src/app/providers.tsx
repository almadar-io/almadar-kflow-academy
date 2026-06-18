import React from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApolloProvider } from '@apollo/client';
import { I18nProvider, NotifyListener, createTranslate } from '@almadar/ui';
import { EventBusProvider } from '@almadar/ui/providers';
import { ThemeProvider } from '@almadar/ui/context';
import { store } from './store';
import { queryClient } from './queryClient';
import { apolloClient } from '../features/knowledge-graph';
import { AuthProvider } from '../features/auth';
import ErrorHandlerInitializer from '../components/ErrorHandlerInitializer';
import enMessagesRaw from '../locales/en.json';

// Filter out non-string entries ($meta, $extends) from locale file
const enMessages: Record<string, string> = {};
for (const [k, v] of Object.entries(enMessagesRaw)) {
  if (typeof v === 'string') enMessages[k] = v;
}

const i18nValue = {
  locale: 'en',
  direction: 'ltr' as const,
  t: createTranslate(enMessages),
};

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <EventBusProvider>
      <NotifyListener />
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApolloProvider client={apolloClient}>
            <I18nProvider value={i18nValue}>
              <ThemeProvider defaultMode="dark">
                <ErrorHandlerInitializer />
                <AuthProvider>
                  {children}
                </AuthProvider>
              </ThemeProvider>
            </I18nProvider>
          </ApolloProvider>
        </QueryClientProvider>
      </Provider>
    </EventBusProvider>
  );
};
