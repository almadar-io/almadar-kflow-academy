/**
 * Placement Test Component
 * Displays and manages placement test questions and results
 */

import React, { useState, useEffect } from 'react';
import { usePlacementTest } from '@features/learning/hooks/usePlacementTest';
import type { PlacementAnswer } from '@/types/server/placementTest';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Box, Stack, Typography, Button, Badge, Textarea, ProgressBar, Spinner, useTranslate } from '@almadar/ui';

interface PlacementTestProps {
  goalId: string;
  graphId: string;
  topic: string;
  onComplete?: (result: {
    assessedLevel: 'beginner' | 'intermediate' | 'advanced';
  }) => void;
  onSkip?: () => void;
}

export const PlacementTest: React.FC<PlacementTestProps> = ({
  goalId,
  graphId,
  topic,
  onComplete,
  onSkip,
}) => {
  const { t } = useTranslate();
  const {
    test,
    questions,
    result,
    loading,
    error,
    generateQuestions,
    createTest,
    updateTestQuestions,
    submitTest,
  } = usePlacementTest({ goalId, graphId, topic });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, PlacementAnswer>>(new Map());
  const [showResults, setShowResults] = useState(false);

  // Initialize test and generate questions only when component is mounted and ready
  useEffect(() => {
    const initializeTest = async () => {
      try {
        // Create test
        const createdTest = await createTest();
        if (!createdTest || !createdTest.id) {
          console.error('Failed to create test');
          return;
        }

        // Generate questions
        const generatedQuestions = await generateQuestions();
        if (!generatedQuestions || generatedQuestions.length === 0) {
          console.error('No questions generated');
          return;
        }

        // Update test with questions using the created test ID directly
        await updateTestQuestions(generatedQuestions, createdTest.id);
      } catch (err) {
        console.error('Error initializing placement test:', err);
      }
    };

    // Only initialize if test doesn't exist and we're not already loading
    if (!test && !loading) {
      initializeTest();
    }
  }, []); // Only run once on mount

  // Handle answer selection
  const handleAnswerSelect = (questionId: string, answer: string | string[]) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, {
      questionId,
      answer,
      isCorrect: false, // Will be validated on submit
      answeredAt: Date.now(),
    });
    setAnswers(newAnswers);
  };

  // Handle next question
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Submit test
      handleSubmit();
    }
  };

  // Handle previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Submit test
  const handleSubmit = async () => {
    try {
      const answerArray: PlacementAnswer[] = questions.map((q) => {
        const answer = answers.get(q.id);
        if (!answer) {
          // If question wasn't answered, create a default answer
          return {
            questionId: q.id,
            answer: '',
            isCorrect: false,
            answeredAt: Date.now(),
          };
        }
        return answer;
      });

      const testResult = await submitTest(answerArray);
      if (testResult && onComplete) {
        setShowResults(true);
        onComplete({
          assessedLevel: testResult.assessedLevel,
        });
      }
    } catch (err) {
      console.error('Error submitting test:', err);
    }
  };

  // Skip test
  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : undefined;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Array.from(answers.values()).filter(a => a.answer).length;

  // Loading state
  if (loading && !test) {
    return (
      <Box className="w-full max-w-3xl mx-auto p-4 sm:p-6 bg-card rounded-lg shadow-md">
        <Stack direction="vertical" align="center" justify="center" gap="md" className="py-8 sm:py-12">
          <Spinner size="md" />
          <Typography variant="body" className="text-muted-foreground">{t('placement.generatingQuestions')}</Typography>
        </Stack>
      </Box>
    );
  }

  // Results screen
  if (showResults && result) {
    const levelVariant: Record<'beginner' | 'intermediate' | 'advanced', string> = {
      beginner: 'bg-success/20 text-success',
      intermediate: 'bg-info/20 text-info',
      advanced: 'bg-accent/20 text-accent',
    };

    return (
      <Box className="w-full max-w-3xl mx-auto p-4 sm:p-6 bg-card rounded-lg shadow-md">
        <Box className="text-center mb-6 sm:mb-8">
          <Box className="text-success mx-auto mb-4 w-16 flex justify-center">
            <CheckCircle2 className="w-16 h-16" />
          </Box>
          <Typography variant="h2" weight="bold" align="center" className="text-foreground mb-2">
            {t('placement.testComplete')}
          </Typography>
          <Typography variant="body" align="center" className="text-muted-foreground">
            {t('placement.assessedDesc')}
          </Typography>
        </Box>

        <Stack direction="vertical" gap="lg">
          {/* Assessed Level */}
          <Box className="bg-muted/30 rounded-lg p-4 sm:p-6">
            <Typography variant="h4" weight="semibold" className="text-foreground mb-4">
              {t('placement.yourLevel')}
            </Typography>
            <Box className={`inline-block px-4 py-2 rounded-lg font-semibold ${levelVariant[result.assessedLevel]}`}>
              {result.assessedLevel.charAt(0).toUpperCase() + result.assessedLevel.slice(1)}
            </Box>
            <Typography variant="body" className="mt-3 text-muted-foreground">
              {t('placement.levelExplain', { level: result.assessedLevel })}
            </Typography>
          </Box>

          {/* Score Breakdown */}
          <Box className="bg-muted/30 rounded-lg p-4 sm:p-6">
            <Typography variant="h4" weight="semibold" className="text-foreground mb-4">
              {t('placement.scoreBreakdown')}
            </Typography>
            <Stack direction="vertical" gap="sm">
              <Box>
                <Stack direction="horizontal" justify="between" className="text-sm mb-1">
                  <Typography variant="small" className="text-muted-foreground">{t('placement.beginnerQuestions')}</Typography>
                  <Typography variant="small" weight="semibold" className="text-foreground">
                    {Math.round(result.beginnerScore * 100)}%
                  </Typography>
                </Stack>
                <ProgressBar value={result.beginnerScore * 100} variant="success" />
              </Box>
              <Box>
                <Stack direction="horizontal" justify="between" className="text-sm mb-1">
                  <Typography variant="small" className="text-muted-foreground">{t('placement.intermediateQuestions')}</Typography>
                  <Typography variant="small" weight="semibold" className="text-foreground">
                    {Math.round(result.intermediateScore * 100)}%
                  </Typography>
                </Stack>
                <ProgressBar value={result.intermediateScore * 100} variant="default" />
              </Box>
              <Box>
                <Stack direction="horizontal" justify="between" className="text-sm mb-1">
                  <Typography variant="small" className="text-muted-foreground">{t('placement.advancedQuestions')}</Typography>
                  <Typography variant="small" weight="semibold" className="text-foreground">
                    {Math.round(result.advancedScore * 100)}%
                  </Typography>
                </Stack>
                <ProgressBar value={result.advancedScore * 100} variant="primary" />
              </Box>
            </Stack>
          </Box>

          {/* Continue Button */}
          <Stack direction="horizontal" justify="end">
            <Button
              variant="primary"
              onClick={() => {
                if (onComplete) {
                  onComplete({
                    assessedLevel: result.assessedLevel,
                  });
                }
              }}
            >
              {t('placement.continueToPath')}
            </Button>
          </Stack>
        </Stack>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box className="w-full max-w-3xl mx-auto p-4 sm:p-6 bg-card rounded-lg shadow-md">
        <Stack direction="horizontal" align="center" gap="sm" className="text-error mb-4">
          <XCircle className="w-5 h-5" />
          <Typography variant="body" className="text-error">{error}</Typography>
        </Stack>
        <Button variant="secondary" onClick={handleSkip}>
          {t('placement.skipTest')}
        </Button>
      </Box>
    );
  }

  // No questions yet
  if (!currentQuestion || questions.length === 0) {
    return (
      <Box className="w-full max-w-3xl mx-auto p-4 sm:p-6 bg-card rounded-lg shadow-md">
        <Box className="text-center py-8 sm:py-12">
          <Typography variant="body" className="text-muted-foreground mb-4">
            {loading ? t('placement.generatingQuestionsShort') : t('placement.noQuestionsAvailable')}
          </Typography>
          {!loading && (
            <Button variant="secondary" onClick={handleSkip}>
              {t('placement.skipTest')}
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  // Question display
  return (
    <Box className="w-full max-w-3xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <Box className="mb-6 relative">
        {/* Skip button in top right */}
        {onSkip && (
          <Box className="absolute top-0 right-0">
            <Button variant="secondary" size="sm" onClick={handleSkip}>
              {t('placement.skipTest')}
            </Button>
          </Box>
        )}
        <Typography variant="h2" weight="bold" className="text-foreground mb-2 pr-32">
          {t('placement.title')}
        </Typography>
        <Typography variant="body" className="text-muted-foreground">
          {t('placement.answerDesc')}
        </Typography>
      </Box>

      {/* Progress Bar */}
      <Box className="mb-6">
        <Stack direction="horizontal" justify="between" className="text-sm text-muted-foreground mb-2">
          <Typography variant="small" className="text-muted-foreground">
            {t('learning.questionOf', { current: currentQuestionIndex + 1, total: questions.length })}
          </Typography>
          <Typography variant="small" className="text-muted-foreground">{t('placement.answered', { count: answeredCount })}</Typography>
        </Stack>
        <ProgressBar value={progress} variant="primary" />
      </Box>

      {/* Question */}
      <Box className="bg-card rounded-lg shadow-md p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
        <Box className="mb-6">
          <Box className="mb-4">
            <Badge variant="info" label={currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)} />
          </Box>
          <Typography variant="h4" weight="semibold" className="text-foreground mb-2">
            {currentQuestion.question}
          </Typography>
        </Box>

        {/* Answer Options */}
        {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
          <Stack direction="vertical" gap="sm" className="mb-6">
            {currentQuestion.options.map((option, index) => {
              const isSelected = currentAnswer?.answer === option;
              return (
                <Box
                  key={index}
                  as="button"
                  onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                  className={`w-full flex items-center p-4 border-2 rounded-lg cursor-pointer text-left transition ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-border-hover'}`}
                >
                  <Box className={`mr-3 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary' : 'border-border'}`}>
                    {isSelected && <Box className="w-2 h-2 rounded-full bg-primary" />}
                  </Box>
                  <Typography as="span" variant="body" className="flex-1 text-foreground">{option}</Typography>
                </Box>
              );
            })}
          </Stack>
        )}

        {currentQuestion.type === 'true_false' && (
          <Stack direction="vertical" gap="sm" className="mb-6">
            {['True', 'False'].map((option) => {
              const isSelected = currentAnswer?.answer === option;
              return (
                <Box
                  key={option}
                  as="button"
                  onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                  className={`w-full flex items-center p-4 border-2 rounded-lg cursor-pointer text-left transition ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-border-hover'}`}
                >
                  <Box className={`mr-3 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary' : 'border-border'}`}>
                    {isSelected && <Box className="w-2 h-2 rounded-full bg-primary" />}
                  </Box>
                  <Typography as="span" variant="body" className="flex-1 text-foreground">{option}</Typography>
                </Box>
              );
            })}
          </Stack>
        )}

        {currentQuestion.type === 'short_answer' && (
          <Box className="mb-6">
            <Textarea
              value={typeof currentAnswer?.answer === 'string' ? currentAnswer.answer : ''}
              onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
              placeholder={t('learning.typeAnswerHere')}
              rows={4}
              className="resize-none"
            />
          </Box>
        )}

        {/* Navigation */}
        <Stack direction="horizontal" justify="between" align="center" className="pt-6 border-t border-border">
          <Stack direction="horizontal" gap="sm">
            {currentQuestionIndex > 0 && (
              <Button variant="secondary" onClick={handlePrevious}>
                {t('lesson.previous')}
              </Button>
            )}
          </Stack>

          <Button
            variant="primary"
            isLoading={loading}
            onClick={handleNext}
            disabled={!currentAnswer?.answer || loading}
          >
            {loading
              ? t('placement.submitting')
              : currentQuestionIndex === questions.length - 1
              ? t('placement.submitTest')
              : t('lesson.next')}
          </Button>
        </Stack>

        {/* Question Indicators */}
        <Stack direction="horizontal" gap="sm" justify="center" wrap className="mt-6">
          {questions.map((q, index) => {
            const answer = answers.get(q.id);
            const isAnswered = answer && answer.answer;
            const isCurrent = index === currentQuestionIndex;

            return (
              <Box
                key={q.id}
                as="button"
                onClick={() => setCurrentQuestionIndex(index)}
                title={q.question}
                className={`w-8 h-8 rounded-full text-sm transition ${isCurrent
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : isAnswered
                  ? 'bg-success text-success-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/60'}`}
              >
                {index + 1}
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
};
