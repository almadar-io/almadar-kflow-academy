/**
 * Button Atom Component
 * 
 * A versatile button component with multiple variants, sizes, and states.
 * Supports icons, loading states, and full accessibility.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant
   * @default 'primary'
   */
  variant?: ButtonVariant;
  
  /**
   * Size of the button
   * @default 'md'
   */
  size?: ButtonSize;
  
  /**
   * Show loading spinner and disable button
   * @default false
   */
  loading?: boolean;
  
  /**
   * Icon to display on the left side
   */
  icon?: LucideIcon;
  
  /**
   * Icon to display on the right side
   */
  iconRight?: LucideIcon;
  
  /**
   * Make button full width
   * @default false
   */
  fullWidth?: boolean;
  
  /**
   * Button content
   */
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
  success: 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600',
  danger: 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600',
  warning: 'bg-yellow-500 hover:bg-yellow-600 text-white dark:bg-yellow-400 dark:hover:bg-yellow-500',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-800 dark:text-gray-300',
  link: 'bg-transparent hover:underline text-indigo-600 dark:text-indigo-400 p-0',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-xl',
};

const iconSizes: Record<ButtonSize, number> = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 22,
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const widthStyle = fullWidth ? 'w-full' : '';
  
  // Special handling for link variant (no padding, no rounded corners)
  const linkVariant = variant === 'link';
  const roundedStyle = linkVariant ? '' : 'rounded-lg';
  const paddingStyle = linkVariant ? '' : sizeStyle;
  
  const focusRingColor = variant === 'primary' || variant === 'link' 
    ? 'focus:ring-indigo-500' 
    : variant === 'success'
    ? 'focus:ring-green-500'
    : variant === 'danger'
    ? 'focus:ring-red-500'
    : variant === 'warning'
    ? 'focus:ring-yellow-500'
    : 'focus:ring-gray-500';
  
  const combinedClassName = [
    baseStyles,
    variantStyle,
    paddingStyle,
    widthStyle,
    roundedStyle,
    focusRingColor,
    className,
  ].filter(Boolean).join(' ');

  const iconSize = iconSizes[size];
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      className={combinedClassName}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" />
      ) : Icon ? (
        <Icon size={iconSize} />
      ) : null}
      {children}
      {!loading && IconRight && <IconRight size={iconSize} />}
    </button>
  );
};

export default Button;


