import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useGraphSummary, useConceptsByLayer, useGetGraph, useMindMapStructure } from '../../knowledge-graph/hooks';
import { setCurrentGraphId, selectGraphById } from '../../knowledge-graph/knowledgeGraphSlice';
import { useProgressiveExpand } from '../../knowledge-graph/hooks/useProgressiveExpand';
import { useExplainConcept } from '../../knowledge-graph/hooks/useExplainConcept';
import { useAnswerQuestion } from '../../knowledge-graph/hooks/useAnswerQuestion';
import { useGenerateGoals } from '../../knowledge-graph/hooks/useGenerateGoals';
import { useGenerateLayerPractice } from '../../knowledge-graph/hooks/useGenerateLayerPractice';
import { useCustomOperation } from '../../knowledge-graph/hooks/useCustomOperation';
import { useUpdateNodeProperties } from '../../knowledge-graph/hooks/useUpdateNodeProperties';
import {
  useCourseSettings,
  usePublishCourseToGraph,
  useUnpublishCourseFromGraph,
  usePublishedModules,
  useModuleLessons,
  usePublishModule,
  useUnpublishModule,
  usePublishLesson,
  useUnpublishLesson,
  type CoursePublishSettings,
} from '../../knowledge-graph/hooks';
import type { Concept } from '../../concepts/types';
import type { ConceptDisplay } from '../../knowledge-graph/api/types';
import type { LearningGoal } from '../../learning/goalApi';
import type { OperationType, OperationResult } from '../hooks/useMentorOperations';
import { MentorConceptListPage, type ChatMessage } from '../../../components/pages/MentorConceptListPage';
import type { ConceptLayer, GraphNode, GraphEdge } from '../../../components/templates/KnowledgeGraphTemplate';
import { ConceptCardProps } from '../../../components/organisms/ConceptCard';
import { Operation } from '../../../components/organisms/OperationPanel';
import { useAuthContext } from '../../auth/AuthContext';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { Sparkles, Zap, Target, BookOpen } from 'lucide-react';
import PublishCourseDialog from '../components/PublishCourseDialog';
import ManageCourseDialog from '../components/ManageCourseDialog';
import SelectModulesDialog from '../components/SelectModulesDialog';
import SelectLessonsDialog from '../components/SelectLessonsDialog';
import type { LessonWithPublishState, ModuleInfo } from '../components/SelectLessonsDialog';

// Helper to convert ConceptDisplay to Concept for compatibility
const convertConceptDisplayToConcept = (display: ConceptDisplay): Concept => {
  return {
    id: display.id,
    name: display.name,
    description: display.description,
    layer: display.layer,
    isSeed: display.isSeed,
    sequence: display.sequence,
    parents: display.parents,
    children: display.children,
    prerequisites: display.prerequisites,
    // Extract optional fields from properties
    lesson: display.properties.lesson,
    goal: display.properties.goal,
    difficulty: display.properties.difficulty,
    focus: display.properties.focus,
    flash: display.properties.flash,
    questions: display.properties.questions,
    notes: display.properties.notes,
    userProgress: display.properties.userProgress,
  };
};

/**
 * Container component for MentorConceptListPage
 * Handles data fetching, Redux state, and business logic
 * Uses DashboardTemplate for layout (Option 1 - templates include Header/Sidebar)
 * 
 * Phase 2: Replaced useMentorOperations with knowledge-graph hooks
 */
const MentorConceptListPageContainer: React.FC = () => {
  const { graphId } = useParams<{ graphId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthContext();
  
  // Navigation configuration for template
  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

  // Set current graph ID on mount
  useEffect(() => {
    if (graphId) {
      dispatch(setCurrentGraphId(graphId));
    }
  }, [graphId, dispatch]);

  // Data fetching hooks - ONLY from knowledge-graph
  const graphSummary = useGraphSummary(graphId || '');
  const conceptsData = useConceptsByLayer(graphId || '', {
    includeRelationships: true,
    groupByLayer: true, // Group concepts by layer for MentorConceptList
  });
  // Note: KnowledgeGraphTemplate builds mindmap tree internally from goal and layers
  // mindMapData hook kept for potential future use but not currently needed
  const mindMapData = useMindMapStructure(graphId || '', {
    expandAll: false,
  });
  const graph = useAppSelector((state) => selectGraphById(state, graphId || ''));
  const { getGraph, loading: isLoadingGraph } = useGetGraph();

  // Load graph if not in Redux
  useEffect(() => {
    if (graphId && !graph && !isLoadingGraph) {
      getGraph(graphId, { storeInRedux: true }).catch((error) => {
        console.error('Failed to load graph:', error);
      });
    }
  }, [graphId, graph, isLoadingGraph, getGraph]);

  // Convert data once
  const concepts = useMemo((): Concept[] => {
    return conceptsData.concepts.map(convertConceptDisplayToConcept);
  }, [conceptsData.concepts]);

  const seedConcept = useMemo(() => {
    return concepts.find((c) => c.isSeed) || concepts[0] || null;
  }, [concepts]);

  const conceptMap = useMemo(() => {
    const map = new Map<string, Concept>();
    concepts.forEach((concept) => {
      map.set(concept.name, concept);
    });
    return map;
  }, [concepts]);

  // Extract learning goal from graphSummary
  const learningGoal = useMemo<LearningGoal | null>(() => {
    if (!graphSummary.graphSummary?.goal) return null;
    const goal = graphSummary.graphSummary.goal;
    return {
      id: goal.id,
      graphId: graphId || '',
      title: goal.title,
      description: goal.description,
      type: goal.type || 'skill',
      target: goal.target || '',
      estimatedTime: (goal as any).estimatedTime || null,
      milestones: graphSummary.graphSummary.milestones || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }, [graphSummary.graphSummary, graphId]);

  // Knowledge-graph operation hooks - ONLY from knowledge-graph feature
  const { expand, isLoading: isExpanding } = useProgressiveExpand(graphId || '');
  const { explain, isLoading: isExplaining } = useExplainConcept(graphId || '');
  const { answer, isLoading: isAnswering } = useAnswerQuestion(graphId || '');
  const { generate: generateGoals, isLoading: isGeneratingGoals } = useGenerateGoals(graphId || '');
  const { generate: generatePractice, isLoading: isGeneratingPractice } = useGenerateLayerPractice(graphId || '');
  const { execute: customOp, isLoading: isCustomOp } = useCustomOperation(graphId || '');
  
  // Hook for updating goal/milestone node properties
  const { updateProperties, updating: isUpdatingNodeProps } = useUpdateNodeProperties(graphId || '');

  // AI Assistant state
  const [llmMessages, setLlmMessages] = useState<ChatMessage[]>([]);
  const [isLLMLoading, setIsLLMLoading] = useState(false);
  const streamingContentRef = useRef<string>('');

  // Note: KnowledgeGraphTemplate builds mindmap tree internally from goal and layers
  // No need to transform mindmap data separately

  // ===========================================================================
  // Publishing - Graph-Based Hooks
  // ===========================================================================
  
  // Course settings for this graph
  const { data: courseSettings, isLoading: isLoadingCourseSettings } = useCourseSettings(graphId);
  
  // Publishing mutation hooks
  const publishCourseMutation = usePublishCourseToGraph();
  const unpublishCourseMutation = useUnpublishCourseFromGraph();
  const publishModuleMutation = usePublishModule();
  const unpublishModuleMutation = useUnpublishModule();
  const publishLessonMutation = usePublishLesson();
  const unpublishLessonMutation = useUnpublishLesson();

  // Publishing UI state
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showManageCourseDialog, setShowManageCourseDialog] = useState(false);
  const [showModulesDialog, setShowModulesDialog] = useState(false);
  const [showLessonsDialog, setShowLessonsDialog] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [pendingModuleIds, setPendingModuleIds] = useState<string[]>([]);
  
  // Track local publish state for UI
  const [publishedModuleIds, setPublishedModuleIds] = useState<Set<string>>(new Set());
  const [publishedLessonIds, setPublishedLessonIds] = useState<Set<string>>(new Set());
  
  // Fetch modules when modules dialog is open
  const { data: modulesData = [], isLoading: isLoadingModules } = usePublishedModules(
    showModulesDialog && graphId ? graphId : undefined
  );
  
  // Fetch lessons when lessons dialog is open
  const { data: lessonsData = [], isLoading: isLoadingLessons } = useModuleLessons(
    showLessonsDialog && graphId ? graphId : undefined,
    showLessonsDialog ? selectedModuleId ?? undefined : undefined
  );
  
  // Get module info for lessons dialog
  const selectedModuleInfo: ModuleInfo | null = useMemo(() => {
    if (!selectedModuleId || !modulesData.length) return null;
    const module = modulesData.find(m => m.id === selectedModuleId);
    if (!module) return null;
    return {
      id: module.id,
      name: module.name,
      description: module.description,
      layerNumber: module.layerNumber,
    };
  }, [selectedModuleId, modulesData]);
  
  // Convert lessons to format with publish state
  const lessonsWithPublishState: LessonWithPublishState[] = useMemo(() => {
    return lessonsData.map(lesson => ({
      ...lesson,
      isPublished: publishedLessonIds.has(lesson.id),
    }));
  }, [lessonsData, publishedLessonIds]);

  // Check if course is published
  const isPublished = courseSettings?.isPublished ?? false;

  // Publishing flow handlers
  const handlePublishCourse = useCallback(async (settings: CoursePublishSettings) => {
    if (!graphId) return;
    
    try {
      await publishCourseMutation.mutateAsync({ graphId, settings });
      setShowPublishDialog(false);
      setShowModulesDialog(true);
    } catch (error: any) {
      console.error('Failed to publish course:', error);
      alert(error.message || 'Failed to publish course');
    }
  }, [graphId, publishCourseMutation]);

  const handleCourseUnpublished = useCallback(() => {
    setShowManageCourseDialog(false);
  }, []);

  const handlePublishModules = useCallback(async (selectedIds: string[], deselectedIds: string[]) => {
    if (!graphId) return;
    
    try {
      // Publish selected modules
      for (const layerId of selectedIds) {
        if (!publishedModuleIds.has(layerId)) {
          await publishModuleMutation.mutateAsync({ graphId, layerId });
        }
      }
      
      // Unpublish deselected modules
      for (const layerId of deselectedIds) {
        await unpublishModuleMutation.mutateAsync({ graphId, layerId });
      }
      
      setPublishedModuleIds(new Set(selectedIds));
      setShowModulesDialog(false);
      
      if (selectedIds.length > 0) {
        setPendingModuleIds(selectedIds);
        setSelectedModuleId(selectedIds[0]);
        setPublishedLessonIds(new Set());
        setShowLessonsDialog(true);
      }
    } catch (error: any) {
      console.error('Failed to publish modules:', error);
      alert(error.message || 'Failed to publish modules');
    }
  }, [graphId, publishModuleMutation, unpublishModuleMutation, publishedModuleIds]);

  const handlePublishLessons = useCallback(async (selectedIds: string[], deselectedIds: string[]) => {
    if (!graphId) return;
    
    try {
      // Publish selected lessons
      for (const conceptId of selectedIds) {
        if (!publishedLessonIds.has(conceptId)) {
          await publishLessonMutation.mutateAsync({ graphId, conceptId });
        }
      }
      
      // Unpublish deselected lessons
      for (const conceptId of deselectedIds) {
        await unpublishLessonMutation.mutateAsync({ graphId, conceptId });
      }
      
      setPublishedLessonIds(prev => {
        const newSet = new Set(prev);
        selectedIds.forEach(id => newSet.add(id));
        deselectedIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      // Move to next module or close
      if (pendingModuleIds.length > 1) {
        const remaining = pendingModuleIds.slice(1);
        setPendingModuleIds(remaining);
        setSelectedModuleId(remaining[0]);
        setPublishedLessonIds(new Set());
      } else {
        setSelectedModuleId(null);
        setPendingModuleIds([]);
        setShowLessonsDialog(false);
      }
    } catch (error: any) {
      console.error('Failed to publish lessons:', error);
      alert(error.message || 'Failed to publish lessons');
    }
  }, [graphId, publishLessonMutation, unpublishLessonMutation, publishedLessonIds, pendingModuleIds]);

  // Operation handler - maps old operations to new knowledge-graph hooks
  const handleOperation = useCallback(async (
    operation: OperationType,
    concept: Concept | Concept[],
    ...args: any[]
  ): Promise<OperationResult> => {
    if (!graphId) {
      throw new Error('Graph ID is required');
    }

    // Extract streaming callback if provided as last argument
    const lastArg = args[args.length - 1];
    const onStream = typeof lastArg === 'function' ? lastArg : undefined;
    const actualArgs = typeof lastArg === 'function' ? args.slice(0, -1) : args;

    const conceptsArray = Array.isArray(concept) ? concept : [concept];
    const primaryConcept = conceptsArray[0];
    const conceptId = primaryConcept.id || primaryConcept.name;

    let result: any = { addedConcepts: [], diff: null, prompt: undefined };

    try {
      switch (operation) {
        case 'expand':
        case 'progressiveExpandSingle': {
          // Progressive expand from a concept
          const response = await expand(
            { numConcepts: 10 }, // Generate 10 concepts per layer
            {
              stream: !!onStream,
              onChunk: onStream,
            }
          );
          result.prompt = (response as any).prompt;
          // Note: New API doesn't return addedConcepts directly - they're in the graph mutations
          break;
        }

        case 'progressiveExpandMultipleFromText': {
          // Expand multiple levels from seed concept
          const response = await expand(
            { numConcepts: 10 }, // Generate more concepts for multiple levels
            {
              stream: !!onStream,
              onChunk: onStream,
            }
          );
          result.prompt = (response as any).prompt;
          break;
        }

        case 'explain': {
          const response = await explain(
            { targetNodeId: conceptId },
            {
              stream: !!onStream,
              onChunk: onStream,
            }
          );
          result.prompt = (response as any).prompt;
          break;
        }

        case 'custom': {
          const prompt = actualArgs[0];
          if (!prompt) throw new Error('Prompt required for custom operation');
          
          const targetNodeIds = conceptsArray.map(c => c.id || c.name);
          const response = await customOp(
            { targetNodeIds, userPrompt: prompt },
            {
              stream: !!onStream,
              onChunk: onStream,
            }
          );
          result.prompt = (response as any).prompt;
          break;
        }

        case 'generateNextConcept': {
          // Use progressive expand to generate next concept
          const response = await expand(
            { numConcepts: 1 },
            {
              stream: !!onStream,
              onChunk: onStream,
            }
          );
          result.prompt = (response as any).prompt;
          break;
        }

        // Note: generateLayerPractice and generateGoals are not in OperationType enum
        // They can be called via custom operation if needed

        // Operations not yet supported by knowledge-graph API
        case 'synthesize':
        case 'explore':
        case 'tracePath':
        case 'deriveParents':
        case 'deriveSummary':
        case 'generateFlashCards':
          console.warn(`Operation ${operation} not yet implemented in knowledge-graph API`);
          throw new Error(`Operation ${operation} is not yet supported. Please use custom operation instead.`);

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Refetch data after operation completes
      graphSummary.refetch();
      conceptsData.refetch();
      mindMapData.refetch();

      return result;
    } catch (error) {
      console.error(`Error executing ${operation}:`, error);
      throw error;
    }
  }, [
    graphId,
    expand,
    explain,
    customOp,
    generatePractice,
    generateGoals,
    graphSummary,
    conceptsData,
  ]);

  // Navigation handlers
  const handleSelectConcept = useCallback((concept: Concept) => {
    if (graphId) {
      const { getConceptRouteId } = require('../../concepts/utils/graphHelpers');
      navigate(`/mentor/${graphId}/concept/${getConceptRouteId(concept)}`);
    }
  }, [graphId, navigate]);

  const handleBack = useCallback(() => {
    navigate('/mentor');
  }, [navigate]);

  // Transform groupedByLayer to ConceptLayer[] format for KnowledgeGraphTemplate
  const layers: ConceptLayer[] = useMemo(() => {
    if (!conceptsData.groupedByLayer) return [];
    
    // Layer color palette
    const layerColors = [
      '#8b5cf6', // L0/L1 - Purple
      '#3b82f6', // L2 - Blue
      '#10b981', // L3 - Green
      '#f59e0b', // L4 - Amber
      '#ef4444', // L5 - Red
      '#ec4899', // L6 - Pink
    ];

    return Object.entries(conceptsData.groupedByLayer)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([layerStr, conceptDisplays]) => {
        const layerNum = Number(layerStr);
        const concepts: ConceptCardProps[] = conceptDisplays.map(display => {
          const concept = convertConceptDisplayToConcept(display);
          return {
            id: concept.id,
            name: concept.name,
            description: concept.description,
            layer: concept.layer,
            prerequisites: concept.prerequisites,
            parents: concept.parents,
            progress: concept.userProgress?.masteryLevel ? (concept.userProgress.masteryLevel / 3) * 100 : undefined,
            onClick: () => handleSelectConcept(concept),
          };
        });

        return {
          id: `L${layerNum}`,
          name: `Layer ${layerNum}`,
          color: layerColors[layerNum % layerColors.length] || '#6b7280',
          concepts,
        };
      });
  }, [conceptsData.groupedByLayer, handleSelectConcept]);

  // Transform graph nodes and relationships to graphNodes and graphEdges for ForceGraph
  // Include ALL node types and ALL relationships from the graph
  const { graphNodes, graphEdges } = useMemo(() => {
    if (!graph || !graph.nodes || !graph.relationships) {
      return { graphNodes: [], graphEdges: [] };
    }
    
    // Build graphNodes - include ALL nodes from the graph
    const nodes: GraphNode[] = Object.values(graph.nodes).map(node => ({
      id: node.id,
      label: node.properties?.name || node.id,
      layer: `L${node.properties?.layer || 0}`,
      // Store node type and full node data for JSON viewer
      nodeType: node.type,
      nodeData: node,
    }));
    
    // Build graphEdges - include ALL relationships from the graph
    const nodeIdSet = new Set(nodes.map(n => n.id));
    const edges: GraphEdge[] = graph.relationships
      .filter(rel => nodeIdSet.has(rel.source) && nodeIdSet.has(rel.target))
      .map(rel => ({
        source: rel.source,
        target: rel.target,
        label: rel.type,
        relationshipData: rel,
      }));
    
    return { graphNodes: nodes, graphEdges: edges };
  }, [graph]);

  // Transform goal for template with full milestone data
  const templateGoal = useMemo(() => {
    if (!learningGoal) return undefined;
    return {
      id: learningGoal.id,
      text: learningGoal.title,
      description: learningGoal.description,
      milestones: learningGoal.milestones?.map(m => ({
        id: m.id,
        title: m.title, // Full title for milestone header
        text: m.title, // For backward compatibility with GoalDisplay.Milestone
        description: m.description,
        targetDate: m.targetDate,
        completed: m.completed || false,
      })) || [],
    };
  }, [learningGoal]);

  // Extract difficulty from graph LearningGoal node
  const difficulty = useMemo<'beginner' | 'intermediate' | 'advanced' | undefined>(() => {
    if (!graph?.nodes || !graph?.nodeTypes?.LearningGoal?.length) return undefined;
    const goalNodeId = graph.nodeTypes.LearningGoal[0];
    const goalNode = graph.nodes[goalNodeId];
    const level = goalNode?.properties?.assessedLevel;
    if (level && ['beginner', 'intermediate', 'advanced'].includes(level)) {
      return level as 'beginner' | 'intermediate' | 'advanced';
    }
    return undefined;
  }, [graph]);

  // Handler for updating goal properties (title, description)
  const handleGoalUpdate = useCallback(async (updates: { text?: string; description?: string }) => {
    if (!learningGoal?.id) return;
    try {
      // Map text -> name for the node property
      const nodeUpdates: Record<string, any> = {};
      if (updates.text !== undefined) {
        nodeUpdates.name = updates.text;
      }
      if (updates.description !== undefined) {
        nodeUpdates.description = updates.description;
      }
      await updateProperties(learningGoal.id, nodeUpdates);
      // Refetch to get updated data (useUpdateNodeProperties also invalidates cache)
      await graphSummary.refetch();
    } catch (error) {
      console.error('Failed to update goal:', error);
      throw error;
    }
  }, [learningGoal?.id, updateProperties, graphSummary]);

  // Handler for updating milestone properties
  const handleMilestoneUpdate = useCallback(async (milestoneId: string, updates: { title?: string; completed?: boolean }) => {
    try {
      // Map title -> name for the node property
      const nodeUpdates: Record<string, any> = {};
      if (updates.title !== undefined) {
        nodeUpdates.name = updates.title;
      }
      if (updates.completed !== undefined) {
        nodeUpdates.completed = updates.completed;
      }
      await updateProperties(milestoneId, nodeUpdates);
      // Refetch to get updated data (useUpdateNodeProperties also invalidates cache)
      await graphSummary.refetch();
    } catch (error) {
      console.error('Failed to update milestone:', error);
      throw error;
    }
  }, [updateProperties, graphSummary]);

  // Handler for changing difficulty level
  const handleDifficultyChange = useCallback(async (newDifficulty: 'beginner' | 'intermediate' | 'advanced') => {
    if (!learningGoal?.id) return;
    try {
      await updateProperties(learningGoal.id, { assessedLevel: newDifficulty });
      // Refetch graph and summary to get updated data
      await Promise.all([
        graphSummary.refetch(),
        getGraph(graphId || '', { storeInRedux: true }),
      ]);
    } catch (error) {
      console.error('Failed to change difficulty:', error);
      throw error;
    }
  }, [learningGoal?.id, updateProperties, graphSummary, getGraph, graphId]);

  // Handler for adding a new milestone
  const handleAddMilestone = useCallback(async (title: string) => {
    if (!learningGoal?.id || !graphId) return;
    try {
      // Generate a unique milestone ID
      const milestoneIndex = (learningGoal.milestones?.length || 0);
      const milestoneId = `milestone-${graphId}-${milestoneIndex}`;
      
      // Create the milestone node mutation
      const createNodeMutation = {
        type: 'create_node' as const,
        node: {
          id: milestoneId,
          type: 'Milestone' as const,
          properties: {
            name: title,
            description: '',
            completed: false,
            targetDate: null,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        updateIndex: true,
      };

      // Create relationship from goal to milestone
      const createRelationshipMutation = {
        type: 'create_relationship' as const,
        relationship: {
          id: `rel-${learningGoal.id}-${milestoneId}-hasMilestone`,
          source: learningGoal.id,
          target: milestoneId,
          type: 'hasMilestone' as const,
          direction: 'forward' as const,
          createdAt: Date.now(),
        },
      };

      // Apply mutations via the API
      const { graphOperationsApi } = await import('../../knowledge-graph/api/graphOperationsApi');
      await graphOperationsApi.applyMutations(graphId, {
        mutations: {
          mutations: [createNodeMutation, createRelationshipMutation],
          metadata: {
            operation: 'add_milestone',
            timestamp: Date.now(),
          },
        },
      });

      // Refetch to get updated data
      await Promise.all([
        graphSummary.refetch(),
        getGraph(graphId, { storeInRedux: true }),
      ]);
    } catch (error) {
      console.error('Failed to add milestone:', error);
      throw error;
    }
  }, [learningGoal?.id, learningGoal?.milestones?.length, graphId, graphSummary, getGraph]);

  // Handler for expanding the graph (progressive expand)
  const handleExpand = useCallback(async () => {
    if (!graphId) return;
    try {
      await expand(
        { numConcepts: 10 },
        {
          stream: true,
          onDone: async () => {
            // Refetch data after expansion
            await Promise.all([
              graphSummary.refetch(),
              conceptsData.refetch(),
              getGraph(graphId, { storeInRedux: true }),
            ]);
          },
        }
      );
    } catch (error) {
      console.error('Failed to expand graph:', error);
      throw error;
    }
  }, [graphId, expand, graphSummary, conceptsData, getGraph]);

  // Transform operations for template
  const operations: Operation[] = useMemo(() => {
    const ops: Operation[] = [];
    
    // Expand operation
    ops.push({
      id: 'expand',
      label: 'Expand Graph',
      icon: Sparkles,
      variant: 'primary',
      onClick: async () => {
        try {
          await handleOperation('expand', seedConcept || concepts[0]);
        } catch (error) {
          console.error('Expand failed:', error);
        }
      },
    });

    // Generate Goals operation - requires user input (anchorAnswer and questionAnswers)
    // Disabled for now - would need a dialog to collect user input
    // TODO: Implement dialog to collect anchorAnswer and questionAnswers before calling generateGoals
    // ops.push({
    //   id: 'generate-goals',
    //   label: 'Generate Goals',
    //   icon: Target,
    //   variant: 'secondary',
    //   onClick: async () => {
    //     // Show dialog to collect anchorAnswer and questionAnswers
    //     // await generateGoals({ anchorAnswer: '', questionAnswers: [] });
    //   },
    // });

    // Generate Practice operation
    ops.push({
      id: 'generate-practice',
      label: 'Generate Practice',
      icon: BookOpen,
      variant: 'secondary',
      onClick: async () => {
        try {
          // Use layer 1 as default (first layer)
          const firstLayer = layers.length > 0 ? layers[0] : null;
          const layerNumber = firstLayer ? parseInt(firstLayer.id.replace('L', '')) : 1;
          await generatePractice({ layerNumber });
        } catch (error) {
          console.error('Generate practice failed:', error);
        }
      },
    });

    return ops;
  }, [handleOperation, seedConcept, concepts, generatePractice, layers]);

  // Handle operation execution from template
  const handleOperationExecute = useCallback(async (operationId: string) => {
    const operation = operations.find(op => op.id === operationId);
    if (operation) {
      await operation.onClick();
    }
  }, [operations]);

  // Determine if any operation is running
  const isOperationRunning = isExpanding || isExplaining || isAnswering || 
                             isGeneratingGoals || isGeneratingPractice || isCustomOp;

  // Handle concept click (navigate to detail page)
  const handleConceptClick = useCallback((conceptId: string) => {
    if (graphId) {
      navigate(`/mentor/${graphId}/concept/${encodeURIComponent(conceptId)}`);
    }
  }, [graphId, navigate]);

  // Handle add concept (navigate to concept creation or trigger expand)
  const handleAddConcept = useCallback((layerId: string) => {
    // Trigger expand operation for the layer
    const layerNum = parseInt(layerId.replace('L', ''));
    const layerConcepts = layers.find(l => l.id === layerId)?.concepts || [];
    const lastConcept = layerConcepts[layerConcepts.length - 1];
    if (lastConcept && graphId) {
      handleOperation('expand', concepts.find(c => c.id === lastConcept.id) || concepts[0])
        .catch(error => console.error('Failed to add concept:', error));
    }
  }, [layers, concepts, graphId, handleOperation]);

  // Handle AI Assistant message
  const handleLLMMessageSend = useCallback(async (message: string) => {
    if (!graphId || !message.trim()) return;

    const lowerMessage = message.toLowerCase();
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setLlmMessages(prev => [...prev, userMessage]);
    setIsLLMLoading(true);
    streamingContentRef.current = '';

    // Create placeholder for assistant response
    const assistantMessageId = `assistant-${Date.now()}`;
    setLlmMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    try {
      // Detect intent and route to appropriate operation
      const isLessonRequest = lowerMessage.includes('lesson') || 
                              lowerMessage.includes('explain') || 
                              lowerMessage.includes('teach');
      const isQuestionRequest = lowerMessage.includes('?') || 
                                lowerMessage.startsWith('what') ||
                                lowerMessage.startsWith('how') ||
                                lowerMessage.startsWith('why') ||
                                lowerMessage.startsWith('when');

      // Find concept mentioned in the message
      const mentionedConcept = concepts.find(c => 
        lowerMessage.includes(c.name.toLowerCase())
      );
      
      if (isLessonRequest && mentionedConcept) {
        // Use explainConcept for lesson generation
        await explain(
          { targetNodeId: mentionedConcept.id },
          {
            stream: true,
            onChunk: (chunk) => {
              streamingContentRef.current += chunk;
              setLlmMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: streamingContentRef.current }
                  : msg
              ));
            },
            onDone: () => {
              setIsLLMLoading(false);
              graphSummary.refetch();
              conceptsData.refetch();
            },
          }
        );
      } else if (isQuestionRequest && mentionedConcept) {
        // Use answerQuestion for questions about concepts
        await answer(
          { targetNodeId: mentionedConcept.id, question: message },
          {
            stream: true,
            onChunk: (chunk) => {
              streamingContentRef.current += chunk;
              setLlmMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: streamingContentRef.current }
                  : msg
              ));
            },
            onDone: () => {
              setIsLLMLoading(false);
            },
          }
        );
      } else {
        // Default to customOperation for general graph modifications
        const targetNodeIds = concepts.length > 0 
          ? concepts.slice(0, 5).map(c => c.id)
          : [seedConcept?.id || graphId];

        await customOp(
          { 
            targetNodeIds: targetNodeIds.filter(Boolean) as string[], 
            userPrompt: message 
          },
          {
            stream: true,
            onChunk: (chunk) => {
              streamingContentRef.current += chunk;
              setLlmMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: streamingContentRef.current }
                  : msg
              ));
            },
            onDone: () => {
              setIsLLMLoading(false);
              graphSummary.refetch();
              conceptsData.refetch();
            },
          }
        );
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      setLlmMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : msg
      ));
      setIsLLMLoading(false);
    }
  }, [graphId, concepts, seedConcept, explain, answer, customOp, graphSummary, conceptsData]);

  // Loading state
  const isLoading = graphSummary.loading || conceptsData.loading || mindMapData.loading || isLoadingGraph;
  const error = graphSummary.error || conceptsData.error || mindMapData.error;

  // Render dialogs
  const publishCourseDialog = graphId && seedConcept ? (
    <PublishCourseDialog
      isOpen={showPublishDialog}
      onClose={() => setShowPublishDialog(false)}
      graphId={graphId}
      seedConcept={seedConcept}
      existingSettings={courseSettings}
      isLoadingSettings={isLoadingCourseSettings}
      isPublishing={publishCourseMutation.isPending}
      onPublish={handlePublishCourse}
    />
  ) : null;

  const manageCourseDialog = graphId && isPublished ? (
    <ManageCourseDialog
      isOpen={showManageCourseDialog}
      onClose={() => setShowManageCourseDialog(false)}
      courseId={graphId}
      onUnpublished={handleCourseUnpublished}
      onManageModules={() => setShowModulesDialog(true)}
    />
  ) : null;

  const selectModulesDialog = graphId ? (
    <SelectModulesDialog
      isOpen={showModulesDialog}
      onClose={() => setShowModulesDialog(false)}
      modules={modulesData}
      publishedModuleIds={publishedModuleIds}
      isLoading={isLoadingModules}
      isPublishing={publishModuleMutation.isPending || unpublishModuleMutation.isPending}
      onPublish={handlePublishModules}
    />
  ) : null;

  const selectLessonsDialog = graphId && selectedModuleId ? (
    <SelectLessonsDialog
      isOpen={showLessonsDialog}
      onClose={() => {
        if (pendingModuleIds.length > 1) {
          const remaining = pendingModuleIds.slice(1);
          setPendingModuleIds(remaining);
          setSelectedModuleId(remaining[0]);
          setPublishedLessonIds(new Set());
        } else {
          setShowLessonsDialog(false);
          setSelectedModuleId(null);
          setPendingModuleIds([]);
        }
      }}
      module={selectedModuleInfo}
      lessons={lessonsWithPublishState}
      publishedLessonIds={publishedLessonIds}
      isLoading={isLoadingLessons}
      isPublishing={publishLessonMutation.isPending || unpublishLessonMutation.isPending}
      onPublish={handlePublishLessons}
    />
  ) : null;

  return (
    <MentorConceptListPage
      graphId={graphId}
      goal={templateGoal}
      difficulty={difficulty}
      onGoalUpdate={handleGoalUpdate}
      onMilestoneUpdate={handleMilestoneUpdate}
      onDifficultyChange={handleDifficultyChange}
      onAddMilestone={handleAddMilestone}
      onExpand={handleExpand}
      isExpanding={isExpanding}
      layers={layers}
      graphNodes={graphNodes}
      graphEdges={graphEdges}
      operations={operations}
      onOperationExecute={handleOperationExecute}
      isOperationRunning={isOperationRunning}
      selectedConceptId={undefined}
      loading={isLoading}
      error={error}
      onConceptClick={handleConceptClick}
      onConceptSelect={(conceptId) => {
        // Template handles selection internally for highlighting
      }}
      onAddConcept={handleAddConcept}
      onGoalSave={(goalText) => {
        // Use new goal update handler
        handleGoalUpdate({ text: goalText });
      }}
      onLLMMessageSend={handleLLMMessageSend}
      llmMessages={llmMessages}
      isLLMLoading={isLLMLoading}
      user={templateUser}
      navigationItems={navigationItems}
      onLogoClick={() => navigate('/home')}
      publishCourseDialog={publishCourseDialog}
      manageCourseDialog={manageCourseDialog}
      selectModulesDialog={selectModulesDialog}
      selectLessonsDialog={selectLessonsDialog}
    />
  );
};

MentorConceptListPageContainer.displayName = 'MentorConceptListPageContainer';

export default MentorConceptListPageContainer;
export { MentorConceptListPageContainer };