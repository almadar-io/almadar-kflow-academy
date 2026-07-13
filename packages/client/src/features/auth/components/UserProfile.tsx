import { createLogger } from '@almadar/logger';
import React from 'react';
import { useAuthContext } from '../AuthContext';
import { useSelector } from 'react-redux';
import { RootState } from '../../../app/store';
import { Menu, MenuItem, useTranslate } from '@almadar/ui';
import { LogOut, User } from 'lucide-react';

const log = createLogger('kflow:client:auth:UserProfile');

const UserProfile: React.FC = () => {
  const { t } = useTranslate();
  const { user, signOut } = useAuthContext();
  const { loading } = useSelector((state: RootState) => state.auth);

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      log.error('Sign out error', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: 'signout',
      label: t('nav.signOut'),
      onClick: handleSignOut,
      icon: LogOut,
      disabled: loading
    }
  ];

  const userInfo = (
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0">
        <User className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">
          {user.displayName || t('auth.user')}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {user.email}
        </p>
      </div>
    </div>
  );

  return (
    <Menu
      trigger={
        <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity duration-200">
          {user.photoURL ? (
            <img
              className="h-8 w-8 rounded-full ring-2 ring-border shadow-sm"
              src={user.photoURL}
              alt={user.displayName || user.email || t('auth.user')}
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-surface flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      }
      items={menuItems}
      header={userInfo}
      position="top-right"
    />
  );
};

export default UserProfile;
