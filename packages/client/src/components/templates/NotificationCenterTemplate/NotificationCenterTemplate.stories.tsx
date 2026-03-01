import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { NotificationCenterTemplate } from './NotificationCenterTemplate';
import { Home, BookOpen, Bell, Settings } from 'lucide-react';
import { useState } from 'react';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta: Meta<typeof NotificationCenterTemplate> = {
  title: 'Templates/NotificationCenterTemplate',
  component: NotificationCenterTemplate,
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
type Story = StoryObj<typeof NotificationCenterTemplate>;

const navigationItems = [
  { id: '1', label: 'Dashboard', icon: Home },
  { id: '2', label: 'Courses', icon: BookOpen },
  { id: '3', label: 'Notifications', icon: Bell, active: true, badge: 5 },
  { id: '4', label: 'Settings', icon: Settings },
];

const mockNotifications = [
  {
    id: '1',
    type: 'course' as const,
    title: 'New lesson available',
    message: 'React Hooks Deep Dive has been added to your course.',
    timestamp: new Date().toISOString(),
    isRead: false,
  },
  {
    id: '2',
    type: 'achievement' as const,
    title: 'Achievement unlocked!',
    message: "You've earned the 'Dedicated Learner' badge.",
    timestamp: new Date().toISOString(),
    isRead: false,
  },
  {
    id: '3',
    type: 'comment' as const,
    title: 'New comment on your question',
    message: 'Sarah replied to your question about state management.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
    actor: {
      name: 'Sarah',
    },
  },
  {
    id: '4',
    type: 'alert' as const,
    title: 'Course deadline approaching',
    message: 'Complete TypeScript Fundamentals by Friday.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    isRead: true,
  },
  {
    id: '5',
    type: 'info' as const,
    title: 'System maintenance',
    message: 'Scheduled maintenance on Sunday 2am-4am.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    isRead: true,
  },
  {
    id: '6',
    type: 'course' as const,
    title: 'Course completed!',
    message: "Congratulations! You've completed React Fundamentals.",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    isRead: true,
  },
];

const InteractiveNotificationCenter = () => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationCenterTemplate
      notifications={notifications}
      unreadCount={unreadCount}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      onNotificationClick={(n) => {
        handleMarkAsRead(n.id);
        console.log('Clicked:', n);
      }}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      onDelete={handleDelete}
      onClearAll={handleClearAll}
      onSettingsClick={() => console.log('Settings clicked')}
      user={{ name: 'John Doe', email: 'john@example.com' }}
      navigationItems={navigationItems}
      logo={<span className="font-bold text-xl text-indigo-600">KFlow</span>}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveNotificationCenter />,
};

export const WithNotifications: Story = {
  args: {
    notifications: mockNotifications,
    unreadCount: 3,
    activeFilter: 'all',
    user: { name: 'John Doe', email: 'john@example.com' },
    navigationItems,
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
  },
};

export const UnreadOnly: Story = {
  args: {
    notifications: mockNotifications.filter(n => !n.isRead),
    unreadCount: 3,
    activeFilter: 'unread',
    user: { name: 'John Doe', email: 'john@example.com' },
    navigationItems,
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
  },
};

export const Empty: Story = {
  args: {
    notifications: [],
    unreadCount: 0,
    activeFilter: 'all',
    user: { name: 'John Doe', email: 'john@example.com' },
    navigationItems,
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
  },
};

export const AllRead: Story = {
  args: {
    notifications: mockNotifications.map(n => ({ ...n, isRead: true })),
    unreadCount: 0,
    activeFilter: 'all',
    user: { name: 'John Doe', email: 'john@example.com' },
    navigationItems,
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
  },
};

export const Mobile: Story = {
  render: () => <InteractiveNotificationCenter />,
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

