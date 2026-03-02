import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ScheduleSlotForm } from './ScheduleSlotForm';
import { mockStudents, mockCourses, mockScheduleSlots } from '../../__mocks__/scheduleMocks';

const meta: Meta<typeof ScheduleSlotForm> = {
  title: 'Molecules/ScheduleSlotForm',
  component: ScheduleSlotForm,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Form for creating/editing schedule slots with student, course, day, time, and location fields.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: {
      action: 'submitted',
      description: 'Callback when form is submitted',
    },
    onCancel: {
      action: 'cancelled',
      description: 'Callback when form is cancelled',
    },
    isLoading: {
      control: 'boolean',
      description: 'Show loading state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ScheduleSlotForm>;

const students = mockStudents.map((s) => ({
  userId: s.userId,
  name: s.name,
  email: s.email,
}));

const courses = mockCourses.map((c) => ({
  id: c.id,
  title: c.title,
}));

export const CreateMode: Story = {
  args: {
    students,
    courses,
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const EditMode: Story = {
  args: {
    initialValues: {
      studentUserId: mockScheduleSlots[0].studentUserId,
      courseSettingsId: mockScheduleSlots[0].courseSettingsId,
      dayOfWeek: String(mockScheduleSlots[0].dayOfWeek),
      startTime: mockScheduleSlots[0].startTime,
      endTime: mockScheduleSlots[0].endTime,
      location: mockScheduleSlots[0].location,
      room: mockScheduleSlots[0].room,
      recurring: mockScheduleSlots[0].recurring,
    },
    students,
    courses,
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const CourseSpecificMode: Story = {
  args: {
    students,
    courseSettingsId: 'course-1',
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const WithErrors: Story = {
  args: {
    students,
    courses,
    errors: {
      studentUserId: 'Please select a student',
      dayOfWeek: 'Please select a day',
      startTime: 'Please select a start time',
    },
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const Loading: Story = {
  args: {
    students,
    courses,
    isLoading: true,
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const Prefilled: Story = {
  args: {
    initialValues: {
      studentUserId: students[0].userId,
      courseSettingsId: courses[0].id,
      dayOfWeek: '1',
      startTime: '09:00',
      endTime: '10:30',
      location: 'Main Building',
      room: 'Room 101',
      recurring: true,
    },
    students,
    courses,
    onSubmit: () => {},
    onCancel: () => {},
  },
};
