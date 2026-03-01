import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { 
  Home, 
  BookOpen, 
  Search, 
  User,
  Settings,
} from 'lucide-react';
import { EnrollmentTemplate } from './EnrollmentTemplate';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta = {
  title: 'Templates/EnrollmentTemplate',
  component: EnrollmentTemplate,
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
} satisfies Meta<typeof EnrollmentTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultUser = {
  name: 'Alex Johnson',
  email: 'alex.j@email.com',
};

const defaultNavigation = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'browse', label: 'Browse Courses', icon: Search, active: true },
  { id: 'my-courses', label: 'My Courses', icon: BookOpen },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const sampleInstructor = {
  id: 'inst-1',
  name: 'Dr. Sarah Chen',
  title: 'Professor of Computer Science at MIT',
  courseCount: 5,
  studentCount: 12500,
  rating: 4.8,
};

const sampleModules = [
  {
    id: 'm1',
    title: 'Module 1: Getting Started',
    lessonCount: 4,
    duration: 45,
    lessons: [
      { id: 'l1', title: 'Welcome to the Course', duration: 5, isFreePreview: true },
      { id: 'l2', title: 'What is Machine Learning?', duration: 15, isFreePreview: true },
      { id: 'l3', title: 'Setting Up Your Environment', duration: 15 },
      { id: 'l4', title: 'Your First ML Model', duration: 10 },
    ],
  },
  {
    id: 'm2',
    title: 'Module 2: Core Concepts',
    lessonCount: 5,
    duration: 90,
    lessons: [
      { id: 'l5', title: 'Understanding Neural Networks', duration: 20 },
      { id: 'l6', title: 'Activation Functions', duration: 15 },
      { id: 'l7', title: 'Loss Functions', duration: 18 },
      { id: 'l8', title: 'Backpropagation', duration: 25 },
      { id: 'l9', title: 'Module Quiz', duration: 12 },
    ],
  },
  {
    id: 'm3',
    title: 'Module 3: Deep Learning',
    lessonCount: 6,
    duration: 120,
    lessons: [
      { id: 'l10', title: 'Introduction to Deep Learning', duration: 15 },
      { id: 'l11', title: 'Convolutional Neural Networks', duration: 25 },
      { id: 'l12', title: 'CNN Architectures', duration: 20 },
      { id: 'l13', title: 'Recurrent Neural Networks', duration: 25 },
      { id: 'l14', title: 'LSTM and GRU', duration: 20 },
      { id: 'l15', title: 'Practical Project', duration: 15 },
    ],
  },
  {
    id: 'm4',
    title: 'Module 4: Advanced Topics',
    lessonCount: 4,
    duration: 80,
  },
  {
    id: 'm5',
    title: 'Module 5: Final Project',
    lessonCount: 3,
    duration: 60,
  },
];

const sampleLearningOutcomes = [
  'Build neural networks from scratch using Python and NumPy',
  'Understand the mathematics behind machine learning algorithms',
  'Implement popular deep learning architectures (CNN, RNN, Transformers)',
  'Train and optimize models for real-world applications',
  'Work with popular frameworks like TensorFlow and PyTorch',
  'Apply machine learning to computer vision and NLP problems',
];

const samplePrerequisites = [
  'Basic Python programming knowledge',
  'Understanding of linear algebra and calculus',
  'Familiarity with statistics and probability',
];

const sampleReviews = [
  {
    id: 'r1',
    reviewerName: 'John D.',
    rating: 5,
    text: 'Excellent course! The explanations are clear and the projects are practical. Dr. Chen is an amazing instructor.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
  },
  {
    id: 'r2',
    reviewerName: 'Maria S.',
    rating: 5,
    text: 'Finally understood backpropagation after years of confusion. The visualizations and examples really helped.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
  },
  {
    id: 'r3',
    reviewerName: 'David K.',
    rating: 4,
    text: 'Great content but could use more advanced topics. Perfect for beginners transitioning to intermediate.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21),
  },
  {
    id: 'r4',
    reviewerName: 'Emily W.',
    rating: 5,
    text: 'The hands-on projects made all the difference. I was able to build my own image classifier after module 3!',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
  },
];

const sampleLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
];

export const Default: Story = {
  args: {
    courseId: 'course-1',
    courseTitle: 'Introduction to Machine Learning',
    courseDescription: 'Master the fundamentals of machine learning and deep learning. Learn to build neural networks, train models, and apply ML to real-world problems. Perfect for beginners with basic Python knowledge.',
    category: 'Artificial Intelligence',
    difficulty: 'beginner',
    totalLessons: 22,
    totalDuration: 6.5,
    rating: 4.7,
    ratingCount: 1234,
    studentCount: 12500,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    instructor: sampleInstructor,
    modules: sampleModules,
    learningOutcomes: sampleLearningOutcomes,
    prerequisites: samplePrerequisites,
    reviews: sampleReviews,
    availableLanguages: sampleLanguages,
    user: defaultUser,
    navigationItems: defaultNavigation,
    onEnroll: () => alert('Enroll clicked'),
    onPreviewLesson: (id) => alert(`Preview lesson ${id}`),
    onBack: () => alert('Back clicked'),
  },
};

export const AlreadyEnrolled: Story = {
  args: {
    ...Default.args,
    isEnrolled: true,
    onStartCourse: () => alert('Start course clicked'),
  },
};

export const Enrolling: Story = {
  args: {
    ...Default.args,
    isEnrolling: true,
  },
};

export const AdvancedCourse: Story = {
  args: {
    ...Default.args,
    courseTitle: 'Advanced Deep Learning & Transformers',
    courseDescription: 'Deep dive into transformer architectures, attention mechanisms, and state-of-the-art models. Build GPT-style language models and vision transformers from scratch.',
    difficulty: 'advanced',
    prerequisites: [
      'Strong understanding of neural networks and backpropagation',
      'Experience with PyTorch or TensorFlow',
      'Linear algebra proficiency (matrix operations, eigenvalues)',
      'Python programming at an intermediate level',
    ],
  },
};

export const NewCourse: Story = {
  args: {
    ...Default.args,
    rating: undefined,
    ratingCount: 0,
    studentCount: 23,
    reviews: [],
    lastUpdated: new Date(),
  },
};

export const MinimalInfo: Story = {
  args: {
    courseId: 'course-2',
    courseTitle: 'Quick Python Tutorial',
    courseDescription: 'Learn Python basics in just a few hours.',
    totalLessons: 8,
    totalDuration: 2,
    modules: [
      { id: 'm1', title: 'Python Basics', lessonCount: 4, duration: 60 },
      { id: 'm2', title: 'Intermediate Python', lessonCount: 4, duration: 60 },
    ],
    user: defaultUser,
    navigationItems: defaultNavigation,
    onEnroll: () => alert('Enroll clicked'),
  },
};
