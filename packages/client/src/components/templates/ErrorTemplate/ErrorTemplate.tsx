/**
 * ErrorTemplate Component
 * 
 * Error pages (404, 500, maintenance, etc.).
 * Uses EmptyState, Card molecules and atoms.
 */

import React from 'react';
import { Home, ArrowLeft, RefreshCw, Search, AlertTriangle, WifiOff, Settings } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { SearchInput } from '../../molecules/SearchInput';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { cn } from '../../../utils/theme';

export type ErrorVariant = '404' | '500' | '403' | 'maintenance' | 'offline';

export interface ErrorTemplateProps {
  /**
   * Error variant
   */
  variant: ErrorVariant;
  
  /**
   * Custom title
   */
  title?: string;
  
  /**
   * Custom message
   */
  message?: string;
  
  /**
   * On home click
   */
  onHomeClick?: () => void;
  
  /**
   * On back click
   */
  onBackClick?: () => void;
  
  /**
   * On retry click (for 500/offline)
   */
  onRetryClick?: () => void;
  
  /**
   * Show search (for 404)
   */
  showSearch?: boolean;
  
  /**
   * On search
   */
  onSearch?: (query: string) => void;
  
  /**
   * Support email
   */
  supportEmail?: string;
  
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  
  /**
   * App name
   */
  appName?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const errorConfig: Record<ErrorVariant, { icon: React.ReactNode; title: string; message: string; color: string }> = {
  '404': {
    icon: '🔍',
    title: 'Page not found',
    message: "Oops! The page you're looking for doesn't exist or has been moved.",
    color: 'text-blue-500',
  },
  '500': {
    icon: '⚠️',
    title: 'Something went wrong',
    message: "We're having some technical difficulties. Please try again later.",
    color: 'text-red-500',
  },
  '403': {
    icon: '🔒',
    title: 'Access denied',
    message: "You don't have permission to access this page.",
    color: 'text-yellow-500',
  },
  'maintenance': {
    icon: '🔧',
    title: 'Under maintenance',
    message: "We're making some improvements. We'll be back shortly!",
    color: 'text-purple-500',
  },
  'offline': {
    icon: '📡',
    title: "You're offline",
    message: 'Please check your internet connection and try again.',
    color: 'text-gray-500',
  },
};

export const ErrorTemplate: React.FC<ErrorTemplateProps> = ({
  variant,
  title,
  message,
  onHomeClick,
  onBackClick,
  onRetryClick,
  showSearch = false,
  onSearch,
  supportEmail,
  logo,
  appName = 'KFlow',
  className,
}) => {
  const config = errorConfig[variant];
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  const getErrorCode = () => {
    switch (variant) {
      case '404': return '404';
      case '500': return '500';
      case '403': return '403';
      default: return null;
    }
  };

  const errorCode = getErrorCode();

  return (
    <div className={cn(
      'min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col',
      className
    )}>
      {/* Minimal header */}
      <header className="p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {logo || (
            <Typography variant="h5" className="text-lg sm:text-xl md:text-2xl text-indigo-600 font-bold">
              {appName}
            </Typography>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="text-center max-w-lg w-full px-4">
          {/* Error icon/illustration */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <span className="text-6xl sm:text-7xl md:text-8xl">{config.icon}</span>
          </div>

          {/* Error code */}
          {errorCode && (
            <Typography 
              variant="h1" 
              className={cn('text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold opacity-20 mb-3 sm:mb-4', config.color)}
            >
              {errorCode}
            </Typography>
          )}

          {/* Title */}
          <Typography variant="h2" className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl">
            {displayTitle}
          </Typography>

          {/* Message */}
          <Typography variant="body" color="secondary" className="mb-6 sm:mb-8 text-sm sm:text-base">
            {displayMessage}
          </Typography>

          {/* Search (for 404) */}
          {showSearch && variant === '404' && (
            <div className="mb-6 sm:mb-8 max-w-sm mx-auto">
              <SearchInput
                placeholder="Search for something else..."
                onSearch={onSearch}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
            {onBackClick && (
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={onBackClick}
              >
                Go Back
              </Button>
            )}
            
            {onHomeClick && (
              <Button
                variant="primary"
                icon={Home}
                onClick={onHomeClick}
              >
                Back to Home
              </Button>
            )}
            
            {onRetryClick && (variant === '500' || variant === 'offline') && (
              <Button
                variant="primary"
                icon={RefreshCw}
                onClick={onRetryClick}
              >
                Try Again
              </Button>
            )}
          </div>

          {/* Support contact */}
          {supportEmail && (
            <Typography variant="small" color="muted" className="mt-8">
              Need help? Contact us at{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {supportEmail}
              </a>
            </Typography>
          )}

          {/* Maintenance specific message */}
          {variant === 'maintenance' && (
            <Card className="mt-8 inline-block">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-purple-500 animate-spin" />
                <Typography variant="small">
                  Estimated downtime: 30 minutes
                </Typography>
              </div>
            </Card>
          )}

          {/* Offline specific message */}
          {variant === 'offline' && (
            <Card className="mt-8 inline-block">
              <div className="flex items-center gap-3">
                <WifiOff className="w-5 h-5 text-gray-500" />
                <Typography variant="small">
                  Some features may be unavailable
                </Typography>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-3 sm:p-4 md:p-6 text-center">
        <Typography variant="small" color="muted" className="text-xs sm:text-sm">
          © {new Date().getFullYear()} {appName}. All rights reserved.
        </Typography>
      </footer>
    </div>
  );
};

ErrorTemplate.displayName = 'ErrorTemplate';

