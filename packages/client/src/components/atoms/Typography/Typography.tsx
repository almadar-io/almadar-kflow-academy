/**
 * Typography Atom Component
 * 
 * Typography components for consistent text styling across the application.
 * Includes headings, body text, links, code, and blockquotes.
 */

import React from 'react';

export type TypographyVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'small' | 'large' | 'code' | 'blockquote';
export type TypographyColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'muted';
export type TypographyWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold';

export interface TypographyProps {
  /**
   * Typography variant
   * @default 'body'
   */
  variant?: TypographyVariant;
  
  /**
   * Text color variant
   * @default 'default'
   */
  color?: TypographyColor;
  
  /**
   * Font weight
   * @default 'normal'
   */
  weight?: TypographyWeight;
  
  /**
   * Text content
   */
  children: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * HTML element to render (overrides variant default)
   */
  as?: keyof React.JSX.IntrinsicElements;
}

const variantStyles: Record<TypographyVariant, string> = {
  h1: 'text-4xl font-bold',
  h2: 'text-3xl font-bold',
  h3: 'text-2xl font-semibold',
  h4: 'text-xl font-semibold',
  h5: 'text-lg font-semibold',
  h6: 'text-base font-semibold',
  body: 'text-base',
  small: 'text-sm',
  large: 'text-lg leading-relaxed',
  code: 'font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded',
  blockquote: 'border-l-4 border-indigo-500 dark:border-indigo-400 pl-4 italic text-gray-700 dark:text-gray-300',
};

const colorStyles: Record<TypographyColor, string> = {
  default: 'text-gray-900 dark:text-gray-100',
  primary: 'text-indigo-600 dark:text-indigo-400',
  secondary: 'text-gray-600 dark:text-gray-400',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  error: 'text-red-600 dark:text-red-400',
  muted: 'text-gray-500 dark:text-gray-500',
};

const weightStyles: Record<TypographyWeight, string> = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const defaultElements: Record<TypographyVariant, keyof React.JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body: 'p',
  small: 'p',
  large: 'p',
  code: 'code',
  blockquote: 'blockquote',
};

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = 'default',
  weight,
  children,
  className = '',
  as,
}) => {
  const Element = as || defaultElements[variant];
  const variantStyle = variantStyles[variant];
  const colorStyle = colorStyles[color];
  const weightStyle = weight ? weightStyles[weight] : '';
  
  // For headings, weight is already included in variantStyle
  const finalWeightStyle = variant.startsWith('h') ? '' : weightStyle;
  
  const combinedClassName = [
    variantStyle,
    colorStyle,
    finalWeightStyle,
    className,
  ].filter(Boolean).join(' ');

  const ElementType = Element as keyof React.JSX.IntrinsicElements;
  return React.createElement(ElementType, { className: combinedClassName }, children);
};

// Convenience components
export const Heading1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h1" {...props} />
);

export const Heading2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h2" {...props} />
);

export const Heading3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h3" {...props} />
);

export const Heading4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h4" {...props} />
);

export const Heading5: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h5" {...props} />
);

export const Heading6: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h6" {...props} />
);

export const Body: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body" {...props} />
);

export const Small: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="small" {...props} />
);

export const Large: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="large" {...props} />
);

export const Code: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="code" {...props} />
);

export const Blockquote: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="blockquote" {...props} />
);

export default Typography;

