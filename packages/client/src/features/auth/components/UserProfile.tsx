import React from 'react';
import { useAuthContext } from '../AuthContext';
import { useSelector } from 'react-redux';
import { RootState } from '../../../app/store';
import { Menu, MenuOption } from '../../../components/Menu';
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

  const menuOptions: MenuOption[] = [
    {
      id: 'signout',
      label: 'Sign Out',
      onClick: handleSignOut,
      icon: <LogOut className="h-4 w-4" />,
      disabled: loading
    }
  ];

  const userInfo = (
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0">
        <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {user.displayName || 'User'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
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
              className="h-8 w-8 rounded-full ring-2 ring-gray-200 dark:ring-gray-700 shadow-sm"
              src={user.photoURL}
              alt={user.displayName || user.email || 'User'}
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </div>
          )}
        </div>
      }
      options={menuOptions}
      children={userInfo}
      position="top-right"
      className="relative"
    />
  );
};

export default UserProfile;
