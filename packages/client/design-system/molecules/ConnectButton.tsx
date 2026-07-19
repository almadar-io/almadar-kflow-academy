import React from 'react';
import { Button } from '@almadar/ui';
import { useTranslate } from '@almadar/ui';
import { Users, type LucideIcon } from 'lucide-react';

export interface ConnectButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Click handler — call sites emit UI:PEER_CONNECT_OPEN here. */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Size adapts to context (compact action-bar vs. card). Visual identity is fixed. */
  size?: 'sm' | 'md' | 'lg';
  /** Override the default label (rare). */
  label?: string;
  /** Override the default icon (rare). */
  icon?: LucideIcon;
  className?: string;
}

/**
 * The single canonical Connect affordance (G8): same icon + label + variant
 * everywhere — concept cards, the dashboard action-bar, the concept-detail
 * header. Size is the only thing that adapts to context.
 */
export const ConnectButton: React.FC<ConnectButtonProps> = ({
  onClick,
  size = 'md',
  label,
  icon: Icon = Users,
  className,
  ...rest
}) => {
  const { t } = useTranslate();
  return (
    <Button
      variant="primary"
      size={size}
      icon={Icon}
      onClick={onClick}
      className={className}
      {...rest}
    >
      {label ?? t('connections.connect')}
    </Button>
  );
};

ConnectButton.displayName = 'ConnectButton';
