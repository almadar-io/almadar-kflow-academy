/**
 * Tests for AnchorStep Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnchorStep } from '../../../../../features/mentor/components/MentorGoalFormSteps/AnchorStep';

describe('AnchorStep', () => {
  const mockProps = {
    anchorAnswer: '',
    onAnchorAnswerChange: jest.fn(),
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render anchor step with input field', () => {
    render(<AnchorStep {...mockProps} />);

    expect(screen.getByText("What would you like to learn?")).toBeInTheDocument();
    expect(screen.getByLabelText('Your learning goal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('should disable submit button when anchor answer is empty', () => {
    render(<AnchorStep {...mockProps} anchorAnswer="" />);

    const submitButton = screen.getByRole('button', { name: /continue/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when anchor answer is provided', () => {
    render(<AnchorStep {...mockProps} anchorAnswer="Learn React" />);

    const submitButton = screen.getByRole('button', { name: /continue/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('should call onAnchorAnswerChange when input changes', () => {
    render(<AnchorStep {...mockProps} />);

    const input = screen.getByLabelText('Your learning goal');
    fireEvent.change(input, { target: { value: 'Learn TypeScript' } });

    expect(mockProps.onAnchorAnswerChange).toHaveBeenCalledWith('Learn TypeScript');
  });

  it('should call onSubmit when form is submitted with valid input', () => {
    render(<AnchorStep {...mockProps} anchorAnswer="Learn React" />);

    const form = screen.getByLabelText('Your learning goal').closest('form');
    fireEvent.submit(form!);

    expect(mockProps.onSubmit).toHaveBeenCalled();
  });

  it('should not call onSubmit when form is submitted with empty input', () => {
    render(<AnchorStep {...mockProps} anchorAnswer="" />);

    const form = screen.getByLabelText('Your learning goal').closest('form');
    fireEvent.submit(form!);

    expect(mockProps.onSubmit).not.toHaveBeenCalled();
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(<AnchorStep {...mockProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('should not show cancel button when onCancel is not provided', () => {
    const { onCancel, ...propsWithoutCancel } = mockProps;
    render(<AnchorStep {...propsWithoutCancel} />);

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });
});

