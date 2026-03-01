/**
 * GraphQL Queries and Mutations for Knowledge Graph Access
 * 
 * Defines all GraphQL operations as gql strings
 */

import { gql } from '@apollo/client';

// Fragments
export const GRAPH_NODE_FRAGMENT = gql`
  fragment GraphNodeFields on GraphNode {
    id
    type
    properties
    createdAt
    updatedAt
  }
`;

export const RELATIONSHIP_FRAGMENT = gql`
  fragment RelationshipFields on Relationship {
    id
    source
    target
    type
    direction
    strength
    metadata
    createdAt
  }
`;

// Queries
export const GET_GRAPH = gql`
  ${GRAPH_NODE_FRAGMENT}
  query GetGraph($graphId: ID!) {
    graph(graphId: $graphId) {
      id
      seedConceptId
      createdAt
      updatedAt
      nodes {
        ...GraphNodeFields
      }
      relationships {
        ...RelationshipFields
      }
    }
  }
`;

export const GET_NODE = gql`
  ${GRAPH_NODE_FRAGMENT}
  query GetNode($graphId: ID!, $nodeId: ID!) {
    node(graphId: $graphId, nodeId: $nodeId) {
      ...GraphNodeFields
    }
  }
`;

export const GET_NODES = gql`
  ${GRAPH_NODE_FRAGMENT}
  query GetNodes($graphId: ID!, $type: NodeType) {
    nodes(graphId: $graphId, type: $type) {
      nodes {
        ...GraphNodeFields
      }
      count
    }
  }
`;

export const FIND_NODES = gql`
  ${GRAPH_NODE_FRAGMENT}
  query FindNodes($graphId: ID!, $filter: NodeFilter!) {
    findNodes(graphId: $graphId, filter: $filter) {
      nodes {
        ...GraphNodeFields
      }
      count
    }
  }
`;

export const GET_RELATIONSHIPS = gql`
  ${RELATIONSHIP_FRAGMENT}
  query GetRelationships($graphId: ID!, $filter: RelationshipFilter) {
    relationships(graphId: $graphId, filter: $filter) {
      relationships {
        ...RelationshipFields
      }
      count
    }
  }
`;

export const GET_NODE_RELATIONSHIPS = gql`
  ${RELATIONSHIP_FRAGMENT}
  query GetNodeRelationships($graphId: ID!, $nodeId: ID!, $direction: RelationshipDirection, $type: RelationshipType) {
    nodeRelationships(graphId: $graphId, nodeId: $nodeId, direction: $direction, type: $type) {
      relationships {
        ...RelationshipFields
      }
      count
    }
  }
`;

export const FIND_PATH = gql`
  ${GRAPH_NODE_FRAGMENT}
  query FindPath($graphId: ID!, $from: ID!, $to: ID!, $maxDepth: Int) {
    path(graphId: $graphId, from: $from, to: $to, maxDepth: $maxDepth) {
      path {
        ...GraphNodeFields
      }
      length
    }
  }
`;

export const TRAVERSE = gql`
  ${GRAPH_NODE_FRAGMENT}
  ${RELATIONSHIP_FRAGMENT}
  query Traverse($graphId: ID!, $startNodeId: ID!, $options: TraverseOptions) {
    traverse(graphId: $graphId, startNodeId: $startNodeId, options: $options) {
      nodes {
        ...GraphNodeFields
      }
      relationships {
        ...RelationshipFields
      }
      depth
      visited
    }
  }
`;

export const EXTRACT_SUBGRAPH = gql`
  ${GRAPH_NODE_FRAGMENT}
  ${RELATIONSHIP_FRAGMENT}
  query ExtractSubgraph($graphId: ID!, $nodeIds: [ID!]!, $depth: Int) {
    subgraph(graphId: $graphId, nodeIds: $nodeIds, depth: $depth) {
      id
      seedConceptId
      createdAt
      updatedAt
      nodes {
        ...GraphNodeFields
      }
      relationships {
        ...RelationshipFields
      }
    }
  }
`;

// Mutations
export const SAVE_GRAPH = gql`
  mutation SaveGraph($graphId: ID!, $graph: JSON!) {
    saveGraph(graphId: $graphId, graph: $graph) {
      id
      seedConceptId
      updatedAt
    }
  }
`;

export const CREATE_NODE = gql`
  ${GRAPH_NODE_FRAGMENT}
  mutation CreateNode($graphId: ID!, $input: CreateNodeInput!) {
    createNode(graphId: $graphId, input: $input) {
      ...GraphNodeFields
    }
  }
`;

export const UPDATE_NODE = gql`
  ${GRAPH_NODE_FRAGMENT}
  mutation UpdateNode($graphId: ID!, $nodeId: ID!, $input: UpdateNodeInput!) {
    updateNode(graphId: $graphId, nodeId: $nodeId, input: $input) {
      ...GraphNodeFields
    }
  }
`;

export const DELETE_NODE = gql`
  mutation DeleteNode($graphId: ID!, $nodeId: ID!, $options: DeleteNodeOptions) {
    deleteNode(graphId: $graphId, nodeId: $nodeId, options: $options)
  }
`;

export const CREATE_RELATIONSHIP = gql`
  ${RELATIONSHIP_FRAGMENT}
  mutation CreateRelationship($graphId: ID!, $input: CreateRelationshipInput!) {
    createRelationship(graphId: $graphId, input: $input) {
      ...RelationshipFields
    }
  }
`;

export const DELETE_RELATIONSHIP = gql`
  mutation DeleteRelationship($graphId: ID!, $relId: ID!) {
    deleteRelationship(graphId: $graphId, relId: $relId)
  }
`;

