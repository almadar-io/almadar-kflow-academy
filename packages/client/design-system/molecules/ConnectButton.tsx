import React from 'react';
import { Badge, Button } from '@almadar/ui';
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
  /** Peer count for the badge (includes AI, minimum 1). */
  count?: number;
  className?: string;
}

/**
 * The single canonical Connect affordance (G8): kflow logo icon everywhere,
 * switching between light/dark variants via resolvedMode. Optional badge shows
 * peer count (always ≥1 for the AI peer).
 */
export const ConnectButton: React.FC<ConnectButtonProps> = ({
  onClick,
  size = 'md',
  label,
  iconOnly = false,
  count,
  className,
  ...rest
}) => {
  const { t } = useTranslate();
  const { resolvedMode } = useTheme();
  const text = label ?? t('connections.connect');
  const logo = resolvedMode === 'dark' ? kflowLogoWhite : kflowLogo;
  const displayCount = count ?? 1;

  const badge = (
    <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[0.625rem] font-bold text-[var(--color-primary-foreground)]">
      {displayCount}
    </span>
  );

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={size}
        onClick={onClick}
        aria-label={text}
        className={cn('relative', className)}
        {...rest}
      >
        <span className="relative inline-flex">
          <img src={logo} alt="" className="h-5 w-5 flex-shrink-0" />
          {badge}
        </span>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="primary"
      size={size}
      onClick={onClick}
      className={cn('relative gap-1.5', className)}
      {...rest}
    >
      <span className="relative inline-flex">
        <img src={logo} alt="" className="h-5 w-5 flex-shrink-0" />
        {badge}
      </span>
      {text}
    </Button>
  );
};

ConnectButton.displayName = 'ConnectButton';
