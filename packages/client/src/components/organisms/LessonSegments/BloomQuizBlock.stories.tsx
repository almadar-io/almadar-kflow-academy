import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { BloomQuizBlock } from './BloomQuizBlock';

const meta: Meta<typeof BloomQuizBlock> = {
  title: 'Organisms/LessonSegments/BloomQuizBlock',
  component: BloomQuizBlock,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onAnswer: { action: 'answered' },
  },
};

export default meta;
type Story = StoryObj<typeof BloomQuizBlock>;

export const Remember: Story = {
  args: {
    level: 'remember',
    question: 'What is the syntax for creating a React functional component?',
    answer: 'A React functional component is created using a function declaration or arrow function that returns JSX.',
    index: 0,
  },
};

export const Understand: Story = {
  args: {
    level: 'understand',
    question: 'Explain the difference between props and state in React.',
    answer: 'Props are passed from parent to child and are immutable. State is internal to a component and can be changed.',
    index: 1,
  },
};

export const Apply: Story = {
  args: {
    level: 'apply',
    question: 'Write a React component that uses `useState` to manage a counter.',
    answer: '```javascript\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <div>\n      <p>{count}</p>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n    </div>\n  );\n}\n```',
    index: 2,
  },
};

export const Analyze: Story = {
  args: {
    level: 'analyze',
    question: 'Compare and contrast class components and functional components in React. What are the advantages of each?',
    answer: 'Class components use ES6 classes and have lifecycle methods. Functional components are simpler and can use hooks. Functional components are generally preferred in modern React.',
    index: 3,
  },
};

export const Evaluate: Story = {
  args: {
    level: 'evaluate',
    question: 'When would you choose to use Context API versus prop drilling? Justify your decision.',
    answer: 'Use Context API when you need to share state across many components at different nesting levels. Prop drilling is fine for shallow component trees.',
    index: 4,
  },
};

export const Create: Story = {
  args: {
    level: 'create',
    question: 'Design a custom hook that manages form state with validation.',
    answer: '```javascript\nfunction useForm(initialValues, validate) {\n  const [values, setValues] = useState(initialValues);\n  const [errors, setErrors] = useState({});\n  \n  const handleChange = (name, value) => {\n    setValues({...values, [name]: value});\n    if (errors[name]) setErrors({...errors, [name]: null});\n  };\n  \n  const handleSubmit = (onSubmit) => {\n    const validationErrors = validate(values);\n    if (Object.keys(validationErrors).length === 0) {\n      onSubmit(values);\n    } else {\n      setErrors(validationErrors);\n    }\n  };\n  \n  return { values, errors, handleChange, handleSubmit };\n}\n```',
    index: 5,
  },
};

export const Answered: Story = {
  args: {
    level: 'understand',
    question: 'What is the purpose of the useEffect hook?',
    answer: 'useEffect allows you to perform side effects in functional components, such as data fetching, subscriptions, or manually changing the DOM.',
    index: 0,
    isAnswered: true,
  },
};
