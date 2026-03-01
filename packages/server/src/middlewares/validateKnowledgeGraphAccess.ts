/**
 * Validation middleware for Knowledge Graph Access API
 * 
 * Phase 2: REST API Endpoints
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Validate graphId parameter
 */
export function validateGraphId(req: Request, res: Response, next: NextFunction): void {
  const { graphId } = req.params;
  
  if (!graphId || typeof graphId !== 'string' || graphId.trim().length === 0) {
    res.status(400).json({ error: 'Invalid graphId parameter' });
    return;
  }
  
  next();
}

/**
 * Validate nodeId parameter
 */
export function validateNodeId(req: Request, res: Response, next: NextFunction): void {
  const { nodeId } = req.params;
  
  if (!nodeId || typeof nodeId !== 'string' || nodeId.trim().length === 0) {
    res.status(400).json({ error: 'Invalid nodeId parameter' });
    return;
  }
  
  next();
}

/**
 * Validate create node request body
 */
export function validateCreateNode(req: Request, res: Response, next: NextFunction): void {
  const { type, properties } = req.body;
  
  if (!type || typeof type !== 'string') {
    res.status(400).json({ error: 'type is required and must be a string' });
    return;
  }
  
  if (!properties || typeof properties !== 'object') {
    res.status(400).json({ error: 'properties is required and must be an object' });
    return;
  }
  
  next();
}

/**
 * Validate create relationship request body
 */
export function validateCreateRelationship(req: Request, res: Response, next: NextFunction): void {
  const { source, target, type } = req.body;
  
  if (!source || typeof source !== 'string') {
    res.status(400).json({ error: 'source is required and must be a string' });
    return;
  }
  
  if (!target || typeof target !== 'string') {
    res.status(400).json({ error: 'target is required and must be a string' });
    return;
  }
  
  if (!type || typeof type !== 'string') {
    res.status(400).json({ error: 'type is required and must be a string' });
    return;
  }
  
  next();
}

/**
 * Validate extract subgraph request body
 */
export function validateExtractSubgraph(req: Request, res: Response, next: NextFunction): void {
  const { nodeIds } = req.body;
  
  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    res.status(400).json({ error: 'nodeIds is required and must be a non-empty array' });
    return;
  }
  
  if (!nodeIds.every(id => typeof id === 'string')) {
    res.status(400).json({ error: 'All nodeIds must be strings' });
    return;
  }
  
  next();
}

