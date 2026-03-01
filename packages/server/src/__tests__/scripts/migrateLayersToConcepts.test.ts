import { migrateGraph } from '../../scripts/migrateLayersToConcepts';
import { Concept } from '../../types/concept';
import { StoredConceptGraph } from '../../services/graphService';
import { LayerDocument } from '../../services/layerService';

// Mock Firebase Admin
jest.mock('../../config/firebaseAdmin', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(),
          })),
        })),
      })),
    })),
  })),
}));

// Mock services
jest.mock('../../services/graphService', () => ({
  getUserGraphById: jest.fn(),
  upsertUserGraph: jest.fn(),
}));

jest.mock('../../services/layerService', () => ({
  getLayerByNumber: jest.fn(),
}));

import { getUserGraphById, upsertUserGraph } from '../../services/graphService';
import { getLayerByNumber } from '../../services/layerService';
import { getFirestore } from '../../config/firebaseAdmin';

describe('migrateLayersToConcepts', () => {
  const uid = 'test-uid';
  const graphId = 'test-graph-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Graphs with layers - successful migration', () => {
    it('should migrate a graph with single layer correctly', async () => {
      const seedConcept: Concept = {
        id: 'seed-1',
        name: 'React',
        description: 'A JavaScript library',
        parents: [],
        children: ['Component'],
        isSeed: true,
      };

      const layer1Concept: Concept = {
        id: 'concept-1',
        name: 'Component',
        description: 'Building blocks',
        layer: 1,
        parents: ['React'],
        children: [],
      };

      const mockGraph: StoredConceptGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {
          'React': seedConcept,
          'Component': layer1Concept,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (getFirestore as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ empty: true }),
              })),
            })),
          })),
        })),
      });
      (upsertUserGraph as jest.Mock).mockResolvedValue(undefined);

      await migrateGraph(uid, graphId);

      expect(getUserGraphById).toHaveBeenCalledWith(uid, graphId);
      expect(upsertUserGraph).toHaveBeenCalled();

      const savedGraph = (upsertUserGraph as jest.Mock).mock.calls[0][1];
      const savedConcepts = savedGraph.concepts;

      // Check that Level 1 concept was created
      expect(savedConcepts['Level 1']).toBeDefined();
      expect(savedConcepts['Level 1'].name).toBe('Level 1');
      expect(savedConcepts['Level 1'].parents).toEqual(['React']);
      expect(savedConcepts['Level 1'].children).toEqual(['Component']);

      // Check that Component was updated
      expect(savedConcepts['Component']).toBeDefined();
      expect(savedConcepts['Component'].parents).toContain('Level 1');
      expect(savedConcepts['Component'].layer).toBeUndefined();

      // Check that seed concept was updated with Level 1 as child
      expect(savedConcepts['React'].children).toContain('Level 1');
      expect(savedConcepts['React'].isSeed).toBe(true);
    });

    it('should migrate a graph with multiple layers correctly', async () => {
      const seedConcept: Concept = {
        id: 'seed-1',
        name: 'React',
        description: 'A JavaScript library',
        parents: [],
        children: ['Component'],
        isSeed: true,
      };

      const layer1Concept1: Concept = {
        id: 'concept-1',
        name: 'Component',
        description: 'Building blocks',
        layer: 1,
        parents: ['React'],
        children: [],
      };

      const layer1Concept2: Concept = {
        id: 'concept-2',
        name: 'Props',
        description: 'Component properties',
        layer: 1,
        parents: ['React'],
        children: [],
      };

      const layer2Concept: Concept = {
        id: 'concept-3',
        name: 'State',
        description: 'Component state',
        layer: 2,
        parents: ['Component'],
        children: [],
      };

      const mockGraph: StoredConceptGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {
          'React': seedConcept,
          'Component': layer1Concept1,
          'Props': layer1Concept2,
          'State': layer2Concept,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (getFirestore as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ empty: true }),
              })),
            })),
          })),
        })),
      });
      (upsertUserGraph as jest.Mock).mockResolvedValue(undefined);

      await migrateGraph(uid, graphId);

      const savedGraph = (upsertUserGraph as jest.Mock).mock.calls[0][1];
      const savedConcepts = savedGraph.concepts;

      // Check that Level 1 and Level 2 concepts were created
      expect(savedConcepts['Level 1']).toBeDefined();
      expect(savedConcepts['Level 2']).toBeDefined();

      // Check Level 1 children
      expect(savedConcepts['Level 1'].children).toContain('Component');
      expect(savedConcepts['Level 1'].children).toContain('Props');

      // Check Level 2 children
      expect(savedConcepts['Level 2'].children).toContain('State');

      // Check that concepts have level concepts as first parent
      expect(savedConcepts['Component'].parents[0]).toBe('Level 1');
      expect(savedConcepts['Props'].parents[0]).toBe('Level 1');
      expect(savedConcepts['State'].parents[0]).toBe('Level 2');

      // Check that layer property is removed
      expect(savedConcepts['Component'].layer).toBeUndefined();
      expect(savedConcepts['Props'].layer).toBeUndefined();
      expect(savedConcepts['State'].layer).toBeUndefined();

      // Check seed concept has both level concepts as children
      expect(savedConcepts['React'].children).toContain('Level 1');
      expect(savedConcepts['React'].children).toContain('Level 2');
    });

    it('should preserve goals from layer documents', async () => {
      const seedConcept: Concept = {
        id: 'seed-1',
        name: 'React',
        description: 'A JavaScript library',
        parents: [],
        children: [],
        isSeed: true,
      };

      const layer1Concept: Concept = {
        id: 'concept-1',
        name: 'Component',
        description: 'Building blocks',
        layer: 1,
        parents: ['React'],
        children: [],
      };

      const mockGraph: StoredConceptGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {
          'React': seedConcept,
          'Component': layer1Concept,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const mockLayerDoc: LayerDocument = {
        layerNumber: 1,
        prompt: 'test prompt',
        response: 'test response',
        goal: 'Learn React components',
        conceptIds: ['concept-1'],
        createdAt: Date.now(),
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      
      // Mock Firestore chain for layer document check
      // db.collection('users').doc(uid).collection('graphs').doc(graphId).collection('layers').limit(1).get()
      const mockLayersSnapshot = {
        empty: false,
      };
      
      const mockLayersCollection = {
        limit: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(mockLayersSnapshot),
        })),
      };
      
      const mockGraphDoc = {
        collection: jest.fn((name: string) => {
          if (name === 'layers') {
            return mockLayersCollection;
          }
          return { limit: jest.fn(() => ({ get: jest.fn() })) };
        }),
      };
      
      const mockGraphsCollection = {
        doc: jest.fn(() => mockGraphDoc),
      };
      
      const mockUserDoc = {
        collection: jest.fn((name: string) => {
          if (name === 'graphs') {
            return mockGraphsCollection;
          }
          return { doc: jest.fn() };
        }),
      };
      
      const mockUsersCollection = {
        doc: jest.fn(() => mockUserDoc),
      };
      
      (getFirestore as jest.Mock).mockReturnValue({
        collection: jest.fn((name: string) => {
          if (name === 'users') {
            return mockUsersCollection;
          }
          return { doc: jest.fn() };
        }),
      });
      
      (getLayerByNumber as jest.Mock).mockResolvedValue(mockLayerDoc);
      (upsertUserGraph as jest.Mock).mockResolvedValue(undefined);

      await migrateGraph(uid, graphId);

      const savedGraph = (upsertUserGraph as jest.Mock).mock.calls[0][1];
      const savedConcepts = savedGraph.concepts;

      expect(savedConcepts['Level 1'].goal).toBe('Learn React components');
    });

    it('should preserve sequence order for level concepts', async () => {
      const seedConcept: Concept = {
        id: 'seed-1',
        name: 'React',
        description: 'A JavaScript library',
        parents: [],
        children: [],
        isSeed: true,
      };

      const existingTopLevel: Concept = {
        id: 'existing-1',
        name: 'Existing Level',
        description: 'Existing top level',
        parents: ['React'],
        children: [],
        sequence: 100,
      };

      const layer1Concept: Concept = {
        id: 'concept-1',
        name: 'Component',
        description: 'Building blocks',
        layer: 1,
        parents: ['React'],
        children: [],
      };

      const mockGraph: StoredConceptGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {
          'React': seedConcept,
          'Existing Level': existingTopLevel,
          'Component': layer1Concept,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (getFirestore as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ empty: true }),
              })),
            })),
          })),
        })),
      });
      (upsertUserGraph as jest.Mock).mockResolvedValue(undefined);

      await migrateGraph(uid, graphId);

      const savedGraph = (upsertUserGraph as jest.Mock).mock.calls[0][1];
      const savedConcepts = savedGraph.concepts;

      // Level 1 should have sequence > 100 (max existing sequence)
      expect(savedConcepts['Level 1'].sequence).toBeGreaterThan(100);
      expect(savedConcepts['Existing Level'].sequence).toBe(100);
    });

    it('should preserve existing parents when adding level concept as first parent', async () => {
      const seedConcept: Concept = {
        id: 'seed-1',
        name: 'React',
        description: 'A JavaScript library',
        parents: [],
        children: [],
        isSeed: true,
      };

      const layer1Concept: Concept = {
        id: 'concept-1',
        name: 'Component',
        description: 'Building blocks',
        layer: 1,
        parents: ['React', 'JavaScript'], // Multiple existing parents
        children: [],
      };

      const mockGraph: StoredConceptGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {
          'React': seedConcept,
          'Component': layer1Concept,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (getFirestore as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ empty: true }),
              })),
            })),
          })),
        })),
      });
      (upsertUserGraph as jest.Mock).mockResolvedValue(undefined);

      await migrateGraph(uid, graphId);

      const savedGraph = (upsertUserGraph as jest.Mock).mock.calls[0][1];
      const savedConcepts = savedGraph.concepts;

      // Level 1 should be first parent, but existing parents should be preserved
      expect(savedConcepts['Component'].parents[0]).toBe('Level 1');
      expect(savedConcepts['Component'].parents).toContain('React');
      expect(savedConcepts['Component'].parents).toContain('JavaScript');
    });
  });

  describe('Seed concept exclusion', () => {
    it('should exclude seed concept from being added to any level', async () => {
      const seedConcept: Concept = {
        id: 'seed-1',
        name: 'React',
        description: 'A JavaScript library',
        layer: 0, // Seed has layer property (edge case)
        parents: [],
        children: [],
        isSeed: true,
      };

      const layer0Concept: Concept = {
        id: 'concept-1',
        name: 'Component',
        description: 'Building blocks',
        layer: 0,
        parents: ['React'],
        children: [],
      };

      const mockGraph: StoredConceptGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {
          'React': seedConcept,
          'Component': layer0Concept,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (getFirestore as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ empty: true }),
              })),
            })),
          })),
        })),
      });
      (upsertUserGraph as jest.Mock).mockResolvedValue(undefined);

      await migrateGraph(uid, graphId);

      const savedGraph = (upsertUserGraph as jest.Mock).mock.calls[0][1];
      const savedConcepts = savedGraph.concepts;

      // Level 0 should exist
      expect(savedConcepts['Level 0']).toBeDefined();

      // Seed concept should NOT be a child of Level 0
      expect(savedConcepts['Level 0'].children).not.toContain('React');
      expect(savedConcepts['Level 0'].children).toContain('Component');

      // Seed concept should remain separate
      expect(savedConcepts['React'].isSeed).toBe(true);
      expect(savedConcepts['React'].parents).toEqual([]);
    });

    it('should not update seed concept to have level concept as parent', async () => {
      const seedConcept: Concept = {
        id: 'seed-1',
        name: 'React',
        description: 'A JavaScript library',
        layer: 1, // Seed has layer property (edge case)
        parents: [],
        children: [],
        isSeed: true,
      };

      const layer1Concept: Concept = {
        id: 'concept-1',
        name: 'Component',
        description: 'Building blocks',
        layer: 1,
        parents: ['React'],
        children: [],
      };

      const mockGraph: StoredConceptGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {
          'React': seedConcept,
          'Component': layer1Concept,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (getFirestore as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ empty: true }),
              })),
            })),
          })),
        })),
      });
      (upsertUserGraph as jest.Mock).mockResolvedValue(undefined);

      await migrateGraph(uid, graphId);

      const savedGraph = (upsertUserGraph as jest.Mock).mock.calls[0][1];
      const savedConcepts = savedGraph.concepts;

      // Seed concept should NOT have Level 1 as parent
      expect(savedConcepts['React'].parents).not.toContain('Level 1');
      expect(savedConcepts['React'].parents).toEqual([]);
      expect(savedConcepts['React'].isSeed).toBe(true);
    });
  });

  describe('Existing graphs without layers - no corruption', () => {
    it('should skip graphs without layer property', async () => {
      const seedConcept: Concept = {
        id: 'seed-1',
        name: 'React',
        description: 'A JavaScript library',
        parents: [],
        children: ['Component'],
        isSeed: true,
      };

      const concept: Concept = {
        id: 'concept-1',
        name: 'Component',
        description: 'Building blocks',
        // No layer property
        parents: ['React'],
        children: [],
      };

      const mockGraph: StoredConceptGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {
          'React': seedConcept,
          'Component': concept,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (upsertUserGraph as jest.Mock).mockResolvedValue(undefined);

      await migrateGraph(uid, graphId);

      // Should not call upsertUserGraph for graphs without layers
      expect(upsertUserGraph).not.toHaveBeenCalled();
    });

    it('should preserve existing top-level concepts that are not level concepts', async () => {
      const seedConcept: Concept = {
        id: 'seed-1',
        name: 'React',
        description: 'A JavaScript library',
        parents: [],
        children: ['Existing Level', 'Component'],
        isSeed: true,
      };

      const existingTopLevel: Concept = {
        id: 'existing-1',
        name: 'Existing Level',
        description: 'Existing top level',
        parents: ['React'],
        children: [],
        sequence: 50,
      };

      const layer1Concept: Concept = {
        id: 'concept-1',
        name: 'Component',
        description: 'Building blocks',
        layer: 1,
        parents: ['React'],
        children: [],
      };

      const mockGraph: StoredConceptGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {
          'React': seedConcept,
          'Existing Level': existingTopLevel,
          'Component': layer1Concept,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (getFirestore as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ empty: true }),
              })),
            })),
          })),
        })),
      });
      (upsertUserGraph as jest.Mock).mockResolvedValue(undefined);

      await migrateGraph(uid, graphId);

      const savedGraph = (upsertUserGraph as jest.Mock).mock.calls[0][1];
      const savedConcepts = savedGraph.concepts;

      // Existing top-level concept should be preserved unchanged
      expect(savedConcepts['Existing Level']).toBeDefined();
      expect(savedConcepts['Existing Level'].parents).toEqual(['React']);
      expect(savedConcepts['Existing Level'].sequence).toBe(50);
      expect(savedConcepts['Existing Level'].layer).toBeUndefined();
    });

    it('should preserve concepts without layer property', async () => {
      const seedConcept: Concept = {
        id: 'seed-1',
        name: 'React',
        description: 'A JavaScript library',
        parents: [],
        children: ['Component', 'Unrelated'],
        isSeed: true,
      };

      const layer1Concept: Concept = {
        id: 'concept-1',
        name: 'Component',
        description: 'Building blocks',
        layer: 1,
        parents: ['React'],
        children: [],
      };

      const unrelatedConcept: Concept = {
        id: 'concept-2',
        name: 'Unrelated',
        description: 'Unrelated concept',
        // No layer property
        parents: ['React'],
        children: [],
      };

      const mockGraph: StoredConceptGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {
          'React': seedConcept,
          'Component': layer1Concept,
          'Unrelated': unrelatedConcept,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (getFirestore as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ empty: true }),
              })),
            })),
          })),
        })),
      });
      (upsertUserGraph as jest.Mock).mockResolvedValue(undefined);

      await migrateGraph(uid, graphId);

      const savedGraph = (upsertUserGraph as jest.Mock).mock.calls[0][1];
      const savedConcepts = savedGraph.concepts;

      // Unrelated concept should be preserved as-is
      expect(savedConcepts['Unrelated']).toBeDefined();
      expect(savedConcepts['Unrelated'].parents).toEqual(['React']);
      expect(savedConcepts['Unrelated'].layer).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty graph gracefully', async () => {
      const mockGraph: StoredConceptGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (upsertUserGraph as jest.Mock).mockResolvedValue(undefined);

      await migrateGraph(uid, graphId);

      expect(upsertUserGraph).not.toHaveBeenCalled();
    });

    it('should handle graph without seed concept gracefully', async () => {
      const concept: Concept = {
        id: 'concept-1',
        name: 'Component',
        description: 'Building blocks',
        layer: 1,
        parents: [],
        children: [],
      };

      const mockGraph: StoredConceptGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        concepts: {
          'Component': concept,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (upsertUserGraph as jest.Mock).mockResolvedValue(undefined);

      await migrateGraph(uid, graphId);

      expect(upsertUserGraph).not.toHaveBeenCalled();
    });

    it('should handle graph not found gracefully', async () => {
      (getUserGraphById as jest.Mock).mockResolvedValue(null);
      (upsertUserGraph as jest.Mock).mockResolvedValue(undefined);

      await migrateGraph(uid, graphId);

      expect(upsertUserGraph).not.toHaveBeenCalled();
    });
  });
});

