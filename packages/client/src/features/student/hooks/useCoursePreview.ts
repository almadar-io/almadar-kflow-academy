import { useState, useEffect, useCallback, useRef } from 'react';
import { graphPublishingApi } from '../../knowledge-graph/api/publishingApi';
import { publicApi } from '../../public/publicApi';
import { auth } from '../../../config/firebase';
import type { LessonPreview } from '../types';

/**
 * Module type for course preview
 * Includes all properties needed by UI components
 */
export interface PublishedModule {
  id: string;
  name: string;
  description: string;
  layerNumber: number;
  goal?: string;
  conceptCount: number;
  sequence?: number;
  // Backward-compatible aliases
  title?: string;
  conceptName?: string;
  estimatedDuration?: number;
}

/**
 * Course preview type
 * Includes all properties needed by UI components with backward-compatible fields
 */
export interface CoursePreview {
  // Primary identifier (graphId for graph-based courses)
  graphId: string;
  // Alias for backward compatibility
  id: string;
  title: string;
  description: string;
  visibility: 'public' | 'private' | 'unlisted';
  isPublished: boolean;
  publishedAt?: number;
  enrollmentEnabled: boolean;
  thumbnailUrl?: string;
  category?: string;
  modules: PublishedModule[];
  // Backward-compatible fields
  isPublic: boolean;
  seedConceptName?: string;
  moduleIds?: string[];
  estimatedDuration?: number;
}

interface UseCoursePreviewOptions {
  enabled?: boolean; // Whether to automatically load on mount
}

interface UseCoursePreviewReturn {
  course: CoursePreview | null;
  modules: PublishedModule[];
  lessons: LessonPreview[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Hook to load and manage course preview data
 * 
 * Note: courseId is now the graphId for graph-based publishing
 */
export function useCoursePreview(
  courseId: string,
  options: UseCoursePreviewOptions = {}
): UseCoursePreviewReturn {
  const { enabled = true } = options;
  const [course, setCourse] = useState<CoursePreview | null>(null);
  const [modules, setModules] = useState<PublishedModule[]>([]);
  const [lessons, setLessons] = useState<LessonPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousCourseIdRef = useRef<string | null>(null);

  const loadCoursePreview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Check if user is authenticated to determine which API to use
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Use graph-based API for logged-in users
        const courseResult = await graphPublishingApi.getPublishedCourseView(courseId);
        
        if (!courseResult.course) {
          throw new Error('Course not found');
        }

        const courseData = courseResult.course;
        const courseModules = courseData.seed?.modules || [];
        
        setCourse({
          graphId: courseData.graphId,
          id: courseData.graphId, // Alias
          title: courseData.title,
          description: courseData.description,
          visibility: courseData.visibility,
          isPublished: courseData.isPublished,
          publishedAt: courseData.publishedAt,
          enrollmentEnabled: courseData.enrollmentEnabled,
          thumbnailUrl: courseData.thumbnailUrl,
          category: courseData.category,
          modules: courseModules,
          // Backward-compatible fields
          isPublic: courseData.visibility === 'public',
          seedConceptName: courseData.title,
          moduleIds: courseModules.map((m: any) => m.id),
        });

        // Get modules from the course view with backward-compatible fields
        const publishedModules: PublishedModule[] = courseModules.map((m: any, index: number) => ({
          id: m.id,
          name: m.name,
          description: m.description || '',
          layerNumber: m.layerNumber ?? index,
          goal: m.goal,
          conceptCount: m.conceptCount || 0,
          sequence: m.layerNumber ?? index,
          // Backward-compatible aliases
          title: m.name,
          conceptName: m.name,
        }));
        setModules(publishedModules);

        // Fetch lessons for each module (only published lessons)
        const allLessons: LessonPreview[] = [];
        for (const module of publishedModules) {
          try {
            const lessonsResult = await graphPublishingApi.getModuleLessons(courseId, module.id);
            const moduleLessons = (lessonsResult.lessons || []).filter((lesson: any) => lesson.isPublished);
            
            moduleLessons.forEach((lesson: any, index: number) => {
              allLessons.push({
                id: lesson.id,
                title: lesson.name,
                description: lesson.description || '',
                lessonContent: '', // Would need to be fetched separately if needed
                flashCards: [],
                moduleTitle: module.name,
                moduleId: module.id,
                sequence: lesson.sequence ?? index,
              });
            });
          } catch (lessonError) {
            console.warn(`Failed to load lessons for module ${module.id}:`, lessonError);
          }
        }

        // Sort lessons by module sequence and lesson sequence
        allLessons.sort((a, b) => {
          const moduleA = publishedModules.find(m => m.id === a.moduleId);
          const moduleB = publishedModules.find(m => m.id === b.moduleId);
          if (moduleA && moduleB) {
            if (moduleA.layerNumber !== moduleB.layerNumber) {
              return moduleA.layerNumber - moduleB.layerNumber;
            }
          }
          return a.sequence - b.sequence;
        });

        setLessons(allLessons);
      } else {
        // Use public API for unauthenticated users
        const result = await publicApi.getCourseDetails(courseId, {
          includeModules: true,
          includeLessons: true,
        });
        
        const courseData = result.course;
        const isPublic = courseData?.isPublic ?? true;
        
        setCourse({
          graphId: courseData?.id || courseId,
          id: courseData?.id || courseId,
          title: courseData?.title || '',
          description: courseData?.description || '',
          visibility: isPublic ? 'public' : 'private',
          isPublished: true,
          publishedAt: courseData?.publishedAt,
          enrollmentEnabled: true,
          thumbnailUrl: courseData?.thumbnailUrl,
          category: courseData?.category,
          modules: [],
          // Backward-compatible fields
          isPublic,
          seedConceptName: courseData?.seedConceptName || courseData?.title,
          moduleIds: (result.modules || []).map((m: any) => m.id),
          estimatedDuration: courseData?.estimatedDuration,
        });

        const publishedModules: PublishedModule[] = (result.modules || []).map((m: any, index: number) => ({
          id: m.id,
          name: m.title || m.conceptName || '',
          description: m.description || '',
          layerNumber: m.sequence ?? index,
          conceptCount: 0,
          sequence: m.sequence ?? index,
          // Backward-compatible aliases
          title: m.title || m.conceptName || '',
          conceptName: m.conceptName || m.title || '',
          estimatedDuration: m.estimatedDuration,
        }));
        setModules(publishedModules);

        const allLessons: LessonPreview[] = (result.lessons || []).map((lesson: any) => {
          const module = publishedModules.find((m: any) => m.id === lesson.moduleId);
          return {
            id: lesson.id,
            title: lesson.title || lesson.conceptName,
            description: lesson.description || '',
            lessonContent: lesson.lessonContent,
            flashCards: lesson.flashCards?.map((fc: any) => ({
              front: fc.front,
              back: fc.back,
            })) || [],
            moduleTitle: module?.name || '',
            moduleId: lesson.moduleId,
            sequence: lesson.sequence,
          };
        });

        allLessons.sort((a, b) => {
          const moduleA = publishedModules.find((m: any) => m.id === a.moduleId);
          const moduleB = publishedModules.find((m: any) => m.id === b.moduleId);
          if (moduleA && moduleB) {
            if (moduleA.layerNumber !== moduleB.layerNumber) {
              return moduleA.layerNumber - moduleB.layerNumber;
            }
          }
          return a.sequence - b.sequence;
        });

        setLessons(allLessons);
      }
    } catch (error: any) {
      console.error('Failed to load course preview:', error);
      setError(error.message || 'Failed to load course preview');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId !== previousCourseIdRef.current) {
      previousCourseIdRef.current = courseId;
      
      // Clear previous data when courseId changes
      if (!courseId) {
        setCourse(null);
        setModules([]);
        setLessons([]);
        setIsLoading(false);
        setError(null);
        return;
      }
      
      // Load course preview if enabled
      if (enabled) {
        loadCoursePreview();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, courseId]); // loadCoursePreview is stable (useCallback with courseId dependency)

  return {
    course,
    modules,
    lessons,
    isLoading,
    error,
    reload: loadCoursePreview,
  };
}
