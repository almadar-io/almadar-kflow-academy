/**
 * Graph Authorization Types
 * 
 * Type definitions for graph access control and authorization.
 */

/**
 * Access level for graph operations
 */
export type GraphAccessLevel = 'read' | 'write' | 'delete';

/**
 * Graph ownership information
 */
export interface GraphOwnership {
  ownerId: string;           // User ID of graph owner
  createdAt: number;         // When graph was created
  lastModifiedBy?: string;   // Last user who modified graph
}

/**
 * Graph permissions for a user
 */
export interface GraphPermissions {
  ownerId: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  sharedWith?: Array<{
    userId: string;
    permissions: 'read' | 'read-write';
    sharedAt: number;
  }>;
}

/**
 * Authorization error types
 */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND',
    public readonly graphId?: string,
    public readonly userId?: string
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

