import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { StudentAvatar } from './StudentAvatar';

const meta: Meta<typeof StudentAvatar> = {
  title: 'Atoms/StudentAvatar',
  component: StudentAvatar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Avatar component specifically for students. Automatically generates initials from student name.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    studentName: {
      control: 'text',
      description: 'Student name (used to generate initials)',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Avatar size',
    },
    status: {
      control: 'select',
      options: ['online', 'offline', 'away', 'busy'],
      description: 'Status indicator',
    },
  },
};

export default meta;
type Story = StoryObj<typeof StudentAvatar>;

export const Default: Story = {
  args: {
    studentName: 'John Doe',
    studentEmail: 'john.doe@example.com',
  },
};

export const WithImage: Story = {
  args: {
    studentName: 'Jane Smith',
    studentEmail: 'jane.smith@example.com',
    src: 'https://i.pravatar.cc/150?img=1',
  },
};

export const SingleName: Story = {
  args: {
    studentName: 'Alice',
    studentEmail: 'alice@example.com',
  },
};

export const LongName: Story = {
  args: {
    studentName: 'Robert Johnson Williams',
    studentEmail: 'robert.johnson@example.com',
  },
};

export const Small: Story = {
  args: {
    studentName: 'John Doe',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    studentName: 'John Doe',
    size: 'lg',
  },
};

export const WithStatus: Story = {
  args: {
    studentName: 'John Doe',
    status: 'online',
  },
};

export const WithBadge: Story = {
  args: {
    studentName: 'John Doe',
    badge: 3,
  },
};

export const NoName: Story = {
  args: {
    studentEmail: 'student@example.com',
  },
};
