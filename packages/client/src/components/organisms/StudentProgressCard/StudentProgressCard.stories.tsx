import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { StudentProgressCard } from './StudentProgressCard';

const meta: Meta<typeof StudentProgressCard> = {
  title: 'Organisms/StudentProgressCard',
  component: StudentProgressCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StudentProgressCard>;

// Default variant
export const Default: Story = {
  args: {
    id: 'student-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    progress: 65,
    lessonsCompleted: 13,
    totalLessons: 20,
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 14 days ago
    onViewDetails: () => alert('View details clicked'),
    onSendMessage: () => alert('Send message clicked'),
  },
};

// Compact variant
export const Compact: Story = {
  args: {
    id: 'student-2',
    name: 'Jane Smith',
    progress: 45,
    lessonsCompleted: 9,
    totalLessons: 20,
    variant: 'compact',
  },
};

// Detailed variant
export const Detailed: Story = {
  args: {
    id: 'student-3',
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=alex',
    progress: 80,
    lessonsCompleted: 16,
    totalLessons: 20,
    lastActivity: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
    timeSpent: 720, // 12 hours
    avgQuizScore: 92,
    variant: 'detailed',
    onViewDetails: () => alert('View details clicked'),
    onSendMessage: () => alert('Send message clicked'),
  },
};

// Completed student
export const Completed: Story = {
  args: {
    id: 'student-4',
    name: 'Sarah Williams',
    email: 'sarah.w@example.com',
    progress: 100,
    lessonsCompleted: 20,
    totalLessons: 20,
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24), // yesterday
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45), // 45 days ago
    timeSpent: 1440, // 24 hours
    avgQuizScore: 95,
    isCompleted: true,
    hasCertificate: true,
    variant: 'detailed',
    onViewDetails: () => alert('View details clicked'),
  },
};

// Inactive student
export const Inactive: Story = {
  args: {
    id: 'student-5',
    name: 'Mike Brown',
    progress: 15,
    lessonsCompleted: 3,
    totalLessons: 20,
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21), // 3 weeks ago
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60), // 60 days ago
    onViewDetails: () => alert('View details clicked'),
    onSendMessage: () => alert('Send message clicked'),
  },
};

// New student
export const NewStudent: Story = {
  args: {
    id: 'student-6',
    name: 'Emily Davis',
    progress: 5,
    lessonsCompleted: 1,
    totalLessons: 20,
    lastActivity: new Date(), // just now
    enrolledAt: new Date(), // just enrolled
  },
};

// List of compact cards
export const CompactList: Story = {
  render: () => (
    <div className="space-y-2">
      <StudentProgressCard
        id="1"
        name="John Doe"
        progress={85}
        lessonsCompleted={17}
        totalLessons={20}
        variant="compact"
        isCompleted={false}
      />
      <StudentProgressCard
        id="2"
        name="Jane Smith"
        progress={100}
        lessonsCompleted={20}
        totalLessons={20}
        variant="compact"
        isCompleted={true}
      />
      <StudentProgressCard
        id="3"
        name="Alex Johnson"
        progress={45}
        lessonsCompleted={9}
        totalLessons={20}
        variant="compact"
      />
      <StudentProgressCard
        id="4"
        name="Sarah Williams"
        progress={20}
        lessonsCompleted={4}
        totalLessons={20}
        variant="compact"
      />
    </div>
  ),
};

// Default variant list
export const DefaultList: Story = {
  render: () => (
    <div className="space-y-4">
      <StudentProgressCard
        id="1"
        name="John Doe"
        progress={85}
        lessonsCompleted={17}
        totalLessons={20}
        lastActivity={new Date(Date.now() - 1000 * 60 * 30)}
        hasCertificate={false}
        onViewDetails={() => alert('View John')}
      />
      <StudentProgressCard
        id="2"
        name="Jane Smith"
        progress={100}
        lessonsCompleted={20}
        totalLessons={20}
        lastActivity={new Date(Date.now() - 1000 * 60 * 60 * 24)}
        isCompleted={true}
        hasCertificate={true}
        onViewDetails={() => alert('View Jane')}
      />
      <StudentProgressCard
        id="3"
        name="Alex Johnson"
        progress={45}
        lessonsCompleted={9}
        totalLessons={20}
        lastActivity={new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)}
        onViewDetails={() => alert('View Alex')}
        onSendMessage={() => alert('Message Alex')}
      />
    </div>
  ),
};





