import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ButtonGroup } from './ButtonGroup';
import { Button } from '../../atoms/Button';

const meta: Meta<typeof ButtonGroup> = {
  title: 'Molecules/ButtonGroup',
  component: ButtonGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ButtonGroup>;

export const Default: Story = {
  args: {
    children: (
      <>
        <Button variant="primary">First</Button>
        <Button variant="primary">Second</Button>
        <Button variant="primary">Third</Button>
      </>
    ),
  },
};

export const Segmented: Story = {
  args: {
    variant: 'segmented',
    children: (
      <>
        <Button variant="primary">Option 1</Button>
        <Button variant="primary">Option 2</Button>
        <Button variant="primary">Option 3</Button>
      </>
    ),
  },
};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
    children: (
      <>
        <Button variant="primary">Top</Button>
        <Button variant="primary">Middle</Button>
        <Button variant="primary">Bottom</Button>
      </>
    ),
  },
};

export const MixedVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <ButtonGroup variant="default">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="success">Success</Button>
      </ButtonGroup>
      <ButtonGroup variant="segmented">
        <Button variant="primary">One</Button>
        <Button variant="primary">Two</Button>
        <Button variant="primary">Three</Button>
      </ButtonGroup>
    </div>
  ),
};
