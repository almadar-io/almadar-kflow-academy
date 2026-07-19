import { createLogger } from '@almadar/logger';
import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router';
import { useEventBus, useTranslate } from '@almadar/ui';
import { useNavigateEvent } from '../hooks/useNavigateEvent';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { useGraphSummary, useConceptsByLayer, useGetGraph, useMindMapStructure } from '../features/knowledge-graph/hooks';
import { setCurrentGraphId, selectGraphById } from '../features/knowledge-graph/knowledgeGraphSlice';
import { useProgressiveExpand } from '../features/knowledge-graph/hooks/useProgressiveExpand';
import { useExplainConcept } from '../features/knowledge-graph/hooks/useExplainConcept';
import { useAnswerQuestion } from '../features/knowledge-graph/hooks/useAnswerQuestion';
import { useGenerateGoals } from '../features/knowledge-graph/hooks/useGenerateGoals';
import { useGenerateLayerPractice } from '../features/knowledge-graph/hooks/useGenerateLayerPractice';
import { useCustomOperation } from '../features/knowledge-graph/hooks/useCustomOperation';
import { useAuthContext } from '../features/auth/AuthContext';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import type { Concept } from '../features/concepts/types';
import type { ConceptDisplay } from '../features/knowledge-graph/api/types';
import type { LearningGoal } from '../features/learning/goalApi';
import { getConceptRouteId } from '../features/concepts/utils/graphHelpers';
import { convertConceptDisplayToConcept } from '../features/concepts/utils/convertConceptDisplay';
import { FocusModeTemplate } from '@design-system/templates/FocusModeTemplate';
import type { FocusModeEntity } from '@design-system/templates/FocusModeTemplate';
import kflowLogo from '../assets/kflow-logo.svg';
import type { LearnGoal, LearnLevel, LearnConcept } from '@design-system/templates/LearnTemplates/types';

const log = createLogger('kflow:client:pages:ConceptsPage');

export const ConceptsPage: React.FC = () => {
  const { graphId } = useParams<{ graphId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigateEvent();
  const location = useLocation();
  const { user } = useAuthContext();
  const { on, emit } = useEventBus();
  const { t } = useTranslate();

  const [viewMode, setViewMode] = useState<'list' | 'mindmap'>('list');
  const [nextLevelStreamContent, setNextLevelStreamContent] = useState('');
  const [showNextLevelLoader, setShowNextLevelLoader] = useState(false);
  const [focusedLevelId, setFocusedLevelId] = useState<string | undefined>(undefined);

  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

  useEffect(() => {
    if (graphId) dispatch(setCurrentGraphId(graphId));
  }, [graphId, dispatch]);

  const graphSummary = useGraphSummary(graphId || '');
  const conceptsData = useConceptsByLayer(graphId || '', {
    includeRelationships: true,
    groupByLayer: true,
  });
  const mindMapData = useMindMapStructure(graphId || '', { expandAll: false });
  const graph = useAppSelector((state) => selectGraphById(state, graphId || ''));
  const { getGraph, loading: isLoadingGraph } = useGetGraph();

  const attemptedGraphIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (graphId && !graph && !isLoadingGraph && attemptedGraphIdRef.current !== graphId) {
      attemptedGraphIdRef.current = graphId;
      getGraph(graphId, { storeInRedux: true }).catch((err) => {
        log.error('Failed to load graph', { error: err instanceof Error ? err.message : String(err) });
      });
    }
  }, [graphId, graph, isLoadingGraph, getGraph]);

  const concepts = useMemo((): Concept[] => {
    return conceptsData.concepts.map(convertConceptDisplayToConcept);
  }, [conceptsData.concepts]);

  const seedConcept = useMemo(() => concepts.find((c) => c.isSeed) || concepts[0] || null, [concepts]);

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
      estimatedTime: undefined,
      milestones: graphSummary.graphSummary.milestones || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }, [graphSummary.graphSummary, graphId]);

  const { expand, isLoading: isExpanding } = useProgressiveExpand(graphId || '');
  const { explain, isLoading: isExplaining } = useExplainConcept(graphId || '');
  const { answer, isLoading: isAnswering } = useAnswerQuestion(graphId || '');
  const { generate: generateGoals, isLoading: isGeneratingGoals } = useGenerateGoals(graphId || '');
  const { generate: generatePractice, isLoading: isGeneratingPractice, streaming: practiceStreaming } = useGenerateLayerPractice(graphId || '');
  const { execute: customOp, isLoading: isCustomOp } = useCustomOperation(graphId || '');

  // Internal layers for building LearnLevel[]
  const layers = useMemo(() => {
    if (!conceptsData.groupedByLayer) return [];
    const layerColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    return Object.entries(conceptsData.groupedByLayer)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([layerStr, conceptDisplays]) => {
        const layerNum = Number(layerStr);
        return {
          id: `L${layerNum}`,
          layerNum,
          color: layerColors[layerNum % layerColors.length] || '#6b7280',
          displayConcepts: conceptDisplays.map(convertConceptDisplayToConcept),
          rawDisplays: conceptDisplays,
        };
      });
  }, [conceptsData.groupedByLayer]);

  const handleConceptClick = useCallback((conceptId: string) => {
    if (graphId) {
      navigate(`/concepts/${graphId}/concept/${encodeURIComponent(conceptId)}`);
    }
  }, [graphId, navigate]);

  const handleLoadNextLevel = useCallback(async () => {
    if (!graphId) return;
    setNextLevelStreamContent('');
    setShowNextLevelLoader(true);
    try {
      await expand(
        { numConcepts: 10 },
        {
          stream: true,
          onChunk: (chunk: string) => {
            setNextLevelStreamContent(prev => prev + chunk);
          },
          onDone: (finalResult) => {
            const levelName = finalResult.content?.levelName;
            if (levelName) {
              const match = levelName.match(/\d+/);
              if (match) setFocusedLevelId(`L${match[0]}`);
            }
            graphSummary.refetch();
            conceptsData.refetch();
            mindMapData.refetch();
            setTimeout(() => {
              setShowNextLevelLoader(false);
              setNextLevelStreamContent('');
            }, 1000);
          },
        }
      );
    } catch (err) {
      log.error('Failed to load next level', { error: err instanceof Error ? err.message : String(err) });
      setShowNextLevelLoader(false);
      setNextLevelStreamContent('');
    }
  }, [graphId, expand, graphSummary, conceptsData, mindMapData]);

  const handleGenerateLayerPractice = useCallback(async (layerNumber: number) => {
    if (!graphId) return;
    try {
      await generatePractice(
        { layerNumber },
        {
          stream: true,
          onChunk: () => {},
          onDone: (result) => { log.debug('Layer practice generated', { reviewLength: result.content.review.length, errorCount: result.errors?.length ?? 0 }); },
        }
      );
    } catch (err) {
      log.error('Failed to generate layer practice', { error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }, [graphId, generatePractice]);

  // Bus listeners
  useEffect(() => {
    const unsubConcept = on('UI:CONCEPT_CLICK', (event) => {
      const payload = event.payload as { conceptId?: string } | undefined;
      if (payload?.conceptId) handleConceptClick(payload.conceptId);
    });
    const unsubViewMode = on('UI:VIEW_MODE_CHANGE', (event) => {
      const payload = event.payload as { mode?: 'list' | 'mindmap' } | undefined;
      if (payload?.mode) setViewMode(payload.mode);
    });
    const unsubNextLevel = on('UI:LOAD_NEXT_LEVEL', () => {
      handleLoadNextLevel();
    });
    const unsubPractice = on('UI:GENERATE_LAYER_PRACTICE', (event) => {
      const payload = event.payload as { layerNumber?: number } | undefined;
      if (payload?.layerNumber !== undefined) handleGenerateLayerPractice(payload.layerNumber);
    });
    return () => {
      unsubConcept();
      unsubViewMode();
      unsubNextLevel();
      unsubPractice();
    };
  }, [on, handleConceptClick, handleLoadNextLevel, handleGenerateLayerPractice]);

  // Derive LearnGoal
  const assessedLevel = useMemo(() => {
    if (!graph?.nodes || !graph.nodeTypes?.LearningGoal?.length) return undefined;
    const learningGoalNodeId = graph.nodeTypes.LearningGoal[0];
    const learningGoalNode = graph.nodes[learningGoalNodeId];
    return learningGoalNode?.properties?.assessedLevel as 'beginner' | 'intermediate' | 'advanced' | undefined;
  }, [graph]);

  const learnGoal: LearnGoal | undefined = useMemo(() => {
    if (!learningGoal) return undefined;
    const completedConcepts = layers.reduce((sum, l) => {
      return sum + l.displayConcepts.filter(c => c.userProgress?.masteryLevel === 3).length;
    }, 0);
    const totalConcepts = layers.reduce((sum, l) => sum + l.displayConcepts.length, 0);
    const progress = totalConcepts > 0 ? Math.round((completedConcepts / totalConcepts) * 100) : 0;
    const milestones = (learningGoal.milestones || []).map((m, index) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      levelNumber: index + 1,
      completed: m.completed || false,
    }));
    return {
      id: learningGoal.id,
      title: learningGoal.title,
      description: learningGoal.description,
      progress,
      totalLevels: layers.filter(l => l.layerNum > 0).length,
      completedLevels: 0,
      totalConcepts,
      completedConcepts,
      milestones,
      assessedLevel,
    };
  }, [learningGoal, layers, assessedLevel]);

  // Derive LearnConcept for seed
  const learnSeedConcept: LearnConcept | undefined = useMemo(() => {
    if (!seedConcept) return undefined;
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
  }, [seedConcept, conceptsData.concepts]);

  // Derive LearnLevel[]
  const learnLevels: LearnLevel[] = useMemo(() => {
    const layerNodes = graph?.nodes
      ? Object.values(graph.nodes).filter(n => n.type === 'Layer')
      : [];
    return layers
      .filter(l => l.layerNum > 0)
      .map((layer, index) => {
        const displayLayerNum = index + 1;
        const layerNode = layerNodes.find(n => n.properties?.layerNumber === layer.layerNum);
        const learnConcepts: LearnConcept[] = layer.displayConcepts.map(c => {
          const rawDisplay = layer.rawDisplays.find(d => d.id === c.id);
          const hasLesson = Boolean(
            rawDisplay?.properties?.hasLesson ||
            (c.lesson && typeof c.lesson === 'string' && c.lesson.trim().length > 0)
          );
          return {
            id: c.id,
            name: c.name,
            description: c.description,
            completed: c.userProgress?.masteryLevel === 3,
            isCurrent: false,
            prerequisites: c.prerequisites,
            parents: c.parents,
            hasLesson,
          };
        });
        const isCompleted = learnConcepts.every(c => c.completed);
        const isCurrent = !isCompleted && (
          index === 0 ||
          layers.filter(l => l.layerNum > 0)[index - 1]?.displayConcepts.every(c => c.userProgress?.masteryLevel === 3)
        );
        return {
          id: layer.id,
          number: displayLayerNum,
          name: t('concept.levelLabel', { number: String(displayLayerNum) }),
          concepts: learnConcepts,
          completed: isCompleted,
          isCurrent,
          review: layerNode?.properties?.review as string | undefined,
          reviewGeneratedAt: layerNode?.properties?.reviewGeneratedAt as number | undefined,
        };
      });
  }, [layers, graph]);

  // Graph nodes/edges for the hero concept canvas (Concept nodes only, grouped by layer).
  const learnGraphNodes = useMemo(() => {
    if (!graph?.nodes) return [];
    return Object.values(graph.nodes)
      .filter(node => node.type === 'Concept')
      .map(node => {
        const layer = Number(node.properties?.layer ?? 0);
        return {
          id: node.id,
          label: typeof node.properties?.name === 'string' ? node.properties.name : node.id,
          layer,
          group: `L${layer}`,
        };
      });
  }, [graph]);

  const learnGraphEdges = useMemo(() => {
    if (!graph?.relationships) return [];
    const nodeIdSet = new Set(learnGraphNodes.map(n => n.id));
    return graph.relationships
      .filter(rel => nodeIdSet.has(rel.source) && nodeIdSet.has(rel.target))
      .map(rel => ({ source: rel.source, target: rel.target }));
  }, [graph, learnGraphNodes]);

  const isLoading = graphSummary.loading || conceptsData.loading || mindMapData.loading || isLoadingGraph;
  const error = graphSummary.error || conceptsData.error || mindMapData.error;

  const entity: FocusModeEntity = {
    goal: learnGoal,
    seedConcept: learnSeedConcept,
    levels: learnLevels,
    viewMode,
    isLoadingNextLevel: isExpanding || showNextLevelLoader,
    nextLevelStreamContent: showNextLevelLoader ? nextLevelStreamContent : undefined,
    focusedLevelId,
    isGeneratingLayerPractice: isGeneratingPractice,
    layerPracticeStreamContent: practiceStreaming?.content,
    graphId: graphId || undefined,
    user: templateUser,
    navigationItems,
    logoSrc: kflowLogo,
    brandName: 'KFlow',
    graphNodes: learnGraphNodes,
    graphEdges: learnGraphEdges,
  };

  return (
    <FocusModeTemplate
      entity={entity}
      isLoading={isLoading}
      error={error ? { message: error } : null}
    />
  );
};

ConceptsPage.displayName = 'ConceptsPage';
