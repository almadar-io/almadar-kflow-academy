import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../AuthContext';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router';
import { useNavigateEvent } from '../../../hooks/useNavigateEvent';
import { RootState } from '../../../app/store';

const EMAIL_FOR_SIGN_IN_KEY = 'emailForSignIn';

const Login: React.FC = () => {
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
            console.error('Error signing in with email link:', error);
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
      console.error('Google sign-in error:', error);
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
      console.error('Email authentication error:', error);
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
      console.error('Error completing email link sign-in:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-card border border-border rounded-xl p-8 shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            {completingEmailLink 
              ? 'Complete sign-in' 
              : isSignUp 
                ? 'Create your account' 
                : 'Sign in to your account'}
          </h2>
        </div>
        
        <div className="mt-8 space-y-6">
          {/* Email Link Completion Form (when user clicks link but email not in localStorage) */}
          {completingEmailLink && (
            <form onSubmit={handleCompleteEmailLink} className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Please enter your email address to complete sign-in.
                </p>
                <label htmlFor="email-completion" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-completion"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={emailForLinkCompletion}
                  onChange={(e) => setEmailForLinkCompletion(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-border placeholder:text-[var(--color-placeholder)] text-foreground bg-card focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors duration-200"
                  placeholder="Enter your email"
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
                className="group relative w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors duration-200"
              >
                {loading ? 'Signing in...' : 'Complete sign-in'}
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
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors duration-200"
                >
                  {loading ? 'Signing in...' : 'Sign in with Google'}
                </button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">Or sign in with email</span>
                </div>
              </div>

              {/* Email/Password Form */}
              <div className="mt-6">
                <form className="mt-6 space-y-4" onSubmit={handleEmailAuth}>
              {isSignUp && (
                <div>
                  <label htmlFor="displayName" className="sr-only">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    required={isSignUp}
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-border placeholder:text-[var(--color-placeholder)] text-foreground bg-card focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors duration-200"
                    placeholder="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              )}
              
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm transition-colors duration-200"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm transition-colors duration-200"
                  placeholder="Password"
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
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors duration-200"
                >
                  {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                </button>
              </div>
                </form>

                <div className="text-center mt-4">
                  <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-primary hover:text-primary transition-colors duration-200 font-medium text-sm"
                  >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
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
