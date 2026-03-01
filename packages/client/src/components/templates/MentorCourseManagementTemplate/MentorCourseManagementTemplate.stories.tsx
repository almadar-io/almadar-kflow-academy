import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MentorCourseManagementTemplate } from './MentorCourseManagementTemplate';
import { CourseSettingsForm } from '../../organisms/CourseSettingsForm';
import { StudentManagementDialog } from '../StudentManagementDialog';
import { mockStudents, mockScheduleSlots } from '../../__mocks__/studentMocks';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta: Meta<typeof MentorCourseManagementTemplate> = {
  title: 'Templates/MentorCourseManagementTemplate',
  component: MentorCourseManagementTemplate,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Template for course management page with tabs for Settings, Students, and Content.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  argTypes: {
    activeTab: {
      control: 'select',
      options: ['settings', 'students', 'content'],
      description: 'Active tab ID',
    },
    onTabChange: {
      action: 'tab changed',
      description: 'Callback when tab changes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MentorCourseManagementTemplate>;

const mockUser = {
  name: 'John Instructor',
  email: 'instructor@example.com',
};

const mockCourseSettings = {
  title: 'Introduction to React',
  description: 'Learn the fundamentals of React development',
  visibility: 'public' as const,
  enrollmentEnabled: true,
  maxStudents: 50,
};

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

export const SettingsTab: Story = {
  args: {
    courseId: 'course-1',
    courseSettings: mockCourseSettings,
    activeTab: 'settings',
    settingsContent: (
      <CourseSettingsForm
        initialSettings={mockCourseSettings}
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    ),
    user: mockUser,
    onBack: () => {},
    onLogout: () => {},
  },
};

export const StudentsTab: Story = {
  args: {
    courseId: 'course-1',
    courseSettings: mockCourseSettings,
    activeTab: 'students',
    studentsContent: (
      <StudentManagementDialog
        asModal={false}
        courseId="course-1"
        courseTitle={mockCourseSettings.title}
        students={students.filter((s) => s.enrolledCoursesCount && s.enrolledCoursesCount > 0)}
        scheduleSlots={scheduleSlots.filter((s) => s.courseSettingsId === 'course-1')}
        onAddStudent={() => {}}
        onEditStudent={() => {}}
        onDeleteStudent={() => {}}
        onSlotClick={() => {}}
        onEmptySlotClick={() => {}}
      />
    ),
    user: mockUser,
    onBack: () => {},
    onLogout: () => {},
  },
};

export const ContentTab: Story = {
  args: {
    courseId: 'course-1',
    courseSettings: mockCourseSettings,
    activeTab: 'content',
    contentContent: (
      <div className="space-y-4">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Modules & Lessons</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Content management interface for publishing modules and lessons will go here.
          </p>
        </div>
      </div>
    ),
    user: mockUser,
    onBack: () => {},
    onLogout: () => {},
  },
};

export const AllTabs: Story = {
  args: {
    courseId: 'course-1',
    courseSettings: mockCourseSettings,
    activeTab: 'settings',
    settingsContent: (
      <CourseSettingsForm
        initialSettings={mockCourseSettings}
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    ),
    studentsContent: (
      <StudentManagementDialog
        asModal={false}
        courseId="course-1"
        courseTitle={mockCourseSettings.title}
        students={students}
        scheduleSlots={scheduleSlots}
        onAddStudent={() => {}}
        onEditStudent={() => {}}
        onDeleteStudent={() => {}}
        onSlotClick={() => {}}
        onEmptySlotClick={() => {}}
      />
    ),
    contentContent: (
      <div className="space-y-4">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Modules & Lessons</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Content management interface for publishing modules and lessons will go here.
          </p>
        </div>
      </div>
    ),
    user: mockUser,
    onBack: () => {},
    onLogout: () => {},
  },
};

export const WithoutBackButton: Story = {
  args: {
    courseId: 'course-1',
    courseSettings: mockCourseSettings,
    activeTab: 'settings',
    settingsContent: (
      <CourseSettingsForm
        initialSettings={mockCourseSettings}
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    ),
    user: mockUser,
    onLogout: () => {},
  },
};
