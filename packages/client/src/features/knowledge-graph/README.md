# Knowledge Graph Access Feature

This feature provides hooks for accessing the knowledge graph via both REST and GraphQL APIs.

## Installation

First, install the required dependencies:

```bash
npm install @apollo/client graphql
```

## Setup

The Apollo Client is already configured in `apolloClient.ts` and integrated into the app providers. The feature is ready to use once dependencies are installed.

## Usage

### REST API Hooks

REST hooks provide imperative functions for making API calls:

```typescript
import { useGetGraph, useCreateNode, useGetNodes } from '@/features/knowledge-graph';

function MyComponent() {
  const { getGraph, loading, error } = useGetGraph();
  const { createNode, loading: creating, error: createError } = useCreateNode();
  const { getNodes, loading: nodesLoading } = useGetNodes();

  const handleLoadGraph = async () => {
    try {
      const graph = await getGraph('graph-id');
      console.log('Graph loaded:', graph);
    } catch (err) {
      console.error('Failed to load graph:', err);
    }
  };

  const handleCreateNode = async () => {
    try {
      const node = await createNode('graph-id', {
        type: 'Concept',
        properties: {
          name: 'New Concept',
          description: 'A new concept',
        },
      });
      console.log('Node created:', node);
    } catch (err) {
      console.error('Failed to create node:', err);
    }
  };

  return (
    <div>
      <button onClick={handleLoadGraph} disabled={loading}>
        {loading ? 'Loading...' : 'Load Graph'}
      </button>
      <button onClick={handleCreateNode} disabled={creating}>
        {creating ? 'Creating...' : 'Create Node'}
      </button>
    </div>
  );
}
```

### GraphQL Hooks

GraphQL hooks use Apollo Client and provide reactive data fetching:

```typescript
import { useGetGraphQuery, useCreateNodeMutation, useGetNodesQuery } from '@/features/knowledge-graph';

function MyComponent() {
  const graphId = 'graph-id';
  
  // Query hook - automatically fetches when component mounts
  const { data, loading, error, refetch } = useGetGraphQuery(graphId);
  
  // Query hook with lazy execution
  const [getNodes, { data: nodesData, loading: nodesLoading }] = useGetNodesLazy();
  
  // Mutation hook
  const [createNode, { loading: creating }] = useCreateNodeMutation();

  const handleCreateNode = async () => {
    try {
      const result = await createNode({
        variables: {
          graphId,
          input: {
            type: 'Concept',
            properties: {
              name: 'New Concept',
              description: 'A new concept',
            },
          },
        },
      });
      console.log('Node created:', result.data?.createNode);
      // Refetch graph to get updated data
      refetch();
    } catch (err) {
      console.error('Failed to create node:', err);
    }
  };

  if (loading) return <div>Loading graph...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Graph: {data?.graph.id}</h1>
      <p>Nodes: {data?.graph.nodes.length}</p>
      <button onClick={handleCreateNode} disabled={creating}>
        {creating ? 'Creating...' : 'Create Node'}
      </button>
    </div>
  );
}
```

## Available Hooks

### REST Hooks

- `useGetGraph()` - Get full graph
- `useSaveGraph()` - Save/update graph
- `useGetNodes()` - Get all nodes (with optional type filter)
- `useGetNode()` - Get single node
- `useCreateNode()` - Create node
- `useUpdateNode()` - Update node
- `useDeleteNode()` - Delete node
- `useFindNodes()` - Find nodes with filter
- `useGetRelationships()` - Get relationships
- `useGetNodeRelationships()` - Get node's relationships
- `useCreateRelationship()` - Create relationship
- `useDeleteRelationship()` - Delete relationship
- `useFindPath()` - Find path between nodes
- `useTraverse()` - Traverse graph from a node
- `useExtractSubgraph()` - Extract subgraph

### GraphQL Hooks

#### Query Hooks (with automatic fetching)
- `useGetGraphQuery(graphId, options?)` - Get full graph
- `useGetNodeQuery(graphId, nodeId, options?)` - Get single node
- `useGetNodesQuery(graphId, type?, options?)` - Get nodes
- `useGetRelationshipsQuery(graphId, filter?, options?)` - Get relationships
- `useGetNodeRelationshipsQuery(graphId, nodeId, options?)` - Get node relationships

#### Lazy Query Hooks (manual execution)
- `useGetGraphLazy()` - Get graph (lazy)
- `useGetNodeLazy()` - Get node (lazy)
- `useGetNodesLazy()` - Get nodes (lazy)
- `useFindNodesLazy()` - Find nodes (lazy)
- `useGetRelationshipsLazy()` - Get relationships (lazy)
- `useGetNodeRelationshipsLazy()` - Get node relationships (lazy)
- `useFindPathLazy()` - Find path (lazy)
- `useTraverseLazy()` - Traverse graph (lazy)
- `useExtractSubgraphLazy()` - Extract subgraph (lazy)

#### Mutation Hooks
- `useSaveGraphMutation()` - Save graph
- `useCreateNodeMutation()` - Create node
- `useUpdateNodeMutation()` - Update node
- `useDeleteNodeMutation()` - Delete node
- `useCreateRelationshipMutation()` - Create relationship
- `useDeleteRelationshipMutation()` - Delete relationship

## Type Definitions

All types are exported from the feature:

```typescript
import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
  Relationship,
  NodeType,
  RelationshipType,
  RelationshipDirection,
} from '@/features/knowledge-graph';
```

## Examples

### Using REST for one-off operations

```typescript
const { findPath, loading } = useFindPath();

const handleFindPath = async () => {
  const result = await findPath('graph-id', 'node-1', 'node-2', 5);
  console.log('Path found:', result?.path);
};
```

### Using GraphQL for reactive data

```typescript
const { data, loading, error } = useGetGraphQuery('graph-id');

// Data automatically updates when cache is invalidated
// Use refetch() to manually refresh
```

### Combining REST and GraphQL

```typescript
// Use GraphQL for queries (reactive, cached)
const { data: graph } = useGetGraphQuery('graph-id');

// Use REST for mutations (imperative, simple)
const { createNode } = useCreateNode();

const handleCreate = async () => {
  await createNode('graph-id', { type: 'Concept', properties: { name: 'Test' } });
  // GraphQL query will automatically refetch if cache is updated
};
```

## Authentication

Both REST and GraphQL hooks automatically include Firebase authentication tokens in requests. No additional setup is required.

## Error Handling

All hooks provide error states:

```typescript
const { getGraph, loading, error } = useGetGraph();

if (error) {
  console.error('Error:', error.message);
}
```

For GraphQL hooks, errors are available in the query/mutation result:

```typescript
const { data, error } = useGetGraphQuery('graph-id');

if (error) {
  console.error('GraphQL Error:', error);
}
```

