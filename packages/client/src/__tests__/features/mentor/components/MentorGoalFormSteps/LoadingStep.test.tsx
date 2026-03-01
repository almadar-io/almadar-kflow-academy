/**
 * Tests for LoadingStep Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingStep } from '../../../../../features/mentor/components/MentorGoalFormSteps/LoadingStep';

describe('LoadingStep', () => {
  const mockProps = {
    anchorAnswer: 'Learn React',
    streamingContent: '',
    isLoading: true,
  };

  it('should render loading step with spinner', () => {
    render(<LoadingStep {...mockProps} />);

    expect(screen.getByText(/Creating your learning path/i)).toBeInTheDocument();
    expect(screen.getByText(/Learn React/i)).toBeInTheDocument();
  });

  it('should display streaming content when provided', () => {
    render(
      <LoadingStep
        {...mockProps}
        streamingContent="Generating goal... This is a test goal."
      />
    );

    expect(screen.getByText(/Generating goal... This is a test goal./i)).toBeInTheDocument();
  });

  it('should show processing message when loading without streaming content', () => {
    render(<LoadingStep {...mockProps} streamingContent="" />);

    expect(screen.getByText(/Processing your request/i)).toBeInTheDocument();
  });

  it('should not show processing message when streaming content is available', () => {
    render(
      <LoadingStep
        {...mockProps}
        streamingContent="Some content"
        isLoading={true}
      />
    );

    expect(screen.queryByText(/Processing your request/i)).not.toBeInTheDocument();
  });
});

