import React, { useState, useEffect } from 'react';
import Modal from '../../../components/Modal';
import { assessmentApi } from '../assessmentApi';
import { Loader2, Plus, Trash2, Sparkles, Edit2, Save, X, FileText } from 'lucide-react';
import type { Assessment, AssessmentQuestion } from '@/types/server/publishing';

interface AssessmentBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  moduleId: string;
  lessonId: string;
  assessment?: Assessment | null;
  onSaved: () => void;
  lessonTitle?: string;
}

const AssessmentBuilder: React.FC<AssessmentBuilderProps> = ({
  isOpen,
  onClose,
  courseId,
  moduleId,
  lessonId,
  assessment,
  onSaved,
  lessonTitle,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [passingScore, setPassingScore] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState<number | undefined>(undefined);
  const [timeLimit, setTimeLimit] = useState<number | undefined>(undefined);
  const [showResults, setShowResults] = useState(true);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<('multiple_choice' | 'true_false' | 'short_answer' | 'essay')[]>(['multiple_choice', 'true_false', 'short_answer']);

  // Load existing assessment if provided
  useEffect(() => {
    if (isOpen && assessment) {
      setTitle(assessment.title);
      setDescription(assessment.description || '');
      setQuestions(assessment.questions || []);
      setPassingScore(assessment.passingScore || 70);
      setMaxAttempts(assessment.maxAttempts);
      setTimeLimit(assessment.timeLimit);
      setShowResults(assessment.showResults ?? true);
      setRandomizeQuestions(assessment.randomizeQuestions ?? false);
    } else if (isOpen && !assessment) {
      // Reset for new assessment
      // Set title to lesson name if provided, otherwise empty
      setTitle(lessonTitle || '');
      setDescription('');
      setQuestions([]);
      setPassingScore(70);
      setMaxAttempts(undefined);
      setTimeLimit(undefined);
      setShowResults(true);
      setRandomizeQuestions(false);
      setAutoGenerate(false);
      setNumQuestions(5);
      setQuestionTypes(['multiple_choice', 'true_false', 'short_answer']);
    }
  }, [isOpen, assessment, lessonTitle]);

  const handleAutoGenerate = async () => {
    // Warn if there are existing questions
    if (questions.length > 0) {
      const confirm = window.confirm(
        `This will replace all ${questions.length} existing question(s) with newly generated questions. Do you want to continue?`
      );
      if (!confirm) return;
    }

    setIsGenerating(true);
    try {
      const result = await assessmentApi.createAssessment(courseId, moduleId, lessonId, {
        title: title || 'Assessment',
        description,
        autoGenerate: true,
        numQuestions,
        questionTypes,
        passingScore,
        maxAttempts,
        timeLimit,
        showResults,
        randomizeQuestions,
      });

      if (result.assessment) {
        setQuestions(result.assessment.questions);
        setTitle(result.assessment.title);
        setDescription(result.assessment.description || '');
        setAutoGenerate(false);
      }
    } catch (error: any) {
      console.error('Failed to generate questions:', error);
      alert(error.message || 'Failed to generate questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: AssessmentQuestion = {
      id: `q${Date.now()}`,
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1,
      explanation: '',
    };
    setQuestions([...questions, newQuestion]);
    setEditingQuestionId(newQuestion.id);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    if (editingQuestionId === questionId) {
      setEditingQuestionId(null);
    }
  };

  const updateQuestion = (questionId: string, updates: Partial<AssessmentQuestion>) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    ));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter an assessment title');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    // Validate questions
    for (const q of questions) {
      if (!q.question.trim()) {
        alert('All questions must have question text');
        return;
      }
      if (q.type === 'multiple_choice' && (!q.options || q.options.length < 2)) {
        alert('Multiple choice questions must have at least 2 options');
        return;
      }
      if (q.type === 'multiple_choice' && !q.correctAnswer && !q.correctAnswers) {
        alert('Multiple choice questions must have a correct answer');
        return;
      }
      if (q.type === 'true_false' && !q.correctAnswer) {
        alert('True/false questions must have a correct answer');
        return;
      }
      if (q.type === 'short_answer' && !q.correctAnswer) {
        alert('Short answer questions must have a correct answer');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (assessment) {
        // Update existing assessment
        await assessmentApi.updateAssessment(courseId, moduleId, lessonId, assessment.id, {
          title,
          description,
          questions,
          passingScore,
          maxAttempts,
          timeLimit,
          showResults,
          randomizeQuestions,
        });
      } else {
        // Create new assessment
        await assessmentApi.createAssessment(courseId, moduleId, lessonId, {
          title,
          description,
          questions,
          passingScore,
          maxAttempts,
          timeLimit,
          showResults,
          randomizeQuestions,
          autoGenerate: false,
        });
      }
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Failed to save assessment:', error);
      alert(error.message || 'Failed to save assessment');
    } finally {
      setIsSaving(false);
    }
  };

  const renderQuestionEditor = (question: AssessmentQuestion) => {
    const isEditing = editingQuestionId === question.id;

    if (!isEditing) {
      return (
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded">
                  {question.type.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {question.points} point{question.points !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                {question.question || '(No question text)'}
              </p>
              {question.type === 'multiple_choice' && question.options && (
                <ul className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                  {question.options.map((opt, idx) => (
                    <li key={idx} className={opt === question.correctAnswer ? 'font-semibold text-green-600 dark:text-green-400' : ''}>
                      {String.fromCharCode(65 + idx)}. {opt}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingQuestionId(question.id)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => removeQuestion(question.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 border-2 border-indigo-300 dark:border-indigo-600 rounded-lg bg-indigo-50/30 dark:bg-indigo-900/10">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <select
                value={question.type}
                onChange={(e) => updateQuestion(question.id, { 
                  type: e.target.value as any,
                  options: e.target.value === 'multiple_choice' ? ['', '', '', ''] : undefined,
                  correctAnswer: e.target.value === 'true_false' ? 'true' : '',
                })}
                className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True/False</option>
                <option value="short_answer">Short Answer</option>
                <option value="essay">Essay</option>
              </select>
              <input
                type="number"
                min="1"
                max="10"
                value={question.points}
                onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value) || 1 })}
                className="w-20 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                placeholder="Points"
              />
            </div>
            <button
              onClick={() => setEditingQuestionId(null)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Question
            </label>
            <textarea
              value={question.question}
              onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
              rows={2}
              className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter question text"
            />
          </div>

          {question.type === 'multiple_choice' && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Options (mark correct answer)
              </label>
              {question.options?.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-6">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...(question.options || [])];
                      newOptions[idx] = e.target.value;
                      updateQuestion(question.id, { options: newOptions });
                    }}
                    className="flex-1 text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  />
                  <input
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={question.correctAnswer === opt}
                    onChange={() => updateQuestion(question.id, { correctAnswer: opt })}
                    className="w-4 h-4 text-indigo-600"
                  />
                </div>
              ))}
            </div>
          )}

          {question.type === 'true_false' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Correct Answer
              </label>
              <select
                value={question.correctAnswer || 'true'}
                onChange={(e) => updateQuestion(question.id, { correctAnswer: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          )}

          {question.type === 'short_answer' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Correct Answer
              </label>
              <input
                type="text"
                value={question.correctAnswer || ''}
                onChange={(e) => updateQuestion(question.id, { correctAnswer: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                placeholder="Enter correct answer"
              />
            </div>
          )}

          {question.type === 'essay' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Key Points (for evaluation)
              </label>
              <textarea
                value={question.correctAnswer || ''}
                onChange={(e) => updateQuestion(question.id, { correctAnswer: e.target.value })}
                rows={3}
                className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                placeholder="Enter key points that should be covered in the answer"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Explanation (optional)
            </label>
            <textarea
              value={question.explanation || ''}
              onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
              rows={2}
              className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              placeholder="Explanation shown after answering"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={assessment ? 'Edit Assessment' : 'Create Assessment'} size="extra-large">
      <div className="space-y-6">
        {/* Lesson Name Display */}
        {lessonTitle && (
          <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <FileText className="text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" size={20} />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {lessonTitle}
              </h3>
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assessment Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter assessment title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Special Instructions for LLM
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter special instructions for the LLM when generating questions (e.g., focus on specific topics, emphasize certain concepts, etc.)"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              These instructions will be passed to the LLM when auto-generating questions to guide question creation.
            </p>
          </div>
        </div>

        {/* Auto-Generate Section - Always Visible */}
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-start gap-3">
            <Sparkles className="text-indigo-600 dark:text-indigo-400 mt-0.5" size={20} />
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Auto-Generate Questions
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Use AI to automatically generate assessment questions from the lesson content.
                  {questions.length > 0 && (
                    <span className="block mt-1 text-orange-600 dark:text-orange-400 font-medium">
                      ⚠️ Generating new questions will replace all existing questions.
                    </span>
                  )}
                </p>
              </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Number of Questions
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Question Types
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['multiple_choice', 'true_false', 'short_answer', 'essay'].map(type => (
                        <label key={type} className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={questionTypes.includes(type as any)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setQuestionTypes([...questionTypes, type as any]);
                              } else {
                                setQuestionTypes(questionTypes.filter(t => t !== type));
                              }
                            }}
                            className="w-3 h-3"
                          />
                          <span className="text-gray-700 dark:text-gray-300">
                            {type.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleAutoGenerate}
                  disabled={isGenerating || questionTypes.length === 0}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      {questions.length > 0 ? 'Regenerate Questions' : 'Generate Questions'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

        {/* Questions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Questions ({questions.length})
            </h3>
            <button
              onClick={addQuestion}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
            >
              <Plus size={16} />
              Add Question
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                No questions yet. Add questions manually or use auto-generate.
              </div>
            ) : (
              questions.map((q) => (
                <div key={q.id}>
                  {renderQuestionEditor(q)}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Settings</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Passing Score (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Attempts (leave empty for unlimited)
              </label>
              <input
                type="number"
                min="1"
                value={maxAttempts || ''}
                onChange={(e) => setMaxAttempts(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                placeholder="Unlimited"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time Limit (minutes, leave empty for no limit)
              </label>
              <input
                type="number"
                min="1"
                value={timeLimit || ''}
                onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                placeholder="No limit"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showResults}
                onChange={(e) => setShowResults(e.target.checked)}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Show results immediately after submission
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={randomizeQuestions}
                onChange={(e) => setRandomizeQuestions(e.target.checked)}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Randomize question order
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || questions.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            {assessment ? 'Update Assessment' : 'Create Assessment'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AssessmentBuilder;

