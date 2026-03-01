/**
 * QuestionsStep Component
 * 
 * Third step of MentorGoalForm - answer generated questions about the goal
 * Uses component library components
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { generateGoalQuestions, type GoalQuestion, type GoalQuestionAnswer } from '../../../learning/goalApi';
import { Button } from '../../../../components/atoms/Button';
import { Typography } from '../../../../components/atoms/Typography';
import { ProgressBar } from '../../../../components/atoms/ProgressBar';
import { Card } from '../../../../components/molecules/Card';
import { Input } from '../../../../components/atoms/Input';
import { Alert } from '../../../../components/molecules/Alert';
import { Spinner } from '../../../../components/atoms/Spinner';
import { Badge } from '../../../../components/atoms/Badge';

interface QuestionsStepProps {
  anchorAnswer: string;
  onSubmit: (answers: GoalQuestionAnswer[]) => void;
  onBack: () => void;
}

export const QuestionsStep: React.FC<QuestionsStepProps> = ({ anchorAnswer, onSubmit, onBack }) => {
  const [questions, setQuestions] = useState<GoalQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, GoalQuestionAnswer>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await generateGoalQuestions({
          anchorAnswer: anchorAnswer.trim(),
        });
        setQuestions(response.questions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate questions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [anchorAnswer]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : undefined;

  const handleAnswerSelect = (questionId: string, option: string, isMulti: boolean) => {
    const newAnswers = new Map(answers);
    const currentAnswer = newAnswers.get(questionId);

    if (isMulti) {
      // Multi-select: toggle option
      const currentSelections = currentAnswer
        ? Array.isArray(currentAnswer.answer)
          ? currentAnswer.answer
          : currentAnswer.answer
          ? [currentAnswer.answer]
          : []
        : [];

      const isSelected = currentSelections.includes(option);
      const newSelections = isSelected
        ? currentSelections.filter((a) => a !== option)
        : [...currentSelections, option];

      newAnswers.set(questionId, {
        questionId,
        answer: newSelections.length > 0 ? newSelections : undefined,
        isOther: false,
        skipped: false,
      });
    } else {
      // Single-select: replace option
      newAnswers.set(questionId, {
        questionId,
        answer: option,
        isOther: false,
        skipped: false,
      });
    }

    setAnswers(newAnswers);
  };

  const handleOtherSelect = (questionId: string, otherValue: string) => {
    const newAnswers = new Map(answers);
    const currentAnswer = newAnswers.get(questionId);
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
      otherValue: otherValue,
      skipped: false,
    });

    setAnswers(newAnswers);
  };

  const handleSkip = (questionId: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, {
      questionId,
      skipped: true,
    });
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    const questionAnswers: GoalQuestionAnswer[] = questions.map((q) => {
      const answer = answers.get(q.id);
      if (answer && answer.isOther && answer.otherValue) {
        return {
          ...answer,
          otherValue: answer.otherValue.trim(),
        };
      }
      return answer || { questionId: q.id, skipped: true };
    });

    onSubmit(questionAnswers);
  };

  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Array.from(answers.values()).filter((a) => {
    if (a.skipped) return false;
    if (a.isOther) return true;
    if (Array.isArray(a.answer)) return a.answer.length > 0;
    return !!a.answer;
  }).length;

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" color="primary" />
          <Typography variant="body" color="muted" className="ml-3">
            Generating questions...
          </Typography>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
        <Button variant="secondary" onClick={onBack}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const isMulti = currentQuestion.selectionType === 'multi' || (!currentQuestion.selectionType && currentQuestion.type === 'multiple_choice');
  const currentSelections = currentAnswer
    ? Array.isArray(currentAnswer.answer)
      ? currentAnswer.answer
      : currentAnswer.answer && !currentAnswer.isOther
      ? [currentAnswer.answer]
      : []
    : [];

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="h2">
            Question {currentQuestionIndex + 1} of {questions.length}
          </Typography>
          <Badge variant="default" size="sm">
            {answeredCount} answered
          </Badge>
        </div>
        <ProgressBar value={progress} color="primary" />
      </div>

      <Card variant="outlined" className="mb-6">
        <Typography variant="h3" className="mb-4">
          {currentQuestion.question}
        </Typography>
        {currentQuestion.helpText && (
          <Typography variant="small" color="muted" className="mb-4">
            {currentQuestion.helpText}
          </Typography>
        )}

        <div className="space-y-2">
          {currentQuestion.options.map((option) => {
            const isSelected = isMulti
              ? currentSelections.includes(option)
              : currentAnswer?.answer === option && !currentAnswer.isOther;

            return (
              <Card
                key={option}
                variant="interactive"
                onClick={() => handleAnswerSelect(currentQuestion.id, option, isMulti)}
                className={`p-4 border-2 transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-gray-400 dark:border-gray-500'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <Typography variant="body">{option}</Typography>
                </div>
              </Card>
            );
          })}

          {currentQuestion.allowOther && (
            <div className="mt-4">
              <Input
                type="text"
                value={currentAnswer?.isOther ? currentAnswer.otherValue || '' : ''}
                onChange={(e) => handleOtherSelect(currentQuestion.id, e.target.value)}
                placeholder="Other (please specify)"
              />
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onBack} icon={ArrowLeft}>
            Back
          </Button>
          {currentQuestionIndex > 0 && (
            <Button variant="secondary" onClick={handlePrevious}>
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          {currentQuestion.allowSkip && (
            <Button variant="ghost" onClick={() => handleSkip(currentQuestion.id)}>
              Skip
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleNext}
            iconRight={ArrowRight}
          >
            {currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

