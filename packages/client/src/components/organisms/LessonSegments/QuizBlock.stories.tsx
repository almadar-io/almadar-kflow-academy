import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { QuizBlock } from './QuizBlock';

const meta: Meta<typeof QuizBlock> = {
  title: 'Organisms/LessonSegments/QuizBlock',
  component: QuizBlock,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof QuizBlock>;

export const Default: Story = {
  args: {
    question: 'What is the purpose of the `useState` hook in React?',
    answer: 'The `useState` hook allows functional components to manage local state. It returns an array with two elements: the current state value and a function to update it.',
  },
};

export const WithCode: Story = {
  args: {
    question: 'What does this code do?\n\n```javascript\nconst [count, setCount] = useState(0);\n```',
    answer: 'This code initializes a state variable called `count` with an initial value of `0`, and provides a `setCount` function to update it.',
  },
};

export const Complex: Story = {
  args: {
    question: 'Explain the difference between **props** and **state** in React. When would you use each?',
    answer: `**Props** are passed from parent to child components and are immutable within the child component. They're used for passing data down the component tree.

**State** is internal to a component and can be changed using \`setState\` or state setters from hooks. It's used for data that changes over time and affects the component's rendering.

Use props when:
- Data needs to be shared from parent to child
- Data doesn't change within the child component

Use state when:
- Data changes over time
- Data affects the component's rendering
- Data is local to the component`,
  },
};
