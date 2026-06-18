import React from 'react';
import { LogOut } from 'lucide-react';
import { Avatar, Menu, MenuItem, Typography, useEventBus } from '@almadar/ui';

export interface ProfilePopupProps {
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  /** @deprecated Use the bus — ProfilePopup emits UI:LOGOUT automatically */
  onLogout?: () => void;
  isLoggingOut?: boolean;
  trigger: React.ReactNode;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const ProfilePopup: React.FC<ProfilePopupProps> = ({
  userName,
  userEmail,
  userAvatar,
  isLoggingOut = false,
  trigger,
  position = 'top-right',
}) => {
  const { emit } = useEventBus();

  const menuItems: MenuItem[] = [
    {
      id: 'logout',
      label: 'Log Out',
      onClick: () => emit('UI:LOGOUT', {}),
      icon: LogOut,
      disabled: isLoggingOut,
    },
  ];

  const userInfo = (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <Avatar
          src={userAvatar}
          initials={userName
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <Typography variant="body" weight="medium" className="truncate">
            {userName}
          </Typography>
          {userEmail && (
            <Typography variant="small" color="secondary" className="truncate">
              {userEmail}
            </Typography>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Menu
      trigger={trigger}
      items={menuItems}
      header={userInfo}
      position={position}
    />
  );
};

ProfilePopup.displayName = 'ProfilePopup';
