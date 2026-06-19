import React from 'react';
import { useAuthContext } from '../AuthContext';
import { useSelector } from 'react-redux';
import { RootState } from '../../../app/store';
import { Menu, MenuItem } from '@almadar/ui';
import { LogOut, User } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const { loading } = useSelector((state: RootState) => state.auth);

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: 'signout',
      label: 'Sign Out',
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
          {user.displayName || 'User'}
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
              alt={user.displayName || user.email || 'User'}
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
