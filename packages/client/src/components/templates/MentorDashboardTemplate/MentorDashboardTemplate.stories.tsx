import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { 
  Home, 
  BookOpen, 
  Users, 
  Settings, 
  BarChart3,
  LogOut,
} from 'lucide-react';
import { MentorDashboardTemplate } from './MentorDashboardTemplate';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta = {
  title: 'Templates/MentorDashboardTemplate',
  component: MentorDashboardTemplate,
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
} satisfies Meta<typeof MentorDashboardTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultUser = {
  name: 'Dr. Sarah Chen',
  email: 'sarah.chen@university.edu',
  avatar: undefined,
};

const defaultNavigation = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, active: true },
  { id: 'courses', label: 'My Courses', icon: BookOpen, badge: 3 },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const sampleCourses = [
  {
    id: '1',
    title: 'Introduction to Machine Learning',
    description: 'A comprehensive course on ML fundamentals',
    isPublished: true,
    studentCount: 1234,
    completionRate: 68,
    rating: 4.7,
  },
  {
    id: '2',
    title: 'Deep Learning with PyTorch',
    description: 'Advanced neural networks and deep learning',
    isPublished: true,
    studentCount: 856,
    completionRate: 54,
    rating: 4.5,
  },
  {
    id: '3',
    title: 'Natural Language Processing',
    description: 'NLP techniques and applications',
    isPublished: false,
    studentCount: 0,
    completionRate: 0,
    readiness: 75,
  },
];

const sampleActivity = [
  {
    id: '1',
    type: 'enrollment' as const,
    studentName: 'John Doe',
    courseName: 'Introduction to Machine Learning',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
  },
  {
    id: '2',
    type: 'completion' as const,
    studentName: 'Jane Smith',
    courseName: 'Introduction to Machine Learning',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
  },
  {
    id: '3',
    type: 'rating' as const,
    studentName: 'Mike Johnson',
    courseName: 'Deep Learning with PyTorch',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    data: { rating: 5 },
  },
  {
    id: '4',
    type: 'enrollment' as const,
    studentName: 'Emily Wilson',
    courseName: 'Deep Learning with PyTorch',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
  },
  {
    id: '5',
    type: 'completion' as const,
    studentName: 'David Brown',
    courseName: 'Introduction to Machine Learning',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
];

export const Default: Story = {
  args: {
    mentorName: 'Sarah',
    user: defaultUser,
    navigationItems: defaultNavigation,
    courses: sampleCourses,
    recentActivity: sampleActivity,
    onCreateCourse: () => alert('Create course clicked'),
    onEditCourse: (id) => alert(`Edit course ${id}`),
    onViewAnalytics: (id) => alert(`View analytics for ${id}`),
    onPreviewCourse: (id) => alert(`Preview course ${id}`),
  },
};

export const WithCustomStats: Story = {
  args: {
    ...Default.args,
    stats: [
      { label: 'Total Revenue', value: '$12,450', change: 15, changeType: 'increase' },
      { label: 'Total Students', value: 2090, change: 8, changeType: 'increase' },
      { label: 'Courses Published', value: 2 },
      { label: 'Avg Completion', value: '61%', change: -3, changeType: 'decrease' },
    ],
  },
};

export const Empty: Story = {
  args: {
    mentorName: 'New Mentor',
    user: defaultUser,
    navigationItems: defaultNavigation,
    courses: [],
    recentActivity: [],
    onCreateCourse: () => alert('Create course clicked'),
  },
};

export const SingleCourse: Story = {
  args: {
    ...Default.args,
    courses: [sampleCourses[0]],
    recentActivity: sampleActivity.slice(0, 3),
  },
};

export const WithDraftCourses: Story = {
  args: {
    ...Default.args,
    courses: [
      sampleCourses[2],
      {
        id: '4',
        title: 'Computer Vision Basics',
        isPublished: false,
        studentCount: 0,
        completionRate: 0,
        readiness: 45,
      },
      {
        id: '5',
        title: 'Reinforcement Learning',
        isPublished: false,
        studentCount: 0,
        completionRate: 0,
        readiness: 100,
      },
    ],
    recentActivity: [],
  },
};
