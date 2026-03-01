/**
 * ProfileTemplate Component
 * 
 * User profile and settings page.
 * Uses AppLayoutTemplate for consistent layout structure.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { User, Settings, Bell, Shield, Key, Camera, Save, X } from 'lucide-react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { Card } from '../../molecules/Card';
import { Tabs, TabItem } from '../../molecules/Tabs';
import { FormField } from '../../molecules/FormField';
import { Alert } from '../../molecules/Alert';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Avatar } from '../../atoms/Avatar';
import { Badge } from '../../atoms/Badge';
import { Divider } from '../../atoms/Divider';
import { cn } from '../../../utils/theme';

export interface ProfileData {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  role?: 'student' | 'mentor';
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  courseUpdates: boolean;
  progressReminders: boolean;
  marketingEmails: boolean;
}

export interface ProfileTemplateProps {
  /**
   * User profile data
   */
  profile: ProfileData;
  
  /**
   * On profile update
   */
  onProfileUpdate?: (data: Partial<ProfileData>) => void;
  
  /**
   * On avatar change
   */
  onAvatarChange?: (file: File) => void;
  
  /**
   * On password change
   */
  onPasswordChange?: (oldPassword: string, newPassword: string) => void;
  
  /**
   * Notification settings
   */
  notificationSettings?: NotificationSettings;
  
  /**
   * On notification settings change
   */
  onNotificationSettingsChange?: (settings: Partial<NotificationSettings>) => void;
  
  /**
   * User achievements/badges
   */
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    icon?: string;
    earnedAt?: string;
  }>;
  
  /**
   * Learning statistics
   */
  stats?: Array<{
    label: string;
    value: string | number;
  }>;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Success message
   */
  success?: string;
  
  /**
   * Error message
   */
  error?: string;
  
  /**
   * Navigation items for sidebar
   */
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;
  
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  
  /**
   * On logo click
   */
  onLogoClick?: () => void;
  
  /**
   * On logout handler
   */
  onLogout?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ProfileTemplate: React.FC<ProfileTemplateProps> = ({
  profile,
  onProfileUpdate,
  onAvatarChange,
  onPasswordChange,
  notificationSettings,
  onNotificationSettingsChange,
  achievements = [],
  stats = [],
  loading = false,
  success,
  error,
  navigationItems = [],
  logo,
  onLogoClick,
  onLogout,
  className,
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(profile);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const tabs: TabItem[] = [
    { id: 'profile', label: 'Profile', icon: User, content: null },
    { id: 'notifications', label: 'Notifications', icon: Bell, content: null },
    { id: 'security', label: 'Security', icon: Shield, content: null },
  ];

  const handleProfileSave = () => {
    onProfileUpdate?.(formData);
    setEditMode(false);
  };

  const handlePasswordSave = () => {
    if (passwordData.newPassword === passwordData.confirmPassword) {
      onPasswordChange?.(passwordData.currentPassword, passwordData.newPassword);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  // Map profile to user format for AppLayoutTemplate
  const user = {
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar,
  };

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      brandName="KFlow"
      onLogoClick={onLogoClick}
      className={className}
      contentClassName="max-w-4xl mx-auto"
    >
          {/* Profile header */}
          <Card className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="relative">
                <Avatar
                  src={profile.avatar}
                  initials={profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  size="xl"
                  className="w-20 h-20 sm:w-24 sm:h-24"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) onAvatarChange?.(file);
                    };
                    input.click();
                  }}
                  className="absolute bottom-0 right-0 p-1.5 sm:p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
              <div className="text-center sm:text-left flex-1 min-w-0">
                <Typography variant="h4" className="text-xl sm:text-2xl md:text-3xl">{profile.name}</Typography>
                <Typography variant="body" color="secondary" className="text-sm sm:text-base">{profile.email}</Typography>
                {profile.role && (
                  <Badge variant="primary" className="mt-2 text-xs sm:text-sm">
                    {profile.role === 'mentor' ? 'Mentor' : 'Student'}
                  </Badge>
                )}
              </div>
              {stats.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full sm:w-auto">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <Typography variant="h5" className="text-lg sm:text-xl md:text-2xl">{stat.value}</Typography>
                      <Typography variant="small" color="muted" className="text-xs sm:text-sm">{stat.label}</Typography>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Messages */}
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}
          {success && <Alert variant="success" className="mb-4">{success}</Alert>}

          {/* Tabs */}
          <Tabs
            items={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="mb-6"
          />

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <div className="flex items-center justify-between mb-6">
                <Typography variant="h5">Profile Information</Typography>
                {!editMode ? (
                  <Button variant="secondary" onClick={() => setEditMode(true)}>
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" icon={Save} onClick={handleProfileSave} loading={loading}>
                      Save
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <FormField
                  label="Full Name"
                  type="input"
                  inputProps={{
                    value: formData.name,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value })),
                    disabled: !editMode,
                  }}
                />
                <FormField
                  label="Email"
                  type="input"
                  inputProps={{
                    type: 'email',
                    value: formData.email,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, email: e.target.value })),
                    disabled: !editMode,
                  }}
                />
                <FormField
                  label="Bio"
                  type="textarea"
                  inputProps={{
                    value: formData.bio || '',
                    onChange: (e) => setFormData(prev => ({ ...prev, bio: e.target.value })),
                    disabled: !editMode,
                    rows: 4,
                    placeholder: 'Tell us about yourself...',
                  }}
                />
              </div>

              {/* Achievements */}
              {achievements.length > 0 && (
                <>
                  <Divider className="my-4 sm:my-6" />
                  <Typography variant="h6" className="mb-3 sm:mb-4 text-base sm:text-lg">Achievements</Typography>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="text-3xl mb-2">{achievement.icon || '🏆'}</div>
                        <Typography variant="small" weight="medium">
                          {achievement.title}
                        </Typography>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && notificationSettings && (
            <Card>
              <Typography variant="h5" className="mb-6">Notification Preferences</Typography>
              <div className="space-y-4">
                {Object.entries({
                  emailNotifications: 'Email Notifications',
                  pushNotifications: 'Push Notifications',
                  courseUpdates: 'Course Updates',
                  progressReminders: 'Progress Reminders',
                  marketingEmails: 'Marketing Emails',
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between">
                    <Typography variant="body">{label}</Typography>
                    <input
                      type="checkbox"
                      checked={notificationSettings[key as keyof NotificationSettings]}
                      onChange={(e) => onNotificationSettingsChange?.({
                        [key]: e.target.checked
                      })}
                      className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card>
              <Typography variant="h5" className="mb-6">Change Password</Typography>
              <div className="space-y-4 max-w-md">
                <FormField
                  label="Current Password"
                  type="input"
                  inputProps={{
                    type: 'password',
                    value: passwordData.currentPassword,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value })),
                  }}
                />
                <FormField
                  label="New Password"
                  type="input"
                  inputProps={{
                    type: 'password',
                    value: passwordData.newPassword,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value })),
                  }}
                />
                <FormField
                  label="Confirm New Password"
                  type="input"
                  inputProps={{
                    type: 'password',
                    value: passwordData.confirmPassword,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value })),
                  }}
                />
                <Button
                  variant="primary"
                  icon={Key}
                  onClick={handlePasswordSave}
                  loading={loading}
                  disabled={!passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                >
                  Update Password
                </Button>
              </div>
            </Card>
          )}
    </AppLayoutTemplate>
  );
};

ProfileTemplate.displayName = 'ProfileTemplate';

