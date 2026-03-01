/**
 * Storybook stories for StreamingJSONDisplay component
 */

import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { StreamingJSONDisplay } from './StreamingJSONDisplay';

const meta: Meta<typeof StreamingJSONDisplay> = {
  title: 'Molecules/StreamingJSONDisplay',
  component: StreamingJSONDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof StreamingJSONDisplay>;

// Example of complete JSON
const completeJSON = `{"title": "Learn React", "description": "Master React framework", "type": "skill", "target": "intermediate", "estimatedTime": 40, "milestones": [{"id": "m1", "title": "Basics", "description": "Learn React fundamentals", "completed": false}, {"id": "m2", "title": "Advanced", "description": "Learn advanced patterns", "completed": false}]}`;

// Example of partial/incremental JSON (as it streams)
const partialJSON1 = `{"title": "Learn React"`;
const partialJSON2 = `{"title": "Learn React", "description": "Master React framework"`;
const partialJSON3 = `{"title": "Learn React", "description": "Master React framework", "type": "skill", "target": "intermediate", "milestones": [{"id": "m1"`;
const partialJSON4 = `{"title": "Learn React", "description": "Master React framework", "type": "skill", "target": "intermediate", "milestones": [{"id": "m1", "title": "Basics"`;
const partialJSON5 = `{"title": "Learn React", "description": "Master React framework", "type": "skill", "target": "intermediate", "milestones": [{"id": "m1", "title": "Basics", "description": "Learn React fundamentals"}, {"id": "m2", "title": "Advanced"`;

export const CompleteJSON: Story = {
  args: {
    content: completeJSON,
    title: 'Complete Goal Data',
  },
};

export const PartialJSON: Story = {
  args: {
    content: partialJSON3,
    title: 'Streaming Goal Data',
  },
};

export const EarlyStream: Story = {
  args: {
    content: partialJSON1,
    title: 'Early Stream',
  },
};

export const MidStream: Story = {
  args: {
    content: partialJSON2,
    title: 'Mid Stream',
  },
};

export const FirstMilestone: Story = {
  args: {
    content: partialJSON4,
    title: 'First Milestone Streaming',
  },
};

export const MultipleMilestones: Story = {
  args: {
    content: partialJSON5,
    title: 'Multiple Milestones Streaming',
  },
};

export const WithMilestones: Story = {
  args: {
    content: completeJSON,
    title: 'Complete Goal with Milestones',
  },
};

export const ShowRawContent: Story = {
  args: {
    content: partialJSON3,
    title: 'With Raw Content',
    showRaw: true,
  },
};

export const EmptyContent: Story = {
  args: {
    content: '',
    title: 'Waiting for Data',
  },
};

export const ComplexNested: Story = {
  args: {
    content: `{"title": "Learn Full Stack", "description": "Master full stack development", "milestones": [{"id": "m1", "title": "Frontend", "skills": ["React", "Vue"]}, {"id": "m2", "title": "Backend", "skills": ["Node.js", "Python"]}]}`,
    title: 'Complex Nested Data',
  },
};

