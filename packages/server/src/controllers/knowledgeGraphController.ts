/**
 * Knowledge Graph Controller
 * 
 * Handles API requests for knowledge graph conversion and export.
 * Part of Phase 2: Concept Graph to Knowledge Graph Conversion
 */

import type { Request, Response } from 'express';
import { 
  convertStoredConceptGraphToNodeBased, 
  saveNodeBasedKnowledgeGraph, 
  getNodeBasedKnowledgeGraph 
} from '../services/knowledgeGraphService';
import { exportToGraphML, type GraphMLExportOptions } from '../services/graphmlExportService';
import { getUserGraphById } from '../services/graphService';
import { getGoalsByGraphId } from '../services/goalService';
import type { ConvertToNodeBasedOptions } from '../services/knowledgeGraphService';
import { generateNodeId } from '../types/nodeBasedKnowledgeGraph';

/**
 * Convert ConceptGraph to NodeBasedKnowledgeGraph
 * POST /api/knowledge-graphs/convert
 */
export async function convertGraphHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId } = req.params;
    const uid = (req as any).firebaseUser?.uid;

    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!graphId) {
      res.status(400).json({ error: 'graphId is required' });
      return;
    }

    // Get options from query parameters
    const options: ConvertToNodeBasedOptions = {
      includeLayers: req.query.includeLayers !== 'false',
      includeLessons: req.query.includeLessons !== 'false',
      includeMetadata: req.query.includeMetadata !== 'false',
      includeFlashCards: req.query.includeFlashCards !== 'false',
    };

    // Fetch ConceptGraph
    const conceptGraph = await getUserGraphById(uid, graphId);

    if (!conceptGraph) {
      res.status(404).json({ error: 'Graph not found' });
      return;
    }

    // Fetch learning goal if available (pass full object to get milestones)
    const goals = await getGoalsByGraphId(uid, graphId);
    const learningGoal = goals.length > 0 ? goals[0] : null;
    if (learningGoal) {
      options.learningGoal = learningGoal;
    }

    // Convert to NodeBasedKnowledgeGraph
    const result = convertStoredConceptGraphToNodeBased(conceptGraph, options);

    // Save NodeBasedKnowledgeGraph to Firestore
    await saveNodeBasedKnowledgeGraph(uid, result.nodeBasedGraph);

    res.json(result);
  } catch (error) {
    console.error('Error converting graph:', error);
    res.status(500).json({
      error: 'Failed to convert graph',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get NodeBasedKnowledgeGraph
 * GET /api/knowledge-graphs/:graphId
 */
export async function getKnowledgeGraphHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId } = req.params;
    const uid = (req as any).firebaseUser?.uid;

    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Try to get existing NodeBasedKnowledgeGraph
    let nodeBasedGraph = await getNodeBasedKnowledgeGraph(uid, graphId);

    // If it doesn't exist, convert from ConceptGraph
    if (!nodeBasedGraph) {
      const conceptGraph = await getUserGraphById(uid, graphId);
      if (!conceptGraph) {
        res.status(404).json({ error: 'Graph not found' });
        return;
      }

      // Fetch learning goal if available
      const goals = await getGoalsByGraphId(uid, graphId);
      const learningGoal = goals.length > 0 ? goals[0] : null;

      // Convert to NodeBasedKnowledgeGraph (with all enhancements, pass full LearningGoal to get milestones)
      const result = convertStoredConceptGraphToNodeBased(conceptGraph, {
        includeLayers: true,
        includeLessons: true,
        includeMetadata: true,
        includeFlashCards: true,
        learningGoal: learningGoal || undefined,
      });

      nodeBasedGraph = result.nodeBasedGraph;

      // Save NodeBasedKnowledgeGraph to Firestore
      await saveNodeBasedKnowledgeGraph(uid, nodeBasedGraph);
    }

    res.json(nodeBasedGraph);
  } catch (error) {
    console.error('Error fetching knowledge graph:', error);
    res.status(500).json({
      error: 'Failed to fetch knowledge graph',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Export NodeBasedKnowledgeGraph to GraphML
 * GET /api/knowledge-graphs/:graphId/export/graphml
 */
export async function exportGraphMLHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId } = req.params;
    const uid = (req as any).firebaseUser?.uid;

    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get options from query parameters
    const options: GraphMLExportOptions = {
      includeEmbeddings: req.query.includeEmbeddings === 'true',
      includeMetadata: req.query.includeMetadata !== 'false',
      simplified: req.query.simplified === 'true',
    };

    // Try to get existing NodeBasedKnowledgeGraph
    let nodeBasedGraph = await getNodeBasedKnowledgeGraph(uid, graphId);

    // If it doesn't exist, convert from ConceptGraph
    if (!nodeBasedGraph) {
      const conceptGraph = await getUserGraphById(uid, graphId);
      if (!conceptGraph) {
        res.status(404).json({ error: 'Graph not found' });
        return;
      }

      // Fetch learning goal if available
      const goals = await getGoalsByGraphId(uid, graphId);
      const learningGoal = goals.length > 0 ? goals[0] : null;

      // Convert to NodeBasedKnowledgeGraph (pass full LearningGoal to get milestones)
      const conversionResult = convertStoredConceptGraphToNodeBased(conceptGraph, {
        includeLayers: true,
        includeLessons: true,
        includeMetadata: true,
        includeFlashCards: true,
        learningGoal: learningGoal || undefined,
      });

      nodeBasedGraph = conversionResult.nodeBasedGraph;

      // Save NodeBasedKnowledgeGraph to Firestore
      await saveNodeBasedKnowledgeGraph(uid, nodeBasedGraph);
    }

    // Export to GraphML (now accepts NodeBasedKnowledgeGraph directly)
    const graphmlXml = exportToGraphML(nodeBasedGraph, options);

    // Return as XML with appropriate headers
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${graphId}.graphml"`);
    res.send(graphmlXml);
  } catch (error) {
    console.error('Error exporting GraphML:', error);
    res.status(500).json({
      error: 'Failed to export GraphML',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update layer goal in NodeBasedKnowledgeGraph
 * PATCH /api/knowledge-graphs/:graphId/layers/:layerNumber/goal
 */
export async function updateLayerGoalHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId, layerNumber } = req.params;
    const uid = (req as any).firebaseUser?.uid;

    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!graphId || !layerNumber) {
      res.status(400).json({ error: 'graphId and layerNumber are required' });
      return;
    }

    const { goal } = req.body;
    if (typeof goal !== 'string') {
      res.status(400).json({ error: 'goal must be a string' });
      return;
    }

    const layerNum = parseInt(layerNumber, 10);
    if (isNaN(layerNum)) {
      res.status(400).json({ error: 'layerNumber must be a valid number' });
      return;
    }

    // Get existing NodeBasedKnowledgeGraph
    let nodeBasedGraph = await getNodeBasedKnowledgeGraph(uid, graphId);
    
    // If NodeBasedKnowledgeGraph doesn't exist, convert from ConceptGraph
    if (!nodeBasedGraph) {
      const conceptGraph = await getUserGraphById(uid, graphId);
      if (!conceptGraph) {
        res.status(404).json({ error: 'Graph not found' });
        return;
      }
      // Fetch learning goal if available
      const goals = await getGoalsByGraphId(uid, graphId);
      const learningGoal = goals.length > 0 ? goals[0] : null;
      const conversion = convertStoredConceptGraphToNodeBased(conceptGraph, {
        learningGoal: learningGoal || undefined,
      });
      nodeBasedGraph = conversion.nodeBasedGraph;
    }

    // Find the layer node
    const layerNodeId = generateNodeId('Layer', { graphId, layerNumber: layerNum });
    let layerNode = nodeBasedGraph.nodes[layerNodeId];

    if (!layerNode) {
      // Create layer node if it doesn't exist
      const { createGraphNode } = await import('../types/nodeBasedKnowledgeGraph');
      layerNode = createGraphNode(
        layerNodeId,
        'Layer',
        {
          id: layerNodeId,
          layerNumber: layerNum,
          goal: goal,
          prompt: '',
          response: '',
          createdAt: nodeBasedGraph.createdAt,
        },
        nodeBasedGraph.createdAt
      );
      nodeBasedGraph.nodes[layerNodeId] = layerNode;
      nodeBasedGraph.nodeTypes.Layer.push(layerNodeId);

      // Create relationship: Graph → hasLayer → Layer
      const { createRelationship } = await import('../types/nodeBasedKnowledgeGraph');
      nodeBasedGraph.relationships.push(
        createRelationship(graphId, layerNodeId, 'hasLayer', 'forward', 1.0, {
          extractedFrom: 'layer_update',
          confidence: 1.0,
        })
      );
    } else {
      // Update existing layer node goal
      layerNode.properties.goal = goal;
      layerNode.updatedAt = Date.now();
    }

    // Update graph timestamp
    nodeBasedGraph.updatedAt = Date.now();

    // Save updated NodeBasedKnowledgeGraph
    await saveNodeBasedKnowledgeGraph(uid, nodeBasedGraph);

    // Also update the ConceptGraph so the frontend can see the changes
    const conceptGraph = await getUserGraphById(uid, graphId);
    if (conceptGraph) {
      if (!conceptGraph.layers) {
        conceptGraph.layers = {};
      }
      conceptGraph.layers[layerNum] = {
        ...conceptGraph.layers[layerNum],
        layerNumber: layerNum,
        goal: goal,
        conceptIds: conceptGraph.layers[layerNum]?.conceptIds || [],
        prompt: conceptGraph.layers[layerNum]?.prompt || '',
        response: conceptGraph.layers[layerNum]?.response || '',
        practiceExercises: conceptGraph.layers[layerNum]?.practiceExercises,
      };
      
      // Update ConceptGraph in Firestore
      const { upsertUserGraph } = await import('../services/graphService');
      await upsertUserGraph(uid, conceptGraph);
    }

    res.json({ success: true, goal });
  } catch (error) {
    console.error('Error updating layer goal:', error);
    res.status(500).json({
      error: 'Failed to update layer goal',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

