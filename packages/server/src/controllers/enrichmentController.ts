/**
 * Enrichment Controller
 * 
 * Handles API requests for graph enrichment operations.
 */

import { Request, Response } from 'express';
import { enrichKnowledgeGraph, enrichKnowledgeGraphStream, enrichLayerStream } from '../services/graphEnrichmentService';
import { applyEnrichmentsToGraph } from '../services/enrichmentApplicationService';
// Note: applyEnrichmentsToGraph handles saving internally
// import { saveNodeBasedKnowledgeGraph } from '../services/knowledgeGraphService';
// import { upsertUserGraph } from '../services/graphService'; // No longer needed
import type { EnrichmentOptions } from '../types/enrichment';
import type {
  LayerCompletenessAnalysis,
  MilestoneConceptDiscovery,
  PrerequisiteAnalysis,
  GoalAwareRelationships,
  CrossLayerDiscovery,
} from '../types/enrichment';

/**
 * Enrich a knowledge graph
 * POST /api/enrichment/:graphId
 */
export async function enrichGraphHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId } = req.params;
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const options: EnrichmentOptions = {
      discoverMissingConcepts: req.body.discoverMissingConcepts ?? false,
      analyzePrerequisites: req.body.analyzePrerequisites ?? false,
      discoverRelationships: req.body.discoverRelationships ?? false,
      analyzeLayers: req.body.analyzeLayers ?? false,
      discoverCrossLayer: req.body.discoverCrossLayer ?? false,
      autoApply: req.body.autoApply ?? false,
      stream: req.body.stream ?? false,
    };

    // If streaming is requested, use streaming handler
    if (options.stream) {
      // Set up Server-Sent Events headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      let clientDisconnected = false;
      const cleanup = () => {
        clientDisconnected = true;
        if (!res.headersSent) {
          res.end();
        } else if (!res.writableEnded) {
          res.end();
        }
      };

      req.on('close', cleanup);
      req.on('aborted', cleanup);

      try {
        const stream = enrichKnowledgeGraphStream(uid, graphId, options);
        
        for await (const chunk of stream) {
          if (clientDisconnected) break;

          if (chunk.type === 'enrichment' && chunk.enrichment) {
            // Stream individual enrichment result
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ enrichment: chunk.enrichment, done: false })}\n\n`);
            }
          } else if (chunk.type === 'complete' && chunk.result) {
            // Stream final result
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ result: chunk.result, done: true })}\n\n`);
            }
          }
        }
      } catch (streamError) {
        console.error('Error streaming enrichment:', streamError);
        if (!clientDisconnected && !res.writableEnded) {
          try {
            res.write(`data: ${JSON.stringify({ error: 'Stream error', done: true })}\n\n`);
          } catch (writeError) {
            // Ignore write errors if client already disconnected
          }
        }
      } finally {
        req.removeListener('close', cleanup);
        req.removeListener('aborted', cleanup);
        if (!res.writableEnded) {
          res.end();
        }
      }
      return;
    }

    // Non-streaming response
    const result = await enrichKnowledgeGraph(uid, graphId, options);
    res.json(result);
  } catch (error: any) {
    console.error('Error enriching graph:', error);
    res.status(500).json({
      error: 'Failed to enrich graph',
      message: error.message,
    });
  }
}

/**
 * Enrich a specific layer of a knowledge graph
 * POST /api/enrichment/:graphId/layers/:layerNumber
 */
export async function enrichLayerHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId, layerNumber } = req.params;
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const layerNum = parseInt(layerNumber, 10);
    if (isNaN(layerNum)) {
      res.status(400).json({ error: 'Invalid layer number' });
      return;
    }

    const options: EnrichmentOptions = {
      discoverMissingConcepts: req.body.discoverMissingConcepts ?? false,
      analyzePrerequisites: req.body.analyzePrerequisites ?? false,
      discoverRelationships: req.body.discoverRelationships ?? false,
      analyzeLayers: req.body.analyzeLayers ?? true, // Default to true for layer enrichment
      discoverCrossLayer: req.body.discoverCrossLayer ?? false,
      autoApply: req.body.autoApply ?? false,
      stream: req.body.stream ?? true, // Default to streaming
    };

    // Set up Server-Sent Events headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let clientDisconnected = false;
    const cleanup = () => {
      clientDisconnected = true;
      if (!res.headersSent) {
        res.end();
      } else if (!res.writableEnded) {
        res.end();
      }
    };

    req.on('close', cleanup);
    req.on('aborted', cleanup);

    try {
      const stream = enrichLayerStream(uid, graphId, layerNum, options);
      
      for await (const chunk of stream) {
        if (clientDisconnected) break;

        if (chunk.type === 'enrichment' && chunk.enrichment) {
          // Stream individual enrichment result
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ enrichment: chunk.enrichment, done: false })}\n\n`);
          }
        } else if (chunk.type === 'complete' && chunk.result) {
          // Stream final result
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ result: chunk.result, done: true })}\n\n`);
          }
        }
      }
    } catch (streamError) {
      console.error('Error streaming layer enrichment:', streamError);
      if (!clientDisconnected && !res.writableEnded) {
        try {
          res.write(`data: ${JSON.stringify({ error: 'Stream error', done: true })}\n\n`);
        } catch (writeError) {
          // Ignore write errors if client already disconnected
        }
      }
    } finally {
      req.removeListener('close', cleanup);
      req.removeListener('aborted', cleanup);
      if (!res.writableEnded) {
        res.end();
      }
    }
  } catch (error: any) {
    console.error('Error enriching layer:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to enrich layer',
        message: error.message,
      });
    } else if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
      res.end();
    }
  }
}

/**
 * Apply enrichments to a knowledge graph
 * POST /api/enrichment/:graphId/apply
 */
export async function applyEnrichmentsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId } = req.params;
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get enrichments from request body
    const enrichments: Array<
      | LayerCompletenessAnalysis
      | MilestoneConceptDiscovery
      | PrerequisiteAnalysis
      | GoalAwareRelationships
      | CrossLayerDiscovery
    > = req.body.enrichments || [];

    if (enrichments.length === 0) {
      res.status(400).json({ error: 'No enrichments provided' });
      return;
    }

    // Apply enrichments
    const result = await applyEnrichmentsToGraph(uid, graphId, enrichments);

    console.log(`[applyEnrichmentsHandler] Applied enrichments: ${result.stats.conceptsAdded} concepts, ${result.stats.relationshipsAdded} relationships`);
    
    // Note: applyEnrichmentsToGraph still returns old KnowledgeGraph format
    // TODO: Update applyEnrichmentsToGraph to return NodeBasedKnowledgeGraph
    // For now, we skip saving since the format doesn't match
    // The graph should already be saved by applyEnrichmentsToGraph internally
    console.log(`[applyEnrichmentsHandler] Enrichments applied successfully`);

    res.json({
      success: true,
      graphId,
      stats: result.stats,
    });
  } catch (error: any) {
    console.error('Error applying enrichments:', error);
    res.status(500).json({
      error: 'Failed to apply enrichments',
      message: error.message,
    });
  }
}
