import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import type { Assessment, AssessmentQuestion, AssessmentSubmission, AssessmentAnswer } from '@/types/server/publishing';
import { useAnswerEvaluation } from '../hooks/useAnswerEvaluation';
import { enrollmentApi } from '../enrollmentApi';

interface AssessmentViewProps {
  assessment: Assessment;
  lessonId: string;
  enrollmentId: string;
  onComplete?: (submission: AssessmentSubmission) => void;
  onClose?: () => void;
}

const AssessmentView: React.FC<AssessmentViewProps> = ({
  assessment,
  lessonId,
  enrollmentId,
  onComplete,
  onClose,
}) => {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<AssessmentSubmission | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  
  const { evaluations, evaluateAnswer, clearEvaluation } = useAnswerEvaluation({
    courseId: assessment.courseId || '',
    moduleId: assessment.moduleId || '',
    lessonId,
  });

  // Initialize questions (randomize if needed)
  useEffect(() => {
    if (assessment.questions) {
      const qs = assessment.randomizeQuestions
        ? [...(assessment.questions || [])].sort(() => Math.random() - 0.5)
        : (assessment.questions || []);
      setQuestions(qs);
    }
  }, [assessment]);

  // Initialize time limit
  useEffect(() => {
    if (assessment.timeLimit && !submission) {
      setTimeRemaining(assessment.timeLimit * 60); // Convert to seconds
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            if (prev === 1) {
              handleSubmit(); // Auto-submit when time runs out
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [assessment.timeLimit, submission]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));

    // Clear evaluation if answer is changed after evaluation
    const question = questions.find(q => q.id === questionId);
    if (question && (question.type === 'short_answer' || question.type === 'essay')) {
      if (evaluations[questionId]) {
        clearEvaluation(questionId);
      }
    }
  };

  const handleEvaluateAnswer = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const answerText = typeof answers[questionId] === 'string' 
      ? answers[questionId] as string
      : (answers[questionId] as string[]).join(' ');

    if (answerText.trim().length === 0) {
      return;
    }

    evaluateAnswer(
      questionId,
      question.question || '',
      answerText,
      question.correctAnswer,
      question.points
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Check if all questions are answered
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      const confirm = window.confirm(
        `You have ${unanswered.length} unanswered question(s). Do you want to submit anyway?`
      );
      if (!confirm) return;
    }

    setIsSubmitting(true);
    try {
      const answerArray: AssessmentAnswer[] = questions.map(q => ({
        questionId: q.id,
        answer: answers[q.id] || (q.type === 'multiple_choice' ? [] : ''),
      }));

      const result = await enrollmentApi.submitAssessment(
        assessment.courseId || '',
        assessment.id,
        enrollmentId,
        lessonId,
        answerArray
      );

      if (result.submission) {
        setSubmission(result.submission);
        if (onComplete) {
          onComplete(result.submission);
        }
      }
    } catch (error: any) {
      console.error('Failed to submit assessment:', error);
      alert(error.message || 'Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const hasNext = currentQuestionIndex < questions.length - 1;
  const hasPrevious = currentQuestionIndex > 0;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  // If submission exists, show results
  if (submission) {
    return (
      <div className="space-y-6">
        <div className="text-center py-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            submission.passed
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            {submission.passed ? (
              <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
            ) : (
              <XCircle size={32} className="text-red-600 dark:text-red-400" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {submission.passed ? 'Assessment Passed!' : 'Assessment Failed'}
          </h2>
          <div className={`inline-block px-6 py-3 rounded-lg border-2 mb-2 ${
            submission.passed
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
          }`}>
            <p className={`text-2xl font-bold ${
              submission.passed
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}>
              Score: {submission.score?.toFixed(1) ?? '0.0'} / {submission.maxScore ?? '0'} 
              <span className="text-lg ml-2">
                ({submission.percentage?.toFixed(1) ?? '0.0'}%)
              </span>
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Passing Score: {assessment.passingScore}%
          </p>
        </div>

        {assessment.showResults && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Review Your Answers
            </h3>
            {questions.map((question, idx) => {
              const answer = submission.answers.find((a: AssessmentAnswer) => a.questionId === question.id);
              const isCorrect = answer?.isCorrect ?? false;
              const pointsEarned = answer?.pointsEarned ?? 0;

              return (
                <div
                  key={question.id}
                  className={`p-4 rounded-lg border-2 ${
                    isCorrect
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                      : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Question {idx + 1}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        isCorrect
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {pointsEarned} / {question.points} points
                      </span>
                    </div>
                    {isCorrect ? (
                      <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle size={20} className="text-red-600 dark:text-red-400" />
                    )}
                  </div>

                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                    {question.question}
                  </p>

                  {question.type === 'multiple_choice' && question.options && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Options:
                      </div>
                      {question.options.map((opt, optIdx) => {
                        const isSelected = answer
                          ? (Array.isArray(answer.answer)
                            ? answer.answer.includes(opt)
                            : answer.answer === opt)
                          : false;
                        const isCorrectOption = question.correctAnswer === opt ||
                          question.correctAnswers?.includes(opt);

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded border-2 text-sm ${
                              isCorrectOption
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                                : isSelected
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                                : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span className="flex-1 text-gray-900 dark:text-gray-100">{opt}</span>
                              {isCorrectOption && (
                                <div className="flex items-center gap-1 text-green-700 dark:text-green-400">
                                  <CheckCircle2 size={18} />
                                  <span className="text-xs font-medium">Correct</span>
                                </div>
                              )}
                              {isSelected && !isCorrectOption && (
                                <div className="flex items-center gap-1 text-red-700 dark:text-red-400">
                                  <XCircle size={18} />
                                  <span className="text-xs font-medium">Your Answer</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {!isCorrect && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              Correct Answer: {
                                question.correctAnswer || 
                                (question.correctAnswers && question.correctAnswers.length > 0 
                                  ? question.correctAnswers.join(', ')
                                  : 'N/A')
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {question.type === 'short_answer' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                          Your Answer:
                        </label>
                        <div className={`p-3 rounded border-2 ${
                          isCorrect
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                        }`}>
                          <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                            {answer?.answer || '(No answer provided)'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Score Display */}
                      <div className={`p-3 rounded-lg border-2 ${
                        isCorrect
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isCorrect ? (
                              <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle size={18} className="text-red-600 dark:text-red-400" />
                            )}
                            <span className={`text-sm font-semibold ${
                              isCorrect
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-red-700 dark:text-red-300'
                            }`}>
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                          <span className={`text-sm font-bold ${
                            isCorrect
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-red-700 dark:text-red-300'
                          }`}>
                            {pointsEarned.toFixed(1)} / {question.points} points
                          </span>
                        </div>
                      </div>

                      {!isCorrect && question.correctAnswer && (
                        <div>
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                            Expected Answer:
                          </label>
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                              <span className="text-xs font-medium text-green-700 dark:text-green-300">Reference Answer</span>
                            </div>
                            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap mt-2">
                              {question.correctAnswer}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Feedback - Always show if available */}
                      {answer?.feedback ? (
                        <div>
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                            Detailed Feedback:
                          </label>
                          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border-2 border-indigo-300 dark:border-indigo-700">
                            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                              {answer.feedback}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <p className="text-xs text-yellow-800 dark:text-yellow-300">
                            No detailed feedback available for this answer.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {question.type === 'essay' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                          Your Answer:
                        </label>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                            {answer?.answer || '(No answer provided)'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Score Display */}
                      <div className={`p-3 rounded-lg border-2 ${
                        isCorrect
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isCorrect ? (
                              <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle size={18} className="text-red-600 dark:text-red-400" />
                            )}
                            <span className={`text-sm font-semibold ${
                              isCorrect
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-red-700 dark:text-red-300'
                            }`}>
                              {isCorrect ? 'Passed' : 'Needs Improvement'}
                            </span>
                          </div>
                          <span className={`text-sm font-bold ${
                            isCorrect
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-red-700 dark:text-red-300'
                          }`}>
                            {pointsEarned.toFixed(1)} / {question.points} points
                          </span>
                        </div>
                      </div>
                      
                      {/* Feedback - Always show if available */}
                      {answer?.feedback ? (
                        <div>
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                            Detailed Feedback:
                          </label>
                          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border-2 border-indigo-300 dark:border-indigo-700">
                            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                              {answer.feedback}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <p className="text-xs text-yellow-800 dark:text-yellow-300">
                            No detailed feedback available for this answer.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {question.type === 'true_false' && (
                    <div className="space-y-2">
                      <div className={`p-3 rounded border-2 text-sm ${
                        answer?.answer === question.correctAnswer
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {answer?.answer === question.correctAnswer ? (
                            <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle size={18} className="text-red-600 dark:text-red-400" />
                          )}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            Your answer: <strong>{answer?.answer === 'true' ? 'True' : 'False'}</strong>
                          </span>
                        </div>
                      </div>
                      {answer?.answer !== question.correctAnswer && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              Correct answer: <strong>{question.correctAnswer === 'true' ? 'True' : 'False'}</strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {question.explanation && (
                    <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800">
                      <p className="text-xs font-medium text-indigo-900 dark:text-indigo-300 mb-1">
                        Explanation:
                      </p>
                      <p className="text-xs text-indigo-800 dark:text-indigo-400">
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  // Assessment in progress
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {assessment.title}
          </h2>
          {timeRemaining !== null && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <Clock size={16} className="text-red-600 dark:text-red-400" />
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
        {assessment.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {assessment.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>{questions.length} questions</span>
          <span>Passing score: {assessment.passingScore}%</span>
          {assessment.maxAttempts && (
            <span>Max attempts: {assessment.maxAttempts}</span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current Question */}
      {currentQuestion && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded">
                  {currentQuestion.type.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
              {currentQuestion.question}
            </p>

            {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (() => {
              const selectedAnswer = answers[currentQuestion.id];
              const isCorrect = selectedAnswer && (
                currentQuestion.correctAnswer === selectedAnswer ||
                currentQuestion.correctAnswers?.includes(selectedAnswer as string)
              );
              const hasAnswer = !!selectedAnswer;

              return (
                <div className="space-y-2">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrectOption = currentQuestion.correctAnswer === option ||
                      currentQuestion.correctAnswers?.includes(option);

                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          hasAnswer && isCorrectOption
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : hasAnswer && isSelected && !isCorrectOption
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : isSelected
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          checked={isSelected}
                          onChange={() => handleAnswerChange(currentQuestion.id, option)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="font-medium text-gray-500 dark:text-gray-400 w-6">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <span className="flex-1 text-gray-900 dark:text-gray-100">
                          {option}
                        </span>
                        {hasAnswer && isCorrectOption && (
                          <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                        )}
                        {hasAnswer && isSelected && !isCorrectOption && (
                          <XCircle size={18} className="text-red-600 dark:text-red-400" />
                        )}
                      </label>
                    );
                  })}
                  
                  {/* Feedback Message */}
                  {hasAnswer && (
                    <div className={`mt-3 p-3 rounded-lg border-2 ${
                      isCorrect
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <>
                            <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              Correct! Well done.
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle size={18} className="text-red-600 dark:text-red-400" />
                            <span className="text-sm font-medium text-red-700 dark:text-red-300">
                              Incorrect. The correct answer is: <strong>{currentQuestion.correctAnswer || (currentQuestion.correctAnswers && currentQuestion.correctAnswers.join(', '))}</strong>
                            </span>
                          </>
                        )}
                      </div>
                      {currentQuestion.explanation && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          {currentQuestion.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {currentQuestion.type === 'true_false' && (() => {
              const selectedAnswer = answers[currentQuestion.id] as string;
              const isCorrect = selectedAnswer && selectedAnswer === currentQuestion.correctAnswer;
              const hasAnswer = !!selectedAnswer;

              return (
                <div className="space-y-2">
                  {['true', 'false'].map((value) => {
                    const isSelected = selectedAnswer === value;
                    const isCorrectOption = value === currentQuestion.correctAnswer;

                    return (
                      <label
                        key={value}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          hasAnswer && isCorrectOption
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : hasAnswer && isSelected && !isCorrectOption
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : isSelected
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={value}
                          checked={isSelected}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="flex-1 text-gray-900 dark:text-gray-100 font-medium">
                          {value === 'true' ? 'True' : 'False'}
                        </span>
                        {hasAnswer && isCorrectOption && (
                          <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                        )}
                        {hasAnswer && isSelected && !isCorrectOption && (
                          <XCircle size={18} className="text-red-600 dark:text-red-400" />
                        )}
                      </label>
                    );
                  })}
                  
                  {/* Feedback Message */}
                  {hasAnswer && (
                    <div className={`mt-3 p-3 rounded-lg border-2 ${
                      isCorrect
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <>
                            <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              Correct! Well done.
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle size={18} className="text-red-600 dark:text-red-400" />
                            <span className="text-sm font-medium text-red-700 dark:text-red-300">
                              Incorrect. The correct answer is: <strong>{currentQuestion.correctAnswer === 'true' ? 'True' : 'False'}</strong>
                            </span>
                          </>
                        )}
                      </div>
                      {currentQuestion.explanation && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          {currentQuestion.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {currentQuestion.type === 'short_answer' && (() => {
              const answerText = (answers[currentQuestion.id] as string) || '';
              const evaluation = evaluations[currentQuestion.id];
              const hasAnswer = answerText.trim().length > 0;
              const hasEvaluation = evaluation && !evaluation.isLoading;

              return (
                <div className="space-y-3">
                  <textarea
                    value={answerText}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your answer..."
                  />
                  
                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleEvaluateAnswer(currentQuestion.id)}
                      disabled={!hasAnswer || (evaluation?.isLoading ?? false)}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {evaluation?.isLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        'Check Answer'
                      )}
                    </button>
                  </div>

                  {/* Feedback */}
                  {hasEvaluation && (
                    <div className={`p-4 rounded-lg border-2 ${
                      evaluation.isCorrect
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {evaluation.isCorrect ? (
                            <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle size={20} className="text-red-600 dark:text-red-400" />
                          )}
                          <span className={`text-sm font-semibold ${
                            evaluation.isCorrect
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-red-700 dark:text-red-300'
                          }`}>
                            {evaluation.isCorrect ? 'Correct!' : 'Incorrect'}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${
                          evaluation.isCorrect
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          {evaluation.score.toFixed(1)} / {currentQuestion.points} points
                        </span>
                      </div>
                      <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800">
                        <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                          {evaluation.feedback}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {currentQuestion.type === 'essay' && (() => {
              const answerText = (answers[currentQuestion.id] as string) || '';
              const evaluation = evaluations[currentQuestion.id];
              const hasAnswer = answerText.trim().length > 0;
              const hasEvaluation = evaluation && !evaluation.isLoading;

              return (
                <div className="space-y-3">
                  <textarea
                    value={answerText}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your detailed answer..."
                  />
                  
                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleEvaluateAnswer(currentQuestion.id)}
                      disabled={!hasAnswer || (evaluation?.isLoading ?? false)}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {evaluation?.isLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        'Check Answer'
                      )}
                    </button>
                  </div>

                  {/* Feedback */}
                  {hasEvaluation && (
                    <div className={`p-4 rounded-lg border-2 ${
                      evaluation.isCorrect
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {evaluation.isCorrect ? (
                            <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle size={20} className="text-red-600 dark:text-red-400" />
                          )}
                          <span className={`text-sm font-semibold ${
                            evaluation.isCorrect
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-red-700 dark:text-red-300'
                          }`}>
                            {evaluation.isCorrect ? 'Passed' : 'Needs Improvement'}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${
                          evaluation.isCorrect
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          {evaluation.score.toFixed(1)} / {currentQuestion.points} points
                        </span>
                      </div>
                      <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800">
                        <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                          {evaluation.feedback}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={!hasPrevious}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex items-center gap-2">
          {hasNext ? (
            <button
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Assessment'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Warning for unanswered questions */}
      {Object.keys(answers).length < questions.length && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <p className="text-xs text-yellow-800 dark:text-yellow-300">
            You have {questions.length - Object.keys(answers).length} unanswered question(s).
          </p>
        </div>
      )}
    </div>
  );
};

export default AssessmentView;

