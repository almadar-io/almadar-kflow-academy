/**
 * ProfilePopup Molecule Component
 * 
 * A popup card that displays user profile information and logout button.
 * Used in templates when clicking on user avatar.
 */

import React from 'react';
import { LogOut, User } from 'lucide-react';
import { Menu, MenuOption } from '../../../components/Menu';
import { Typography } from '../../atoms/Typography';
import { Avatar } from '../../atoms/Avatar';

export interface ProfilePopupProps {
  /**
   * User name
   */
  userName: string;
  
  /**
   * User email (optional)
   */
  userEmail?: string;
  
  /**
   * User avatar URL (optional)
   */
  userAvatar?: string;
  
  /**
   * Logout handler
   */
  onLogout: () => void;
  
  /**
   * Whether logout is in progress
   */
  isLoggingOut?: boolean;
  
  /**
   * Trigger element (usually the avatar button)
   */
  trigger: React.ReactNode;
  
  /**
   * Menu position
   * @default 'top-right'
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const ProfilePopup: React.FC<ProfilePopupProps> = ({
  userName,
  userEmail,
  userAvatar,
  onLogout,
  isLoggingOut = false,
  trigger,
  position = 'top-right',
}) => {
  const menuOptions: MenuOption[] = [
    {
      id: 'logout',
      label: 'Log Out',
      onClick: onLogout,
      icon: <LogOut className="h-4 w-4" />,
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
      options={menuOptions}
      children={userInfo}
      position={position}
      className="relative"
    />
  );
};

ProfilePopup.displayName = 'ProfilePopup';
