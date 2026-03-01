/**
 * MentorGoalForm Component
 * 
 * Multi-step form for creating learning goals and knowledge graphs.
 * Uses only knowledge-graph hooks (no legacy APIs).
 */

import React, { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useGenerateGoals } from '../../../features/knowledge-graph/hooks/useGenerateGoals';
import { useSaveGraph } from '../../../features/knowledge-graph/hooks/useKnowledgeGraphRest';
import { useProgressiveExpand } from '../../../features/knowledge-graph/hooks/useProgressiveExpand';
import { setGraph, setCurrentGraphId, selectGraphById } from '../../../features/knowledge-graph/knowledgeGraphSlice';
import type { GenerateGoalsRequest, QuestionAnswerInput, ProgressiveExpandRequest } from '../../../features/knowledge-graph/api/types';
import type { NodeBasedKnowledgeGraph } from '../../../features/knowledge-graph/types';
import type { GoalQuestionAnswer } from '../../learning/goalApi';
import { generateUUID } from '../../../utils/uuid';
import { Loader2 } from 'lucide-react';
import { AnchorStep } from './MentorGoalFormSteps/AnchorStep';
import { DetailsStep } from './MentorGoalFormSteps/DetailsStep';
import { QuestionsStep } from './MentorGoalFormSteps/QuestionsStep';
import { LoadingStep } from './MentorGoalFormSteps/LoadingStep';
import { ReviewStep } from './MentorGoalFormSteps/ReviewStep';
import { LevelSelectionStep } from './MentorGoalFormSteps/LevelSelectionStep';
import MentorFirstLayerLoader from './MentorFirstLayerLoader';
import { useUpdateNodeProperties } from '../../knowledge-graph/hooks/useUpdateNodeProperties';

interface MentorGoalFormProps {
  onComplete: (result: { goalId: string; graphId: string }) => void;
  onCancel?: () => void;
}

type FormStep = 'anchor' | 'details' | 'questions' | 'loading' | 'review' | 'level-selection' | 'firstLayer';
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export const MentorGoalForm: React.FC<MentorGoalFormProps> = ({ onComplete, onCancel }) => {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState<FormStep>('anchor');
  const [anchorAnswer, setAnchorAnswer] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [questionAnswers, setQuestionAnswers] = useState<GoalQuestionAnswer[]>([]);
  const [createdGoal, setCreatedGoal] = useState<{ goalId: string; graphId: string } | null>(null);
  const [graphId, setGraphId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [firstLayerStreamingContent, setFirstLayerStreamingContent] = useState('');
  const [updatedGraphAfterExpand, setUpdatedGraphAfterExpand] = useState<NodeBasedKnowledgeGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>('beginner');

  // Hook to save/create graph (from knowledge-graph REST API hooks)
  const { saveGraph, loading: isCreatingGraph } = useSaveGraph();

  // Hook to generate goals (from knowledge-graph operations hooks)
  // This hook requires an existing graphId, so we create the graph first
  const { generate, isLoading: isGeneratingGoals, streaming } = useGenerateGoals(graphId || '');

  // Hook for progressive expand (first layer generation)
  const { expand, isLoading: isExpandingFirstLayer } = useProgressiveExpand(graphId || '');

  // Hook for updating node properties (to store assessedLevel)
  const { updateProperties, updating: isUpdatingLevel } = useUpdateNodeProperties(graphId || '');

  // Get current graph from Redux for first layer loader
  const currentGraph = useAppSelector((state) => 
    graphId ? selectGraphById(state, graphId) : null
  );

  // Helper: Create empty graph first
  const createEmptyGraph = useCallback(async (): Promise<string> => {
    const newGraphId = generateUUID();

    // Create a minimal empty graph structure
    const emptyGraph: NodeBasedKnowledgeGraph = {
      id: newGraphId,
      seedConceptId: '', // Will be set after goal generation
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: {},
      relationships: [],
      nodeTypes: {
        Graph: [],
        Concept: [],
        Layer: [],
        LearningGoal: [],
        Milestone: [],
        PracticeExercise: [],
        Lesson: [],
        ConceptMetadata: [],
        GraphMetadata: [],
        FlashCard: [],
      },
    };

    const savedGraph = await saveGraph(newGraphId, emptyGraph);
    if (!savedGraph) {
      throw new Error('Failed to create graph');
    }

    // Store graph in Redux
    dispatch(setGraph(savedGraph));
    dispatch(setCurrentGraphId(savedGraph.id));
    setGraphId(savedGraph.id);

    return savedGraph.id;
  }, [saveGraph, dispatch]);

  // Step 1: Anchor answer submission
  const handleAnchorSubmit = () => {
    if (!anchorAnswer.trim()) return;
    setStep('details');
  };

  // Step 2: Details step - proceed to questionnaire
  const handleQuestionnaireClick = () => {
    setStep('questions');
  };

  // Helper: Extract goalId from result graph
  const extractGoalId = useCallback((graph: any): string => {
    if (graph?.nodeTypes?.LearningGoal?.length > 0) {
      return graph.nodeTypes.LearningGoal[0];
    }
    throw new Error('Failed to create goal - no LearningGoal node found');
  }, []);

  // Step 3: Manual goal submission (with optional description)
  const handleManualGoalSubmit = useCallback(async () => {
    try {
      // Validate anchorAnswer is present
      if (!anchorAnswer || !anchorAnswer.trim()) {
        setError('Anchor answer is required');
        setStep('anchor');
        return;
      }

      setStep('loading');
      setStreamingContent('');
      setError(null);

      // Step 1: Create empty graph
      const newGraphId = await createEmptyGraph();

      // Step 2: Generate goal using useGenerateGoals hook
      // Pass the newly created graphId to override the hook's graphId
      // Include goalDescription if provided
      const trimmedAnchorAnswer = anchorAnswer.trim();
      const trimmedGoalDescription = goalDescription.trim();
      
      const generateRequest: GenerateGoalsRequest = {
        anchorAnswer: trimmedAnchorAnswer,
        questionAnswers: [],
        manualGoal: trimmedGoalDescription ? {
          title: trimmedAnchorAnswer, // Use anchor answer as title
          description: trimmedGoalDescription,
        } : undefined,
      };

      // Use a promise to wait for onDone callback
      const goalIdPromise = new Promise<string>((resolve, reject) => {
        generate(
          generateRequest,
          {
            stream: true,
            graphId: newGraphId, // Pass the newly created graphId
            onChunk: (chunk: string) => {
              setStreamingContent((prev) => prev + chunk);
            },
            onDone: (finalResult) => {
              try {
                // Store graph in Redux after goal generation
                dispatch(setGraph(finalResult.graph));
                const goalId = extractGoalId(finalResult.graph);
                resolve(goalId);
              } catch (err) {
                reject(err instanceof Error ? err : new Error('Failed to extract goal ID'));
              }
            },
          }
        ).catch(reject);
      });

      const goalId = await goalIdPromise;

      setCreatedGoal({
        goalId,
        graphId: newGraphId,
      });

      setStep('review');
    } catch (err) {
      console.error('Failed to create goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to create goal');
      setStep('details'); // Go back to details step on error
    }
  }, [anchorAnswer, goalDescription, createEmptyGraph, generate, extractGoalId]);

  // Step 2: Details step - manual submit (with description)
  // Defined after handleManualGoalSubmit to avoid hoisting issues
  const handleDetailsManualSubmit = useCallback(() => {
    handleManualGoalSubmit();
  }, [handleManualGoalSubmit]);

  // Step 4: Form submission (after answering questions)
  const handleFormSubmit = useCallback(
    async (answers: GoalQuestionAnswer[]) => {
      try {
        setStep('loading');
        setQuestionAnswers(answers);
        setStreamingContent('');
        setError(null);

        // Step 1: Create empty graph
        const newGraphId = await createEmptyGraph();

        // Step 2: Generate goal using useGenerateGoals hook
        // Pass the newly created graphId to override the hook's graphId
        const generateRequest: GenerateGoalsRequest = {
          anchorAnswer: anchorAnswer.trim(),
          questionAnswers: answers.map((a): QuestionAnswerInput => {
            if (Array.isArray(a.answer)) {
              return {
                questionId: a.questionId,
                answers: a.answer,
                skipped: a.skipped || false,
                isOther: a.isOther || false,
                otherValue: a.otherValue,
              };
            } else {
              return {
                questionId: a.questionId,
                answer: a.answer || undefined,
                skipped: a.skipped || false,
                isOther: a.isOther || false,
                otherValue: a.otherValue,
              };
            }
          }),
        };

        // Use a promise to wait for onDone callback
        const goalIdPromise = new Promise<string>((resolve, reject) => {
          generate(
            generateRequest,
            {
              stream: true,
              graphId: newGraphId, // Pass the newly created graphId
              onChunk: (chunk: string) => {
                setStreamingContent((prev) => prev + chunk);
              },
              onDone: (finalResult) => {
                try {
                  // Store graph in Redux after goal generation
                  dispatch(setGraph(finalResult.graph));
                  const goalId = extractGoalId(finalResult.graph);
                  resolve(goalId);
                } catch (err) {
                  reject(err instanceof Error ? err : new Error('Failed to extract goal ID'));
                }
              },
            }
          ).catch(reject);
        });

        const goalId = await goalIdPromise;

        setCreatedGoal({
          goalId,
          graphId: newGraphId,
        });

        setStep('review');
      } catch (err) {
        console.error('Failed to create goal:', err);
        setError(err instanceof Error ? err.message : 'Failed to create goal');
        setStep('questions'); // Go back to questions on error
      }
    },
    [anchorAnswer, createEmptyGraph, generate, extractGoalId]
  );

  // Step 5: Review and complete - proceed to level selection
  const handleReviewComplete = useCallback(async () => {
    if (!createdGoal || !graphId) {
      return;
    }
    // Proceed to level selection step
    setStep('level-selection');
  }, [createdGoal, graphId]);

  // Step 6: Level selection - store level and trigger first layer generation
  const handleLevelSelect = useCallback(async (level: ExperienceLevel) => {
    if (!createdGoal || !graphId || !currentGraph) {
      return;
    }

    try {
      setSelectedLevel(level);
      setError(null);

      // Find the LearningGoal node ID
      const learningGoalNodeId = currentGraph.nodeTypes?.LearningGoal?.[0];
      
      if (learningGoalNodeId) {
        // Update the LearningGoal node with the selected level
        await updateProperties(learningGoalNodeId, {
          assessedLevel: level,
        });
      }

      // Now proceed to first layer generation
      setStep('firstLayer');
      setFirstLayerStreamingContent('');

      // Check if seed concept exists
      if (!currentGraph.seedConceptId && (!currentGraph.nodeTypes?.Concept || currentGraph.nodeTypes.Concept.length === 0)) {
        throw new Error('No seed concept found in graph');
      }

      // Call progressive expand with numConcepts: 10
      const expandRequest: ProgressiveExpandRequest = {
        numConcepts: 10,
      };

      // Use a promise to wait for onDone callback
      const expandPromise = new Promise<NodeBasedKnowledgeGraph>((resolve, reject) => {
        expand(
          expandRequest,
          {
            stream: true,
            onChunk: (chunk: string) => {
              setFirstLayerStreamingContent((prev) => prev + chunk);
            },
            onDone: (finalResult) => {
              // Update graph in Redux
              dispatch(setGraph(finalResult.graph));
              console.log('finalResult.graph', finalResult.graph);
              setUpdatedGraphAfterExpand(finalResult.graph);
              resolve(finalResult.graph);
            },
          }
        ).catch(reject);
      });

      await expandPromise;

      // After first layer is complete, MentorFirstLayerLoader will call onComplete
      // which will navigate to the concept detail page
    } catch (err) {
      console.error('Failed to process level selection:', err);
      setError(err instanceof Error ? err.message : 'Failed to process level selection');
      setStep('level-selection'); // Go back to level selection on error
    }
  }, [createdGoal, graphId, currentGraph, expand, dispatch, updateProperties]);

  // Handle first layer completion - navigate to concept detail page
  const handleFirstLayerComplete = useCallback(() => {
    if (createdGoal && graphId) {
      // Find the seed concept to navigate to its detail page
      const graph = updatedGraphAfterExpand || currentGraph;
      if (graph) {
        const seedConceptId = graph.seedConceptId || (graph.nodeTypes?.Concept?.[0]);
        if (seedConceptId) {
          // Navigate to concept detail page
          onComplete(createdGoal);
        } else {
          // Fallback: navigate to concept list
          onComplete(createdGoal);
        }
      } else {
        // Fallback: navigate to concept list
        onComplete(createdGoal);
      }
    }
  }, [createdGoal, graphId, updatedGraphAfterExpand, currentGraph, onComplete]);

  const isLoading = isCreatingGraph || isGeneratingGoals || isExpandingFirstLayer || isUpdatingLevel;

  // Show error if any
  if (error && step !== 'loading') {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setStep('anchor');
          }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Start Over
        </button>
      </div>
    );
  }

  // Render current step
  switch (step) {
    case 'anchor':
      return (
        <AnchorStep
          anchorAnswer={anchorAnswer}
          onAnchorAnswerChange={setAnchorAnswer}
          onSubmit={handleAnchorSubmit}
          onCancel={onCancel}
        />
      );
    case 'details':
      return (
        <DetailsStep
          goalDescription={goalDescription}
          onGoalDescriptionChange={setGoalDescription}
          onManualSubmit={handleDetailsManualSubmit}
          onQuestionnaireClick={handleQuestionnaireClick}
          onBack={() => setStep('anchor')}
        />
      );
    case 'questions':
      return (
        <QuestionsStep
          anchorAnswer={anchorAnswer}
          onSubmit={handleFormSubmit}
          onBack={() => setStep('details')}
        />
      );
    case 'loading':
      return (
        <LoadingStep
          anchorAnswer={anchorAnswer}
          streamingContent={streamingContent}
          isLoading={isLoading}
        />
      );
    case 'review':
      return (
        <ReviewStep
          goalId={createdGoal?.goalId || ''}
          graphId={createdGoal?.graphId || ''}
          onComplete={handleReviewComplete}
          onBack={() => setStep('loading')}
        />
      );
    case 'level-selection':
      return (
        <LevelSelectionStep
          onSelectLevel={handleLevelSelect}
          onBack={() => setStep('review')}
          isLoading={isUpdatingLevel}
        />
      );
    case 'firstLayer':
      if (!graphId || !currentGraph) {
        return (
          <div className="w-full max-w-2xl mx-auto p-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading graph...</span>
            </div>
          </div>
        );
      }
      return (
        <MentorFirstLayerLoader
          graphId={graphId}
          graph={currentGraph}
          streamContent={firstLayerStreamingContent}
          isLoading={isExpandingFirstLayer}
          onComplete={handleFirstLayerComplete}
        />
      );
    default:
      return null;
  }
};

