/**
 * Public Course Index Service
 * 
 * Manages the public course index for efficient searching and browsing.
 * Integrates with the graph-based publishing system.
 */

import { getFirestore } from '../../config/firebaseAdmin';
import type { KnowledgeGraphAccessLayer } from '../knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import type {
  PublicCourseEntry,
  PublicCourseSearchFilters,
  PublicCourseSearchResult,
  FeaturedCourse,
  CourseCategory,
} from '../../types/publicCourse';
import { createPublicCourseEntry } from '../../types/publicCourse';

const PUBLIC_COURSES_COLLECTION = 'publicCourses';
const FEATURED_COURSES_COLLECTION = 'featuredCourses';
const CATEGORIES_COLLECTION = 'courseCategories';

export class PublicCourseIndexService {
  constructor(private accessLayer: KnowledgeGraphAccessLayer) {}

  // ==================== Index Management ====================

  /**
   * Add or update a course in the public index when publishing
   */
  async indexCourse(
    uid: string,
    graphId: string,
    mentorInfo: { name: string; avatar?: string }
  ): Promise<PublicCourseEntry> {
    // Get course data from graph
    const courseSettings = await this.accessLayer.getCourseSettings(uid, graphId);
    if (!courseSettings) {
      throw new Error('Course settings not found');
    }

    // Check if course is public
    if (courseSettings.visibility !== 'public') {
      // Remove from index if exists
      await this.removeFromIndex(graphId);
      throw new Error('Course is not public');
    }

    // Get published modules and lessons count
    const modules = await this.accessLayer.getPublishedModules(uid, graphId);
    const allLessons = await this.accessLayer.getAllPublishedLessons(uid, graphId);

    // Get language info
    const graph = await this.accessLayer.getGraph(uid, graphId);
    const languageConfigs = graph.nodeTypes.LanguageConfig || [];
    let primaryLanguage = courseSettings.defaultLanguage || 'en';
    let availableLanguages = [primaryLanguage];
    
    if (languageConfigs.length > 0) {
      const langConfig = graph.nodes[languageConfigs[0]];
      if (langConfig?.properties) {
        primaryLanguage = (langConfig.properties as any).primaryLanguage || primaryLanguage;
        availableLanguages = (langConfig.properties as any).supportedLanguages || availableLanguages;
      }
    }

    // Calculate estimated duration
    let estimatedDuration = 0;
    for (const lesson of allLessons) {
      estimatedDuration += lesson.estimatedDuration || 10; // Default 10 min per lesson
    }

    // Create entry data
    const entryData = createPublicCourseEntry(graphId, {
      title: courseSettings.title,
      description: courseSettings.description || '',
      thumbnailUrl: courseSettings.thumbnailUrl,
      mentorId: uid,
      mentorName: mentorInfo.name,
      mentorAvatar: mentorInfo.avatar,
      moduleCount: modules.length,
      lessonCount: allLessons.length,
      estimatedDuration,
      primaryLanguage,
      availableLanguages,
      category: courseSettings.category,
      tags: courseSettings.tags || [],
      difficulty: courseSettings.difficulty,
    });

    const now = Date.now();
    const db = getFirestore();

    // Check if entry exists
    const existingDoc = await db
      .collection(PUBLIC_COURSES_COLLECTION)
      .where('graphId', '==', graphId)
      .limit(1)
      .get();

    let entry: PublicCourseEntry;

    if (!existingDoc.empty) {
      // Update existing
      const docRef = existingDoc.docs[0].ref;
      const existingData = existingDoc.docs[0].data() as PublicCourseEntry;
      
      entry = {
        ...entryData,
        id: existingDoc.docs[0].id,
        enrollmentCount: existingData.enrollmentCount || 0,
        publishedAt: existingData.publishedAt,
        updatedAt: now,
      };

      await docRef.update({
        ...entryData,
        updatedAt: now,
      });
    } else {
      // Create new
      const docRef = db.collection(PUBLIC_COURSES_COLLECTION).doc();
      entry = {
        ...entryData,
        id: docRef.id,
        enrollmentCount: 0,
        publishedAt: now,
        updatedAt: now,
      };

      await docRef.set(entry);
    }

    // Update category count
    if (entry.category) {
      await this.updateCategoryCount(entry.category, 1);
    }

    return entry;
  }

  /**
   * Remove a course from the public index when unpublishing
   */
  async removeFromIndex(graphId: string): Promise<void> {
    const db = getFirestore();
    
    const snapshot = await db
      .collection(PUBLIC_COURSES_COLLECTION)
      .where('graphId', '==', graphId)
      .get();

    if (snapshot.empty) {
      return;
    }

    const batch = db.batch();
    
    for (const doc of snapshot.docs) {
      const data = doc.data() as PublicCourseEntry;
      
      // Update category count
      if (data.category) {
        await this.updateCategoryCount(data.category, -1);
      }
      
      batch.delete(doc.ref);
    }

    // Also remove from featured if present
    const featuredSnapshot = await db
      .collection(FEATURED_COURSES_COLLECTION)
      .where('graphId', '==', graphId)
      .get();

    for (const doc of featuredSnapshot.docs) {
      batch.delete(doc.ref);
    }

    await batch.commit();
  }

  /**
   * Update enrollment count for a course
   */
  async updateEnrollmentCount(graphId: string, delta: number): Promise<void> {
    const db = getFirestore();
    
    const snapshot = await db
      .collection(PUBLIC_COURSES_COLLECTION)
      .where('graphId', '==', graphId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return;
    }

    const docRef = snapshot.docs[0].ref;
    const currentCount = (snapshot.docs[0].data() as PublicCourseEntry).enrollmentCount || 0;
    
    await docRef.update({
      enrollmentCount: Math.max(0, currentCount + delta),
      updatedAt: Date.now(),
    });
  }

  // ==================== Search & Query ====================

  /**
   * Get all public courses from graphs
   * Queries all knowledge graphs and filters for those with public CourseSettings
   */
  private async getAllPublicCoursesFromGraphs(): Promise<PublicCourseEntry[]> {
    const db = getFirestore();
    const publicCourses: PublicCourseEntry[] = [];

    try {
      // Get all knowledge graphs from all users using collectionGroup
      const snapshot = await db.collectionGroup('knowledgeGraphs').get();
      
      // Process graphs in batches to avoid overwhelming the system
      const batchSize = 50;
      const graphDocs = snapshot.docs;
      
      for (let i = 0; i < graphDocs.length; i += batchSize) {
        const batch = graphDocs.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (doc) => {
            try {
              const graphId = doc.id;
              
              // Extract uid from document path: users/{uid}/knowledgeGraphs/{graphId}
              const pathParts = doc.ref.path.split('/');
              const uidIndex = pathParts.indexOf('users');
              if (uidIndex === -1 || uidIndex + 1 >= pathParts.length) {
                return; // Skip if path is malformed
              }
              const uid = pathParts[uidIndex + 1];

              // Check if graph has CourseSettings with public visibility
              const courseSettings = await this.accessLayer.getCourseSettings(uid, graphId);
              
              if (!courseSettings || !courseSettings.isPublished || courseSettings.visibility !== 'public') {
                return; // Skip non-public courses
              }

              // Get published modules and lessons
              const modules = await this.accessLayer.getPublishedModules(uid, graphId);
              const allLessons = await this.accessLayer.getAllPublishedLessons(uid, graphId);

              // Get graph for language info
              const graph = await this.accessLayer.getGraph(uid, graphId);
              const languageConfigs = graph.nodeTypes.LanguageConfig || [];
              let primaryLanguage = courseSettings.defaultLanguage || 'en';
              let availableLanguages = courseSettings.supportedLanguages || [primaryLanguage];
              
              if (languageConfigs.length > 0) {
                const langConfig = graph.nodes[languageConfigs[0]];
                if (langConfig?.properties) {
                  const langProps = langConfig.properties as any;
                  primaryLanguage = langProps.primaryLanguage || primaryLanguage;
                  availableLanguages = langProps.supportedLanguages || availableLanguages;
                }
              }

              // Calculate estimated duration
              let estimatedDuration = courseSettings.estimatedDuration || 0;
              if (estimatedDuration === 0) {
                for (const lesson of allLessons) {
                  estimatedDuration += lesson.estimatedDuration || 10;
                }
              }

              // Get user info for mentor name
              let mentorName = '';
              try {
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists) {
                  const userData = userDoc.data();
                  mentorName = (userData as any)?.name || (userData as any)?.email || 'Unknown';
                }
              } catch (err) {
                console.warn(`Failed to get user info for ${uid}:`, err);
              }

              // Get enrollment count (would need to query enrollments - for now use 0)
              // TODO: Query enrollment service for actual count
              const enrollmentCount = 0;

              // Create search text
              const searchText = [
                courseSettings.title || '',
                courseSettings.description || '',
                ...(courseSettings.tags || []),
                mentorName,
              ]
                .join(' ')
                .toLowerCase();

              // Create PublicCourseEntry
              const courseEntry: PublicCourseEntry = {
                id: graphId, // Use graphId as ID
                graphId,
                mentorId: uid,
                title: courseSettings.title || '',
                description: courseSettings.description || '',
                thumbnailUrl: courseSettings.thumbnailUrl,
                mentorName,
                mentorAvatar: undefined,
                moduleCount: modules.length,
                lessonCount: allLessons.length,
                enrollmentCount,
                estimatedDuration,
                primaryLanguage,
                availableLanguages,
                category: courseSettings.category,
                tags: courseSettings.tags || [],
                difficulty: courseSettings.difficulty,
                publishedAt: courseSettings.publishedAt || Date.now(),
                updatedAt: courseSettings.updatedAt || Date.now(),
                searchText,
              };

              publicCourses.push(courseEntry);
            } catch (error) {
              // Skip graphs that fail to load
              console.warn(`Failed to process graph ${doc.id}:`, error);
            }
          })
        );
      }
    } catch (error) {
      console.error('Failed to get public courses from graphs:', error);
      throw error;
    }

    return publicCourses;
  }

  /**
   * Search public courses with filters
   * Now reads from graphs instead of Firestore collections
   */
  async searchCourses(filters: PublicCourseSearchFilters): Promise<PublicCourseSearchResult> {
    // Get all public courses from graphs
    let courses = await this.getAllPublicCoursesFromGraphs();

    // Apply filters
    if (filters.category) {
      courses = courses.filter(c => c.category === filters.category);
    }

    if (filters.difficulty) {
      courses = courses.filter(c => c.difficulty === filters.difficulty);
    }

    if (filters.language) {
      courses = courses.filter(c => c.availableLanguages.includes(filters.language!));
    }

    if (filters.mentorId) {
      courses = courses.filter(c => c.mentorId === filters.mentorId);
    }

    // Apply text search filter
    if (filters.query) {
      const searchTerm = filters.query.toLowerCase();
      courses = courses.filter(c => c.searchText.includes(searchTerm));
    }

    // Apply duration filters
    if (filters.minDuration !== undefined) {
      courses = courses.filter(c => (c.estimatedDuration || 0) >= filters.minDuration!);
    }
    if (filters.maxDuration !== undefined) {
      courses = courses.filter(c => (c.estimatedDuration || 0) <= filters.maxDuration!);
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      courses = courses.filter(c => 
        filters.tags!.some(tag => c.tags.includes(tag))
      );
    }

    // Sort
    const sortBy = filters.sortBy || 'publishedAt';
    const sortOrder = filters.sortOrder || 'desc';
    courses.sort((a, b) => {
      const aVal = (a as any)[sortBy] || 0;
      const bVal = (b as any)[sortBy] || 0;
      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });

    // Get total before pagination
    const total = courses.length;

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    courses = courses.slice(offset, offset + limit);

    const hasMore = offset + courses.length < total;

    return {
      courses,
      total,
      hasMore,
      nextOffset: hasMore ? offset + limit : undefined,
    };
  }

  /**
   * Get a single public course by graph ID
   * Reads from graph instead of Firestore
   */
  async getCourseByGraphId(graphId: string): Promise<PublicCourseEntry | null> {
    const db = getFirestore();
    
    // Find the graph document to get the uid
    // Note: collectionGroup queries don't support __name__ filter directly
    // We need to query all and filter, or use a different approach
    const snapshot = await db.collectionGroup('knowledgeGraphs').get();
    
    // Find the graph document
    const graphDoc = snapshot.docs.find(doc => doc.id === graphId);
    if (!graphDoc) {
      return null;
    }

    const pathParts = graphDoc.ref.path.split('/');
    const uidIndex = pathParts.indexOf('users');
    if (uidIndex === -1 || uidIndex + 1 >= pathParts.length) {
      return null;
    }
    const uid = pathParts[uidIndex + 1];

    // Get course settings from graph
    const courseSettings = await this.accessLayer.getCourseSettings(uid, graphId);
    
    if (!courseSettings || !courseSettings.isPublished || courseSettings.visibility !== 'public') {
      return null;
    }

    // Get published modules and lessons
    const modules = await this.accessLayer.getPublishedModules(uid, graphId);
    const allLessons = await this.accessLayer.getAllPublishedLessons(uid, graphId);

    // Get graph for language info
    const graph = await this.accessLayer.getGraph(uid, graphId);
    const languageConfigs = graph.nodeTypes.LanguageConfig || [];
    let primaryLanguage = courseSettings.defaultLanguage || 'en';
    let availableLanguages = courseSettings.supportedLanguages || [primaryLanguage];
    
    if (languageConfigs.length > 0) {
      const langConfig = graph.nodes[languageConfigs[0]];
      if (langConfig?.properties) {
        const langProps = langConfig.properties as any;
        primaryLanguage = langProps.primaryLanguage || primaryLanguage;
        availableLanguages = langProps.supportedLanguages || availableLanguages;
      }
    }

    // Calculate estimated duration
    let estimatedDuration = courseSettings.estimatedDuration || 0;
    if (estimatedDuration === 0) {
      for (const lesson of allLessons) {
        estimatedDuration += lesson.estimatedDuration || 10;
      }
    }

    // Get user info for mentor name
    let mentorName = '';
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        mentorName = (userData as any)?.name || (userData as any)?.email || 'Unknown';
      }
    } catch (err) {
      console.warn(`Failed to get user info for ${uid}:`, err);
    }

    // Create search text
    const searchText = [
      courseSettings.title || '',
      courseSettings.description || '',
      ...(courseSettings.tags || []),
      mentorName,
    ]
      .join(' ')
      .toLowerCase();

    return {
      id: graphId,
      graphId,
      mentorId: uid,
      title: courseSettings.title || '',
      description: courseSettings.description || '',
      thumbnailUrl: courseSettings.thumbnailUrl,
      mentorName,
      mentorAvatar: undefined,
      moduleCount: modules.length,
      lessonCount: allLessons.length,
      enrollmentCount: 0, // TODO: Query enrollment service
      estimatedDuration,
      primaryLanguage,
      availableLanguages,
      category: courseSettings.category,
      tags: courseSettings.tags || [],
      difficulty: courseSettings.difficulty,
      publishedAt: courseSettings.publishedAt || Date.now(),
      updatedAt: courseSettings.updatedAt || Date.now(),
      searchText,
    };
  }

  /**
   * Get a single public course by ID (graphId)
   * Reads from graph instead of Firestore
   */
  async getCourseById(id: string): Promise<PublicCourseEntry | null> {
    // ID is the graphId
    return this.getCourseByGraphId(id);
  }

  /**
   * List all public courses (paginated)
   */
  async listCourses(
    limit: number = 20,
    offset: number = 0
  ): Promise<PublicCourseSearchResult> {
    return this.searchCourses({ limit, offset });
  }

  /**
   * Get courses by mentor
   */
  async getCoursesByMentor(mentorId: string): Promise<PublicCourseEntry[]> {
    const result = await this.searchCourses({
      mentorId,
      limit: 100,
      sortBy: 'publishedAt',
      sortOrder: 'desc',
    });
    return result.courses;
  }

  // ==================== Featured Courses ====================

  /**
   * Get featured courses
   * Reads featured course metadata from Firestore, but course data from graphs
   */
  async getFeaturedCourses(limit: number = 10): Promise<FeaturedCourse[]> {
    const db = getFirestore();
    
    // Get featured course metadata from Firestore
    const snapshot = await db
      .collection(FEATURED_COURSES_COLLECTION)
      .orderBy('priority', 'desc')
      .orderBy('featuredAt', 'desc')
      .limit(limit)
      .get();

    // Fetch actual course data from graphs
    const featuredCourses: FeaturedCourse[] = [];
    
    for (const doc of snapshot.docs) {
      const featuredData = doc.data() as any;
      const graphId = featuredData.graphId;
      
      if (!graphId) continue;
      
      // Get course from graph
      const course = await this.getCourseByGraphId(graphId);
      if (course) {
        featuredCourses.push({
          ...course,
          featuredAt: featuredData.featuredAt || Date.now(),
          featuredReason: featuredData.featuredReason,
          priority: featuredData.priority || 0,
        });
      }
    }

    return featuredCourses;
  }

  /**
   * Feature a course (admin function)
   */
  async featureCourse(
    graphId: string,
    reason?: string,
    priority: number = 0
  ): Promise<FeaturedCourse | null> {
    // Get course from index
    const course = await this.getCourseByGraphId(graphId);
    if (!course) {
      return null;
    }

    const db = getFirestore();
    const featuredCourse: FeaturedCourse = {
      ...course,
      featuredAt: Date.now(),
      featuredReason: reason,
      priority,
    };

    await db
      .collection(FEATURED_COURSES_COLLECTION)
      .doc(course.id)
      .set(featuredCourse);

    return featuredCourse;
  }

  /**
   * Unfeature a course
   */
  async unfeatureCourse(graphId: string): Promise<void> {
    const db = getFirestore();
    
    const snapshot = await db
      .collection(FEATURED_COURSES_COLLECTION)
      .where('graphId', '==', graphId)
      .get();

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  // ==================== Categories ====================

  /**
   * Get all categories
   */
  async getCategories(): Promise<CourseCategory[]> {
    const db = getFirestore();
    
    const snapshot = await db
      .collection(CATEGORIES_COLLECTION)
      .orderBy('name')
      .get();

    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as CourseCategory[];
  }

  /**
   * Get or create a category
   */
  async getOrCreateCategory(
    name: string,
    description?: string
  ): Promise<CourseCategory> {
    const db = getFirestore();
    
    // Check if exists
    const snapshot = await db
      .collection(CATEGORIES_COLLECTION)
      .where('name', '==', name)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return {
        ...snapshot.docs[0].data(),
        id: snapshot.docs[0].id,
      } as CourseCategory;
    }

    // Create new
    const category: Omit<CourseCategory, 'id'> = {
      name,
      description,
      courseCount: 0,
    };

    const docRef = await db.collection(CATEGORIES_COLLECTION).add(category);
    
    return {
      ...category,
      id: docRef.id,
    };
  }

  /**
   * Update category course count
   */
  private async updateCategoryCount(
    categoryName: string,
    delta: number
  ): Promise<void> {
    const db = getFirestore();
    
    const snapshot = await db
      .collection(CATEGORIES_COLLECTION)
      .where('name', '==', categoryName)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Create category if it doesn't exist
      if (delta > 0) {
        await this.getOrCreateCategory(categoryName);
      }
      return;
    }

    const docRef = snapshot.docs[0].ref;
    const currentCount = (snapshot.docs[0].data() as CourseCategory).courseCount || 0;
    
    await docRef.update({
      courseCount: Math.max(0, currentCount + delta),
    });
  }

  // ==================== Popular & Trending ====================

  /**
   * Get popular courses (by enrollment count)
   */
  async getPopularCourses(limit: number = 10): Promise<PublicCourseEntry[]> {
    const result = await this.searchCourses({
      sortBy: 'enrollmentCount',
      sortOrder: 'desc',
      limit,
    });
    return result.courses;
  }

  /**
   * Get recently published courses
   */
  async getRecentCourses(limit: number = 10): Promise<PublicCourseEntry[]> {
    const result = await this.searchCourses({
      sortBy: 'publishedAt',
      sortOrder: 'desc',
      limit,
    });
    return result.courses;
  }
}
