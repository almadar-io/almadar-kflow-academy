import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { 
  Home, 
  BookOpen, 
  Users, 
  Settings, 
  BarChart3,
} from 'lucide-react';
import { CourseAnalyticsTemplate } from './CourseAnalyticsTemplate';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta = {
  title: 'Templates/CourseAnalyticsTemplate',
  component: CourseAnalyticsTemplate,
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
} satisfies Meta<typeof CourseAnalyticsTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultUser = {
  name: 'Dr. Sarah Chen',
  email: 'sarah.chen@university.edu',
};

const defaultNavigation = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'courses', label: 'My Courses', icon: BookOpen },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, active: true },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const sampleLessonAnalytics = [
  {
    id: 'l1',
    title: 'Introduction to Neural Networks',
    moduleName: 'Module 1: Foundations',
    views: 1250,
    completions: 980,
    completionRate: 78,
    avgTimeSpent: 15,
    dropOffRate: 8,
    avgQuizScore: 85,
  },
  {
    id: 'l2',
    title: 'Activation Functions',
    moduleName: 'Module 1: Foundations',
    views: 1100,
    completions: 890,
    completionRate: 81,
    avgTimeSpent: 12,
    dropOffRate: 5,
    avgQuizScore: 78,
  },
  {
    id: 'l3',
    title: 'Backpropagation',
    moduleName: 'Module 2: Training',
    views: 950,
    completions: 650,
    completionRate: 68,
    avgTimeSpent: 25,
    dropOffRate: 18,
    avgQuizScore: 72,
  },
  {
    id: 'l4',
    title: 'Convolutional Neural Networks',
    moduleName: 'Module 3: Architectures',
    views: 780,
    completions: 450,
    completionRate: 58,
    avgTimeSpent: 30,
    dropOffRate: 25,
    avgQuizScore: 70,
  },
  {
    id: 'l5',
    title: 'Recurrent Neural Networks',
    moduleName: 'Module 3: Architectures',
    views: 620,
    completions: 320,
    completionRate: 52,
    avgTimeSpent: 35,
    dropOffRate: 32,
    avgQuizScore: 68,
  },
];

const sampleStudentAnalytics = [
  {
    id: 's1',
    name: 'John Doe',
    email: 'john.doe@email.com',
    progress: 100,
    lessonsCompleted: 20,
    totalLessons: 20,
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24),
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    timeSpent: 1200,
    avgQuizScore: 92,
    isCompleted: true,
    hasCertificate: true,
    engagementScore: 95,
  },
  {
    id: 's2',
    name: 'Jane Smith',
    email: 'jane.smith@email.com',
    progress: 85,
    lessonsCompleted: 17,
    totalLessons: 20,
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2),
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
    timeSpent: 980,
    avgQuizScore: 88,
    isCompleted: false,
    engagementScore: 85,
  },
  {
    id: 's3',
    name: 'Mike Johnson',
    email: 'mike.j@email.com',
    progress: 45,
    lessonsCompleted: 9,
    totalLessons: 20,
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
    timeSpent: 450,
    avgQuizScore: 65,
    isCompleted: false,
    isAtRisk: true,
    engagementScore: 35,
  },
  {
    id: 's4',
    name: 'Emily Wilson',
    email: 'emily.w@email.com',
    progress: 30,
    lessonsCompleted: 6,
    totalLessons: 20,
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21),
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
    timeSpent: 280,
    avgQuizScore: 58,
    isCompleted: false,
    isAtRisk: true,
    engagementScore: 25,
  },
  {
    id: 's5',
    name: 'David Brown',
    email: 'david.b@email.com',
    progress: 100,
    lessonsCompleted: 20,
    totalLessons: 20,
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 48),
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25),
    timeSpent: 1100,
    avgQuizScore: 95,
    isCompleted: true,
    hasCertificate: true,
    engagementScore: 92,
  },
];

const sampleLanguageUsage = [
  { language: 'en', name: 'English', studentCount: 850, percentage: 68 },
  { language: 'es', name: 'Spanish', studentCount: 180, percentage: 14 },
  { language: 'ar', name: 'Arabic', studentCount: 120, percentage: 10 },
  { language: 'zh', name: 'Chinese', studentCount: 75, percentage: 6 },
  { language: 'fr', name: 'French', studentCount: 25, percentage: 2 },
];

export const Default: Story = {
  args: {
    courseTitle: 'Introduction to Machine Learning',
    courseId: 'course-1',
    user: defaultUser,
    navigationItems: defaultNavigation,
    totalEnrollments: 1250,
    enrollmentChange: 12,
    activeStudents: 456,
    activeChange: 8,
    completionRate: 68,
    completionChange: 5,
    averageRating: 4.7,
    ratingCount: 342,
    avgCompletionTime: 24,
    totalLessonsCompleted: 18500,
    atRiskStudents: 23,
    lessonAnalytics: sampleLessonAnalytics,
    studentAnalytics: sampleStudentAnalytics,
    languageUsage: sampleLanguageUsage,
    onBack: () => alert('Back clicked'),
    onViewStudent: (id) => alert(`View student ${id}`),
    onMessageStudent: (id) => alert(`Message student ${id}`),
    onViewLesson: (id) => alert(`View lesson ${id}`),
    onExport: (format) => alert(`Export as ${format}`),
    onRefresh: () => alert('Refresh clicked'),
  },
};

export const NewCourse: Story = {
  args: {
    ...Default.args,
    totalEnrollments: 45,
    activeStudents: 38,
    completionRate: 12,
    atRiskStudents: 5,
    averageRating: undefined,
    ratingCount: 0,
    lessonAnalytics: sampleLessonAnalytics.slice(0, 2),
    studentAnalytics: sampleStudentAnalytics.slice(0, 2),
    languageUsage: sampleLanguageUsage.slice(0, 2),
  },
};

export const HighPerforming: Story = {
  args: {
    ...Default.args,
    totalEnrollments: 5000,
    enrollmentChange: 25,
    activeStudents: 2100,
    activeChange: 18,
    completionRate: 85,
    completionChange: 12,
    averageRating: 4.9,
    ratingCount: 1250,
    atRiskStudents: 8,
  },
};

export const Empty: Story = {
  args: {
    ...Default.args,
    totalEnrollments: 0,
    activeStudents: 0,
    completionRate: 0,
    atRiskStudents: 0,
    lessonAnalytics: [],
    studentAnalytics: [],
    languageUsage: [],
  },
};
