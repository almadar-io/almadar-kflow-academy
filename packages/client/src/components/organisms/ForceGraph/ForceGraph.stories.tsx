import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ForceGraph } from './ForceGraph';
import { useState } from 'react';

const meta: Meta<typeof ForceGraph> = {
  title: 'Organisms/ForceGraph',
  component: ForceGraph,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ForceGraph>;

// Sample data for stories
const basicNodes = [
  { id: '1', label: 'React', group: 'Frontend', isPrimary: true },
  { id: '2', label: 'Components', group: 'Frontend' },
  { id: '3', label: 'State', group: 'Frontend' },
  { id: '4', label: 'Props', group: 'Frontend' },
  { id: '5', label: 'Hooks', group: 'Frontend' },
];

const basicEdges = [
  { source: '1', target: '2', label: 'has' },
  { source: '1', target: '3', label: 'manages' },
  { source: '1', target: '4', label: 'uses' },
  { source: '2', target: '5', label: 'use' },
  { source: '3', target: '5', label: 'managed by' },
];

export const Default: Story = {
  args: {
    nodes: basicNodes,
    edges: basicEdges,
    onNodeClick: (nodeId, node) => console.log('Clicked:', nodeId, node),
  },
};

export const WithMultipleGroups: Story = {
  args: {
    nodes: [
      { id: '1', label: 'Application', group: 'Core', isPrimary: true },
      { id: '2', label: 'Frontend', group: 'Layer 1' },
      { id: '3', label: 'Backend', group: 'Layer 1' },
      { id: '4', label: 'Database', group: 'Layer 2' },
      { id: '5', label: 'React', group: 'Layer 1' },
      { id: '6', label: 'Node.js', group: 'Layer 1' },
      { id: '7', label: 'PostgreSQL', group: 'Layer 2' },
      { id: '8', label: 'Redis', group: 'Layer 2' },
    ],
    edges: [
      { source: '1', target: '2' },
      { source: '1', target: '3' },
      { source: '2', target: '5' },
      { source: '3', target: '6' },
      { source: '3', target: '4' },
      { source: '4', target: '7' },
      { source: '4', target: '8' },
    ],
    onNodeClick: (nodeId) => console.log('Node clicked:', nodeId),
  },
};

export const KnowledgeGraph: Story = {
  args: {
    nodes: [
      { id: 'seed', label: 'Machine Learning', group: 'L0', isPrimary: true, description: 'Seed concept' },
      { id: 'supervised', label: 'Supervised Learning', group: 'L1' },
      { id: 'unsupervised', label: 'Unsupervised Learning', group: 'L1' },
      { id: 'reinforcement', label: 'Reinforcement Learning', group: 'L1' },
      { id: 'classification', label: 'Classification', group: 'L2' },
      { id: 'regression', label: 'Regression', group: 'L2' },
      { id: 'clustering', label: 'Clustering', group: 'L2' },
      { id: 'neural', label: 'Neural Networks', group: 'L2' },
      { id: 'cnn', label: 'CNN', group: 'L3' },
      { id: 'rnn', label: 'RNN', group: 'L3' },
    ],
    edges: [
      { source: 'seed', target: 'supervised', label: 'includes' },
      { source: 'seed', target: 'unsupervised', label: 'includes' },
      { source: 'seed', target: 'reinforcement', label: 'includes' },
      { source: 'supervised', target: 'classification' },
      { source: 'supervised', target: 'regression' },
      { source: 'unsupervised', target: 'clustering' },
      { source: 'supervised', target: 'neural' },
      { source: 'neural', target: 'cnn' },
      { source: 'neural', target: 'rnn' },
    ],
    legendItems: [
      { key: 'L0', label: 'Seed Concept', color: '#8b5cf6' },
      { key: 'L1', label: 'Layer 1', color: '#3b82f6' },
      { key: 'L2', label: 'Layer 2', color: '#10b981' },
      { key: 'L3', label: 'Layer 3', color: '#f59e0b' },
    ],
    colorPalette: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'],
    onNodeClick: (nodeId, node) => alert(`Selected: ${node.label}`),
  },
};

export const CustomColors: Story = {
  args: {
    nodes: [
      { id: '1', label: 'Node 1', color: '#ef4444' },
      { id: '2', label: 'Node 2', color: '#22c55e' },
      { id: '3', label: 'Node 3', color: '#3b82f6' },
      { id: '4', label: 'Node 4', color: '#a855f7' },
      { id: '5', label: 'Node 5', color: '#f59e0b' },
    ],
    edges: [
      { source: '1', target: '2', color: '#ef4444' },
      { source: '1', target: '3', color: '#22c55e' },
      { source: '2', target: '4', color: '#3b82f6' },
      { source: '3', target: '5', color: '#a855f7' },
      { source: '4', target: '5', color: '#f59e0b' },
    ],
    showLegend: false,
  },
};

export const LargeGraph: Story = {
  args: {
    nodes: Array.from({ length: 30 }, (_, i) => ({
      id: `node-${i}`,
      label: `Concept ${i + 1}`,
      group: `Layer ${Math.floor(i / 10)}`,
      isPrimary: i === 0,
      size: i === 0 ? 2 : 1,
    })),
    edges: Array.from({ length: 40 }, (_, i) => ({
      source: `node-${Math.floor(Math.random() * 30)}`,
      target: `node-${Math.floor(Math.random() * 30)}`,
      weight: Math.random() + 0.5,
    })).filter(e => e.source !== e.target),
    onNodeClick: (nodeId) => console.log('Clicked:', nodeId),
  },
};

export const NoLabels: Story = {
  args: {
    nodes: basicNodes,
    edges: basicEdges,
    showLabels: false,
  },
};

export const NoControls: Story = {
  args: {
    nodes: basicNodes,
    edges: basicEdges,
    showZoomControls: false,
    showLegend: false,
  },
};

export const Empty: Story = {
  args: {
    nodes: [],
    edges: [],
    emptyMessage: 'No concepts in this knowledge graph yet',
  },
};

// Interactive story with state
const InteractiveGraph = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-gray-100 dark:bg-gray-800">
        <p className="text-sm">
          Selected Node: <strong>{selectedNode || 'None'}</strong>
        </p>
      </div>
      <div className="flex-1">
        <ForceGraph
          nodes={[
            { id: 'react', label: 'React', group: 'Core', isPrimary: true },
            { id: 'redux', label: 'Redux', group: 'State' },
            { id: 'router', label: 'React Router', group: 'Navigation' },
            { id: 'query', label: 'React Query', group: 'Data' },
            { id: 'hooks', label: 'Hooks', group: 'Core' },
            { id: 'context', label: 'Context', group: 'State' },
          ]}
          edges={[
            { source: 'react', target: 'redux' },
            { source: 'react', target: 'router' },
            { source: 'react', target: 'query' },
            { source: 'react', target: 'hooks' },
            { source: 'hooks', target: 'context' },
            { source: 'context', target: 'redux' },
          ]}
          onNodeClick={(nodeId) => setSelectedNode(nodeId)}
          onNodeHover={(nodeId) => console.log('Hovering:', nodeId)}
        />
      </div>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveGraph />,
};
