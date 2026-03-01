/**
 * Theme Utilities
 * 
 * Utility functions for working with themes and Tailwind classes
 */

import { Theme } from '../contexts/ThemeContext';

/**
 * Get theme-aware class names
 * Combines base classes with dark mode variants
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Get theme-aware background color classes
 */
export function getBackgroundColor(theme: Theme): string {
  return theme === 'dark' 
    ? 'bg-gray-900 dark:bg-gray-900' 
    : 'bg-white dark:bg-gray-900';
}

/**
 * Get theme-aware surface color classes
 */
export function getSurfaceColor(theme: Theme): string {
  return theme === 'dark'
    ? 'bg-gray-800 dark:bg-gray-800'
    : 'bg-white dark:bg-gray-800';
}

/**
 * Get theme-aware text color classes
 */
export function getTextColor(theme: Theme): string {
  return theme === 'dark'
    ? 'text-gray-100 dark:text-gray-100'
    : 'text-gray-900 dark:text-gray-100';
}

/**
 * Get theme-aware secondary text color classes
 */
export function getSecondaryTextColor(theme: Theme): string {
  return theme === 'dark'
    ? 'text-gray-400 dark:text-gray-400'
    : 'text-gray-600 dark:text-gray-400';
}

/**
 * Get theme-aware border color classes
 */
export function getBorderColor(theme: Theme): string {
  return theme === 'dark'
    ? 'border-gray-700 dark:border-gray-700'
    : 'border-gray-200 dark:border-gray-700';
}

/**
 * Get theme-aware primary color classes
 */
export function getPrimaryColor(theme: Theme): string {
  return theme === 'dark'
    ? 'bg-indigo-500 dark:bg-indigo-500'
    : 'bg-indigo-600 dark:bg-indigo-500';
}

/**
 * Get theme-aware primary hover color classes
 */
export function getPrimaryHoverColor(theme: Theme): string {
  return theme === 'dark'
    ? 'hover:bg-indigo-600 dark:hover:bg-indigo-600'
    : 'hover:bg-indigo-700 dark:hover:bg-indigo-600';
}

/**
 * Get theme-aware error color classes
 */
export function getErrorColor(theme: Theme): string {
  return theme === 'dark'
    ? 'bg-red-500 dark:bg-red-500'
    : 'bg-red-600 dark:bg-red-500';
}

/**
 * Get theme-aware success color classes
 */
export function getSuccessColor(theme: Theme): string {
  return theme === 'dark'
    ? 'bg-green-500 dark:bg-green-500'
    : 'bg-green-600 dark:bg-green-500';
}

/**
 * Get theme-aware warning color classes
 */
export function getWarningColor(theme: Theme): string {
  return theme === 'dark'
    ? 'bg-yellow-400 dark:bg-yellow-400'
    : 'bg-yellow-500 dark:bg-yellow-400';
}

/**
 * Get theme-aware info color classes
 */
export function getInfoColor(theme: Theme): string {
  return theme === 'dark'
    ? 'bg-blue-500 dark:bg-blue-500'
    : 'bg-blue-600 dark:bg-blue-500';
}

/**
 * Apply theme class to document element
 */
export function applyThemeClass(theme: Theme): void {
  if (typeof document !== 'undefined') {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

/**
 * Get current theme from document element
 */
export function getCurrentTheme(): Theme {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }
  return 'dark'; // Default
}

