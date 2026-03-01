/**
 * Icon Atom Component
 * 
 * A wrapper component for Lucide icons with consistent sizing and styling.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../utils/theme';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type IconAnimation = 'spin' | 'pulse' | 'none';

export interface IconProps {
  /**
   * Lucide icon component
   */
  icon: LucideIcon;
  
  /**
   * Size of the icon
   * @default 'md'
   */
  size?: IconSize;
  
  /**
   * Color class (Tailwind color class)
   * @default 'currentColor'
   */
  color?: string;
  
  /**
   * Animation type
   * @default 'none'
   */
  animation?: IconAnimation;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Icon stroke width
   * @default 2
   */
  strokeWidth?: number;
}

const sizeClasses: Record<IconSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

const animationClasses: Record<IconAnimation, string> = {
  none: '',
  spin: 'animate-spin',
  pulse: 'animate-pulse',
};

export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = 'md',
  color = 'currentColor',
  animation = 'none',
  className,
  strokeWidth = 2,
  ...props
}) => {
  return (
    <IconComponent
      className={cn(
        sizeClasses[size],
        animationClasses[animation],
        color !== 'currentColor' && color,
        // Default to proper text color for dark theme
        color === 'currentColor' && 'text-gray-900 dark:text-gray-100',
        className
      )}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
};

Icon.displayName = 'Icon';

