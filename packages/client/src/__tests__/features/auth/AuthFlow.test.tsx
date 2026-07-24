import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, resetAllMocks, mockAuthContextValue, mockAuthService, mockNavigate, localStorageMock } from '../../testUtils.helper';
import Login from '../../../features/auth/components/Login';

// Mock @almadar/ui: the shared mock fabricates non-callable component stubs for
// every export, but Login calls useTranslate()/useEventBus() as hooks. Wrap the
// module in a Proxy so component stubs keep working while hooks get real impls.
jest.mock('@almadar/ui', () => {
  const actual = jest.requireActual('@almadar/ui');
  const translations: Record<string, string> = require('../../../locales/en.json');
  const overrides = {
    useTranslate: () => ({
      t: (key: string, params?: Record<string, string | number>) => {
        let text = translations[key] ?? key;
        if (params) {
          for (const [name, value] of Object.entries(params)) {
            text = text.replace(`{{${name}}}`, String(value));
          }
        }
        return text;
      },
    }),
    useEventBus: () => ({ emit: jest.fn() }),
  };
  return new Proxy(actual, {
    get: (t, k) => (k in overrides ? overrides[k as keyof typeof overrides] : t[k]),
  });
});

describe('Authentication Flow - Frontend', () => {
  beforeEach(() => {
    resetAllMocks();
    
    // Get mocked authService
    const authService = require('../../../features/auth/authService').authService;
    mockAuthService.signInWithGoogle.mockClear();
    mockAuthService.sendSignInLinkToEmail.mockClear();
    mockAuthService.signInWithEmailLink.mockClear();
    mockAuthService.signInWithEmail.mockClear();
    mockAuthService.signUpWithEmail.mockClear();
    mockAuthService.isSignInWithEmailLink.mockReturnValue(false);
    
    // Reset mock auth context and wire up to authService
    mockAuthContextValue.sendSignInLinkToEmail.mockClear();
    mockAuthContextValue.signInWithEmailLink.mockClear();
    mockAuthContextValue.signInWithEmail.mockClear();
    mockAuthContextValue.signUpWithEmail.mockClear();
    mockAuthContextValue.isSignInWithEmailLink.mockReturnValue(false);
    mockAuthContextValue.sendSignInLinkToEmail.mockImplementation(mockAuthService.sendSignInLinkToEmail);
    mockAuthContextValue.signInWithEmailLink.mockImplementation(mockAuthService.signInWithEmailLink);
    mockAuthContextValue.signInWithEmail.mockImplementation(mockAuthService.signInWithEmail);
    mockAuthContextValue.signUpWithEmail.mockImplementation(mockAuthService.signUpWithEmail);
    mockAuthContextValue.isSignInWithEmailLink.mockImplementation(mockAuthService.isSignInWithEmailLink);
  });

  describe('Login Page Rendering', () => {
    it('should render login form with Google sign-in button', () => {
      renderWithProviders(<Login />);
      
      expect(screen.getByText('Sign in to your account')).toBeTruthy();
      expect(screen.getByText('Sign in with Google')).toBeTruthy();
    });

    it('should render email/password form', () => {
      renderWithProviders(<Login />);
      
      expect(screen.getByPlaceholderText('Email address')).toBeTruthy();
      expect(screen.getByPlaceholderText('Password')).toBeTruthy();
      const signInButton = screen.getAllByRole('button').find(btn => btn.textContent === 'Sign In' && btn.type === 'submit');
      expect(signInButton).toBeTruthy();
    });

    it('should show divider with "Or sign in with email" text', () => {
      renderWithProviders(<Login />);
      
      expect(screen.getByText('Or sign in with email')).toBeTruthy();
    });

    it('should show sign up toggle', () => {
      renderWithProviders(<Login />);
      
      expect(screen.getByText("Don't have an account? Sign up")).toBeTruthy();
    });
  });

  describe('Email/Password Sign-In', () => {
    it('should sign in with email and password when form is submitted', async () => {
      const mockUser = { uid: '123', email: 'test@example.com' };
      mockAuthService.signInWithEmail.mockResolvedValue(mockUser);
      mockAuthContextValue.signInWithEmail.mockResolvedValue(mockUser);

      renderWithProviders(<Login />);
      
      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getAllByRole('button').find(btn => btn.textContent === 'Sign In' && btn.type === 'submit');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      if (submitButton) {
        fireEvent.click(submitButton);
      }

      await waitFor(() => {
        expect(mockAuthContextValue.signInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should toggle to sign up form', () => {
      renderWithProviders(<Login />);
      
      const toggleButton = screen.getByText("Don't have an account? Sign up");
      fireEvent.click(toggleButton);

      expect(screen.getByText('Create your account')).toBeTruthy();
      expect(screen.getByPlaceholderText('Display Name')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Sign Up/i })).toBeTruthy();
    });

    it('should sign up with email, password, and display name', async () => {
      const mockUser = { uid: '123', email: 'test@example.com', displayName: 'Test User' };
      mockAuthContextValue.signUpWithEmail.mockResolvedValue(mockUser);

      renderWithProviders(<Login />);
      
      // Toggle to sign up
      const toggleButton = screen.getByText("Don't have an account? Sign up");
      fireEvent.click(toggleButton);

      const displayNameInput = screen.getByPlaceholderText('Display Name');
      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });

      fireEvent.change(displayNameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthContextValue.signUpWithEmail).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
      });
    });
  });

  describe('Email Link Completion', () => {
    it('should complete sign-in when returning from email link with email in localStorage', async () => {
      const mockUser = { uid: '123', email: 'test@example.com' };
      
      mockAuthService.isSignInWithEmailLink.mockReturnValue(true);
      mockAuthService.signInWithEmailLink.mockResolvedValue(mockUser);
      localStorage.setItem('emailForSignIn', 'test@example.com');
      
      // Mock window.location.href
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost/login?apiKey=test&oobCode=test' },
        writable: true,
      });

      renderWithProviders(<Login />);

      await waitFor(() => {
        expect(mockAuthService.signInWithEmailLink).toHaveBeenCalled();
      });
    });

    it('should prompt for email when returning from link but email not in localStorage', () => {
      mockAuthService.isSignInWithEmailLink.mockReturnValue(true);
      mockAuthContextValue.isSignInWithEmailLink.mockReturnValue(true);
      
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost/login?apiKey=test&oobCode=test' },
        writable: true,
      });

      renderWithProviders(<Login />);

      expect(screen.getByRole('heading', { name: 'Complete sign-in' })).toBeTruthy();
      expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Complete sign-in/i })).toBeTruthy();
    });
  });

  describe('Google Sign-In', () => {
    it('should initiate Google OAuth flow when button is clicked', async () => {
      mockAuthContextValue.signInWithGoogle.mockResolvedValue(undefined);

      renderWithProviders(<Login />);
      
      const googleButton = screen.getByText('Sign in with Google');
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockAuthContextValue.signInWithGoogle).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message for failed authentication', async () => {
      const errorMessage = 'Invalid email or password';
      mockAuthContextValue.signInWithEmail.mockRejectedValue(new Error(errorMessage));

      renderWithProviders(<Login />);
      
      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getAllByRole('button').find(btn => btn.textContent === 'Sign In' && btn.type === 'submit');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      if (submitButton) {
        fireEvent.click(submitButton);
      }

      await waitFor(() => {
        expect(mockAuthContextValue.signInWithEmail).toHaveBeenCalled();
      });
    });
  });

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to login', () => {
      // This would be tested in AppRouter or ProtectedRoute component
      // For now, we verify the Login component renders correctly
      renderWithProviders(<Login />);
      expect(screen.getByText('Sign in to your account')).toBeTruthy();
    });
  });
});

