/**
 * Graph Authorization Service
 * 
 * Provides centralized authorization checks for graph operations.
 * Verifies ownership and permissions before allowing access.
 */

import type { GraphAccessLevel, GraphPermissions } from '../types/graphAuthorization';
import { AuthorizationError as AuthError } from '../types/graphAuthorization';
import { getNodeBasedKnowledgeGraph } from './knowledgeGraphService';

/**
 * Graph Authorization Service
 */
export class GraphAuthorizationService {
  /**
   * Verify that a user owns a graph
   * 
   * @param uid - User ID
   * @param graphId - Graph ID
   * @returns true if user owns the graph, false otherwise
   */
  async verifyGraphOwnership(uid: string, graphId: string): Promise<boolean> {
    try {
      // Check if graph exists in user's path
      const graph = await getNodeBasedKnowledgeGraph(uid, graphId);
      return graph !== null;
    } catch (error) {
      // If graph doesn't exist or error occurs, user doesn't own it
      return false;
    }
  }

  /**
   * Check if user has permission for operation
   * 
   * @param uid - User ID
   * @param graphId - Graph ID
   * @param operation - Operation type (read, write, delete)
   * @returns true if user has permission, false otherwise
   */
  async checkGraphAccess(
    uid: string,
    graphId: string,
    operation: GraphAccessLevel
  ): Promise<boolean> {
    // For now, only owners can access graphs
    // Future: Add support for shared graphs with read-only permissions
    const isOwner = await this.verifyGraphOwnership(uid, graphId);
    
    if (!isOwner) {
      return false;
    }

    // All operations are allowed for owners
    return true;
  }

  /**
   * Get full permissions for user on graph
   * 
   * @param uid - User ID
   * @param graphId - Graph ID
   * @returns Graph permissions object
   */
  async getGraphPermissions(uid: string, graphId: string): Promise<GraphPermissions> {
    const isOwner = await this.verifyGraphOwnership(uid, graphId);
    
    if (!isOwner) {
      // User has no permissions
      return {
        ownerId: '', // Unknown owner
        canRead: false,
        canWrite: false,
        canDelete: false,
      };
    }

    // Owner has full permissions
    return {
      ownerId: uid,
      canRead: true,
      canWrite: true,
      canDelete: true,
    };
  }

  /**
   * Verify graph access and throw error if unauthorized
   * 
   * @param uid - User ID
   * @param graphId - Graph ID
   * @param operation - Operation type
   * @throws AuthorizationError if user doesn't have access
   */
  async verifyGraphAccess(
    uid: string,
    graphId: string,
    operation: GraphAccessLevel = 'read'
  ): Promise<void> {
    const hasAccess = await this.checkGraphAccess(uid, graphId, operation);
    
    if (!hasAccess) {
      // Check if graph exists at all (to avoid info leakage)
      const graphExists = await this.verifyGraphOwnership(uid, graphId);
      
      if (!graphExists) {
        // Graph doesn't exist for this user - return 404 to avoid info leakage
        throw new AuthError(
          `Graph ${graphId} not found`,
          'NOT_FOUND',
          graphId,
          uid
        );
      } else {
        // Graph exists but user doesn't have access - return 403
        throw new AuthError(
          `Access denied to graph ${graphId}`,
          'FORBIDDEN',
          graphId,
          uid
        );
      }
    }
  }

  /**
   * Verify graph ownership and throw error if not owner
   * 
   * @param uid - User ID
   * @param graphId - Graph ID
   * @throws AuthorizationError if user is not the owner
   */
  async verifyGraphOwnershipOrThrow(uid: string, graphId: string): Promise<void> {
    const isOwner = await this.verifyGraphOwnership(uid, graphId);
    
    if (!isOwner) {
      // If verifyGraphOwnership returns false, the graph doesn't exist for this user
      throw new AuthError(
        `Graph ${graphId} not found`,
        'NOT_FOUND',
        graphId,
        uid
      );
    }
  }
}

