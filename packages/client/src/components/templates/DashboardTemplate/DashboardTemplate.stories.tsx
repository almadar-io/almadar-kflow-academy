import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { DashboardTemplate } from './DashboardTemplate';
import { useState } from 'react';
import { 
  Home, 
  BookOpen, 
  GraduationCap, 
  Settings, 
  BarChart3, 
  Users, 
  Plus,
  TrendingUp,
  Clock,
  Target,
  Award,
  LayoutDashboard,
  Brain,
  Sun,
  Moon
} from 'lucide-react';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta: Meta<typeof DashboardTemplate> = {
  title: 'Templates/DashboardTemplate',
  component: DashboardTemplate,
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
type Story = StoryObj<typeof DashboardTemplate>;

const studentNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true, onClick: () => console.log('Dashboard') },
  { id: 'learn', label: 'Learn', icon: Brain, onClick: () => console.log('Learn') },
  { id: 'courses', label: 'My Courses', icon: BookOpen, badge: 3, onClick: () => console.log('Courses') },
  { id: 'progress', label: 'Progress', icon: BarChart3, onClick: () => console.log('Progress') },
  { id: 'achievements', label: 'Achievements', icon: Award, onClick: () => console.log('Achievements') },
];

const mentorNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true, onClick: () => console.log('Dashboard') },
  { id: 'learn', label: 'Learn', icon: Brain, onClick: () => console.log('Learn') },
  { id: 'mentor', label: 'Mentor', icon: GraduationCap, onClick: () => console.log('Mentor') },
  { id: 'courses', label: 'Courses', icon: BookOpen, badge: 5, onClick: () => console.log('Courses') },
];

const studentStats = [
  { label: 'Courses Enrolled', value: 5, icon: BookOpen, change: 2, changeType: 'increase' as const },
  { label: 'Lessons Completed', value: 42, icon: GraduationCap, change: 8, changeType: 'increase' as const },
  { label: 'Hours Learned', value: '24h', icon: Clock, change: 3, changeType: 'increase' as const },
  { label: 'Current Streak', value: '7 days', icon: Target },
];

const mentorStats = [
  { label: 'Total Courses', value: 12, icon: BookOpen, change: 1, changeType: 'increase' as const },
  { label: 'Active Students', value: 156, icon: Users, change: 12, changeType: 'increase' as const },
  { label: 'Completion Rate', value: '78%', icon: TrendingUp, change: 5, changeType: 'increase' as const },
  { label: 'Avg. Rating', value: '4.8', icon: Award },
];

const recentActivities = [
  { id: '1', title: 'Completed "React Hooks"', description: 'Introduction to React course', timestamp: '2 hours ago' },
  { id: '2', title: 'Started new lesson', description: 'State Management basics', timestamp: '5 hours ago' },
  { id: '3', title: 'Earned achievement', description: 'First 10 lessons completed', timestamp: '1 day ago' },
  { id: '4', title: 'Enrolled in course', description: 'Advanced TypeScript', timestamp: '2 days ago' },
];

const studentQuickActions = [
  { label: 'Continue Learning', icon: BookOpen, variant: 'primary' as const, onClick: () => console.log('Continue') },
  { label: 'Browse Courses', icon: GraduationCap, variant: 'secondary' as const, onClick: () => console.log('Browse') },
  { label: 'View Progress', icon: BarChart3, variant: 'secondary' as const, onClick: () => console.log('Progress') },
];

const mentorQuickActions = [
  { label: 'Create Course', icon: Plus, variant: 'primary' as const, onClick: () => console.log('Create') },
  { label: 'View Analytics', icon: BarChart3, variant: 'secondary' as const, onClick: () => console.log('Analytics') },
  { label: 'Manage Students', icon: Users, variant: 'secondary' as const, onClick: () => console.log('Students') },
];

// Theme toggle component for stories
const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);
  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export const StudentDashboard: Story = {
  args: {
    variant: 'student',
    brandName: 'KFlow',
    user: {
      name: 'John Student',
      email: 'john@example.com',
    },
    navigationItems: studentNavItems,
    stats: studentStats,
    progress: {
      value: 65,
      totalLessons: 20,
      completedLessons: 13,
      currentLesson: {
        id: '1',
        title: 'Understanding React State',
        status: 'current',
      },
      nextLesson: {
        id: '2',
        title: 'Working with Effects',
        status: 'upcoming',
      },
    },
    activities: recentActivities,
    quickActions: studentQuickActions,
    onLogoClick: () => console.log('Logo clicked'),
    onUserClick: () => console.log('User clicked'),
    sidebarFooterContent: <ThemeToggle />,
  },
};

export const MentorDashboard: Story = {
  args: {
    variant: 'mentor',
    brandName: 'KFlow',
    user: {
      name: 'Jane Mentor',
      email: 'jane@example.com',
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
    navigationItems: mentorNavItems,
    stats: mentorStats,
    activities: [
      { id: '1', title: 'New enrollment', description: 'React Fundamentals', timestamp: '1 hour ago' },
      { id: '2', title: 'Course completed', description: 'Student: Alex', timestamp: '3 hours ago' },
      { id: '3', title: 'New review', description: '5 stars on TypeScript course', timestamp: '1 day ago' },
    ],
    quickActions: mentorQuickActions,
    onLogoClick: () => console.log('Logo clicked'),
    sidebarFooterContent: <ThemeToggle />,
  },
};

export const WithCustomLogo: Story = {
  args: {
    variant: 'student',
    brandName: 'KFlow',
    logo: (
      <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold">K</span>
      </div>
    ),
    user: {
      name: 'John Student',
    },
    navigationItems: studentNavItems,
    stats: studentStats,
    onLogoClick: () => console.log('Logo clicked'),
    sidebarFooterContent: <ThemeToggle />,
  },
};

export const ContentOnly: Story = {
  args: {
    variant: 'student',
    brandName: 'KFlow',
    user: {
      name: 'John Student',
    },
    navigationItems: studentNavItems,
    children: (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Custom Content
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          This template can render any custom content passed as children.
          The stats, progress, quick actions, and activities sections are optional.
        </p>
      </div>
    ),
    onLogoClick: () => console.log('Logo clicked'),
    sidebarFooterContent: <ThemeToggle />,
  },
};

export const EmptyDashboard: Story = {
  args: {
    variant: 'student',
    brandName: 'KFlow',
    user: {
      name: 'New User',
      email: 'new@example.com',
    },
    navigationItems: studentNavItems,
    stats: [],
    quickActions: [
      { label: 'Browse Courses', icon: BookOpen, variant: 'primary' as const, onClick: () => {} },
      { label: 'Complete Profile', icon: Settings, variant: 'secondary' as const, onClick: () => {} },
    ],
    onLogoClick: () => console.log('Logo clicked'),
    sidebarFooterContent: <ThemeToggle />,
  },
};

export const Mobile: Story = {
  args: {
    ...StudentDashboard.args,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export const Tablet: Story = {
  args: {
    ...StudentDashboard.args,
  },
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
};
