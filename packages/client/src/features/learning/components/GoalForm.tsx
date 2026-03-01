/**
 * @deprecated This component is deprecated. Use features/mentor/components/MentorGoalForm instead.
 * This component uses the old learning API and will be removed in a future version.
 * 
 * Migration guide:
 * - Replace GoalForm with MentorGoalForm from features/mentor/components
 * - MentorGoalForm uses knowledge-graph hooks and provides the same functionality
 */

import React, { useState } from 'react';
import { useGoalQuestions } from '../hooks/useGoalQuestions';
import { useCreateGoal } from '../hooks/useCreateGoal';
import { PlacementTest } from './PlacementTest';
import { GoalReview } from './GoalReview';
import { LevelSelection } from './LevelSelection';
import { GoalOverview } from './GoalOverview';
import { updateGoal } from '../goalApi';
import type { GoalQuestion, GoalQuestionAnswer, LearningGoal } from '../goalApi';
import { Edit3, ClipboardList, Loader2 } from 'lucide-react';

// Anchor question constant (matches backend)
const ANCHOR_QUESTION = "What's something you've always wanted to learn?";

interface GoalFormProps {
  onComplete?: (result: { goalId: string; graphId: string }) => void;
  onCancel?: () => void;
}

export const GoalForm: React.FC<GoalFormProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'anchor' | 'choice' | 'questions' | 'loading' | 'review' | 'level-selection' | 'placement'>('anchor');
  const [anchorAnswer, setAnchorAnswer] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [answers, setAnswers] = useState<Map<string, GoalQuestionAnswer>>(new Map());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [createdGoal, setCreatedGoal] = useState<{ goalId: string; graphId: string; topic: string; goal: LearningGoal } | null>(null);
  const [placementTestSkipped, setPlacementTestSkipped] = useState(false);
  const [placementTestStarted, setPlacementTestStarted] = useState(false);
  
  const { questions: questionsData, isLoading: isGeneratingQuestions, error: questionsError, generateQuestions, reset: resetQuestions } = useGoalQuestions();
  const { isLoading: isSubmitting, error: submitError, createWithGraph, reset: resetGoal, streamingContent, partialGoal } = useCreateGoal();
  
  const questions = questionsData?.questions || [];
  const error = questionsError || submitError;

  // Handle anchor answer submission - go to choice step
  const handleAnchorSubmit = () => {
    if (!anchorAnswer.trim()) {
      return;
    }
    setStep('choice');
  };

  // Handle manual goal submission
  const handleManualGoalSubmit = async () => {
    if (!anchorAnswer.trim()) {
      return;
    }

    try {
      setStep('loading'); // Show loading/streaming state
      // Create goal with graph using manual entry
      // Pass the manual goal to preserve it exactly and only generate milestones
      const result = await createWithGraph({
        anchorAnswer: anchorAnswer.trim(),
        questionAnswers: [],
        seedConceptDescription: goalDescription.trim() || undefined,
        goalFocused: true,
        stream: true, // Enable streaming
        manualGoal: {
          title: anchorAnswer.trim(),
          description: goalDescription.trim() || anchorAnswer.trim(),
          // Let LLM infer type and target from the goal description
        },
      }, (chunk: string, partial: any) => {
        // Update createdGoal with partial goal as it streams
        if (partial && partial.title) {
          setCreatedGoal({
            goalId: partial.id || '',
            graphId: '',
            topic: partial.title || anchorAnswer.trim(),
            goal: partial as LearningGoal,
          });
        }
      });

      if (result) {
        // Store goal info for review and level selection
        setCreatedGoal({
          goalId: result.goal.id,
          graphId: result.graphId,
          topic: result.goal.title || anchorAnswer.trim(),
          goal: result.goal,
        });
        // Show goal review step first (same as form flow)
        setStep('review');
      }
    } catch (err) {
      // Error is handled by the hook
    }
  };

  // Generate questions and start form flow
  const handleStartForm = async () => {
    if (!anchorAnswer.trim()) {
      return;
    }

    try {
      await generateQuestions({
        anchorAnswer: anchorAnswer.trim(),
      });
      setStep('questions');
      setCurrentQuestionIndex(0);
    } catch (err) {
      // Error is handled by the hook
    }
  };

  // Handle answer selection (supports both single and multi selection)
  const handleAnswerSelect = (questionId: string, option: string, isSingleSelection: boolean) => {
    const newAnswers = new Map(answers);
    const currentAnswer = newAnswers.get(questionId);
    
    if (isSingleSelection) {
      // Single selection: replace current answer
      newAnswers.set(questionId, {
        questionId,
        answer: option,
        isOther: false,
        skipped: false,
      });
    } else {
      // Multi selection: toggle the option
      const currentSelections = currentAnswer
        ? Array.isArray(currentAnswer.answer)
          ? currentAnswer.answer
          : currentAnswer.answer
          ? [currentAnswer.answer]
          : []
        : [];

      const isSelected = currentSelections.includes(option);
      const newSelections = isSelected
        ? currentSelections.filter(opt => opt !== option)
        : [...currentSelections, option];

      newAnswers.set(questionId, {
        questionId,
        answer: newSelections.length > 0 ? newSelections : undefined,
        isOther: false,
        skipped: false,
      });
    }
    setAnswers(newAnswers);
  };

  // Handle "All of the above" selection (only for multi-selection questions)
  const handleSelectAll = (questionId: string) => {
    const newAnswers = new Map(answers);
    const currentQuestion = questions.find(q => q.id === questionId);
    if (!currentQuestion) return;

    // Only allow "all of the above" for multi-selection questions
    const isMultiSelection = currentQuestion.selectionType !== 'single';

    if (!isMultiSelection) return;

    const currentAnswer = newAnswers.get(questionId);
    const currentSelections = currentAnswer
      ? Array.isArray(currentAnswer.answer)
        ? currentAnswer.answer
        : currentAnswer.answer
        ? [currentAnswer.answer]
        : []
      : [];

    // If all options are selected, deselect all; otherwise select all
    const allOptions = currentQuestion.options;
    const allSelected = allOptions.every(opt => currentSelections.includes(opt));

    newAnswers.set(questionId, {
      questionId,
      answer: allSelected ? [] : allOptions,
      isOther: false,
      skipped: false,
    });
    setAnswers(newAnswers);
  };

  // Handle "Other" option selection (works for both single and multi)
  const handleOtherToggle = (questionId: string, isSingleSelection: boolean) => {
    const newAnswers = new Map(answers);
    const currentAnswer = newAnswers.get(questionId);
    const isOtherSelected = currentAnswer?.isOther === true;

    if (isSingleSelection) {
      // For single selection, selecting "Other" replaces any previous selection
      newAnswers.set(questionId, {
        questionId,
        answer: undefined,
        isOther: !isOtherSelected,
        otherValue: !isOtherSelected ? '' : undefined,
        skipped: false,
      });
    } else {
      // For multi selection, preserve current selections
      const currentSelections = currentAnswer
        ? Array.isArray(currentAnswer.answer)
          ? currentAnswer.answer
          : currentAnswer.answer && !currentAnswer.isOther
          ? [currentAnswer.answer]
          : []
        : [];

      newAnswers.set(questionId, {
        questionId,
        answer: currentSelections.length > 0 ? currentSelections : undefined,
        isOther: !isOtherSelected,
        otherValue: !isOtherSelected ? '' : undefined, // Clear otherValue when unchecking
        skipped: false,
      });
    }
    setAnswers(newAnswers);
  };

  // Handle "Other" text input
  const handleOtherSelect = (questionId: string, otherValue: string) => {
    const newAnswers = new Map(answers);
    const currentAnswer = newAnswers.get(questionId);
    
    // Preserve current selections
    const currentSelections = currentAnswer
      ? Array.isArray(currentAnswer.answer)
        ? currentAnswer.answer
        : currentAnswer.answer && !currentAnswer.isOther
        ? [currentAnswer.answer]
        : []
      : [];

    newAnswers.set(questionId, {
      questionId,
      answer: currentSelections.length > 0 ? currentSelections : undefined,
      isOther: true,
      otherValue: otherValue, // Don't trim during input - allow spaces
      skipped: false,
    });
    setAnswers(newAnswers);
  };

  // Handle skip
  const handleSkip = (questionId: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, {
      questionId,
      skipped: true,
    });
    setAnswers(newAnswers);
    
    // Move to next question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Handle next question
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered or skipped, submit form
      handleSubmit();
    }
  };

  // Handle previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Submit form
  const handleSubmit = async () => {
    try {
      setStep('loading'); // Show loading/streaming state
      const questionAnswers: GoalQuestionAnswer[] = questions.map((q) => {
        const answer = answers.get(q.id);
        if (answer && answer.isOther && answer.otherValue) {
          // Trim the otherValue only when submitting
          return {
            ...answer,
            otherValue: answer.otherValue.trim(),
          };
        }
        return answer || { questionId: q.id, skipped: true };
      });

      const result = await createWithGraph({
        anchorAnswer: anchorAnswer.trim(),
        questionAnswers,
        seedConceptDescription: goalDescription.trim() || undefined,
        goalFocused: true,
        stream: true, // Enable streaming
      }, (chunk: string, partial: any) => {
        // Update createdGoal with partial goal as it streams
        if (partial && partial.title) {
          setCreatedGoal({
            goalId: partial.id || '',
            graphId: '',
            topic: partial.title || anchorAnswer.trim(),
            goal: partial as LearningGoal,
          });
        }
      });

      if (result) {
        // Store goal info for review and placement test
        setCreatedGoal({
          goalId: result.goal.id,
          graphId: result.graphId,
          topic: result.goal.title || anchorAnswer.trim(),
          goal: result.goal,
        });
        // Show goal review step first
        setStep('review');
      } else {
        // Call onComplete directly without showing complete step
        if (onComplete) {
          onComplete({ goalId: '', graphId: '' });
        }
      }
    } catch (err) {
      // Error is handled by the hook
      setStep('questions'); // Go back to questions on error
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : undefined;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Array.from(answers.values()).filter(a => {
    if (a.skipped) return false;
    if (a.isOther) return true;
    if (Array.isArray(a.answer)) return a.answer.length > 0;
    return !!a.answer;
  }).length;
  const skippedCount = Array.from(answers.values()).filter(a => a.skipped).length;

  // Goal review step
  if (step === 'review' && createdGoal && createdGoal.goal) {
    return (
      <GoalReview
        goal={createdGoal.goal}
        onConfirm={() => {
          // After confirming goal, show level selection
          setStep('level-selection');
        }}
        onCancel={onCancel}
      />
    );
  }

  // Level selection step
  if (step === 'level-selection' && createdGoal) {
    const handleLevelSelect = async (level: 'beginner' | 'intermediate' | 'advanced') => {
      try {
        // Update goal with selected level
        await updateGoal(createdGoal.goalId, {
          assessedLevel: level,
        });
        // Update local goal state
        if (createdGoal.goal) {
          createdGoal.goal.assessedLevel = level;
        }
        // Call onComplete directly without showing complete step
        if (onComplete) {
          onComplete({ goalId: createdGoal.goalId, graphId: createdGoal.graphId });
        }
      } catch (error) {
        console.error('Error updating goal level:', error);
      }
    };

    return (
      <LevelSelection
        onSelectLevel={handleLevelSelect}
        onSkip={() => {
          // Skip level selection, call onComplete directly
          if (onComplete) {
            onComplete({ goalId: createdGoal.goalId, graphId: createdGoal.graphId });
          }
        }}
      />
    );
  }

  // Loading/streaming step - show goal as it's being generated
  if (step === 'loading') {
    return (
      <div className="w-full">
        <div className="flex flex-col items-center justify-center mb-6">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Generating Your Learning Goal...
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
              Please wait while our AI crafts your personalized learning objective.
            </p>
          </div>
          
          {partialGoal && (
            <div className="mt-6 w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <GoalOverview goal={partialGoal} />
            </div>
          )}
      </div>
    );
  }

  // Placement test step - show test directly (user already chose to take it from level selection)
  if (step === 'placement' && createdGoal) {
    // Show placement test component directly (user already chose to take it)
    if (!placementTestSkipped && !placementTestStarted) {
      // Start the placement test
      setPlacementTestStarted(true);
    }

    if (placementTestStarted && !placementTestSkipped) {
      return (
        <PlacementTest
          goalId={createdGoal.goalId}
          graphId={createdGoal.graphId}
          topic={createdGoal.topic}
          onComplete={(result) => {
            // Call onComplete directly without showing complete step
            if (onComplete) {
              onComplete({ goalId: createdGoal.goalId, graphId: createdGoal.graphId });
            }
          }}
          onSkip={() => {
            setPlacementTestSkipped(true);
            // Go back to level selection if they skip the test
            setStep('level-selection');
          }}
        />
      );
    }
  }


  // Show loader when generating questions
  if (isGeneratingQuestions && step === 'choice') {
    return (
      <div className="w-full">
        <div className="flex flex-col items-center justify-center py-8 sm:py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Generating goal questions...</p>
        </div>
      </div>
    );
  }

  // Choice step - after anchor question, show description and choice between manual entry or form
  if (step === 'choice') {
    return (
      <div className="w-full">
        <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Tell us more about your goal
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You want to learn: <span className="font-semibold text-gray-900 dark:text-white">{anchorAnswer}</span>
            </p>
          </div>

          {/* Goal Description */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Goal Description (Optional)
            </label>
            <textarea
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              placeholder="Provide more details about your learning goal. What do you hope to achieve? What specific skills or knowledge are you looking to gain?"
              rows={4}
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Enter a description for your learning goal
            </p>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                OR
              </span>
            </div>
          </div>

          {/* Goal Form Option */}
          <div className="mb-8">
            <button
              onClick={handleStartForm}
              disabled={isGeneratingQuestions || isSubmitting}
              className="w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition">
                  {isGeneratingQuestions ? (
                    <Loader2 size={24} className="text-purple-600 dark:text-purple-400 animate-spin" />
                  ) : (
                    <ClipboardList size={24} className="text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                    {isGeneratingQuestions ? 'Generating Questions...' : 'Take Goal Form'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isGeneratingQuestions 
                      ? 'Please wait while we create personalized questions for you'
                      : 'Answer questions to help us create a tailored goal'}
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Action Buttons - Fixed to bottom */}
          <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 -mx-6 sm:-mx-6 md:-mx-6 px-6 -mb-6">
            <div className="flex justify-between gap-4">
              <button
                onClick={() => setStep('anchor')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                disabled={isSubmitting || isGeneratingQuestions}
              >
                Back
              </button>
              <button
                onClick={handleManualGoalSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating Goal...
                  </>
                ) : (
                  <>
                    <Edit3 size={18} />
                    Create Goal
                  </>
                )}
              </button>
            </div>
          </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Progress Bar */}
      {step === 'questions' && questions.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{answeredCount} answered, {skippedCount} skipped</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Anchor Question Step */}
      {step === 'anchor' && (
        <div className="w-full">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">{ANCHOR_QUESTION}</h2>
          
          <div className="mb-6">
            <textarea
              value={anchorAnswer}
              onChange={(e) => setAnchorAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              rows={4}
              disabled={isGeneratingQuestions}
            />
          </div>

          {/* Action Buttons - Fixed to bottom */}
          <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 -mx-6 sm:-mx-6 md:-mx-6 px-6 -mb-6">
            <div className="flex justify-end gap-4">
              <button
                onClick={handleAnchorSubmit}
                disabled={!anchorAnswer.trim() || isGeneratingQuestions}
                className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions Step */}
      {step === 'questions' && currentQuestion && (
        <div className="w-full relative">
          {/* Skip button in top right */}
          {currentQuestion.allowSkip && (
            <button
              onClick={() => handleSkip(currentQuestion.id)}
              className="absolute top-0 right-0 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Skip
            </button>
          )}
          
          <div className="mb-6 pr-20">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              {currentQuestion.question}
            </h3>
            {currentQuestion.helpText && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{currentQuestion.helpText}</p>
            )}
          </div>

          {/* Multiple Choice Options - Radio buttons (single) or Checkboxes (multi) */}
          {currentQuestion.type === 'multiple_choice' && (
            <div className="space-y-3 mb-6">
              {(() => {
                const isSingleSelection = currentQuestion.selectionType === 'single';
                const isMultiSelection = currentQuestion.selectionType !== 'single';

                // For single selection, use radio buttons
                if (isSingleSelection) {
                  return (
                    <>
                      {currentQuestion.options.map((option, index) => {
                        const isSelected = currentAnswer?.answer === option && !currentAnswer?.isOther;

                        return (
                          <label
                            key={index}
                            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                              isSelected
                                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestion.id}`}
                              checked={isSelected}
                              onChange={() => handleAnswerSelect(currentQuestion.id, option, true)}
                              className="mr-3"
                            />
                            <span className="flex-1 text-gray-900 dark:text-white">{option}</span>
                          </label>
                        );
                      })}
                    </>
                  );
                }

                // For multi selection, use checkboxes
                return (
                  <>
                    {currentQuestion.options.map((option, index) => {
                      const currentSelections = currentAnswer
                        ? Array.isArray(currentAnswer.answer)
                          ? currentAnswer.answer
                          : currentAnswer.answer && !currentAnswer.isOther
                          ? [currentAnswer.answer]
                          : []
                        : [];
                      const isSelected = currentSelections.includes(option);

                      return (
                        <label
                          key={index}
                          className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                            isSelected
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleAnswerSelect(currentQuestion.id, option, false)}
                            className="mr-3"
                          />
                          <span className="flex-1 text-gray-900 dark:text-white">{option}</span>
                        </label>
                      );
                    })}

                    {/* All of the above option - only for multi-selection */}
                    <label
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                        (() => {
                          const currentSelections = currentAnswer
                            ? Array.isArray(currentAnswer.answer)
                              ? currentAnswer.answer
                              : currentAnswer.answer && !currentAnswer.isOther
                              ? [currentAnswer.answer]
                              : []
                            : [];
                          const allSelected = currentQuestion.options.every(opt => currentSelections.includes(opt));
                          return allSelected && currentQuestion.options.length > 0
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600';
                        })()
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={(() => {
                          const currentSelections = currentAnswer
                            ? Array.isArray(currentAnswer.answer)
                              ? currentAnswer.answer
                              : currentAnswer.answer && !currentAnswer.isOther
                              ? [currentAnswer.answer]
                              : []
                            : [];
                          return currentQuestion.options.every(opt => currentSelections.includes(opt)) && currentQuestion.options.length > 0;
                        })()}
                        onChange={() => handleSelectAll(currentQuestion.id)}
                        className="mr-3"
                      />
                      <span className="flex-1 text-gray-900 dark:text-white font-medium">All of the above</span>
                    </label>
                  </>
                );
              })()}

              {/* Other Option */}
              {currentQuestion.allowOther && (
                <div className={`border-2 rounded-lg p-4 ${
                  currentAnswer?.isOther
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}>
                  <label className="flex items-center mb-3 cursor-pointer">
                    <input
                      type={currentQuestion.selectionType === 'single' ? 'radio' : 'checkbox'}
                      name={currentQuestion.selectionType === 'single' ? `question-${currentQuestion.id}` : undefined}
                      checked={currentAnswer?.isOther === true}
                      onChange={() => handleOtherToggle(currentQuestion.id, currentQuestion.selectionType === 'single')}
                      className="mr-3"
                    />
                    <span className="text-gray-900 dark:text-white">Other (specify)</span>
                  </label>
                  {currentAnswer?.isOther && (
                    <input
                      type="text"
                      value={currentAnswer.otherValue || ''}
                      onChange={(e) => handleOtherSelect(currentQuestion.id, e.target.value)}
                      placeholder="Please specify..."
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded mt-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons - Fixed to bottom */}
          <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 -mx-6 sm:-mx-6 md:-mx-6 px-6 -mb-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                {currentQuestionIndex > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Previous
                  </button>
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && (
                  <Loader2 size={18} className="animate-spin" />
                )}
                {currentQuestionIndex === questions.length - 1
                  ? isSubmitting
                    ? 'Creating Goal...'
                    : 'Create Learning Goal'
                  : 'Next'}
              </button>
            </div>
          </div>

          {/* Question Indicators */}
          <div className="mt-6 flex gap-2 justify-center flex-wrap pb-6">
            {questions.map((q, index) => {
              const answer = answers.get(q.id);
              const hasAnswer = answer && !answer.skipped && (
                (Array.isArray(answer.answer) && answer.answer.length > 0) ||
                (typeof answer.answer === 'string' && answer.answer.length > 0) ||
                answer.isOther
              );
              const isSkipped = answer?.skipped;
              const isCurrent = index === currentQuestionIndex;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-full text-sm transition ${
                    isCurrent
                      ? 'bg-blue-600 dark:bg-blue-500 text-white ring-2 ring-blue-300 dark:ring-blue-400'
                      : hasAnswer
                      ? 'bg-green-500 text-white'
                      : isSkipped
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  title={q.question}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

