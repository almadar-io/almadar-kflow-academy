/**
 * GraphQL Resolvers for Knowledge Graph Access API
 * 
 * Phase 3: GraphQL Schema & Resolvers
 */

// Define resolver types manually since IResolvers may not be available
type ResolverMap = {
  [key: string]: {
    [field: string]: (
      parent: any,
      args: any,
      context: any,
      info: any
    ) => any;
  };
};
import { KnowledgeGraphAccessLayer } from '../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import type {
  GraphNode,
  Relationship as NodeBasedRelationship,
  NodeType,
  RelationshipType,
  RelationshipDirection,
  NodeBasedKnowledgeGraph,
} from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../../types/nodeBasedKnowledgeGraph';
import { mutationResolvers } from './mutationResolvers';
import { queryResolvers } from './queryResolvers';
import { expansionResolvers } from './expansionResolvers';
import { explanationResolvers } from './explanationResolvers';
import { goalResolvers } from './goalResolvers';
import { layerPracticeResolvers } from './layerPracticeResolvers';
import { customOperationResolvers } from './customOperationResolvers';

const accessLayer = new KnowledgeGraphAccessLayer();

// Helper to get user ID from context
function getUserId(context: any): string {
  const uid = context?.firebaseUser?.uid;
  if (!uid) {
    throw new Error('Unauthorized');
  }
  return uid;
}

// Helper to convert DateTime scalar
const DateTime = {
  parseValue: (value: number) => new Date(value),
  serialize: (value: Date | number) => {
    if (value instanceof Date) {
      return value.getTime();
    }
    return value;
  },
};

// Helper to convert JSON scalar
const JSON = {
  parseValue: (value: any) => value,
  serialize: (value: any) => value,
};

export const resolvers: ResolverMap = {
  DateTime,
  JSON,

  Query: {
    // Optimized queries for Mentor pages (Phase 3.2)
    ...queryResolvers.Query,

    // Graph queries
    graph: async (_: any, { graphId }: { graphId: string }, context: any) => {
      const uid = getUserId(context);
      return await accessLayer.getGraph(uid, graphId);
    },

    // Node queries
    node: async (
      _: any,
      { graphId, nodeId }: { graphId: string; nodeId: string },
      context: any
    ) => {
      const uid = getUserId(context);
      return await accessLayer.getNode(uid, graphId, nodeId);
    },

    nodes: async (
      _: any,
      {
        graphId,
        type,
        filter,
      }: {
        graphId: string;
        type?: NodeType;
        filter?: { type?: NodeType; properties?: any };
      },
      context: any
    ) => {
      const uid = getUserId(context);
      let nodes: GraphNode[];

      if (type) {
        nodes = await accessLayer.getNodesByType(uid, graphId, type);
      } else if (filter) {
        const predicate = (node: GraphNode) => {
          if (filter.type && node.type !== filter.type) return false;
          if (filter.properties) {
            for (const [key, value] of Object.entries(filter.properties)) {
              if (node.properties[key] !== value) return false;
            }
          }
          return true;
        };
        nodes = await accessLayer.findNodes(uid, graphId, predicate);
      } else {
        const graph = await accessLayer.getGraph(uid, graphId);
        nodes = Object.values(graph.nodes);
      }

      return { nodes, count: nodes.length };
    },

    findNodes: async (
      _: any,
      {
        graphId,
        filter,
      }: {
        graphId: string;
        filter: { type?: NodeType; properties?: any };
      },
      context: any
    ) => {
      const uid = getUserId(context);
      const predicate = (node: GraphNode) => {
        if (filter.type && node.type !== filter.type) return false;
        if (filter.properties) {
          for (const [key, value] of Object.entries(filter.properties)) {
            if (node.properties[key] !== value) return false;
          }
        }
        return true;
      };
      const nodes = await accessLayer.findNodes(uid, graphId, predicate);
      return { nodes, count: nodes.length };
    },

    // Relationship queries
    relationships: async (
      _: any,
      {
        graphId,
        filter,
      }: {
        graphId: string;
        filter?: {
          type?: RelationshipType;
          source?: string;
          target?: string;
          direction?: RelationshipDirection;
        };
      },
      context: any
    ) => {
      const uid = getUserId(context);
      let relationships: NodeBasedRelationship[];

      if (filter?.type) {
        relationships = await accessLayer.getRelationshipsByType(
          uid,
          graphId,
          filter.type,
          filter.source || filter.target
        );
      } else {
        // Convert RelationshipDirection to the format expected by accessLayer
        const direction = filter?.direction
          ? (filter.direction === 'forward'
              ? 'outgoing'
              : filter.direction === 'backward'
              ? 'incoming'
              : 'both')
          : undefined;
        relationships = await accessLayer.getRelationships(
          uid,
          graphId,
          filter?.source || filter?.target,
          direction
        );
      }

      return { relationships, count: relationships.length };
    },

    nodeRelationships: async (
      _: any,
      {
        graphId,
        nodeId,
        direction,
        type,
      }: {
        graphId: string;
        nodeId: string;
        direction?: RelationshipDirection;
        type?: RelationshipType;
      },
      context: any
    ) => {
      const uid = getUserId(context);
      let relationships: NodeBasedRelationship[];

      if (type) {
        relationships = await accessLayer.getRelationshipsByType(
          uid,
          graphId,
          type,
          nodeId
        );
      } else {
        // Convert RelationshipDirection to the format expected by accessLayer
        const dir = direction
          ? (direction === 'forward'
              ? 'outgoing'
              : direction === 'backward'
              ? 'incoming'
              : 'both')
          : undefined;
        relationships = await accessLayer.getRelationships(uid, graphId, nodeId, dir);
      }

      return { relationships, count: relationships.length };
    },

    // Graph algorithms
    path: async (
      _: any,
      {
        graphId,
        from,
        to,
        maxDepth,
      }: {
        graphId: string;
        from: string;
        to: string;
        maxDepth?: number;
      },
      context: any
    ) => {
      const uid = getUserId(context);
      const path = await accessLayer.findPath(uid, graphId, from, to, maxDepth);
      return { path, length: path.length };
    },

    traverse: async (
      _: any,
      {
        graphId,
        startNodeId,
        options,
      }: {
        graphId: string;
        startNodeId: string;
        options?: {
          relationshipTypes?: RelationshipType[];
          direction?: RelationshipDirection;
          maxDepth?: number;
          limit?: number;
        };
      },
      context: any
    ) => {
      const uid = getUserId(context);
      // Convert RelationshipDirection to the format expected by accessLayer
      const direction = options?.direction
        ? (options.direction === 'forward'
            ? 'outgoing'
            : options.direction === 'backward'
            ? 'incoming'
            : 'both')
        : undefined;
      return await accessLayer.traverse(uid, graphId, startNodeId, {
        relationshipTypes: options?.relationshipTypes,
        direction,
        maxDepth: options?.maxDepth,
        limit: options?.limit,
      });
    },

    subgraph: async (
      _: any,
      {
        graphId,
        nodeIds,
        depth,
      }: {
        graphId: string;
        nodeIds: string[];
        depth?: number;
      },
      context: any
    ) => {
      const uid = getUserId(context);
      return await accessLayer.extractSubgraph(uid, graphId, nodeIds, depth);
    },
  },

  NodeBasedKnowledgeGraph: {
    // Convert nodes object to array for GraphQL
    nodes: (parent: NodeBasedKnowledgeGraph) => {
      return Object.values(parent.nodes);
    },
  },

  Mutation: {
    // Graph mutations
    saveGraph: async (
      _: any,
      { graphId, graph }: { graphId: string; graph: any },
      context: any
    ) => {
      const uid = getUserId(context);
      await accessLayer.saveGraph(uid, graph);
      return await accessLayer.getGraph(uid, graphId);
    },

    // Node mutations
    createNode: async (
      _: any,
      {
        graphId,
        input,
      }: {
        graphId: string;
        input: { type: NodeType; properties: any };
      },
      context: any
    ) => {
      const uid = getUserId(context);
      const node = createGraphNode(
        input.properties.id || `temp-${Date.now()}`,
        input.type,
        input.properties
      );
      return await accessLayer.createNode(uid, graphId, node);
    },

    updateNode: async (
      _: any,
      {
        graphId,
        nodeId,
        input,
      }: {
        graphId: string;
        nodeId: string;
        input: { properties: any };
      },
      context: any
    ) => {
      const uid = getUserId(context);
      return await accessLayer.updateNode(uid, graphId, nodeId, input.properties);
    },

    deleteNode: async (
      _: any,
      {
        graphId,
        nodeId,
        options,
      }: {
        graphId: string;
        nodeId: string;
        options?: { cascade?: boolean };
      },
      context: any
    ) => {
      const uid = getUserId(context);
      await accessLayer.deleteNode(uid, graphId, nodeId, {
        cascade: options?.cascade || false,
      });
      return true;
    },

    // Relationship mutations
    createRelationship: async (
      _: any,
      {
        graphId,
        input,
      }: {
        graphId: string;
        input: {
          source: string;
          target: string;
          type: RelationshipType;
          direction?: RelationshipDirection;
          strength?: number;
          metadata?: any;
        };
      },
      context: any
    ) => {
      const uid = getUserId(context);
      const relationship = createRelationship(
        input.source,
        input.target,
        input.type,
        input.direction || 'forward',
        input.strength,
        input.metadata
      );
      return await accessLayer.createRelationship(uid, graphId, relationship);
    },

    deleteRelationship: async (
      _: any,
      { graphId, relId }: { graphId: string; relId: string },
      context: any
    ) => {
      const uid = getUserId(context);
      await accessLayer.deleteRelationship(uid, graphId, relId);
      return true;
    },

    // Direct mutation operations (Phase 3)
    ...mutationResolvers.Mutation,
    
    // Graph operation mutations (Phase 3.1)
    ...expansionResolvers.Mutation,
    ...explanationResolvers.Mutation,
    ...goalResolvers.Mutation,
    ...layerPracticeResolvers.Mutation,
    ...customOperationResolvers.Mutation,
  },
};

