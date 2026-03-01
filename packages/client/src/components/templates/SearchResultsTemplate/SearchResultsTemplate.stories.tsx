import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { SearchResultsTemplate } from './SearchResultsTemplate';
import { Home, BookOpen, Search, Settings } from 'lucide-react';
import { useState } from 'react';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta: Meta<typeof SearchResultsTemplate> = {
  title: 'Templates/SearchResultsTemplate',
  component: SearchResultsTemplate,
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
type Story = StoryObj<typeof SearchResultsTemplate>;

const navigationItems = [
  { id: '1', label: 'Dashboard', icon: Home },
  { id: '2', label: 'Courses', icon: BookOpen },
  { id: '3', label: 'Search', icon: Search, active: true },
  { id: '4', label: 'Settings', icon: Settings },
];

const mockResults = [
  {
    id: '1',
    type: 'course' as const,
    title: 'React Fundamentals',
    description: 'Learn the basics of React including components, props, state, and hooks.',
    context: '20 lessons • 4 hours',
  },
  {
    id: '2',
    type: 'lesson' as const,
    title: 'Understanding React Hooks',
    description: 'Deep dive into useState, useEffect, and custom hooks.',
    context: 'React Fundamentals',
    highlight: 'React hooks are functions that let you use state and other React features',
  },
  {
    id: '3',
    type: 'concept' as const,
    title: 'State Management',
    description: 'Managing application state in React applications.',
    context: 'Layer 2',
  },
  {
    id: '4',
    type: 'lesson' as const,
    title: 'Building Custom Hooks',
    description: 'Create reusable logic with custom React hooks.',
    context: 'Advanced React',
  },
  {
    id: '5',
    type: 'course' as const,
    title: 'React Native Basics',
    description: 'Build mobile apps with React Native.',
    context: '15 lessons • 3 hours',
  },
];

const InteractiveSearch = () => {
  const [query, setQuery] = useState('React');
  const [activeType, setActiveType] = useState<'all' | 'courses' | 'lessons' | 'concepts'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <SearchResultsTemplate
      query={query}
      onQueryChange={setQuery}
      results={mockResults}
      totalResults={42}
      resultCounts={{ all: 42, courses: 8, lessons: 24, concepts: 10 }}
      activeType={activeType}
      onTypeChange={setActiveType}
      currentPage={currentPage}
      totalPages={5}
      onPageChange={setCurrentPage}
      recentSearches={['TypeScript', 'Node.js', 'GraphQL']}
      onRecentSearchClick={setQuery}
      user={{ name: 'John Doe', email: 'john@example.com' }}
      navigationItems={navigationItems}
      logo={<span className="font-bold text-xl text-indigo-600">KFlow</span>}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveSearch />,
};

export const WithResults: Story = {
  args: {
    query: 'React',
    results: mockResults,
    totalResults: 42,
    resultCounts: { all: 42, courses: 8, lessons: 24, concepts: 10 },
    activeType: 'all',
    currentPage: 1,
    totalPages: 5,
    user: { name: 'John Doe', email: 'john@example.com' },
    navigationItems,
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
  },
};

export const CoursesOnly: Story = {
  args: {
    ...WithResults.args,
    activeType: 'courses',
    results: mockResults.filter(r => r.type === 'course'),
  },
};

export const NoResults: Story = {
  args: {
    query: 'xyz123',
    results: [],
    totalResults: 0,
    resultCounts: { all: 0, courses: 0, lessons: 0, concepts: 0 },
    user: { name: 'John Doe', email: 'john@example.com' },
    navigationItems,
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
  },
};

export const Loading: Story = {
  args: {
    ...WithResults.args,
    loading: true,
  },
};

export const EmptyQuery: Story = {
  args: {
    query: '',
    results: [],
    recentSearches: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'Docker'],
    user: { name: 'John Doe', email: 'john@example.com' },
    navigationItems,
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
  },
};

export const Mobile: Story = {
  render: () => <InteractiveSearch />,
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

