/**
 * Storybook stories for StreamingConceptsDisplay component
 */

import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { StreamingConceptsDisplay } from './StreamingConceptsDisplay';

const meta: Meta<typeof StreamingConceptsDisplay> = {
  title: 'Organisms/StreamingConceptsDisplay',
  component: StreamingConceptsDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof StreamingConceptsDisplay>;

// Example stream content with concepts
const streamContentWithConcepts = `
<goal>Learn React and build modern web applications</goal>
<concept>React Components</concept>
<description>Understanding functional components, JSX, and component composition</description>
<parents>JavaScript, HTML, CSS</parents>
<concept>React Hooks</concept>
<description>Using useState, useEffect, useContext, and custom hooks</description>
<parents>React Components</parents>
<concept>State Management</concept>
<description>Managing application state with Redux, Context API, or Zustand</description>
<parents>React Hooks</parents>
<concept>React Router</concept>
<description>Implementing client-side routing and navigation</description>
<parents>React Components</parents>
`;

const streamContentPartial = `
<goal>Learn React and build modern web applications</goal>
<concept>React Components</concept>
<description>Understanding functional components, JSX, and component composition</description>
<parents>JavaScript, HTML, CSS</parents>
<concept>React Hooks</concept>
`;

const streamContentWithGoalOnly = `
<goal>Master machine learning fundamentals and build predictive models</goal>
`;

const streamContentIncomplete = `
<concept>Neural Networks</concept>
<concept>Deep Learning</concept>
`;

export const WithConcepts: Story = {
  args: {
    streamContent: streamContentWithConcepts,
    isLoading: false,
  },
};

export const WithGoal: Story = {
  args: {
    streamContent: streamContentWithGoalOnly,
    goal: 'Master machine learning fundamentals and build predictive models',
    isLoading: false,
  },
};

export const PartialStream: Story = {
  args: {
    streamContent: streamContentPartial,
    isLoading: true,
  },
};

export const LoadingState: Story = {
  args: {
    streamContent: '',
    isLoading: true,
  },
};

export const EmptyState: Story = {
  args: {
    streamContent: '',
    isLoading: false,
  },
};

export const IncompleteConcepts: Story = {
  args: {
    streamContent: streamContentIncomplete,
    isLoading: true,
  },
};

export const CustomMaxHeight: Story = {
  args: {
    streamContent: streamContentWithConcepts,
    isLoading: false,
    maxHeight: '12rem',
  },
};

export const NoAutoScroll: Story = {
  args: {
    streamContent: streamContentWithConcepts,
    isLoading: false,
    autoScroll: false,
  },
};

export const WithManyConcepts: Story = {
  args: {
    streamContent: `
<goal>Learn Full Stack Web Development</goal>
<concept>HTML</concept>
<description>Structure and semantics of web pages</description>
<parents></parents>
<concept>CSS</concept>
<description>Styling and layout of web pages</description>
<parents>HTML</parents>
<concept>JavaScript</concept>
<description>Programming language for web interactivity</description>
<parents>HTML, CSS</parents>
<concept>React</concept>
<description>JavaScript library for building user interfaces</description>
<parents>JavaScript</parents>
<concept>Node.js</concept>
<description>JavaScript runtime for server-side development</description>
<parents>JavaScript</parents>
<concept>Express</concept>
<description>Web framework for Node.js</description>
<parents>Node.js</parents>
<concept>MongoDB</concept>
<description>NoSQL database for storing data</description>
<parents>Node.js</parents>
<concept>PostgreSQL</concept>
<description>Relational database management system</description>
<parents>Node.js</parents>
<concept>REST APIs</concept>
<description>Architectural style for web services</description>
<parents>Express</parents>
<concept>GraphQL</concept>
<description>Query language for APIs</description>
<parents>REST APIs</parents>
`,
    isLoading: false,
    maxHeight: '20rem',
  },
};

