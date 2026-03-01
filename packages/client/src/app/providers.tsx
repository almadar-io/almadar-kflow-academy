import React from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApolloProvider } from '@apollo/client';
import { store } from './store';
import { queryClient } from './queryClient';
import { apolloClient } from '../features/knowledge-graph';
import { AuthProvider } from '../features/auth';
import { AlertProvider } from '../contexts/AlertContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import AlertContainer from '../components/AlertContainer';
import ErrorHandlerInitializer from '../components/ErrorHandlerInitializer';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ApolloProvider client={apolloClient}>
          <ThemeProvider>
            <AlertProvider>
              <ErrorHandlerInitializer />
              <AuthProvider>
                {children}
                <AlertContainer />
              </AuthProvider>
            </AlertProvider>
          </ThemeProvider>
        </ApolloProvider>
      </QueryClientProvider>
    </Provider>
  );
};
