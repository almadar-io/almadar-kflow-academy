/**
 * Tests for StudentCoursePageContainer
 * Phase 4: Tests for container component that handles data fetching and state management
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '../../../../contexts/ThemeContext';
import { StudentCoursePageContainer } from '../index';

// Mock the hooks
jest.mock('../../hooks', () => ({
  useCourseEnrollment: jest.fn(),
  useCoursePreview: jest.fn(),
  useProgress: jest.fn(),
}));

// Mock the presentation component
jest.mock('../../../../pages/StudentCoursePage', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => React.createElement('div', { 'data-testid': 'student-course-page' },
      React.createElement('div', { 'data-testid': 'course-id' }, props.courseId || 'No Course'),
      React.createElement('div', { 'data-testid': 'is-enrolled' }, props.isEnrolled ? 'Enrolled' : 'Not Enrolled'),
      React.createElement('div', { 'data-testid': 'loading' }, props.isCourseLoading ? 'Loading' : 'Not Loading'),
      React.createElement('div', { 'data-testid': 'lessons-count' }, props.lessons?.length || 0)
    ),
  };
});

import { useCourseEnrollment, useCoursePreview, useProgress } from '../../hooks';

const mockUseCourseEnrollment = useCourseEnrollment as jest.MockedFunction<typeof useCourseEnrollment>;
const mockUseCoursePreview = useCoursePreview as jest.MockedFunction<typeof useCoursePreview>;
const mockUseProgress = useProgress as jest.MockedFunction<typeof useProgress>;

// Mock useParams to return test courseId
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ courseId: 'test-course-1' }),
  useNavigate: () => jest.fn(),
}));

const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {},
    preloadedState,
  });
};

const renderWithProviders = (ui: React.ReactElement, store = createTestStore()) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>{children}</ThemeProvider>
      </BrowserRouter>
    </Provider>
  );

  return { store, ...render(ui, { wrapper: Wrapper }) };
};

describe('StudentCoursePageContainer - Phase 4', () => {
  const mockCourse = {
    id: 'test-course-1',
    title: 'Test Course',
    description: 'Test Description',
    mentorName: 'Test Mentor',
    isPublic: true,
    moduleIds: ['module-1'],
    moduleSequence: ['module-1'],
    status: 'published',
  };

  const mockModules = [
    {
      id: 'module-1',
      title: 'Module 1',
      lessonIds: ['lesson-1', 'lesson-2'],
    },
  ];

  const mockLessons = [
    { id: 'lesson-1', title: 'Lesson 1', moduleId: 'module-1' },
    { id: 'lesson-2', title: 'Lesson 2', moduleId: 'module-1' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCourseEnrollment.mockReturnValue({
      enrollment: null,
      enrollmentId: null,
      isEnrolled: false,
      isChecking: false,
      isEnrolling: false,
      checkEnrollment: jest.fn(),
      enroll: jest.fn().mockResolvedValue(undefined),
      unenroll: jest.fn().mockResolvedValue(undefined),
    });

    mockUseCoursePreview.mockReturnValue({
      course: mockCourse,
      modules: mockModules,
      lessons: mockLessons,
      isLoading: false,
      error: null,
    });

    mockUseProgress.mockReturnValue({
      progress: null,
      isLoading: false,
      error: null,
    });
  });

  it('should render and fetch data using hooks', async () => {
    renderWithProviders(<StudentCoursePageContainer />);

    await waitFor(() => {
      expect(mockUseCourseEnrollment).toHaveBeenCalledWith({ courseId: 'test-course-1' });
      expect(mockUseCoursePreview).toHaveBeenCalledWith('test-course-1');
    });
  });

  it('should pass course data to presentation component', async () => {
    renderWithProviders(<StudentCoursePageContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('course-id')).toHaveTextContent('test-course-1');
      expect(screen.getByTestId('lessons-count')).toHaveTextContent('2');
    });
  });

  it('should show not enrolled state when user is not enrolled', async () => {
    renderWithProviders(<StudentCoursePageContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('is-enrolled')).toHaveTextContent('Not Enrolled');
    });
  });

  it('should show enrolled state when user is enrolled', async () => {
    mockUseCourseEnrollment.mockReturnValue({
      enrollment: { id: 'enrollment-1', courseId: 'test-course-1' },
      enrollmentId: 'enrollment-1',
      isEnrolled: true,
      isChecking: false,
      isEnrolling: false,
      checkEnrollment: jest.fn(),
      enroll: jest.fn().mockResolvedValue(undefined),
      unenroll: jest.fn().mockResolvedValue(undefined),
    });

    renderWithProviders(<StudentCoursePageContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('is-enrolled')).toHaveTextContent('Enrolled');
    });
  });

  it('should pass loading state to presentation component', async () => {
    mockUseCoursePreview.mockReturnValue({
      course: null,
      modules: [],
      lessons: [],
      isLoading: true,
      error: null,
    });

    renderWithProviders(<StudentCoursePageContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
    });
  });
});
