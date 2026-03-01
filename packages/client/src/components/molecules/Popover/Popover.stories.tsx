import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Popover } from './Popover';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';

const meta: Meta<typeof Popover> = {
  title: 'Molecules/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const ClickTrigger: Story = {
  args: {
    trigger: 'click',
    content: (
      <div>
        <Typography variant="body" className="font-semibold mb-2">Popover Title</Typography>
        <Typography variant="small">This is popover content triggered by click.</Typography>
      </div>
    ),
    children: <Button>Click Me</Button>,
  },
};

export const HoverTrigger: Story = {
  args: {
    trigger: 'hover',
    content: (
      <Typography variant="body">
        This popover appears on hover.
      </Typography>
    ),
    children: <Button>Hover Me</Button>,
  },
};

export const Positions: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8 p-8">
      <Popover
        position="top"
        content={<Typography variant="body">Top popover</Typography>}
        trigger="click"
      >
        <Button>Top</Button>
      </Popover>
      <Popover
        position="bottom"
        content={<Typography variant="body">Bottom popover</Typography>}
        trigger="click"
      >
        <Button>Bottom</Button>
      </Popover>
      <Popover
        position="left"
        content={<Typography variant="body">Left popover</Typography>}
        trigger="click"
      >
        <Button>Left</Button>
      </Popover>
      <Popover
        position="right"
        content={<Typography variant="body">Right popover</Typography>}
        trigger="click"
      >
        <Button>Right</Button>
      </Popover>
    </div>
  ),
};

export const WithoutArrow: Story = {
  args: {
    trigger: 'click',
    showArrow: false,
    content: (
      <Typography variant="body">
        This popover has no arrow.
      </Typography>
    ),
    children: <Button>No Arrow</Button>,
  },
};

export const RichContent: Story = {
  args: {
    trigger: 'click',
    content: (
      <div className="space-y-2">
        <Typography variant="h6">Rich Content</Typography>
        <Typography variant="small">This popover contains multiple elements.</Typography>
        <Button variant="primary" size="sm" className="mt-2">Action</Button>
      </div>
    ),
    children: <Button>Rich Content</Button>,
  },
};
