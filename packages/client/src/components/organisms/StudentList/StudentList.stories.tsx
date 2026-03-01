import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { StudentList } from './StudentList';
import { mockStudents } from '../../__mocks__/studentMocks';

const meta: Meta<typeof StudentList> = {
  title: 'Organisms/StudentList',
  component: StudentList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'List of students with search, filters, and sorting capabilities.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSelectStudent: {
      action: 'student selected',
      description: 'Callback when student is selected',
    },
    onAddStudent: {
      action: 'add clicked',
      description: 'Callback when add student button is clicked',
    },
    onEditStudent: {
      action: 'edit clicked',
      description: 'Callback when edit student button is clicked',
    },
    onDeleteStudent: {
      action: 'delete clicked',
      description: 'Callback when delete student button is clicked',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof StudentList>;

const students = mockStudents.map((s) => ({
  id: s.id,
  userId: s.userId,
  name: s.name,
  email: s.email,
  phone: s.phone,
  enrolledCoursesCount: s.enrolledCoursesCount,
}));

export const Default: Story = {
  args: {
    students,
    onAddStudent: () => {},
    onEditStudent: () => {},
    onDeleteStudent: () => {},
  },
};

export const Empty: Story = {
  args: {
    students: [],
    onAddStudent: () => {},
  },
};

export const Loading: Story = {
  args: {
    students: [],
    loading: true,
  },
};

export const WithSearch: Story = {
  args: {
    students,
    searchQuery: 'John',
    onAddStudent: () => {},
    onEditStudent: () => {},
    onDeleteStudent: () => {},
  },
};

export const FilteredEnrolled: Story = {
  args: {
    students,
    onAddStudent: () => {},
    onEditStudent: () => {},
    onDeleteStudent: () => {},
  },
  render: (args) => {
    // Simulate filter being set
    return <StudentList {...args} />;
  },
};

export const NoActions: Story = {
  args: {
    students,
  },
};

export const SingleStudent: Story = {
  args: {
    students: [students[0]],
    onAddStudent: () => {},
    onEditStudent: () => {},
    onDeleteStudent: () => {},
  },
};
