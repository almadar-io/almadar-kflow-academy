import React from 'react';
import { Button } from '@almadar/ui';
import { useTranslate } from '@almadar/ui';
import { useTheme } from '@almadar/ui/context';
import { cn } from '@utils/theme';
import kflowLogo from '../../src/assets/kflow-logo.svg';
import kflowLogoWhite from '../../src/assets/kflow-logo-white.svg';

export interface ConnectButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Click handler — call sites emit UI:PEER_CONNECT_OPEN here. */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Size adapts to context (compact action-bar vs. card). Visual identity is fixed. */
  size?: 'sm' | 'md' | 'lg';
  /** Override the default label (rare). */
  label?: string;
  /** Icon-only affordance (top-right of a card). No label. */
  iconOnly?: boolean;
  className?: string;
}

/**
 * The single canonical Connect affordance (G8): kflow logo icon everywhere,
 * switching between light/dark variants via resolvedMode (same logic as TopNavShell).
 */
export const ConnectButton: React.FC<ConnectButtonProps> = ({
  onClick,
  size = 'md',
  label,
  iconOnly = false,
  className,
  ...rest
}) => {
  const { t } = useTranslate();
  const { resolvedMode } = useTheme();
  const text = label ?? t('connections.connect');
  const logo = resolvedMode === 'dark' ? kflowLogoWhite : kflowLogo;

  const logoEl = (
    <img src={logo} alt="" className="h-5 w-5 flex-shrink-0" />
  );

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={size}
        onClick={onClick}
        aria-label={text}
        className={cn(
          className,
          'hover:!bg-primary hover:!border-primary hover:!text-primary-foreground',
        )}
        {...rest}
      >
        {logoEl}
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="primary"
      size={size}
      onClick={onClick}
      className={cn('gap-1.5', className)}
      {...rest}
    >
      {logoEl}
      {text}
    </Button>
  );
};

ConnectButton.displayName = 'ConnectButton';
