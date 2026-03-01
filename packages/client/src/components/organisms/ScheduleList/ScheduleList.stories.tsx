import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ScheduleList } from './ScheduleList';
import { mockScheduleSlots } from '../../__mocks__/studentMocks';

const meta: Meta<typeof ScheduleList> = {
  title: 'Organisms/ScheduleList',
  component: ScheduleList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'List/table view for schedule slots with search, filtering, and sorting.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onEditSlot: {
      action: 'edit clicked',
      description: 'Callback when edit button is clicked',
    },
    onDeleteSlot: {
      action: 'delete clicked',
      description: 'Callback when delete button is clicked',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ScheduleList>;

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

export const Default: Story = {
  args: {
    scheduleSlots,
    onEditSlot: () => {},
    onDeleteSlot: () => {},
  },
};

export const Empty: Story = {
  args: {
    scheduleSlots: [],
    onEditSlot: () => {},
    onDeleteSlot: () => {},
  },
};

export const Loading: Story = {
  args: {
    scheduleSlots: [],
    loading: true,
  },
};

export const FilteredByStudent: Story = {
  args: {
    scheduleSlots,
    filterByStudent: 'user-1',
    onEditSlot: () => {},
    onDeleteSlot: () => {},
  },
};

export const FilteredByCourse: Story = {
  args: {
    scheduleSlots,
    filterByCourse: 'course-1',
    onEditSlot: () => {},
    onDeleteSlot: () => {},
  },
};

export const WithSearch: Story = {
  args: {
    scheduleSlots,
    onEditSlot: () => {},
    onDeleteSlot: () => {},
  },
  render: (args) => {
    // Search will be handled internally
    return <ScheduleList {...args} />;
  },
};

export const NoActions: Story = {
  args: {
    scheduleSlots,
  },
};
