import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { StudentManagementDialog } from './StudentManagementDialog';
import { mockStudents, mockScheduleSlots, mockCourses } from '../../__mocks__/studentMocks';

const meta: Meta<typeof StudentManagementDialog> = {
  title: 'Templates/StudentManagementDialog',
  component: StudentManagementDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Main student management dialog/section with tabs for Students and Schedule. Can be rendered as modal or embedded section.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether dialog is open (modal mode)',
    },
    asModal: {
      control: 'boolean',
      description: 'Render as modal or embedded section',
    },
    courseId: {
      control: 'text',
      description: 'Course ID for course-specific view',
    },
  },
};

export default meta;
type Story = StoryObj<typeof StudentManagementDialog>;

const students = mockStudents.map((s) => ({
  id: s.id,
  userId: s.userId,
  name: s.name,
  email: s.email,
  phone: s.phone,
  enrolledCoursesCount: s.enrolledCoursesCount,
}));

const scheduleSlots = mockScheduleSlots.map((s) => ({
  id: s.id,
  studentUserId: s.studentUserId,
  studentName: s.studentName,
  courseSettingsId: s.courseSettingsId,
  courseTitle: s.courseTitle,
  dayOfWeek: s.dayOfWeek,
  startTime: s.startTime,
  endTime: s.endTime,
  location: s.location,
  room: s.room,
  recurring: s.recurring,
}));

export const GlobalModeAsModal: Story = {
  args: {
    isOpen: true,
    asModal: true,
    students,
    scheduleSlots,
    onAddStudent: () => {},
    onEditStudent: () => {},
    onDeleteStudent: () => {},
    onSlotClick: () => {},
    onEmptySlotClick: () => {},
  },
};

export const CourseSpecificModeAsModal: Story = {
  args: {
    isOpen: true,
    asModal: true,
    courseId: 'course-1',
    courseTitle: 'Introduction to React',
    students: students.filter((s) => s.enrolledCoursesCount && s.enrolledCoursesCount > 0),
    scheduleSlots: scheduleSlots.filter((s) => s.courseSettingsId === 'course-1'),
    onAddStudent: () => {},
    onEditStudent: () => {},
    onDeleteStudent: () => {},
    onSlotClick: () => {},
    onEmptySlotClick: () => {},
  },
};

export const EmbeddedGlobalMode: Story = {
  args: {
    asModal: false,
    students,
    scheduleSlots,
    onAddStudent: () => {},
    onEditStudent: () => {},
    onDeleteStudent: () => {},
    onSlotClick: () => {},
    onEmptySlotClick: () => {},
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export const EmbeddedCourseSpecificMode: Story = {
  args: {
    asModal: false,
    courseId: 'course-1',
    courseTitle: 'Introduction to React',
    students: students.filter((s) => s.enrolledCoursesCount && s.enrolledCoursesCount > 0),
    scheduleSlots: scheduleSlots.filter((s) => s.courseSettingsId === 'course-1'),
    onAddStudent: () => {},
    onEditStudent: () => {},
    onDeleteStudent: () => {},
    onSlotClick: () => {},
    onEmptySlotClick: () => {},
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export const EmptyStudents: Story = {
  args: {
    isOpen: true,
    asModal: true,
    students: [],
    scheduleSlots: [],
    onAddStudent: () => {},
  },
};

export const Loading: Story = {
  args: {
    isOpen: true,
    asModal: true,
    students: [],
    scheduleSlots: [],
    studentsLoading: true,
    scheduleLoading: true,
  },
};

export const StudentsTab: Story = {
  args: {
    isOpen: true,
    asModal: true,
    students,
    scheduleSlots: [],
    onAddStudent: () => {},
    onEditStudent: () => {},
    onDeleteStudent: () => {},
  },
};

export const ScheduleTab: Story = {
  args: {
    isOpen: true,
    asModal: true,
    students: [],
    scheduleSlots,
    onSlotClick: () => {},
    onEmptySlotClick: () => {},
  },
  render: (args) => {
    // Force schedule tab to be active
    return <StudentManagementDialog {...args} />;
  },
};
