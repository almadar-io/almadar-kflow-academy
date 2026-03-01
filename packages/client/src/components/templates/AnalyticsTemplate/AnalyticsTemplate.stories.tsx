import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { AnalyticsTemplate } from './AnalyticsTemplate';
import { Home, BookOpen, BarChart3, Settings, Clock, Target, Award, TrendingUp } from 'lucide-react';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta: Meta<typeof AnalyticsTemplate> = {
  title: 'Templates/AnalyticsTemplate',
  component: AnalyticsTemplate,
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
type Story = StoryObj<typeof AnalyticsTemplate>;

const navigationItems = [
  { id: '1', label: 'Dashboard', icon: Home },
  { id: '2', label: 'Courses', icon: BookOpen },
  { id: '3', label: 'Analytics', icon: BarChart3, active: true },
  { id: '4', label: 'Settings', icon: Settings },
];

const mockStats = [
  { label: 'Total Time', value: '48h 30m', icon: Clock, change: 12, changeType: 'increase' as const },
  { label: 'Courses Completed', value: 5, icon: BookOpen, change: 2, changeType: 'increase' as const },
  { label: 'Current Streak', value: '14 days', icon: Target },
  { label: 'Achievements', value: 12, icon: Award, change: 3, changeType: 'increase' as const },
];

const mockCourseProgress = [
  { id: '1', name: 'React Fundamentals', progress: 100, status: 'completed' as const },
  { id: '2', name: 'Advanced TypeScript', progress: 75, status: 'in-progress' as const },
  { id: '3', name: 'Node.js Backend', progress: 45, status: 'in-progress' as const },
  { id: '4', name: 'GraphQL Masterclass', progress: 20, status: 'in-progress' as const },
  { id: '5', name: 'Docker & Kubernetes', progress: 0, status: 'not-started' as const },
];

const mockDailyActivity = [
  { date: '2024-01-01', minutes: 45, lessonsCompleted: 2 },
  { date: '2024-01-02', minutes: 60, lessonsCompleted: 3 },
  { date: '2024-01-03', minutes: 30, lessonsCompleted: 1 },
  { date: '2024-01-04', minutes: 90, lessonsCompleted: 4 },
  { date: '2024-01-05', minutes: 45, lessonsCompleted: 2 },
  { date: '2024-01-06', minutes: 0, lessonsCompleted: 0 },
  { date: '2024-01-07', minutes: 75, lessonsCompleted: 3 },
  { date: '2024-01-08', minutes: 60, lessonsCompleted: 2 },
  { date: '2024-01-09', minutes: 45, lessonsCompleted: 2 },
  { date: '2024-01-10', minutes: 30, lessonsCompleted: 1 },
  { date: '2024-01-11', minutes: 90, lessonsCompleted: 4 },
  { date: '2024-01-12', minutes: 60, lessonsCompleted: 3 },
  { date: '2024-01-13', minutes: 45, lessonsCompleted: 2 },
  { date: '2024-01-14', minutes: 75, lessonsCompleted: 3 },
];

const mockAchievements = [
  { id: '1', title: 'First Steps', description: 'Complete your first lesson', icon: '🎯', earnedAt: 'Jan 1, 2024' },
  { id: '2', title: 'Dedicated Learner', description: 'Maintain a 7-day streak', icon: '🔥', earnedAt: 'Jan 7, 2024' },
  { id: '3', title: 'Course Master', description: 'Complete your first course', icon: '🎓', earnedAt: 'Jan 10, 2024' },
  { id: '4', title: 'Quick Study', description: 'Complete 10 lessons in a day', icon: '⚡', earnedAt: 'Jan 12, 2024' },
  { id: '5', title: 'Night Owl', description: 'Study after midnight', icon: '🦉', earnedAt: 'Jan 14, 2024' },
  { id: '6', title: 'Perfectionist', description: 'Get 100% on an assessment', icon: '💯' },
];

export const Default: Story = {
  args: {
    title: 'Learning Analytics',
    timeRange: '30d',
    stats: mockStats,
    courseProgress: mockCourseProgress,
    dailyActivity: mockDailyActivity,
    achievements: mockAchievements,
    user: { name: 'John Doe', email: 'john@example.com' },
    navigationItems,
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
    onTimeRangeChange: (range: string) => console.log('Time range:', range),
    onExport: (format: string) => console.log('Export:', format),
  },
};

export const EmptyState: Story = {
  args: {
    title: 'Learning Analytics',
    timeRange: '30d',
    stats: [
      { label: 'Total Time', value: '0h', icon: Clock },
      { label: 'Courses Completed', value: 0, icon: BookOpen },
      { label: 'Current Streak', value: '0 days', icon: Target },
      { label: 'Achievements', value: 0, icon: Award },
    ],
    courseProgress: [],
    dailyActivity: [],
    achievements: [],
    user: { name: 'New User', email: 'new@example.com' },
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

