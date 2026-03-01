import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { useState } from 'react';
import { ContentSelector, ContentSelectorItem } from './ContentSelector';
import { BookOpen, FileText, Play } from 'lucide-react';

const meta: Meta<typeof ContentSelector> = {
  title: 'Organisms/ContentSelector',
  component: ContentSelector,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A reusable component for selecting items with checkboxes. Used for selecting modules, lessons, or other content for publishing.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[500px] p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ContentSelector>;

// Interactive wrapper for state management
const InteractiveContentSelector = (props: {
  initialItems: ContentSelectorItem[];
  selectAllLabel?: string;
  emptyState?: { icon?: any; title: string; description?: string };
}) => {
  const [items, setItems] = useState(props.initialItems);

  const handleSelectionChange = (selectedIds: string[]) => {
    setItems(items.map(item => ({
      ...item,
      checked: selectedIds.includes(item.id),
    })));
  };

  return (
    <ContentSelector
      items={items}
      onSelectionChange={handleSelectionChange}
      selectAllLabel={props.selectAllLabel}
      emptyState={props.emptyState}
    />
  );
};

export const Modules: Story = {
  render: () => (
    <InteractiveContentSelector
      initialItems={[
        { id: '1', label: 'Introduction to React', checked: true, sequence: 0, badges: [{ label: 'Published', variant: 'success' }] },
        { id: '2', label: 'Components and Props', checked: true, sequence: 1 },
        { id: '3', label: 'State and Lifecycle', checked: false, sequence: 2 },
        { id: '4', label: 'Hooks in Depth', checked: false, sequence: 3, badges: [{ label: 'Draft', variant: 'warning' }] },
        { id: '5', label: 'Advanced Patterns', checked: false, sequence: 4, disabled: true, sublabel: 'Coming soon' },
      ]}
      selectAllLabel="Select All Modules"
      emptyState={{
        icon: BookOpen,
        title: 'No modules available',
        description: 'This course has no modules to publish.',
      }}
    />
  ),
};

export const Lessons: Story = {
  render: () => (
    <InteractiveContentSelector
      initialItems={[
        { 
          id: '1', 
          label: 'What is React?', 
          checked: true, 
          sequence: 0, 
          badges: [
            { label: 'Published', variant: 'success' },
            { label: 'Has Assessment', variant: 'info' },
          ],
          action: {
            icon: FileText,
            label: 'Edit Assessment',
            onClick: () => alert('Edit assessment clicked!'),
          },
        },
        { 
          id: '2', 
          label: 'Setting up your environment', 
          checked: true, 
          sequence: 1,
          action: {
            icon: FileText,
            label: 'Add Assessment',
            onClick: () => alert('Add assessment clicked!'),
          },
        },
        { 
          id: '3', 
          label: 'Your first component', 
          checked: false, 
          sequence: 2,
          sublabel: 'Learn to create a basic React component',
        },
        { 
          id: '4', 
          label: 'JSX Syntax', 
          checked: false, 
          sequence: 3,
          badges: [{ label: 'Has Content', variant: 'primary' }],
        },
      ]}
      selectAllLabel="Select All Lessons"
    />
  ),
};

export const WithHeader: Story = {
  render: () => {
    const [items, setItems] = useState<ContentSelectorItem[]>([
      { id: '1', label: 'Module 1: Basics', checked: false, sequence: 0 },
      { id: '2', label: 'Module 2: Intermediate', checked: false, sequence: 1 },
      { id: '3', label: 'Module 3: Advanced', checked: false, sequence: 2 },
    ]);

    return (
      <ContentSelector
        items={items}
        onSelectionChange={(ids) => 
          setItems(items.map(i => ({ ...i, checked: ids.includes(i.id) })))
        }
        selectAllLabel="Select All Modules"
        header={
          <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 mb-4">
            <BookOpen className="text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                React Fundamentals
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select the modules you want to publish for this course.
              </p>
            </div>
          </div>
        }
      />
    );
  },
};

export const Loading: Story = {
  render: () => (
    <ContentSelector
      items={[]}
      onSelectionChange={() => {}}
      loading={true}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <ContentSelector
      items={[]}
      onSelectionChange={() => {}}
      emptyState={{
        icon: BookOpen,
        title: 'No modules available',
        description: 'This course has no modules to publish yet. Add some content first.',
      }}
    />
  ),
};

export const LongList: Story = {
  render: () => {
    const [items, setItems] = useState<ContentSelectorItem[]>(
      Array.from({ length: 20 }, (_, i) => ({
        id: String(i + 1),
        label: `Lesson ${i + 1}: Topic ${String.fromCharCode(65 + i)}`,
        checked: i < 5,
        sequence: i,
        badges: i < 5 ? [{ label: 'Published', variant: 'success' as const }] : undefined,
      }))
    );

    return (
      <ContentSelector
        items={items}
        onSelectionChange={(ids) => 
          setItems(items.map(i => ({ ...i, checked: ids.includes(i.id) })))
        }
        selectAllLabel="Select All Lessons"
        maxHeight="300px"
      />
    );
  },
};

export const WithActions: Story = {
  render: () => {
    const [items, setItems] = useState<ContentSelectorItem[]>([
      { 
        id: '1', 
        label: 'Introduction Video', 
        checked: true, 
        sequence: 0,
        action: {
          icon: Play,
          label: 'Preview',
          onClick: () => alert('Preview video 1'),
        },
      },
      { 
        id: '2', 
        label: 'Setup Tutorial', 
        checked: false, 
        sequence: 1,
        action: {
          icon: Play,
          label: 'Preview',
          onClick: () => alert('Preview video 2'),
        },
      },
      { 
        id: '3', 
        label: 'Deep Dive', 
        checked: false, 
        sequence: 2,
        action: {
          icon: Play,
          label: 'Preview',
          onClick: () => alert('Preview video 3'),
          disabled: true,
        },
        sublabel: 'Video not yet uploaded',
      },
    ]);

    return (
      <ContentSelector
        items={items}
        onSelectionChange={(ids) => 
          setItems(items.map(i => ({ ...i, checked: ids.includes(i.id) })))
        }
        selectAllLabel="Select All Videos"
      />
    );
  },
};
