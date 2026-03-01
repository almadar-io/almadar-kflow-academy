/**
 * AuthTemplate Component
 * 
 * Authentication pages (login, signup, forgot password, reset password).
 * Uses Form organism and Card, FormField, Alert molecules.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { FormField } from '../../molecules/FormField';
import { Alert } from '../../molecules/Alert';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Divider } from '../../atoms/Divider';
import { Spinner } from '../../atoms/Spinner';
import { cn } from '../../../utils/theme';

export type AuthVariant = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'verify-email';

export interface AuthTemplateProps {
  /**
   * Auth variant
   */
  variant: AuthVariant;
  
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  
  /**
   * App name
   */
  appName?: string;
  
  /**
   * On form submit
   */
  onSubmit?: (data: Record<string, string>) => void;
  
  /**
   * On social login
   */
  onSocialLogin?: (provider: 'google' | 'github') => void;
  
  /**
   * Show social login options
   */
  showSocialLogin?: boolean;
  
  /**
   * On forgot password click
   */
  onForgotPassword?: () => void;
  
  /**
   * On sign up click
   */
  onSignUp?: () => void;
  
  /**
   * On sign in click
   */
  onSignIn?: () => void;
  
  /**
   * On back click
   */
  onBack?: () => void;
  
  /**
   * On resend verification email
   */
  onResendVerification?: () => void;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Error message
   */
  error?: string;
  
  /**
   * Success message
   */
  success?: string;
  
  /**
   * Email for reset/verify (pre-filled)
   */
  email?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const AuthTemplate: React.FC<AuthTemplateProps> = ({
  variant,
  logo,
  appName = 'KFlow',
  onSubmit,
  onSocialLogin,
  showSocialLogin = true,
  onForgotPassword,
  onSignUp,
  onSignIn,
  onBack,
  onResendVerification,
  loading = false,
  error,
  success,
  email: initialEmail = '',
  className,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    email: initialEmail,
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  const getTitle = () => {
    switch (variant) {
      case 'login': return 'Welcome back';
      case 'signup': return 'Create an account';
      case 'forgot-password': return 'Forgot password?';
      case 'reset-password': return 'Reset password';
      case 'verify-email': return 'Verify your email';
    }
  };

  const getSubtitle = () => {
    switch (variant) {
      case 'login': return 'Sign in to continue your learning journey';
      case 'signup': return 'Start your learning journey today';
      case 'forgot-password': return "Enter your email and we'll send you a reset link";
      case 'reset-password': return 'Enter your new password';
      case 'verify-email': return `We sent a verification link to ${formData.email || initialEmail}`;
    }
  };

  const getSubmitText = () => {
    switch (variant) {
      case 'login': return 'Sign in';
      case 'signup': return 'Create account';
      case 'forgot-password': return 'Send reset link';
      case 'reset-password': return 'Reset password';
      case 'verify-email': return 'Resend email';
    }
  };

  return (
    <div className={cn(
      'min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8',
      'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500',
      className
    )}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <Card className="w-full max-w-md relative z-10">
        {/* Back button */}
        {onBack && variant !== 'login' && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-3 sm:top-4 left-3 sm:left-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Logo */}
        <div className="text-center mb-4 sm:mb-6 pt-4 sm:pt-0">
          {logo || (
            <Typography variant="h3" className="text-xl sm:text-2xl md:text-3xl text-indigo-600 dark:text-indigo-400 font-bold">
              {appName}
            </Typography>
          )}
        </div>

        {/* Title */}
        <div className="text-center mb-4 sm:mb-6">
          <Typography variant="h4" className="mb-2 text-xl sm:text-2xl md:text-3xl">
            {getTitle()}
          </Typography>
          <Typography variant="body" color="secondary" className="text-sm sm:text-base">
            {getSubtitle()}
          </Typography>
        </div>

        {/* Error/Success messages */}
        {error && (
          <Alert variant="error" className="mb-4">{error}</Alert>
        )}
        {success && (
          <Alert variant="success" className="mb-4">{success}</Alert>
        )}

        {/* Verify email view */}
        {variant === 'verify-email' ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <Typography variant="body" color="secondary">
              Check your inbox and click the verification link to continue.
            </Typography>
            <Button
              variant="secondary"
              onClick={onResendVerification}
              loading={loading}
              fullWidth
            >
              Resend verification email
            </Button>
            <Button
              variant="ghost"
              onClick={onSignIn}
              fullWidth
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (signup only) */}
            {variant === 'signup' && (
              <FormField
                label="Full name"
                type="input"
                inputProps={{
                  value: formData.name,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('name', e.target.value),
                  placeholder: 'Enter your name',
                  icon: User,
                  required: true,
                }}
              />
            )}

            {/* Email field */}
            {(variant === 'login' || variant === 'signup' || variant === 'forgot-password') && (
              <FormField
                label="Email"
                type="input"
                inputProps={{
                  type: 'email',
                  value: formData.email,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value),
                  placeholder: 'Enter your email',
                  icon: Mail,
                  required: true,
                }}
              />
            )}

            {/* Password field */}
            {(variant === 'login' || variant === 'signup' || variant === 'reset-password') && (
              <FormField
                label="Password"
                type="input"
                inputProps={{
                  type: showPassword ? 'text' : 'password',
                  value: formData.password,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('password', e.target.value),
                  placeholder: variant === 'reset-password' ? 'Enter new password' : 'Enter your password',
                  icon: Lock,
                  required: true,
                }}
              />
            )}

            {/* Confirm password field */}
            {(variant === 'signup' || variant === 'reset-password') && (
              <FormField
                label="Confirm password"
                type="input"
                inputProps={{
                  type: showConfirmPassword ? 'text' : 'password',
                  value: formData.confirmPassword,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('confirmPassword', e.target.value),
                  placeholder: 'Confirm your password',
                  icon: Lock,
                  required: true,
                }}
              />
            )}

            {/* Forgot password link */}
            {variant === 'login' && onForgotPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              {getSubmitText()}
            </Button>

            {/* Social login */}
            {showSocialLogin && (variant === 'login' || variant === 'signup') && (
              <>
                <Divider label="or continue with" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onSocialLogin?.('google')}
                    disabled={loading}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onSocialLogin?.('github')}
                    disabled={loading}
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub
                  </Button>
                </div>
              </>
            )}

            {/* Switch auth mode */}
            <div className="text-center">
              {variant === 'login' && onSignUp && (
                <Typography variant="small" color="secondary">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={onSignUp}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </Typography>
              )}
              {variant === 'signup' && onSignIn && (
                <Typography variant="small" color="secondary">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </Typography>
              )}
              {(variant === 'forgot-password' || variant === 'reset-password') && onSignIn && (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

AuthTemplate.displayName = 'AuthTemplate';

