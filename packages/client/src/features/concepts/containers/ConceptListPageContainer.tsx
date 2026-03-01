import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useAppDispatch } from '../../../app/hooks';
import { useGraphSummary, useConceptsByLayer, useGetGraph, useMindMapStructure } from '../../knowledge-graph/hooks';
import { setCurrentGraphId, selectGraphById } from '../../knowledge-graph/knowledgeGraphSlice';
import { useProgressiveExpand } from '../../knowledge-graph/hooks/useProgressiveExpand';
import { useExplainConcept } from '../../knowledge-graph/hooks/useExplainConcept';
import { useAnswerQuestion } from '../../knowledge-graph/hooks/useAnswerQuestion';
import { useGenerateGoals } from '../../knowledge-graph/hooks/useGenerateGoals';
import { useGenerateLayerPractice } from '../../knowledge-graph/hooks/useGenerateLayerPractice';
import { useCustomOperation } from '../../knowledge-graph/hooks/useCustomOperation';
import type { Concept } from '../types';
import type { ConceptDisplay } from '../../knowledge-graph/api/types';
import type { LearningGoal } from '../../learning/goalApi';
import { ConceptListPage } from '../../../components/pages/ConceptListPage';
import type { ConceptLayer, GraphNode, GraphEdge } from '../../../components/templates/KnowledgeGraphTemplate';
import { ConceptCardProps } from '../../../components/organisms/ConceptCard';
import { Operation } from '../../../components/organisms/OperationPanel';
import { useAuthContext } from '../../auth/AuthContext';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { useAppSelector } from '../../../app/hooks';
import { Sparkles, BookOpen } from 'lucide-react';
import { FocusModeTemplate } from '../../../components/templates/FocusModeTemplate';
import type { LearnTemplateProps, LearnLevel, LearnConcept, LearnGoal } from '../../../components/templates/LearnTemplates/types';
import { Button } from '../../../components/atoms/Button';

// Operation types (matching mentor pattern)
type OperationType =
  | 'expand'
  | 'synthesize'
  | 'explore'
  | 'tracePath'
  | 'progressiveExpandSingle'
  | 'progressiveExplore'
  | 'progressiveExpandMultipleFromText'
  | 'deriveParents'
  | 'deriveSummary'
  | 'explain'
  | 'generateNextConcept'
  | 'generateFlashCards'
  | 'custom';

interface OperationResult {
  addedConcepts: Concept[];
  diff: any | null;
  prompt?: string;
}

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

type TemplateType = 'journey' | 'path-explorer' | 'focus-mode';

/**
 * Container component for ConceptListPage
 * Handles data fetching, Redux state, and business logic
 * Uses KnowledgeGraphTemplate or Learn templates for layout
 * 
 * Migrated to use knowledge-graph hooks (same as MentorConceptListPageContainer)
 */
const ConceptListPageContainer: React.FC = () => {
  const { graphId } = useParams<{ graphId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthContext();

  // Template toggle state
  const [templateType, setTemplateType] = useState<TemplateType>('journey');
  const [viewMode, setViewMode] = useState<'list' | 'mindmap'>('list');
  
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
    groupByLayer: true, // Group concepts by layer
  });
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
  const { generate: generatePractice, isLoading: isGeneratingPractice, streaming: practiceStreaming } = useGenerateLayerPractice(graphId || '');
  const { execute: customOp, isLoading: isCustomOp } = useCustomOperation(graphId || '');

  // Operation handler - maps operations to knowledge-graph hooks
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
          const response = await expand(
            { numConcepts: 5 },
            {
              stream: !!onStream,
              onChunk: onStream,
            }
          );
          result.prompt = (response as any).prompt;
          break;
        }

        case 'progressiveExpandMultipleFromText': {
          const response = await expand(
            { numConcepts: 10 },
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
    mindMapData,
  ]);

  // Navigation handlers
  const handleSelectConcept = useCallback((concept: Concept) => {
    if (graphId) {
      const { getConceptRouteId } = require('../utils/graphHelpers');
      navigate(`/concepts/${graphId}/concept/${getConceptRouteId(concept)}`);
    }
  }, [graphId, navigate]);

  const handleBack = useCallback(() => {
    navigate('/home');
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
          // Check if concept has a lesson - use the boolean flag from properties (set by explain operation)
          // or check for lesson string as fallback
          const hasLesson = Boolean(
            display.properties.hasLesson || 
            (concept.lesson && typeof concept.lesson === 'string' && concept.lesson.trim().length > 0)
          );
          return {
            id: concept.id,
            name: concept.name,
            description: concept.description,
            layer: concept.layer,
            prerequisites: concept.prerequisites,
            parents: concept.parents,
            progress: concept.userProgress?.masteryLevel ? (concept.userProgress.masteryLevel / 3) * 100 : undefined,
            hasLesson, // Track if this concept has a generated lesson
            onClick: () => handleSelectConcept(concept),
          };
        });

        return {
          id: `L${layerNum}`,
          name: `Level ${layerNum}`,
          color: layerColors[layerNum % layerColors.length] || '#6b7280',
          concepts,
        };
      });
  }, [conceptsData.groupedByLayer, handleSelectConcept]);

  // Transform graph nodes and relationships to graphNodes and graphEdges for ForceGraph
  const { graphNodes, graphEdges } = useMemo(() => {
    if (!graph || !graph.nodes || !graph.relationships) {
      return { graphNodes: [], graphEdges: [] };
    }
    
    // Build graphNodes - include ALL nodes from the graph
    const nodes: GraphNode[] = Object.values(graph.nodes).map(node => ({
      id: node.id,
      label: node.properties?.name || node.id,
      layer: `L${node.properties?.layer || 0}`,
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
      milestones: learningGoal.milestones?.map(m => ({
        id: m.id,
        title: m.title,
        text: m.title,
        description: m.description,
        targetDate: m.targetDate,
        completed: m.completed || false,
      })) || [],
    };
  }, [learningGoal]);

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

    // Generate Practice operation
    ops.push({
      id: 'generate-practice',
      label: 'Generate Practice',
      icon: BookOpen,
      variant: 'secondary',
      onClick: async () => {
        try {
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
      navigate(`/concepts/${graphId}/concept/${encodeURIComponent(conceptId)}`);
    }
  }, [graphId, navigate]);

  // Handle add concept (trigger expand)
  const handleAddConcept = useCallback((layerId: string) => {
    const layerNum = parseInt(layerId.replace('L', ''));
    const layerConcepts = layers.find(l => l.id === layerId)?.concepts || [];
    const lastConcept = layerConcepts[layerConcepts.length - 1];
    if (lastConcept && graphId) {
      handleOperation('expand', concepts.find(c => c.id === lastConcept.id) || concepts[0])
        .catch(error => console.error('Failed to add concept:', error));
    }
  }, [layers, concepts, graphId, handleOperation]);

  // Loading state
  const isLoading = graphSummary.loading || conceptsData.loading || mindMapData.loading || isLoadingGraph;
  const error = graphSummary.error || conceptsData.error || mindMapData.error;

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [signOut]);

  // Get assessedLevel from the LearningGoal node in the graph
  const assessedLevel = useMemo(() => {
    if (!graph?.nodes || !graph.nodeTypes?.LearningGoal?.length) return undefined;
    const learningGoalNodeId = graph.nodeTypes.LearningGoal[0];
    const learningGoalNode = graph.nodes[learningGoalNodeId];
    return learningGoalNode?.properties?.assessedLevel as 'beginner' | 'intermediate' | 'advanced' | undefined;
  }, [graph]);

  // Transform data for Learn templates
  const learnGoal: LearnGoal | undefined = useMemo(() => {
    if (!templateGoal) return undefined;
    
    const completedLevels = layers.filter(l => {
      // A level is complete if all its concepts are completed
      return l.concepts.every(c => c.progress === 100);
    }).length;
    
    const totalConcepts = layers.reduce((sum, l) => sum + l.concepts.length, 0);
    const completedConcepts = layers.reduce((sum, l) => 
      sum + l.concepts.filter(c => c.progress === 100).length, 0
    );
    
    const progress = totalConcepts > 0 ? Math.round((completedConcepts / totalConcepts) * 100) : 0;
    
    // Map milestones with level numbers (milestone index + 1 = level number)
    const milestones = templateGoal.milestones?.map((m, index) => ({
      id: m.id,
      title: m.title || m.text || `Milestone ${index + 1}`,
      description: m.description,
      levelNumber: index + 1, // Each milestone corresponds to a level (1, 2, 3, ...)
      completed: m.completed || false,
    })) || [];
    
    return {
      id: templateGoal.id,
      title: templateGoal.text,
      description: templateGoal.milestones?.[0]?.description || learningGoal?.description,
      progress,
      totalLevels: layers.length,
      completedLevels,
      totalConcepts,
      completedConcepts,
      milestones,
      assessedLevel, // Include the user's experience level
    };
  }, [templateGoal, layers, learningGoal, assessedLevel]);

  // Extract seed concept from layer 0 for Learn templates
  const learnSeedConcept: LearnConcept | undefined = useMemo(() => {
    if (!seedConcept) return undefined;
    
    const layer0 = layers.find(l => l.id === 'L0' || parseInt(l.id.replace('L', '')) === 0);
    if (!layer0) {
      // Fallback: use seedConcept directly if layer0 not found
      // Find the raw display to check hasLesson property
      const seedDisplay = conceptsData.concepts.find(d => d.id === seedConcept.id);
      const hasLesson = Boolean(
        seedDisplay?.properties?.hasLesson || 
        (seedConcept.lesson && typeof seedConcept.lesson === 'string' && seedConcept.lesson.trim().length > 0)
      );
      return {
        id: seedConcept.id,
        name: seedConcept.name,
        description: seedConcept.description,
        completed: seedConcept.userProgress?.masteryLevel === 3,
        isCurrent: false,
        prerequisites: seedConcept.prerequisites,
        parents: seedConcept.parents,
        hasLesson,
      };
    }
    
    // Find seed concept in layer 0
    const seed = layer0.concepts.find(c => {
      const concept = concepts.find(conv => conv.id === c.id);
      return concept?.isSeed || layer0.concepts.length === 1;
    }) || layer0.concepts[0];
    
    if (!seed) return undefined;
    
    return {
      id: seed.id,
      name: seed.name,
      description: seed.description,
      completed: seed.progress === 100,
      isCurrent: false,
      prerequisites: seed.prerequisites,
      parents: seed.parents,
      hasLesson: seed.hasLesson, // Track if seed concept has a lesson
    };
  }, [layers, concepts, seedConcept]);

  // Filter out layer 0 and renumber levels starting from 1
  const learnLevels: LearnLevel[] = useMemo(() => {
    // Get Layer nodes from graph to access review property
    const layerNodes = graph?.nodes 
      ? Object.values(graph.nodes).filter(n => n.type === 'Layer')
      : [];
    
    return layers
      .filter(layer => {
        const layerNum = parseInt(layer.id.replace('L', '')) || 0;
        return layerNum > 0; // Exclude layer 0 (seed concept layer)
      })
      .map((layer, index) => {
        const originalLayerNum = parseInt(layer.id.replace('L', '')) || 0;
        const displayLayerNum = index + 1; // Start from 1
        
        // Find the Layer node to get the review
        const layerNode = layerNodes.find(n => n.properties?.layerNumber === originalLayerNum);
        
        const concepts: LearnConcept[] = layer.concepts.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          completed: c.progress === 100,
          isCurrent: false, // TODO: Determine current concept based on user progress
          prerequisites: c.prerequisites,
          parents: c.parents,
          hasLesson: c.hasLesson, // Track if this concept has a generated lesson
        }));
        
        const isCompleted = concepts.every(c => c.completed);
        const isCurrent = !isCompleted && (index === 0 || layers.filter(l => parseInt(l.id.replace('L', '')) > 0)[index - 1]?.concepts.every(c => c.progress === 100));
        
        return {
          id: layer.id,
          number: displayLayerNum, // Display number starts from 1
          name: `Level ${displayLayerNum}`, // Rename to Level 1, Level 2, etc.
          description: layer.name !== `Level ${originalLayerNum}` ? layer.name : undefined,
          concepts,
          completed: isCompleted,
          isCurrent,
          // Include review from Layer node if available
          review: layerNode?.properties?.review as string | undefined,
          reviewGeneratedAt: layerNode?.properties?.reviewGeneratedAt as number | undefined,
        };
      });
  }, [layers, graph]);

  // Transform graph nodes/edges for mindmap
  const learnGraphNodes = useMemo(() => {
    return graphNodes.map(node => ({
      id: node.id,
      label: node.label,
      layer: parseInt(node.layer.replace('L', '')) || 0,
    }));
  }, [graphNodes]);

  const learnGraphEdges = useMemo(() => {
    return graphEdges.map(edge => ({
      source: edge.source,
      target: edge.target,
    }));
  }, [graphEdges]);

  // State for streaming content when loading next level
  const [nextLevelStreamContent, setNextLevelStreamContent] = useState('');
  const [showNextLevelLoader, setShowNextLevelLoader] = useState(false);
  
  // Track the focused level (newly created level after expand)
  const [focusedLevelId, setFocusedLevelId] = useState<string | undefined>(undefined);
  
  // Stable callback for clearing focused level
  const handleFocusedLevelClear = useCallback(() => {
    setFocusedLevelId(undefined);
  }, []);

  // Handle loading next level
  const handleLoadNextLevel = useCallback(async () => {
    if (!graphId) return;
    
    // Reset stream content and show loader
    setNextLevelStreamContent('');
    setShowNextLevelLoader(true);
    
    try {
      await expand(
        { numConcepts: 10 }, // Generate 10 concepts per layer
        {
          stream: true,
          onChunk: (chunk: string) => {
            // Accumulate stream chunks
            setNextLevelStreamContent(prev => prev + chunk);
          },
          onDone: (finalResult) => {
            console.log('[ConceptListPageContainer] onDone received:', finalResult);
            
            // Get the level name from the response and set as focused level BEFORE refetch
            // This way the focusedLevelId is set and waiting for the levels to update
            const levelName = finalResult.content?.levelName;
            let newFocusedLevelId: string | undefined;
            if (levelName) {
              // Extract layer number from level name (e.g., "Level 2" -> "L2")
              const match = levelName.match(/\d+/);
              if (match) {
                newFocusedLevelId = `L${match[0]}`;
                console.log('[ConceptListPageContainer] Setting focusedLevelId to:', newFocusedLevelId);
                setFocusedLevelId(newFocusedLevelId);
              }
            }
            
            // Refetch data after expansion completes
            // The focusedLevelId effect in FocusModeTemplate will switch when levels update
            graphSummary.refetch();
            conceptsData.refetch();
            mindMapData.refetch();
            
            // Hide loader after a short delay to show final state
            setTimeout(() => {
              setShowNextLevelLoader(false);
              setNextLevelStreamContent('');
            }, 1000);
          },
        }
      );
    } catch (error) {
      console.error('Failed to load next level:', error);
      setShowNextLevelLoader(false);
      setNextLevelStreamContent('');
    }
  }, [graphId, expand, graphSummary, conceptsData, mindMapData]);

  // Handle generate layer practice (for final review) - with streaming support
  const handleGenerateLayerPractice = useCallback(async (layerNumber: number) => {
    if (!graphId) return;
    
    try {
      await generatePractice(
        { layerNumber },
        {
          stream: true, // Enable streaming to show content as it's generated
          onChunk: (chunk) => {
            // Content is automatically accumulated in practiceStreaming.content
            console.log('Layer practice chunk received');
          },
          onDone: (result) => {
            console.log('Layer practice generated:', result);
          },
        }
      );
    } catch (error) {
      console.error('Failed to generate layer practice:', error);
      throw error;
    }
  }, [graphId, generatePractice]);

  // Common template props
  const commonTemplateProps: Omit<LearnTemplateProps, 'goal' | 'levels' | 'seedConcept'> = {
    viewMode,
    onViewModeChange: setViewMode,
    onConceptClick: handleConceptClick,
    onLevelClick: (levelId) => {
      // Level switching is now handled by the template itself
      // This callback is kept for potential future use (e.g., analytics)
      // The template will update its displayed level when clicked
    },
    onLoadNextLevel: handleLoadNextLevel,
    isLoadingNextLevel: isExpanding || showNextLevelLoader,
    nextLevelStreamContent: showNextLevelLoader ? nextLevelStreamContent : undefined,
    focusedLevelId,
    onFocusedLevelClear: handleFocusedLevelClear,
    onGenerateLayerPractice: handleGenerateLayerPractice,
    layerPracticeStreamContent: practiceStreaming?.content,
    isGeneratingLayerPractice: isGeneratingPractice,
    graphId: graphId || undefined,
    user: templateUser,
    navigationItems,
    onLogout: handleLogout,
    onLogoClick: () => navigate('/home'),
    graphNodes: learnGraphNodes,
    graphEdges: learnGraphEdges,
  };

  // Show loading/error state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading learning path...</p>
        </div>
      </div>
    );
  }

  if (error) {
  return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Error: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  // Render FocusModeTemplate (default)
  const templateProps: LearnTemplateProps = {
    ...commonTemplateProps,
    goal: learnGoal,
    seedConcept: learnSeedConcept,
    levels: learnLevels,
  };

  return <FocusModeTemplate {...templateProps} />;
};

ConceptListPageContainer.displayName = 'ConceptListPageContainer';

export default ConceptListPageContainer;
export { ConceptListPageContainer };
