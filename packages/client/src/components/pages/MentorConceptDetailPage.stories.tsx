import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MentorConceptDetailPage } from './MentorConceptDetailPage';
import { Typography } from '../atoms/Typography';
import { Card } from '../molecules/Card';

const meta: Meta<typeof MentorConceptDetailPage> = {
  title: 'Pages/MentorConceptDetailPage',
  component: MentorConceptDetailPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onBack: { action: 'back clicked' },
    onTabChange: { action: 'tab changed' },
    onOperationPanelToggle: { action: 'operation panel toggled' },
  },
};

export default meta;
type Story = StoryObj<typeof MentorConceptDetailPage>;

export const Default: Story = {
  args: {
    graphId: 'graph-1',
    concept: {
      id: 'concept-1',
      name: 'React',
      description: 'A JavaScript library for building user interfaces',
      layer: 0,
      isSeed: true,
    },
    conceptHeader: (
      <div>
        <Typography variant="h2">React</Typography>
        <Typography variant="body" color="secondary">
          A JavaScript library for building user interfaces
        </Typography>
      </div>
    ),
    lessonPanel: (
      <Card>
        <Typography variant="body">Lesson content goes here...</Typography>
      </Card>
    ),
    flashcardSection: (
      <Card>
        <Typography variant="body">Flashcards go here...</Typography>
      </Card>
    ),
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    navigationItems: [
      { id: 'home', label: 'Home' },
      { id: 'mentor', label: 'Mentor', active: true },
    ],
  },
};

export const Loading: Story = {
  args: {
    graphId: 'graph-1',
    loading: true,
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};

export const Error: Story = {
  args: {
    graphId: 'graph-1',
    error: 'Concept not found',
    user: {
      name: 'User',
    },
    navigationItems: [],
  },
};
