import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ScheduleCalendar } from './ScheduleCalendar';
import { mockScheduleSlots } from '../../__mocks__/scheduleMocks';

const meta: Meta<typeof ScheduleCalendar> = {
  title: 'Organisms/ScheduleCalendar',
  component: ScheduleCalendar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Calendar view for schedule slots with weekly view. Supports clicking slots and empty time slots.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSlotClick: {
      action: 'slot clicked',
      description: 'Callback when schedule slot is clicked',
    },
    onEmptySlotClick: {
      action: 'empty slot clicked',
      description: 'Callback when empty slot is clicked',
    },
    defaultView: {
      control: 'select',
      options: ['week', 'month'],
      description: 'Initial view mode',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ScheduleCalendar>;

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
}));

export const Default: Story = {
  args: {
    scheduleSlots,
    onSlotClick: () => {},
    onEmptySlotClick: () => {},
  },
};

export const Empty: Story = {
  args: {
    scheduleSlots: [],
    onSlotClick: () => {},
    onEmptySlotClick: () => {},
  },
};

export const Loading: Story = {
  args: {
    scheduleSlots: [],
    loading: true,
  },
};

export const MultipleCourses: Story = {
  args: {
    scheduleSlots: [
      ...scheduleSlots,
      {
        id: 'schedule-5',
        studentUserId: 'user-2',
        studentName: 'Jane Smith',
        courseSettingsId: 'course-2',
        courseTitle: 'Advanced TypeScript',
        dayOfWeek: 1,
        startTime: '11:00',
        endTime: '12:30',
        location: 'Tech Building',
        room: 'Room 205',
      },
      {
        id: 'schedule-6',
        studentUserId: 'user-3',
        studentName: 'Bob Johnson',
        courseSettingsId: 'course-3',
        courseTitle: 'Full Stack Development',
        dayOfWeek: 2,
        startTime: '13:00',
        endTime: '14:30',
      },
    ],
    onSlotClick: () => {},
    onEmptySlotClick: () => {},
  },
};

export const WeekView: Story = {
  args: {
    scheduleSlots,
    defaultView: 'week',
    onSlotClick: () => {},
    onEmptySlotClick: () => {},
  },
};

export const MonthView: Story = {
  args: {
    scheduleSlots,
    defaultView: 'month',
    onSlotClick: () => {},
    onEmptySlotClick: () => {},
  },
};
