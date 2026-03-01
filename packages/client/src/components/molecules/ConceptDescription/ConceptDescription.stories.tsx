import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ConceptDescription } from './ConceptDescription';
import { Concept } from '../../../features/concepts/types';
import { useState } from 'react';

const meta: Meta<typeof ConceptDescription> = {
  title: 'Molecules/ConceptDescription',
  component: ConceptDescription,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onDescriptionChange: { action: 'description changed' },
    onStartEditing: { action: 'started editing' },
    onCancelEdit: { action: 'cancelled edit' },
    onKeyDown: { action: 'key pressed' },
  },
};

export default meta;
type Story = StoryObj<typeof ConceptDescription>;

const mockConcept: Concept = {
  id: 'concept-1',
  name: 'React Components',
  description: 'React components are reusable pieces of UI that can accept props and manage state. They allow you to build complex user interfaces by composing smaller, isolated pieces.',
  parents: [],
  children: [],
};

const ConceptDescriptionWrapper = (args: any) => {
  const [isEditing, setIsEditing] = useState(args.isEditing || false);
  const [editValues, setEditValues] = useState({ description: args.concept.description });
  const descriptionTextareaRefs = { current: {} as Record<string, HTMLTextAreaElement | null> };

  return (
    <ConceptDescription
      {...args}
      isEditing={isEditing}
      editValues={editValues}
      onDescriptionChange={(value) => {
        setEditValues({ description: value });
        args.onDescriptionChange?.(value);
      }}
      onStartEditing={(concept, field) => {
        setIsEditing(true);
        args.onStartEditing?.(concept, field);
      }}
      onCancelEdit={() => {
        setIsEditing(false);
        setEditValues({ description: args.concept.description });
        args.onCancelEdit?.();
      }}
      descriptionTextareaRefs={descriptionTextareaRefs}
    />
  );
};

export const Default: Story = {
  render: ConceptDescriptionWrapper,
  args: {
    concept: mockConcept,
    isEditing: false,
    editValues: { description: mockConcept.description },
    onDescriptionChange: () => {},
    onStartEditing: () => {},
    onCancelEdit: () => {},
    onKeyDown: () => {},
    descriptionTextareaRefs: { current: {} },
    showFullContent: true,
  },
};

export const Truncated: Story = {
  render: ConceptDescriptionWrapper,
  args: {
    concept: mockConcept,
    isEditing: false,
    editValues: { description: mockConcept.description },
    onDescriptionChange: () => {},
    onStartEditing: () => {},
    onCancelEdit: () => {},
    onKeyDown: () => {},
    descriptionTextareaRefs: { current: {} },
    showFullContent: false,
  },
};

export const Editing: Story = {
  render: ConceptDescriptionWrapper,
  args: {
    concept: mockConcept,
    isEditing: true,
    editValues: { description: mockConcept.description },
    onDescriptionChange: () => {},
    onStartEditing: () => {},
    onCancelEdit: () => {},
    onKeyDown: () => {},
    descriptionTextareaRefs: { current: {} },
    showFullContent: true,
  },
};
