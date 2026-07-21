import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../AuthContext';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router';
import { useNavigateEvent } from '../../../hooks/useNavigateEvent';
import { RootState } from '../../../app/store';
import { useTranslate } from '@almadar/ui';
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:client:auth:Login');

const EMAIL_FOR_SIGN_IN_KEY = 'emailForSignIn';

const Login: React.FC = () => {
  const { t } = useTranslate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [completingEmailLink, setCompletingEmailLink] = useState(false);
  const [emailForLinkCompletion, setEmailForLinkCompletion] = useState('');
  
  const { 
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithEmailLink,
    isSignInWithEmailLink,
    setOnAuthSuccess 
  } = useAuthContext();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigateEvent();
  const [searchParams] = useSearchParams();
  
  // Set up navigation callback when component mounts
  useEffect(() => {
    const returnUrl = searchParams.get('returnUrl');
    setOnAuthSuccess(() => () => {
      if (returnUrl) {
        navigate(returnUrl, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    });
  }, [setOnAuthSuccess, navigate, searchParams]);

  // Check if user is returning from email link
  useEffect(() => {
    // Check if this is a sign-in link
    if (isSignInWithEmailLink(window.location.href)) {
      // Get the email from localStorage
      const emailForSignIn = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
      
      if (emailForSignIn) {
        // Complete sign-in with email link
        setCompletingEmailLink(true);
        signInWithEmailLink(emailForSignIn, window.location.href)
          .then(() => {
            // Clear the email from localStorage
            window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
            // Clean up the URL
            window.history.replaceState({}, document.title, '/login');
            setCompletingEmailLink(false);
          })
          .catch((error) => {
            log.error('Error signing in with email link', { error: error instanceof Error ? error.message : String(error) });
            setCompletingEmailLink(false);
            // If error, prompt for email
            setEmailForLinkCompletion(emailForSignIn);
          });
      } else {
        // Email not found - user might be on a different device
        // Prompt for email to complete sign-in
        setCompletingEmailLink(true);
        setEmailForLinkCompletion('');
      }
    }
  }, [signInWithEmailLink, isSignInWithEmailLink]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      log.error('Google sign-in error', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error) {
      log.error('Email authentication error', { error: error instanceof Error ? error.message : String(error) });
    }
  };


  const handleCompleteEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailForLinkCompletion.trim()) {
      return;
    }

    try {
      await signInWithEmailLink(emailForLinkCompletion, window.location.href);
      // Clear the email from localStorage
      window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
      // Clean up the URL
      window.history.replaceState({}, document.title, '/login');
      setCompletingEmailLink(false);
      setEmailForLinkCompletion('');
    } catch (error) {
      log.error('Error completing email link sign-in', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-card border border-border rounded-xl p-8 shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            {completingEmailLink
              ? t('auth.completeSignIn')
              : isSignUp
                ? t('auth.createAccount')
                : t('auth.signInToAccount')}
          </h2>
        </div>
        
        <div className="mt-8 space-y-6">
          {/* Email Link Completion Form (when user clicks link but email not in localStorage) */}
          {completingEmailLink && (
            <form onSubmit={handleCompleteEmailLink} className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('auth.enterEmailToComplete')}
                </p>
                <label htmlFor="email-completion" className="sr-only">
                  {t('auth.emailAddress')}
                </label>
                <input
                  id="email-completion"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={emailForLinkCompletion}
                  onChange={(e) => setEmailForLinkCompletion(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-border placeholder:text-[var(--color-placeholder)] text-foreground bg-card focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors duration-fast"
                  placeholder={t('auth.enterYourEmail')}
                />
              </div>

              {error && (
                <div className="text-error text-sm text-center bg-surface p-3 rounded-md border border-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !emailForLinkCompletion.trim()}
                className="group relative w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors duration-fast"
              >
                {loading ? t('auth.signingIn') : t('auth.completeSignIn')}
              </button>
            </form>
          )}

          {/* Regular sign-in flow (if not completing email link) */}
          {!completingEmailLink && (
            <>
              {/* Google Sign In Button */}
              <div>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors duration-fast"
                >
                  {loading ? t('auth.signingIn') : t('auth.signInWithGoogle')}
                </button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">{t('auth.orSignInWithEmail')}</span>
                </div>
              </div>

              {/* Email/Password Form */}
              <div className="mt-6">
                <form className="mt-6 space-y-4" onSubmit={handleEmailAuth}>
              {isSignUp && (
                <div>
                  <label htmlFor="displayName" className="sr-only">
                    {t('auth.displayName')}
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    required={isSignUp}
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-border placeholder:text-[var(--color-placeholder)] text-foreground bg-card focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors duration-fast"
                    placeholder={t('auth.displayName')}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              )}
              
              <div>
                <label htmlFor="email-address" className="sr-only">
                  {t('auth.emailAddress')}
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm transition-colors duration-fast"
                  placeholder={t('auth.emailAddress')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="sr-only">
                  {t('auth.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm transition-colors duration-fast"
                  placeholder={t('auth.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-error text-sm text-center bg-surface p-3 rounded-md border border-error">
                  {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors duration-fast"
                >
                  {loading ? t('auth.processing') : (isSignUp ? t('auth.signUp') : t('auth.signIn'))}
                </button>
              </div>
                </form>

                <div className="text-center mt-4">
                  <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-primary hover:text-primary transition-colors duration-fast font-medium text-sm"
                  >
                    {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
