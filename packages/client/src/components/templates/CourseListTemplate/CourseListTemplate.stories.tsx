import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { CourseListTemplate } from './CourseListTemplate';
import { Home, BookOpen, Settings, BarChart3, Users } from 'lucide-react';
import { useState } from 'react';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta: Meta<typeof CourseListTemplate> = {
  title: 'Templates/CourseListTemplate',
  component: CourseListTemplate,
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
type Story = StoryObj<typeof CourseListTemplate>;

const navigationItems = [
  { id: '1', label: 'Dashboard', icon: Home },
  { id: '2', label: 'Courses', icon: BookOpen, active: true },
  { id: '3', label: 'Students', icon: Users },
  { id: '4', label: 'Analytics', icon: BarChart3 },
  { id: '5', label: 'Settings', icon: Settings },
];

const mockCourses = [
  {
    id: '1',
    title: 'React Fundamentals',
    description: 'Learn the basics of React including components, props, and state management.',
    progress: 75,
    lessonsCount: 20,
    completedLessons: 15,
    status: 'published' as const,
    isPublic: true,
  },
  {
    id: '2',
    title: 'Advanced TypeScript',
    description: 'Deep dive into TypeScript generics, decorators, and advanced patterns.',
    progress: 30,
    lessonsCount: 15,
    completedLessons: 5,
    status: 'published' as const,
    isPublic: true,
  },
  {
    id: '3',
    title: 'Node.js Backend Development',
    description: 'Build scalable backend applications with Node.js and Express.',
    progress: 0,
    lessonsCount: 25,
    completedLessons: 0,
    status: 'published' as const,
    isPublic: false,
  },
  {
    id: '4',
    title: 'GraphQL Masterclass',
    description: 'Master GraphQL with Apollo Server and Client.',
    progress: 100,
    lessonsCount: 18,
    completedLessons: 18,
    status: 'published' as const,
    isPublic: true,
  },
  {
    id: '5',
    title: 'CSS Grid & Flexbox',
    description: 'Modern CSS layout techniques for responsive design.',
    progress: 50,
    lessonsCount: 12,
    completedLessons: 6,
    status: 'published' as const,
    isPublic: true,
  },
  {
    id: '6',
    title: 'Testing with Jest',
    description: 'Write effective unit and integration tests with Jest.',
    progress: 0,
    lessonsCount: 10,
    completedLessons: 0,
    status: 'published' as const,
    isPublic: true,
  },
];

const mockFilters = [
  {
    id: 'status',
    label: 'Status',
    options: [
      { value: 'in-progress', label: 'In Progress', count: 3 },
      { value: 'completed', label: 'Completed', count: 1 },
      { value: 'not-started', label: 'Not Started', count: 2 },
    ],
    selectedValues: [],
  },
  {
    id: 'visibility',
    label: 'Visibility',
    options: [
      { value: 'public', label: 'Public', count: 5 },
      { value: 'private', label: 'Private', count: 1 },
    ],
    selectedValues: [],
  },
  {
    id: 'difficulty',
    label: 'Difficulty',
    options: [
      { value: 'beginner', label: 'Beginner', count: 2 },
      { value: 'intermediate', label: 'Intermediate', count: 3 },
      { value: 'advanced', label: 'Advanced', count: 1 },
    ],
    selectedValues: [],
  },
];

const InteractiveCourseList = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortValue, setSortValue] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <CourseListTemplate
      title="My Courses"
      subtitle="Manage and track your enrolled courses"
      courses={mockCourses}
      totalCourses={24}
      currentPage={currentPage}
      pageSize={6}
      onPageChange={setCurrentPage}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sortValue={sortValue}
      onSortChange={setSortValue}
      filters={mockFilters}
      onFilterChange={(filterId, values) => console.log('Filter changed:', filterId, values)}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showCreateButton
      onCreateClick={() => alert('Create course clicked')}
      user={{
        name: 'John Doe',
        email: 'john@example.com',
      }}
      navigationItems={navigationItems}
      logo={<span className="font-bold text-xl text-indigo-600">KFlow</span>}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveCourseList />,
};

export const GridView: Story = {
  args: {
    title: 'Browse Courses',
    subtitle: 'Explore our course catalog',
    courses: mockCourses,
    viewMode: 'grid',
    filters: mockFilters,
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    navigationItems,
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
  },
};

export const ListView: Story = {
  args: {
    ...GridView.args,
    viewMode: 'list',
  },
};

export const WithCreateButton: Story = {
  args: {
    ...GridView.args,
    title: 'Manage Courses',
    showCreateButton: true,
    onCreateClick: () => alert('Create course'),
  },
};

export const EmptyState: Story = {
  args: {
    title: 'My Courses',
    courses: [],
    showCreateButton: true,
    user: {
      name: 'New User',
      email: 'new@example.com',
    },
    navigationItems,
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
  },
};

export const Loading: Story = {
  args: {
    ...GridView.args,
    loading: true,
  },
};

export const Mobile: Story = {
  args: {
    ...GridView.args,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

