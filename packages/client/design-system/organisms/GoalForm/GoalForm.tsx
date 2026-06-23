import React, { useState } from 'react';
import { useGoalQuestions } from '@features/learning/hooks/useGoalQuestions';
import { useCreateGoal } from '@features/learning/hooks/useCreateGoal';
import { PlacementTest } from '@design-system/organisms/PlacementTest';
import { GoalReview } from './GoalReview';
import { LevelSelection } from './LevelSelection';
import { GoalOverview } from './GoalOverview';
import { updateGoal } from '@features/learning/goalApi';
import type { GoalQuestionAnswer, LearningGoal } from '@features/learning/goalApi';
import { Edit3, ClipboardList } from 'lucide-react';
import { Box, Stack, Typography, Button, Textarea, ProgressBar, Spinner, useTranslate } from '@almadar/ui';

// Anchor question constant (matches backend)
const ANCHOR_QUESTION = "What's something you've always wanted to learn?";

interface GoalFormProps {
  onComplete?: (result: { goalId: string; graphId: string }) => void;
  onCancel?: () => void;
}

type StreamPartial = Partial<LearningGoal> & { id?: string };

export const GoalForm: React.FC<GoalFormProps> = ({ onComplete, onCancel }) => {
  const { t } = useTranslate();
  const [step, setStep] = useState<'anchor' | 'choice' | 'questions' | 'loading' | 'review' | 'level-selection' | 'placement'>('anchor');
  const [anchorAnswer, setAnchorAnswer] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [answers, setAnswers] = useState<Map<string, GoalQuestionAnswer>>(new Map());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [createdGoal, setCreatedGoal] = useState<{ goalId: string; graphId: string; topic: string; goal: LearningGoal } | null>(null);
  const [placementTestSkipped, setPlacementTestSkipped] = useState(false);
  const [placementTestStarted, setPlacementTestStarted] = useState(false);

  const { questions: questionsData, isLoading: isGeneratingQuestions, error: questionsError, generateQuestions } = useGoalQuestions();
  const { isLoading: isSubmitting, error: submitError, createWithGraph, partialGoal } = useCreateGoal();

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
      const result = await createWithGraph({
        anchorAnswer: anchorAnswer.trim(),
        questionAnswers: [],
        seedConceptDescription: goalDescription.trim() || undefined,
        goalFocused: true,
        stream: true, // Enable streaming
        manualGoal: {
          title: anchorAnswer.trim(),
          description: goalDescription.trim() || anchorAnswer.trim(),
        },
      }, (_chunk: string, partial: StreamPartial) => {
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
      }, (_chunk: string, partial: StreamPartial) => {
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
      <Box className="w-full">
        <Stack direction="vertical" align="center" justify="center" gap="md" className="mb-6">
          <Spinner size="lg" />
          <Typography variant="h3" weight="semibold" align="center" className="text-foreground">
            {t('learning.generatingGoal')}
          </Typography>
          <Typography variant="body" align="center" className="text-muted-foreground">
            {t('learning.generatingGoalDesc')}
          </Typography>
        </Stack>

        {partialGoal && (
          <Box className="mt-6 w-full p-4 bg-muted/30 rounded-lg border border-border">
            <GoalOverview goal={partialGoal} />
          </Box>
        )}
      </Box>
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
          onComplete={() => {
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
      <Box className="w-full">
        <Stack direction="vertical" align="center" justify="center" gap="md" className="py-8 sm:py-12">
          <Spinner size="md" />
          <Typography variant="body" className="text-muted-foreground">{t('learning.generatingQuestions')}</Typography>
        </Stack>
      </Box>
    );
  }

  // Choice step - after anchor question, show description and choice between manual entry or form
  if (step === 'choice') {
    return (
      <Box className="w-full">
        <Box className="text-center mb-6 sm:mb-8">
          <Typography variant="h2" weight="bold" align="center" className="text-foreground mb-2">
            {t('learning.tellUsMore')}
          </Typography>
          <Typography variant="body" align="center" className="text-muted-foreground">
            {t('learning.youWantToLearn')}: <Typography as="span" weight="semibold" className="text-foreground">{anchorAnswer}</Typography>
          </Typography>
        </Box>

        {/* Goal Description */}
        <Box className="mb-8">
          <Typography as="label" variant="small" weight="semibold" className="text-foreground mb-2 block">
            {t('learning.goalDescriptionOptional')}
          </Typography>
          <Textarea
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
            placeholder={t('learning.goalDescriptionPlaceholder')}
            rows={4}
            className="resize-none"
          />
          <Typography variant="caption" className="text-muted-foreground mt-2 block">
            {t('learning.enterDescriptionHint')}
          </Typography>
        </Box>

        {/* Divider */}
        <Box className="relative my-8">
          <Box className="absolute inset-0 flex items-center">
            <Box className="w-full border-t border-border" />
          </Box>
          <Box className="relative flex justify-center text-sm">
            <Typography as="span" variant="small" className="px-4 bg-card text-muted-foreground">
              {t('common.or')}
            </Typography>
          </Box>
        </Box>

        {/* Goal Form Option */}
        <Box className="mb-8">
          <Box
            as="button"
            onClick={handleStartForm}
            className="w-full p-6 border-2 border-dashed border-border rounded-lg hover:border-accent hover:bg-accent/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Stack direction="horizontal" align="center" gap="md">
              <Box className="flex-shrink-0 p-3 bg-accent/20 rounded-lg text-accent">
                {isGeneratingQuestions ? (
                  <Spinner size="sm" />
                ) : (
                  <ClipboardList size={24} />
                )}
              </Box>
              <Box className="flex-1 text-left">
                <Typography variant="h4" weight="semibold" className="text-foreground mb-1">
                  {isGeneratingQuestions ? t('learning.generatingQuestionsShort') : t('learning.takeGoalForm')}
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  {isGeneratingQuestions
                    ? t('learning.generatingQuestionsDesc')
                    : t('learning.answerQuestionsDesc')}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>

        {/* Action Buttons - Fixed to bottom */}
        <Box className="sticky bottom-0 left-0 right-0 bg-card border-t border-border py-4 -mx-6 px-6 -mb-6">
          <Stack direction="horizontal" justify="between" gap="md">
            <Button
              variant="secondary"
              onClick={() => setStep('anchor')}
              disabled={isSubmitting || isGeneratingQuestions}
            >
              {t('concept.back')}
            </Button>
            <Button
              variant="primary"
              leftIcon={Edit3}
              isLoading={isSubmitting}
              onClick={handleManualGoalSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('learning.creatingGoal') : t('learning.createGoal')}
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="w-full">
      {/* Progress Bar */}
      {step === 'questions' && questions.length > 0 && (
        <Box className="mb-4 sm:mb-6">
          <Stack direction="horizontal" justify="between" className="text-sm text-muted-foreground mb-2">
            <Typography variant="small" className="text-muted-foreground">{t('learning.questionOf', { current: currentQuestionIndex + 1, total: questions.length })}</Typography>
            <Typography variant="small" className="text-muted-foreground">{t('learning.answeredSkipped', { answered: answeredCount, skipped: skippedCount })}</Typography>
          </Stack>
          <ProgressBar value={progress} variant="primary" />
        </Box>
      )}

      {/* Error Message */}
      {error && (
        <Box className="mb-4 p-4 bg-error/10 border border-error rounded-lg text-error">
          {error}
        </Box>
      )}

      {/* Anchor Question Step */}
      {step === 'anchor' && (
        <Box className="w-full">
          <Typography variant="h2" weight="bold" className="text-foreground mb-4 sm:mb-6">{ANCHOR_QUESTION}</Typography>

          <Box className="mb-6">
            <Textarea
              value={anchorAnswer}
              onChange={(e) => setAnchorAnswer(e.target.value)}
              placeholder={t('learning.typeAnswerHere')}
              rows={4}
              disabled={isGeneratingQuestions}
              className="resize-none"
            />
          </Box>

          {/* Action Buttons - Fixed to bottom */}
          <Box className="sticky bottom-0 left-0 right-0 bg-card border-t border-border py-4 -mx-6 px-6 -mb-6">
            <Stack direction="horizontal" justify="end" gap="md">
              <Button
                variant="primary"
                onClick={handleAnchorSubmit}
                disabled={!anchorAnswer.trim() || isGeneratingQuestions}
              >
                {t('episode.continue')}
              </Button>
            </Stack>
          </Box>
        </Box>
      )}

      {/* Questions Step */}
      {step === 'questions' && currentQuestion && (
        <Box className="w-full relative">
          {/* Skip button in top right */}
          {currentQuestion.allowSkip && (
            <Box className="absolute top-0 right-0">
              <Button variant="secondary" size="sm" onClick={() => handleSkip(currentQuestion.id)}>
                {t('activation.skipForNow')}
              </Button>
            </Box>
          )}

          <Box className="mb-6 pr-20">
            <Typography variant="h4" weight="semibold" className="text-foreground mb-2">
              {currentQuestion.question}
            </Typography>
            {currentQuestion.helpText && (
              <Typography variant="small" className="text-muted-foreground mb-4">{currentQuestion.helpText}</Typography>
            )}
          </Box>

          {/* Multiple Choice Options - Radio (single) or Checkbox (multi) */}
          {currentQuestion.type === 'multiple_choice' && (
            <Stack direction="vertical" gap="sm" className="mb-6">
              {(() => {
                const isSingleSelection = currentQuestion.selectionType === 'single';

                // For single selection, use radio-style selectable cards
                if (isSingleSelection) {
                  return (
                    <>
                      {currentQuestion.options.map((option, index) => {
                        const isSelected = currentAnswer?.answer === option && !currentAnswer?.isOther;

                        return (
                          <Box
                            key={index}
                            as="button"
                            onClick={() => handleAnswerSelect(currentQuestion.id, option, true)}
                            className={`w-full flex items-center p-4 border-2 rounded-lg cursor-pointer text-left transition ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-border-hover'}`}
                          >
                            <Box className={`mr-3 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary' : 'border-border'}`}>
                              {isSelected && <Box className="w-2 h-2 rounded-full bg-primary" />}
                            </Box>
                            <Typography as="span" variant="body" className="flex-1 text-foreground">{option}</Typography>
                          </Box>
                        );
                      })}
                    </>
                  );
                }

                // For multi selection, use checkbox-style selectable cards
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
                        <Box
                          key={index}
                          as="button"
                          onClick={() => handleAnswerSelect(currentQuestion.id, option, false)}
                          className={`w-full flex items-center p-4 border-2 rounded-lg cursor-pointer text-left transition ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-border-hover'}`}
                        >
                          <Box className={`mr-3 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-border'}`}>
                            {isSelected && <Box className="w-2 h-2 bg-primary-foreground" />}
                          </Box>
                          <Typography as="span" variant="body" className="flex-1 text-foreground">{option}</Typography>
                        </Box>
                      );
                    })}

                    {/* All of the above option - only for multi-selection */}
                    {(() => {
                      const currentSelections = currentAnswer
                        ? Array.isArray(currentAnswer.answer)
                          ? currentAnswer.answer
                          : currentAnswer.answer && !currentAnswer.isOther
                          ? [currentAnswer.answer]
                          : []
                        : [];
                      const allSelected = currentQuestion.options.every(opt => currentSelections.includes(opt)) && currentQuestion.options.length > 0;

                      return (
                        <Box
                          as="button"
                          onClick={() => handleSelectAll(currentQuestion.id)}
                          className={`w-full flex items-center p-4 border-2 rounded-lg cursor-pointer text-left transition ${allSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-border-hover'}`}
                        >
                          <Box className={`mr-3 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${allSelected ? 'border-primary bg-primary' : 'border-border'}`}>
                            {allSelected && <Box className="w-2 h-2 bg-primary-foreground" />}
                          </Box>
                          <Typography as="span" variant="body" weight="medium" className="flex-1 text-foreground">{t('learning.allOfTheAbove')}</Typography>
                        </Box>
                      );
                    })()}
                  </>
                );
              })()}

              {/* Other Option */}
              {currentQuestion.allowOther && (
                <Box className={`border-2 rounded-lg p-4 ${currentAnswer?.isOther ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <Box
                    as="button"
                    onClick={() => handleOtherToggle(currentQuestion.id, currentQuestion.selectionType === 'single')}
                    className="w-full flex items-center mb-3 cursor-pointer text-left"
                  >
                    <Box className={`mr-3 w-4 h-4 ${currentQuestion.selectionType === 'single' ? 'rounded-full' : 'rounded'} border-2 flex items-center justify-center flex-shrink-0 ${currentAnswer?.isOther ? 'border-primary bg-primary' : 'border-border'}`}>
                      {currentAnswer?.isOther && <Box className={`w-2 h-2 ${currentQuestion.selectionType === 'single' ? 'rounded-full bg-primary-foreground' : 'bg-primary-foreground'}`} />}
                    </Box>
                    <Typography as="span" variant="body" className="text-foreground">{t('learning.otherSpecify')}</Typography>
                  </Box>
                  {currentAnswer?.isOther && (
                    <Textarea
                      rows={1}
                      value={currentAnswer.otherValue || ''}
                      onChange={(e) => handleOtherSelect(currentQuestion.id, e.target.value)}
                      placeholder={t('learning.pleaseSpecify')}
                      className="resize-none mt-2"
                    />
                  )}
                </Box>
              )}
            </Stack>
          )}

          {/* Navigation Buttons - Fixed to bottom */}
          <Box className="sticky bottom-0 left-0 right-0 bg-card border-t border-border py-4 -mx-6 px-6 -mb-6">
            <Stack direction="horizontal" justify="between" align="center">
              <Stack direction="horizontal" gap="sm">
                {currentQuestionIndex > 0 && (
                  <Button variant="secondary" onClick={handlePrevious}>
                    {t('lesson.previous')}
                  </Button>
                )}
              </Stack>

              <Button
                variant="primary"
                isLoading={isSubmitting}
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {currentQuestionIndex === questions.length - 1
                  ? isSubmitting
                    ? t('learning.creatingGoal')
                    : t('learning.createLearningGoal')
                  : t('lesson.next')}
              </Button>
            </Stack>
          </Box>

          {/* Question Indicators */}
          <Stack direction="horizontal" gap="sm" justify="center" wrap className="mt-6 pb-6">
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
                <Box
                  key={q.id}
                  as="button"
                  onClick={() => setCurrentQuestionIndex(index)}
                  title={q.question}
                  className={`w-8 h-8 rounded-full text-sm transition ${isCurrent
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                    : hasAnswer
                    ? 'bg-success text-success-foreground'
                    : isSkipped
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/60'}`}
                >
                  {index + 1}
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}
    </Box>
  );
};
