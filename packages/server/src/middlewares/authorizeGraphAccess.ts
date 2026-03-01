/**
 * Graph Access Authorization Middleware
 * 
 * Express middleware to verify graph ownership and permissions before operations.
 */

import type { Request, Response, NextFunction } from 'express';
import { GraphAuthorizationService } from '../services/graphAuthorizationService';
import type { GraphAccessLevel } from '../types/graphAuthorization';
import { AuthorizationError } from '../types/graphAuthorization';

const authorizationService = new GraphAuthorizationService();

/**
 * Get user ID from authenticated request
 */
function getUserId(req: Request): string {
  const uid = (req as any).firebaseUser?.uid;
  if (!uid) {
    throw new AuthorizationError('Unauthorized', 'UNAUTHORIZED');
  }
  return uid;
}

/**
 * Get graph ID from request params
 */
function getGraphId(req: Request): string {
  const graphId = req.params.graphId;
  if (!graphId) {
    throw new AuthorizationError('Graph ID is required', 'UNAUTHORIZED');
  }
  return graphId;
}

/**
 * Create authorization middleware for graph operations
 * 
 * @param operation - Operation type (read, write, delete)
 * @returns Express middleware function
 */
export function authorizeGraphAccess(operation: GraphAccessLevel = 'read') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const uid = getUserId(req);
      const graphId = getGraphId(req);

      // Verify access
      await authorizationService.verifyGraphAccess(uid, graphId, operation);

      // Access granted, continue
      next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        // Map authorization errors to HTTP status codes
        let statusCode = 403;
        if (error.code === 'UNAUTHORIZED') {
          statusCode = 401;
        } else if (error.code === 'NOT_FOUND') {
          statusCode = 404;
        } else if (error.code === 'FORBIDDEN') {
          statusCode = 403;
        }

        res.status(statusCode).json({
          error: error.message,
          code: error.code,
          graphId: error.graphId,
        });
        return;
      }

      // Unknown error
      console.error('Authorization middleware error:', error);
      res.status(500).json({
        error: 'Internal server error during authorization',
      });
    }
  };
}

/**
 * Middleware to verify graph ownership (for write/delete operations)
 */
export const authorizeGraphWrite = authorizeGraphAccess('write');

/**
 * Middleware to verify graph ownership (for delete operations)
 */
export const authorizeGraphDelete = authorizeGraphAccess('delete');

/**
 * Middleware to verify graph read access
 */
export const authorizeGraphRead = authorizeGraphAccess('read');

