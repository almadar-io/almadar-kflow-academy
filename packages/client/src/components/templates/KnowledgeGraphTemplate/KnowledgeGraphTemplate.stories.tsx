import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { KnowledgeGraphTemplate } from './KnowledgeGraphTemplate';
import { Home, Network, BookOpen, Settings, Sparkles, FileText, Layers } from 'lucide-react';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta: Meta<typeof KnowledgeGraphTemplate> = {
  title: 'Templates/KnowledgeGraphTemplate',
  component: KnowledgeGraphTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof KnowledgeGraphTemplate>;

const navigationItems = [
  { id: '1', label: 'Dashboard', icon: Home },
  { id: '2', label: 'Knowledge Graph', icon: Network, active: true },
  { id: '3', label: 'Courses', icon: BookOpen },
  { id: '4', label: 'Settings', icon: Settings },
];

const mockLayers = [
  {
    id: 'L1',
    name: 'Layer 1 - Foundation',
    color: '#6366f1',
    concepts: [
      { id: 'c1', name: 'JavaScript Basics', description: 'Variables, functions, and control flow', layer: 'L1' },
      { id: 'c2', name: 'HTML Fundamentals', description: 'Document structure and elements', layer: 'L1' },
      { id: 'c3', name: 'CSS Basics', description: 'Styling and layout fundamentals', layer: 'L1' },
    ],
  },
  {
    id: 'L2',
    name: 'Layer 2 - Intermediate',
    color: '#8b5cf6',
    concepts: [
      { id: 'c4', name: 'React Components', description: 'Building reusable UI components', layer: 'L2' },
      { id: 'c5', name: 'State Management', description: 'Managing application state', layer: 'L2' },
      { id: 'c6', name: 'API Integration', description: 'Fetching and handling data', layer: 'L2' },
    ],
  },
  {
    id: 'L3',
    name: 'Layer 3 - Advanced',
    color: '#a855f7',
    concepts: [
      { id: 'c7', name: 'Performance Optimization', description: 'Improving app performance', layer: 'L3' },
      { id: 'c8', name: 'Testing Strategies', description: 'Unit, integration, and E2E testing', layer: 'L3' },
    ],
  },
];

const mockOperations = [
  { id: 'op1', label: 'Generate Lesson', icon: Sparkles, description: 'Create a lesson from selected concept' },
  { id: 'op2', label: 'Generate Flashcards', icon: FileText, description: 'Create flashcards for review' },
  { id: 'op3', label: 'Expand Layer', icon: Layers, description: 'Add more concepts to current layer' },
];

const mockGraphNodes = [
  { id: 'goal', label: 'Master React Development', layer: 'goal' },
  { id: 'c1', label: 'JavaScript Basics', layer: 'L1' },
  { id: 'c2', label: 'HTML Fundamentals', layer: 'L1' },
  { id: 'c3', label: 'CSS Basics', layer: 'L1' },
  { id: 'c4', label: 'React Components', layer: 'L2' },
  { id: 'c5', label: 'State Management', layer: 'L2' },
];

const mockGraphEdges = [
  { source: 'goal', target: 'c4' },
  { source: 'goal', target: 'c5' },
  { source: 'c4', target: 'c1' },
  { source: 'c4', target: 'c2' },
  { source: 'c4', target: 'c3' },
  { source: 'c5', target: 'c1' },
];

export const Default: Story = {
  args: {
    goal: {
      id: 'g1',
      text: 'Master React Development and build production-ready applications',
      milestones: [
        { id: 'm1', text: 'Complete foundations', completed: true },
        { id: 'm2', text: 'Build first project', completed: false },
        { id: 'm3', text: 'Deploy to production', completed: false },
      ],
    },
    layers: mockLayers,
    operations: mockOperations,
    graphNodes: mockGraphNodes,
    graphEdges: mockGraphEdges,
    user: {
      name: 'Jane Mentor',
      email: 'jane@example.com',
    },
    navigationItems,
    logo: <span className="font-bold text-xl text-indigo-600">KFlow</span>,
    onGoalSave: (goal: string) => console.log('Goal saved:', goal),
    onOperationExecute: (opId: string) => console.log('Operation executed:', opId),
    onConceptClick: (id: string) => console.log('Concept clicked:', id),
    onAddConcept: (layerId: string) => console.log('Add concept to layer:', layerId),
    onSearchChange: (query: string) => console.log('Search:', query),
    onLayerFilterChange: (layers: string[]) => console.log('Layer filter:', layers),
  },
};

export const WithDetailPanel: Story = {
  args: {
    ...Default.args,
    selectedConceptId: 'c4',
    showDetailPanel: true,
    detailPanelContent: (
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">React Components</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Building reusable UI components with React.
          </p>
        </div>
        <div>
          <h4 className="font-medium mb-1 text-sm">Prerequisites</h4>
          <div className="flex flex-wrap gap-1">
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">JavaScript Basics</span>
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">HTML Fundamentals</span>
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-1 text-sm">Status</h4>
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Has Lesson</span>
        </div>
      </div>
    ),
    onCloseDetailPanel: () => console.log('Close detail panel'),
  },
};

export const EmptyGraph: Story = {
  args: {
    ...Default.args,
    layers: [
      { id: 'L1', name: 'Layer 1', color: '#6366f1', concepts: [] },
    ],
    graphNodes: [],
    graphEdges: [],
  },
};

export const OperationRunning: Story = {
  args: {
    ...Default.args,
    isOperationRunning: true,
  },
};

export const WithSearch: Story = {
  args: {
    ...Default.args,
    searchQuery: 'React',
  },
};

export const FilteredByLayer: Story = {
  args: {
    ...Default.args,
    activeLayerFilters: ['L2'],
  },
};

export const Mobile: Story = {
  args: {
    ...Default.args,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

