import React from 'react';
import { Button } from '@almadar/ui';
import { useTranslate } from '@almadar/ui';
import { MessageCircle, type LucideIcon } from 'lucide-react';

export interface ConnectButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Click handler — call sites emit UI:PEER_CONNECT_OPEN here. */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Size adapts to context (compact action-bar vs. card). Visual identity is fixed. */
  size?: 'sm' | 'md' | 'lg';
  /** Override the default label (rare). */
  label?: string;
  /** Override the default icon (rare). */
  icon?: LucideIcon;
  /** Icon-only affordance (top-right of a card). No label. */
  iconOnly?: boolean;
  className?: string;
}

/**
 * The single canonical Connect affordance (G8): same icon + variant everywhere.
 * `iconOnly` renders a compact ghost icon button (card top-right); otherwise a
 * primary button with the label (headers, action bars). Size adapts to context.
 */
export const ConnectButton: React.FC<ConnectButtonProps> = ({
  onClick,
  size = 'md',
  label,
  icon: Icon = MessageCircle,
  iconOnly = false,
  className,
  ...rest
}) => {
  const { t } = useTranslate();
  const text = label ?? t('connections.connect');
  if (iconOnly) {
    return (
      <Button
        variant="ghost"
        size={size}
        icon={Icon}
        onClick={onClick}
        className={className}
        aria-label={text}
        {...rest}
      />
    );
  }
  return (
    <Button
      variant="primary"
      size={size}
      icon={Icon}
      onClick={onClick}
      className={className}
      {...rest}
    >
      {text}
    </Button>
  );
};

ConnectButton.displayName = 'ConnectButton';
