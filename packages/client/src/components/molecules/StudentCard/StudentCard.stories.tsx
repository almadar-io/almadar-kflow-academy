import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { StudentCard } from './StudentCard';
import { mockStudents } from '../../__mocks__/studentMocks';

const meta: Meta<typeof StudentCard> = {
  title: 'Molecules/StudentCard',
  component: StudentCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Card component displaying student information with edit and delete actions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onEdit: {
      action: 'edit clicked',
      description: 'Callback when edit button is clicked',
    },
    onDelete: {
      action: 'delete clicked',
      description: 'Callback when delete button is clicked',
    },
    onClick: {
      action: 'card clicked',
      description: 'Callback when card is clicked',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof StudentCard>;

export const Default: Story = {
  args: {
    student: mockStudents[0],
    onEdit: () => {},
    onDelete: () => {},
  },
};

export const WithEnrolledCourses: Story = {
  args: {
    student: {
      ...mockStudents[0],
      enrolledCoursesCount: 3,
    },
    onEdit: () => {},
    onDelete: () => {},
  },
};

export const WithPhone: Story = {
  args: {
    student: mockStudents[0],
    onEdit: () => {},
    onDelete: () => {},
  },
};

export const NoEnrolledCourses: Story = {
  args: {
    student: {
      ...mockStudents[3],
      enrolledCoursesCount: 0,
    },
    onEdit: () => {},
    onDelete: () => {},
  },
};

export const Clickable: Story = {
  args: {
    student: mockStudents[0],
    onClick: () => {},
    onEdit: () => {},
    onDelete: () => {},
  },
};

export const Loading: Story = {
  args: {
    student: mockStudents[0],
    loading: true,
    onEdit: () => {},
    onDelete: () => {},
  },
};

export const NoActions: Story = {
  args: {
    student: mockStudents[0],
  },
};

export const EditOnly: Story = {
  args: {
    student: mockStudents[0],
    onEdit: () => {},
  },
};
