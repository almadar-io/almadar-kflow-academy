/**
 * Tests for ChoiceStep Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChoiceStep } from '../../../../../features/mentor/components/MentorGoalFormSteps/ChoiceStep';

describe('ChoiceStep', () => {
  const mockProps = {
    onSelect: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render choice step with both options', () => {
    render(<ChoiceStep {...mockProps} />);

    expect(screen.getByText(/How would you like to create your learning goal/i)).toBeInTheDocument();
    expect(screen.getByText(/Guided Form/i)).toBeInTheDocument();
    expect(screen.getByText(/Manual Entry/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('should call onSelect with "form" when Guided Form is clicked', () => {
    render(<ChoiceStep {...mockProps} />);

    const formButton = screen.getByText(/Guided Form/i).closest('button');
    fireEvent.click(formButton!);

    expect(mockProps.onSelect).toHaveBeenCalledWith('form');
  });

  it('should call onSelect with "manual" when Manual Entry is clicked', () => {
    render(<ChoiceStep {...mockProps} />);

    const manualButton = screen.getByText(/Manual Entry/i).closest('button');
    fireEvent.click(manualButton!);

    expect(mockProps.onSelect).toHaveBeenCalledWith('manual');
  });

  it('should call onBack when back button is clicked', () => {
    render(<ChoiceStep {...mockProps} />);

    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    expect(mockProps.onBack).toHaveBeenCalled();
  });
});

