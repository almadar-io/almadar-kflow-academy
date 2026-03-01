import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { TreeMap, TreeMapNode } from './TreeMap';
import { useState } from 'react';

const meta: Meta<typeof TreeMap> = {
  title: 'Organisms/TreeMap',
  component: TreeMap,
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
type Story = StoryObj<typeof TreeMap>;

// Sample data for stories
const basicTreeData: TreeMapNode = {
  id: 'root',
  label: 'Machine Learning',
  isRoot: true,
  children: [
    {
      id: 'supervised',
      label: 'Supervised Learning',
      children: [
        { id: 'classification', label: 'Classification' },
        { id: 'regression', label: 'Regression' },
      ],
    },
    {
      id: 'unsupervised',
      label: 'Unsupervised Learning',
      children: [
        { id: 'clustering', label: 'Clustering' },
        { id: 'dimensionality', label: 'Dimensionality Reduction' },
      ],
    },
  ],
};

export const Default: Story = {
  args: {
    data: basicTreeData,
    onNodeClick: (nodeId, node) => console.log('Clicked:', nodeId, node),
  },
};

export const HorizontalLayout: Story = {
  args: {
    data: basicTreeData,
    layout: 'horizontal',
    onNodeClick: (nodeId) => console.log('Clicked:', nodeId),
  },
};

export const VerticalLayout: Story = {
  args: {
    data: basicTreeData,
    layout: 'vertical',
    onNodeClick: (nodeId) => console.log('Clicked:', nodeId),
  },
};

export const KnowledgeGraphTree: Story = {
  args: {
    data: {
      id: 'goal',
      label: 'Learn React Development',
      description: 'Master modern React patterns',
      isRoot: true,
      children: [
        {
          id: 'layer-1',
          label: 'Fundamentals',
          color: '#3b82f6',
          children: [
            { id: 'jsx', label: 'JSX Syntax', description: 'HTML-like syntax in JavaScript' },
            { id: 'components', label: 'Components', description: 'Building blocks of React' },
            { id: 'props', label: 'Props', description: 'Component inputs' },
          ],
        },
        {
          id: 'layer-2',
          label: 'State Management',
          color: '#10b981',
          children: [
            { id: 'useState', label: 'useState Hook' },
            { id: 'useReducer', label: 'useReducer Hook' },
            { id: 'context', label: 'Context API' },
          ],
        },
        {
          id: 'layer-3',
          label: 'Advanced Patterns',
          color: '#f59e0b',
          children: [
            { id: 'custom-hooks', label: 'Custom Hooks' },
            { id: 'hoc', label: 'Higher-Order Components' },
            { id: 'render-props', label: 'Render Props' },
          ],
        },
      ],
    },
    colorPalette: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'],
    onNodeClick: (nodeId, node) => alert(`Selected: ${node.label}`),
  },
};

export const DeepHierarchy: Story = {
  args: {
    data: {
      id: 'root',
      label: 'Computer Science',
      isRoot: true,
      children: [
        {
          id: 'algorithms',
          label: 'Algorithms',
          children: [
            {
              id: 'sorting',
              label: 'Sorting',
              children: [
                { id: 'quicksort', label: 'Quick Sort' },
                { id: 'mergesort', label: 'Merge Sort' },
                { id: 'heapsort', label: 'Heap Sort' },
              ],
            },
            {
              id: 'searching',
              label: 'Searching',
              children: [
                { id: 'binary', label: 'Binary Search' },
                { id: 'linear', label: 'Linear Search' },
              ],
            },
          ],
        },
        {
          id: 'data-structures',
          label: 'Data Structures',
          children: [
            {
              id: 'linear',
              label: 'Linear',
              children: [
                { id: 'arrays', label: 'Arrays' },
                { id: 'linked-lists', label: 'Linked Lists' },
              ],
            },
            {
              id: 'non-linear',
              label: 'Non-Linear',
              children: [
                { id: 'trees', label: 'Trees' },
                { id: 'graphs', label: 'Graphs' },
              ],
            },
          ],
        },
      ],
    },
    defaultExpanded: true,
    layout: 'horizontal',
  },
};

export const CollapsedByDefault: Story = {
  args: {
    data: basicTreeData,
    collapsible: true,
    defaultExpanded: false,
    onNodeExpand: (nodeId, expanded) => console.log(`Node ${nodeId} ${expanded ? 'expanded' : 'collapsed'}`),
  },
};

export const NonCollapsible: Story = {
  args: {
    data: basicTreeData,
    collapsible: false,
    defaultExpanded: true,
  },
};

export const WithDescriptions: Story = {
  args: {
    data: {
      id: 'root',
      label: 'Web Development',
      description: 'Full-stack web development concepts',
      isRoot: true,
      children: [
        {
          id: 'frontend',
          label: 'Frontend',
          description: 'Client-side technologies',
          children: [
            { id: 'html', label: 'HTML', description: 'Structure of web pages' },
            { id: 'css', label: 'CSS', description: 'Styling and layout' },
            { id: 'js', label: 'JavaScript', description: 'Interactive behavior' },
          ],
        },
        {
          id: 'backend',
          label: 'Backend',
          description: 'Server-side technologies',
          children: [
            { id: 'nodejs', label: 'Node.js', description: 'JavaScript runtime' },
            { id: 'python', label: 'Python', description: 'Versatile language' },
            { id: 'go', label: 'Go', description: 'High-performance language' },
          ],
        },
      ],
    },
    layout: 'horizontal',
  },
};

export const CustomColors: Story = {
  args: {
    data: {
      id: 'root',
      label: 'Root',
      color: '#ef4444',
      isRoot: true,
      children: [
        {
          id: 'child-1',
          label: 'Child 1',
          color: '#22c55e',
          children: [
            { id: 'grandchild-1', label: 'Grandchild 1', color: '#3b82f6' },
            { id: 'grandchild-2', label: 'Grandchild 2', color: '#a855f7' },
          ],
        },
        {
          id: 'child-2',
          label: 'Child 2',
          color: '#f59e0b',
          children: [
            { id: 'grandchild-3', label: 'Grandchild 3', color: '#ec4899' },
          ],
        },
      ],
    },
  },
};

export const NoZoomControls: Story = {
  args: {
    data: basicTreeData,
    showZoomControls: false,
  },
};

export const Empty: Story = {
  args: {
    data: null,
    emptyMessage: 'No mindmap data available',
  },
};

// Interactive story with selection state
const InteractiveTreeMap = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-gray-100 dark:bg-gray-800">
        <p className="text-sm">
          Selected Node: <strong>{selectedId || 'None'}</strong>
        </p>
      </div>
      <div className="flex-1">
        <TreeMap
          data={{
            id: 'react',
            label: 'React Ecosystem',
            isRoot: true,
            children: [
              {
                id: 'state',
                label: 'State Management',
                children: [
                  { id: 'redux', label: 'Redux' },
                  { id: 'zustand', label: 'Zustand' },
                  { id: 'recoil', label: 'Recoil' },
                ],
              },
              {
                id: 'routing',
                label: 'Routing',
                children: [
                  { id: 'react-router', label: 'React Router' },
                  { id: 'tanstack-router', label: 'TanStack Router' },
                ],
              },
              {
                id: 'data',
                label: 'Data Fetching',
                children: [
                  { id: 'react-query', label: 'React Query' },
                  { id: 'swr', label: 'SWR' },
                  { id: 'rtk-query', label: 'RTK Query' },
                ],
              },
            ],
          }}
          selectedId={selectedId}
          onNodeClick={(nodeId) => setSelectedId(nodeId)}
          onNodeExpand={(nodeId, expanded) => 
            console.log(`${nodeId} is now ${expanded ? 'expanded' : 'collapsed'}`)
          }
        />
      </div>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveTreeMap />,
};

// Story showing selection highlight
export const WithSelection: Story = {
  args: {
    data: basicTreeData,
    selectedId: 'classification',
    onNodeClick: (nodeId) => console.log('Clicked:', nodeId),
  },
};
