import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ScheduleSlotCard } from './ScheduleSlotCard';
import { mockScheduleSlots } from '../../__mocks__/studentMocks';

const meta: Meta<typeof ScheduleSlotCard> = {
  title: 'Molecules/ScheduleSlotCard',
  component: ScheduleSlotCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Card component displaying schedule slot information with day, time, location, and actions.',
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
type Story = StoryObj<typeof ScheduleSlotCard>;

export const Default: Story = {
  args: {
    scheduleSlot: {
      id: mockScheduleSlots[0].id,
      studentName: mockScheduleSlots[0].studentName,
      courseTitle: mockScheduleSlots[0].courseTitle,
      dayOfWeek: mockScheduleSlots[0].dayOfWeek,
      startTime: mockScheduleSlots[0].startTime,
      endTime: mockScheduleSlots[0].endTime,
      location: mockScheduleSlots[0].location,
      room: mockScheduleSlots[0].room,
      recurring: mockScheduleSlots[0].recurring,
    },
    onEdit: () => {},
    onDelete: () => {},
  },
};

export const WithLocation: Story = {
  args: {
    scheduleSlot: {
      id: mockScheduleSlots[0].id,
      studentName: mockScheduleSlots[0].studentName,
      courseTitle: mockScheduleSlots[0].courseTitle,
      dayOfWeek: mockScheduleSlots[0].dayOfWeek,
      startTime: mockScheduleSlots[0].startTime,
      endTime: mockScheduleSlots[0].endTime,
      location: 'Main Building',
      room: 'Room 101',
      recurring: true,
    },
    onEdit: () => {},
    onDelete: () => {},
  },
};

export const RecurringSlot: Story = {
  args: {
    scheduleSlot: {
      id: mockScheduleSlots[0].id,
      studentName: mockScheduleSlots[0].studentName,
      courseTitle: mockScheduleSlots[0].courseTitle,
      dayOfWeek: mockScheduleSlots[0].dayOfWeek,
      startTime: mockScheduleSlots[0].startTime,
      endTime: mockScheduleSlots[0].endTime,
      location: mockScheduleSlots[0].location,
      room: mockScheduleSlots[0].room,
      recurring: true,
    },
    onEdit: () => {},
    onDelete: () => {},
  },
};

export const NonRecurringSlot: Story = {
  args: {
    scheduleSlot: {
      id: mockScheduleSlots[3].id,
      studentName: mockScheduleSlots[3].studentName,
      courseTitle: mockScheduleSlots[3].courseTitle,
      dayOfWeek: mockScheduleSlots[3].dayOfWeek,
      startTime: mockScheduleSlots[3].startTime,
      endTime: mockScheduleSlots[3].endTime,
      recurring: false,
    },
    onEdit: () => {},
    onDelete: () => {},
  },
};

export const NoLocation: Story = {
  args: {
    scheduleSlot: {
      id: mockScheduleSlots[3].id,
      studentName: mockScheduleSlots[3].studentName,
      courseTitle: mockScheduleSlots[3].courseTitle,
      dayOfWeek: mockScheduleSlots[3].dayOfWeek,
      startTime: mockScheduleSlots[3].startTime,
      endTime: mockScheduleSlots[3].endTime,
      recurring: false,
    },
    onEdit: () => {},
    onDelete: () => {},
  },
};

export const Clickable: Story = {
  args: {
    scheduleSlot: {
      id: mockScheduleSlots[0].id,
      studentName: mockScheduleSlots[0].studentName,
      courseTitle: mockScheduleSlots[0].courseTitle,
      dayOfWeek: mockScheduleSlots[0].dayOfWeek,
      startTime: mockScheduleSlots[0].startTime,
      endTime: mockScheduleSlots[0].endTime,
      location: mockScheduleSlots[0].location,
      room: mockScheduleSlots[0].room,
      recurring: true,
    },
    onClick: () => {},
    onEdit: () => {},
    onDelete: () => {},
  },
};

export const Loading: Story = {
  args: {
    scheduleSlot: {
      id: mockScheduleSlots[0].id,
      studentName: mockScheduleSlots[0].studentName,
      courseTitle: mockScheduleSlots[0].courseTitle,
      dayOfWeek: mockScheduleSlots[0].dayOfWeek,
      startTime: mockScheduleSlots[0].startTime,
      endTime: mockScheduleSlots[0].endTime,
      location: mockScheduleSlots[0].location,
      room: mockScheduleSlots[0].room,
      recurring: true,
    },
    loading: true,
    onEdit: () => {},
    onDelete: () => {},
  },
};

export const NoActions: Story = {
  args: {
    scheduleSlot: {
      id: mockScheduleSlots[0].id,
      studentName: mockScheduleSlots[0].studentName,
      courseTitle: mockScheduleSlots[0].courseTitle,
      dayOfWeek: mockScheduleSlots[0].dayOfWeek,
      startTime: mockScheduleSlots[0].startTime,
      endTime: mockScheduleSlots[0].endTime,
      location: mockScheduleSlots[0].location,
      room: mockScheduleSlots[0].room,
      recurring: true,
    },
  },
};
