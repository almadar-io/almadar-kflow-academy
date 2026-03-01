import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ProfileTemplate } from './ProfileTemplate';
import { Home, BookOpen, Settings, User } from 'lucide-react';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta: Meta<typeof ProfileTemplate> = {
  title: 'Templates/ProfileTemplate',
  component: ProfileTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProfileTemplate>;

const navigationItems = [
  { id: '1', label: 'Dashboard', icon: Home },
  { id: '2', label: 'Courses', icon: BookOpen },
  { id: '3', label: 'Profile', icon: User, active: true },
  { id: '4', label: 'Settings', icon: Settings },
];

const mockProfile = {
  name: 'John Doe',
  email: 'john@example.com',
  bio: 'Passionate learner and software developer. Always curious about new technologies.',
  role: 'student' as const,
};

const mockStats = [
  { label: 'Courses', value: 5 },
  { label: 'Completed', value: 3 },
  { label: 'Hours', value: '48h' },
  { label: 'Streak', value: '7 days' },
];

const mockAchievements = [
  { id: '1', title: 'First Steps', description: 'Complete your first lesson', icon: '🎯' },
  { id: '2', title: 'Dedicated', description: '7-day streak', icon: '🔥' },
  { id: '3', title: 'Scholar', description: 'Complete 10 lessons', icon: '📚' },
  { id: '4', title: 'Fast Learner', description: 'Complete a course in a week', icon: '⚡' },
];

const mockNotificationSettings = {
  emailNotifications: true,
  pushNotifications: true,
  courseUpdates: true,
  progressReminders: false,
  marketingEmails: false,
};

export const Default: Story = {
  args: {
    profile: mockProfile,
    stats: mockStats,
    achievements: mockAchievements,
    notificationSettings: mockNotificationSettings,
    navigationItems,
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
    onProfileUpdate: (data: any) => console.log('Profile update:', data),
    onAvatarChange: (file: File) => console.log('Avatar change:', file),
    onPasswordChange: (old: string, newPass: string) => console.log('Password change:', old, newPass),
    onNotificationSettingsChange: (settings: any) => console.log('Notification settings:', settings),
  },
};

export const MentorProfile: Story = {
  args: {
    ...Default.args,
    profile: {
      ...mockProfile,
      role: 'mentor',
      name: 'Jane Smith',
      email: 'jane@example.com',
      bio: 'Experienced educator with 10+ years in software development. Helping others learn is my passion.',
    },
    stats: [
      { label: 'Courses', value: 12 },
      { label: 'Students', value: 456 },
      { label: 'Rating', value: '4.9' },
      { label: 'Reviews', value: 128 },
    ],
  },
};

export const WithSuccess: Story = {
  args: {
    ...Default.args,
    success: 'Profile updated successfully!',
  },
};

export const WithError: Story = {
  args: {
    ...Default.args,
    error: 'Failed to update profile. Please try again.',
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    loading: true,
  },
};

export const MinimalProfile: Story = {
  args: {
    profile: {
      name: 'New User',
      email: 'new@example.com',
    },
    navigationItems,
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
  },
};

export const Mobile: Story = {
  args: {
    ...Default.args,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

