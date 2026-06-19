/**
 * LearnPage — thin assembler
 *
 * Calls feature hooks, derives LearnPathsTemplateEntity, mounts
 * LearnPathsTemplate. Goal-form dialog rendered as overlay slot.
 * All navigation and interaction handled via the event bus
 * (UI:CREATE_LEARNING_PATH, UI:LEARNING_PATH_CLICK,
 * UI:DELETE_LEARNING_PATH, UI:NAVIGATE_TO_MENTOR).
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router';
import { Box, Card, Overlay, Spinner, Typography, VStack, useEventBus, useTranslate } from '@almadar/ui';
import { LearnPathsTemplate } from '@design-system/templates/LearnTemplates/LearnPathsTemplate';
import type { LearnPathsTemplateEntity } from '@design-system/templates/LearnTemplates/LearnPathsTemplate';
import { useAuthContext } from '../features/auth/AuthContext';
import { useLearningPaths } from '../features/knowledge-graph/hooks/useLearningPaths';
import { useGetGraph } from '../features/knowledge-graph/hooks/useKnowledgeGraphRest';
import { useAppDispatch } from '../app/hooks';
import { setCurrentGraphId } from '../features/knowledge-graph/knowledgeGraphSlice';
import { graphOperationsStreamingApi } from '../features/knowledge-graph/api/streaming';
import { GoalForm } from '../features/learning/components/GoalForm';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import { useNavigateEvent } from '../hooks/useNavigateEvent';
import { auth } from '../config/firebase';
import { apiClient } from '../services/apiClient';
import type { UiNotifyPayload } from '../app/uiEvents';
import type { LearnEntity } from '@design-system/organisms/LearnBoard';

export const LearnPage: React.FC = () => {
  const { user } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigateEvent();
  const dispatch = useAppDispatch();
  const { on, emit } = useEventBus();
  const { t } = useTranslate();

  const { learningPaths, loading: isLoadingPaths, error: pathsError, refetch } = useLearningPaths();
  const { loading: isLoadingGraph } = useGetGraph();

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [parsedConcepts, setParsedConcepts] = useState<Array<{ name: string; description: string }>>([]);
  const [parsedLevelName, setParsedLevelName] = useState('');
  const contentAccRef = useRef('');

  const templateUser = getUserForTemplate(user);

  const navItems = useMemo(
    () => getNavigationItems(location.pathname, mainNavItems),
    [location.pathname]
  );

  const handleGoalFormComplete = useCallback(
    async (result: { goalId: string; graphId: string }) => {
      dispatch(setCurrentGraphId(result.graphId));
      setIsExpanding(true);
      setParsedConcepts([]);
      setParsedLevelName('');
      contentAccRef.current = '';

      try {
        await graphOperationsStreamingApi.progressiveExpand(
          result.graphId,
          { numConcepts: 10 },
          {
            onChunk: (chunk: string) => {
              contentAccRef.current += chunk;
              const levelMatch = contentAccRef.current.match(/<level-name>(.*?)<\/level-name>/i);
              if (levelMatch) setParsedLevelName(levelMatch[1].trim());
              const conceptMatches = [
                ...contentAccRef.current.matchAll(/<concept>(.*?)<\/concept>\s*<description>(.*?)<\/description>/gis),
              ];
              setParsedConcepts(conceptMatches.map(m => ({ name: m[1].trim(), description: m[2].trim() })));
            },
            onError: (error: string) => {
              console.error('Expansion stream error:', error);
            },
          }
        );
      } catch (err) {
        console.error('Initial expansion failed:', err);
      }

      setIsExpanding(false);
      setParsedConcepts([]);
      setParsedLevelName('');
      contentAccRef.current = '';
      setShowGoalForm(false);
      navigate(`/concepts/${result.graphId}`);
      refetch();
    },
    [dispatch, navigate, refetch]
  );

  const handleDeletePath = useCallback(
    async (pathId: string) => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('User is not authenticated');
        const token = await currentUser.getIdToken();
        await apiClient.fetch(`/api/graphs/${pathId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        emit('UI:NOTIFY', { severity: 'success', message: t('learn.deleteSuccess') } satisfies UiNotifyPayload);
        await refetch();
      } catch {
        emit('UI:NOTIFY', { severity: 'error', message: t('learn.deleteError') } satisfies UiNotifyPayload);
      }
    },
    [refetch, emit, t]
  );

  useEffect(() => {
    const unsubCreate = on('UI:CREATE_LEARNING_PATH', () => {
      setShowGoalForm(true);
    });
    const unsubPath = on('UI:LEARNING_PATH_CLICK', (event) => {
      const graphId = event.payload?.graphId as string | undefined;
      if (graphId) {
        dispatch(setCurrentGraphId(graphId));
        navigate(`/concepts/${graphId}`);
      }
    });
    const unsubDelete = on('UI:DELETE_LEARNING_PATH', (event) => {
      const pathId = event.payload?.pathId as string | undefined;
      if (pathId) handleDeletePath(pathId);
    });
    const unsubMentor = on('UI:NAVIGATE_TO_MENTOR', (event) => {
      const graphId = event.payload?.graphId as string | undefined;
      if (graphId) navigate(`/concepts/${graphId}`);
    });
    return () => {
      unsubCreate();
      unsubPath();
      unsubDelete();
      unsubMentor();
    };
  }, [on, dispatch, navigate, handleDeletePath]);

  const learnEntity: LearnEntity = useMemo(
    () => ({
      learningPaths: learningPaths
        .filter(path => path.seedConcept !== null)
        .map(path => ({
          id: path.id,
          graphId: path.id,
          name: path.title,
          seedConcept: path.seedConcept?.name ?? '',
          conceptCount: path.conceptCount,
          levelCount: Math.max(1, Math.ceil(path.conceptCount / 7)),
          description: path.description,
        })),
      loading: isLoadingPaths || isLoadingGraph,
      error: pathsError ?? undefined,
    }),
    [learningPaths, isLoadingPaths, isLoadingGraph, pathsError]
  );

  const entity: LearnPathsTemplateEntity = useMemo(
    () => ({
      shell: {
        navigationItems: navItems.map(item => ({
          id: item.id,
          label: item.label,
          icon: item.icon,
          href: item.href,
          active: item.active,
        })),
        user: templateUser,
        brandName: 'KFlow',
        activeRoute: location.pathname,
        theme: 'light',
      },
      learn: learnEntity,
    }),
    [navItems, templateUser, location.pathname, learnEntity]
  );

  const overlay =
    showGoalForm || isExpanding ? (
      <Box className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Overlay />
        <Card className="relative z-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          {isExpanding ? (
            <VStack gap="md" align="center" className="py-8">
              <Spinner size="lg" />
              <Typography variant="h3">{t('learn.expanding.title')}</Typography>
              <Typography variant="body" color="secondary" className="text-center max-w-md">
                {parsedConcepts.length > 0
                  ? t('learn.expanding.progress', { count: String(parsedConcepts.length) })
                  : t('learn.expanding.building')}
              </Typography>
              {(parsedLevelName || parsedConcepts.length > 0) && (
                <VStack gap="sm" className="w-full max-h-72 overflow-y-auto">
                  {parsedLevelName && (
                    <Card className="px-4 py-2 bg-[var(--color-primary-muted)]">
                      <Typography variant="small" weight="semibold">
                        {t('learn.expanding.layer', { name: parsedLevelName })}
                      </Typography>
                    </Card>
                  )}
                  {parsedConcepts.map((concept, i) => (
                    <Card key={i} className="px-4 py-3">
                      <Typography variant="small" weight="medium">{concept.name}</Typography>
                      <Typography variant="caption" color="secondary" className="line-clamp-2">
                        {concept.description}
                      </Typography>
                    </Card>
                  ))}
                </VStack>
              )}
            </VStack>
          ) : (
            <GoalForm
              onComplete={result => handleGoalFormComplete(result)}
              onCancel={() => setShowGoalForm(false)}
            />
          )}
        </Card>
      </Box>
    ) : null;

  return <LearnPathsTemplate entity={entity} overlay={overlay} />;
};

LearnPage.displayName = 'LearnPage';
