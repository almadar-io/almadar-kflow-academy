import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router';
import { configureStore, Store } from '@reduxjs/toolkit';
import authSlice from '../features/auth/authSlice';
import conceptsSlice from '../features/concepts/conceptSlice';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock Firebase Auth
export const mockFirebaseAuth = {
  currentUser: null,
  onAuthStateChanged: jest.fn((callback) => {
    setTimeout(() => callback(null), 0);
    return jest.fn(); // unsubscribe function
  }),
};

jest.mock('../config/firebase', () => ({
  auth: mockFirebaseAuth,
}));

// Mock authService
export const mockAuthService = {
  signInWithGoogle: jest.fn(),
  sendSignInLinkToEmail: jest.fn(),
  signInWithEmailLink: jest.fn(),
  isSignInWithEmailLink: jest.fn(() => false),
  signOut: jest.fn(),
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
};

jest.mock('../features/auth/authService', () => ({
  authService: mockAuthService,
}));

// Mock useAuthContext hook
export const mockAuthContextValue = {
  user: null,
  loading: false,
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
  sendSignInLinkToEmail: jest.fn(),
  signInWithEmailLink: jest.fn(),
  isSignInWithEmailLink: jest.fn(() => false),
  onAuthSuccess: undefined,
  setOnAuthSuccess: jest.fn(),
};

jest.mock('../features/auth/AuthContext', () => ({
  ...jest.requireActual('../features/auth/AuthContext'),
  useAuthContext: () => mockAuthContextValue,
}));

// Mock react-router navigate
export const mockNavigate = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

// Mock loadConceptGraphs
jest.mock('../features/concepts', () => ({
  loadConceptGraphs: jest.fn(() => ({ type: 'concepts/loadConceptGraphs' })),
}));

// Mock localStorage
export const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Helper to create a test store
export const createTestStore = (preloadedState = {}): Store => {
  return configureStore({
    reducer: {
      auth: authSlice,
      concepts: conceptsSlice,
    },
    preloadedState,
  });
};

// Helper to render with providers
interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: Store;
}

export const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
  }: RenderWithProvidersOptions = {}
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>{children}</ThemeProvider>
      </BrowserRouter>
    </Provider>
  );

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

// Helper to reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();
  mockNavigate.mockClear();
  localStorageMock.clear();
  Object.keys(mockAuthService).forEach((key) => {
    if (typeof mockAuthService[key as keyof typeof mockAuthService] === 'function') {
      (mockAuthService[key as keyof typeof mockAuthService] as jest.Mock).mockClear();
    }
  });
  Object.keys(mockAuthContextValue).forEach((key) => {
    if (typeof mockAuthContextValue[key as keyof typeof mockAuthContextValue] === 'function') {
      (mockAuthContextValue[key as keyof typeof mockAuthContextValue] as jest.Mock).mockClear();
    }
  });
};

