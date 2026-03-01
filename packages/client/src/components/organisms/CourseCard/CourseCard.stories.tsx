import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { CourseCard } from './CourseCard';
import { Book, Edit, Trash2, Share2 } from 'lucide-react';
import { Button } from '../../atoms/Button';

const meta: Meta<typeof CourseCard> = {
  title: 'Organisms/CourseCard',
  component: CourseCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CourseCard>;

export const Default: Story = {
  args: {
    id: '1',
    title: 'React Mastery',
    description: 'A comprehensive course on React development covering all aspects from basics to advanced patterns.',
    modules: 12,
    duration: 24,
    icon: Book,
  },
};

export const WithProgress: Story = {
  args: {
    id: '2',
    title: 'Advanced JavaScript',
    description: 'Deep dive into modern JavaScript features and patterns.',
    modules: 8,
    duration: 16,
    progress: 65,
    icon: Book,
  },
};

export const Public: Story = {
  args: {
    id: '3',
    title: 'Public Course',
    description: 'This is a publicly available course.',
    modules: 10,
    duration: 20,
    isPublic: true,
    icon: Book,
  },
};

export const WithActions: Story = {
  args: {
    id: '4',
    title: 'Course with Actions',
    description: 'This course has action menu items.',
    modules: 6,
    duration: 12,
    icon: Book,
    actions: [
      { id: 'edit', label: 'Edit', icon: Edit, onClick: () => alert('Edit clicked') },
      { id: 'share', label: 'Share', icon: Share2, onClick: () => alert('Share clicked') },
      { id: 'divider', label: '', onClick: () => {} },
      { id: 'delete', label: 'Delete', icon: Trash2, onClick: () => alert('Delete clicked') },
    ],
  },
};

export const WithQuickActions: Story = {
  args: {
    id: '5',
    title: 'Course with Quick Actions',
    description: 'This course has quick action buttons.',
    modules: 5,
    duration: 10,
    progress: 40,
    icon: Book,
    quickActions: (
      <>
        <Button variant="primary" size="sm" fullWidth>
          Continue Learning
        </Button>
      </>
    ),
  },
};

export const WithImage: Story = {
  args: {
    id: '6',
    title: 'Course with Image',
    description: 'This course has a header image.',
    imageUrl: 'https://via.placeholder.com/400x200?text=Course+Image',
    modules: 15,
    duration: 30,
    progress: 80,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
      <CourseCard
        id="1"
        title="Basic Course"
        description="A basic course description."
        modules={5}
        duration={10}
        icon={Book}
      />
      <CourseCard
        id="2"
        title="Course with Progress"
        description="A course with progress tracking."
        modules={8}
        duration={16}
        progress={60}
        icon={Book}
      />
      <CourseCard
        id="3"
        title="Public Course"
        description="A publicly available course."
        modules={10}
        duration={20}
        isPublic={true}
        icon={Book}
      />
      <CourseCard
        id="4"
        title="Draft Course"
        description="A course in draft status."
        modules={6}
        duration={12}
        status="draft"
        icon={Book}
      />
    </div>
  ),
};
