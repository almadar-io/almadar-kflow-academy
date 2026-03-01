import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Tooltip } from './Tooltip';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Info } from 'lucide-react';

const meta: Meta<typeof Tooltip> = {
  title: 'Molecules/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  args: {
    content: 'This is a tooltip message',
    children: <Button>Hover me</Button>,
  },
};

export const Positions: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8 p-8">
      <Tooltip position="top" content="Top tooltip">
        <Button>Top</Button>
      </Tooltip>
      <Tooltip position="bottom" content="Bottom tooltip">
        <Button>Bottom</Button>
      </Tooltip>
      <Tooltip position="left" content="Left tooltip">
        <Button>Left</Button>
      </Tooltip>
      <Tooltip position="right" content="Right tooltip">
        <Button>Right</Button>
      </Tooltip>
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    content: 'Click for more information',
    children: <Icon icon={Info} size="md" className="cursor-help" />,
  },
};

export const RichContent: Story = {
  args: {
    content: (
      <div>
        <div className="font-semibold mb-1">Tooltip Title</div>
        <div className="text-sm">This tooltip contains rich content.</div>
      </div>
    ),
    children: <Button>Rich Tooltip</Button>,
  },
};

export const WithoutArrow: Story = {
  args: {
    content: 'Tooltip without arrow',
    showArrow: false,
    children: <Button>No Arrow</Button>,
  },
};

export const CustomDelay: Story = {
  args: {
    content: 'This tooltip appears after 500ms',
    delay: 500,
    children: <Button>Custom Delay</Button>,
  },
};
