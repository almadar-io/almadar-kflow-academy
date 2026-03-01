/**
 * Placement Test Component
 * Displays and manages placement test questions and results
 */

import React, { useState, useEffect } from 'react';
import { usePlacementTest } from '../hooks/usePlacementTest';
import { placementTestApi } from '../placementTestApi';
import type { PlacementAnswer } from '../../../../server/src/types/placementTest';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center py-8 sm:py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Generating placement test questions...</p>
        </div>
      </div>
    );
  }

  // Results screen
  if (showResults && result) {
    const levelColors = {
      beginner: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
      intermediate: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400',
      advanced: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400',
    };

    return (
      <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center mb-6 sm:mb-8">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Placement Test Complete!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We've assessed your current knowledge level
          </p>
        </div>

        <div className="space-y-6">
          {/* Assessed Level */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Your Level
            </h3>
            <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${levelColors[result.assessedLevel]}`}>
              {result.assessedLevel.charAt(0).toUpperCase() + result.assessedLevel.slice(1)}
            </div>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Based on your answers, we've determined you're at an{' '}
              <span className="font-semibold">{result.assessedLevel}</span> level. Your learning path
              will be tailored to this level.
            </p>
          </div>


          {/* Score Breakdown */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Score Breakdown
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Beginner Questions</span>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {Math.round(result.beginnerScore * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${result.beginnerScore * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Intermediate Questions</span>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {Math.round(result.intermediateScore * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${result.intermediateScore * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Advanced Questions</span>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {Math.round(result.advancedScore * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${result.advancedScore * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (onComplete) {
                  onComplete({
                    assessedLevel: result.assessedLevel,
                  });
                }
              }}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition"
            >
              Continue to Learning Path
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
          <XCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
        <button
          onClick={handleSkip}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          Skip Placement Test
        </button>
      </div>
    );
  }

  // No questions yet
  if (!currentQuestion || questions.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center py-8 sm:py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {loading ? 'Generating questions...' : 'No questions available'}
          </p>
          {!loading && (
            <button
              onClick={handleSkip}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Skip Placement Test
            </button>
          )}
        </div>
      </div>
    );
  }

  // Question display
  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 relative">
        {/* Skip button in top right */}
        {onSkip && (
          <button
            onClick={handleSkip}
            className="absolute top-0 right-0 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Skip Test
          </button>
        )}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 pr-32">
          Placement Test
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Answer these questions to help us tailor your learning path to your current level.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span>{answeredCount} answered</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-semibold">
              {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
            </span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            {currentQuestion.question}
          </h3>
        </div>

        {/* Answer Options */}
        {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((option, index) => {
              const isSelected = currentAnswer?.answer === option;
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
                    value={option}
                    checked={isSelected}
                    onChange={() => handleAnswerSelect(currentQuestion.id, option)}
                    className="mr-3"
                  />
                  <span className="flex-1 text-gray-900 dark:text-white">{option}</span>
                </label>
              );
            })}
          </div>
        )}

        {currentQuestion.type === 'true_false' && (
          <div className="space-y-3 mb-6">
            {['True', 'False'].map((option) => {
              const isSelected = currentAnswer?.answer === option;
              return (
                <label
                  key={option}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                    isSelected
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option}
                    checked={isSelected}
                    onChange={() => handleAnswerSelect(currentQuestion.id, option)}
                    className="mr-3"
                  />
                  <span className="flex-1 text-gray-900 dark:text-white">{option}</span>
                </label>
              );
            })}
          </div>
        )}

        {currentQuestion.type === 'short_answer' && (
          <div className="mb-6">
            <textarea
              value={typeof currentAnswer?.answer === 'string' ? currentAnswer.answer : ''}
              onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              rows={4}
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
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
            disabled={!currentAnswer?.answer || loading}
            className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <Loader2 size={18} className="animate-spin" />
            )}
            {loading
              ? 'Submitting...'
              : currentQuestionIndex === questions.length - 1 
              ? 'Submit Test' 
              : 'Next'}
          </button>
        </div>

        {/* Question Indicators */}
        <div className="mt-6 flex gap-2 justify-center flex-wrap">
          {questions.map((q, index) => {
            const answer = answers.get(q.id);
            const isAnswered = answer && answer.answer;
            const isCurrent = index === currentQuestionIndex;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded-full text-sm transition ${
                  isCurrent
                    ? 'bg-blue-600 dark:bg-blue-500 text-white ring-2 ring-blue-300 dark:ring-blue-400'
                    : isAnswered
                    ? 'bg-green-500 text-white'
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
    </div>
  );
};

