# Redux Slice Usage Guide

## Overview

The `knowledgeGraphSlice` provides Redux state management for `NodeBasedKnowledgeGraph` objects. It stores graphs in a normalized format and provides actions and selectors for common operations.

## State Structure

```typescript
interface KnowledgeGraphState {
  graphs: Record<string, NodeBasedKnowledgeGraph>; // Map of graphId -> graph
  currentGraphId: string | null;                   // Currently active graph
  isLoading: boolean;                              // Loading state
  error: string | null;                            // Error message
  lastUpdated: number | null;                      // Last update timestamp
}
```

## Actions

### Graph Operations

```typescript
import { useAppDispatch } from '@/app/hooks';
import {
  setGraph,
  setGraphs,
  updateGraph,
  setCurrentGraphId,
  removeGraph,
  clearGraphs,
} from '@/features/knowledge-graph';

const dispatch = useAppDispatch();

// Set a single graph
dispatch(setGraph(graph));

// Set multiple graphs
dispatch(setGraphs([graph1, graph2]));

// Update a graph (merge with existing)
dispatch(updateGraph({ graphId: 'graph-1', updates: { updatedAt: Date.now() } }));

// Set current graph
dispatch(setCurrentGraphId('graph-1'));

// Remove a graph
dispatch(removeGraph('graph-1'));

// Clear all graphs
dispatch(clearGraphs());
```

### Node Operations

```typescript
import {
  upsertNode,
  removeNode,
} from '@/features/knowledge-graph';

// Add or update a node
dispatch(upsertNode({ graphId: 'graph-1', node: newNode }));

// Remove a node (also removes related relationships)
dispatch(removeNode({ graphId: 'graph-1', nodeId: 'node-1' }));
```

### Relationship Operations

```typescript
import {
  upsertRelationship,
  removeRelationship,
} from '@/features/knowledge-graph';

// Add or update a relationship
dispatch(upsertRelationship({ graphId: 'graph-1', relationship: newRel }));

// Remove a relationship
dispatch(removeRelationship({ graphId: 'graph-1', relId: 'rel-1' }));
```

### Loading & Error States

```typescript
import {
  setLoading,
  setError,
  clearError,
} from '@/features/knowledge-graph';

dispatch(setLoading(true));
dispatch(setError('Something went wrong'));
dispatch(clearError());
```

## Selectors

### Basic Selectors

```typescript
import { useAppSelector } from '@/app/hooks';
import {
  selectAllGraphs,
  selectGraphById,
  selectCurrentGraph,
  selectCurrentGraphId,
  selectGraphsLoading,
  selectGraphsError,
} from '@/features/knowledge-graph';

function MyComponent() {
  // Get all graphs
  const allGraphs = useAppSelector(selectAllGraphs);
  
  // Get specific graph
  const graph = useAppSelector(state => selectGraphById(state, 'graph-1'));
  
  // Get current graph
  const currentGraph = useAppSelector(selectCurrentGraph);
  
  // Get current graph ID
  const currentGraphId = useAppSelector(selectCurrentGraphId);
  
  // Get loading state
  const isLoading = useAppSelector(selectGraphsLoading);
  
  // Get error state
  const error = useAppSelector(selectGraphsError);
}
```

### Node Selectors

```typescript
import {
  selectNodeById,
  selectNodesByType,
} from '@/features/knowledge-graph';

// Get a specific node
const node = useAppSelector(state => selectNodeById(state, 'graph-1', 'node-1'));

// Get all nodes of a specific type
const concepts = useAppSelector(state => selectNodesByType(state, 'graph-1', 'Concept'));
```

### Relationship Selectors

```typescript
import {
  selectRelationshipsByNode,
} from '@/features/knowledge-graph';

// Get all relationships for a node
const relationships = useAppSelector(state =>
  selectRelationshipsByNode(state, 'graph-1', 'node-1')
);
```

## Example: Combining with Hooks

```typescript
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useGetGraph } from '@/features/knowledge-graph';
import { setGraph, selectCurrentGraph } from '@/features/knowledge-graph';

function GraphLoader() {
  const dispatch = useAppDispatch();
  const { getGraph, loading } = useGetGraph();
  const currentGraph = useAppSelector(selectCurrentGraph);

  const handleLoadGraph = async () => {
    const graph = await getGraph('graph-1');
    if (graph) {
      dispatch(setGraph(graph));
    }
  };

  return (
    <div>
      <button onClick={handleLoadGraph} disabled={loading}>
        Load Graph
      </button>
      {currentGraph && <div>Current Graph: {currentGraph.id}</div>}
    </div>
  );
}
```

## Integration with GraphQL

```typescript
import { useGetGraphQuery } from '@/features/knowledge-graph';
import { setGraph } from '@/features/knowledge-graph';
import { useAppDispatch } from '@/app/hooks';

function GraphComponent() {
  const dispatch = useAppDispatch();
  const { data, loading } = useGetGraphQuery('graph-1');

  useEffect(() => {
    if (data?.graph) {
      dispatch(setGraph(data.graph));
    }
  }, [data, dispatch]);

  // Use Redux selectors for reactive updates
  const graph = useAppSelector(selectCurrentGraph);
}
```

## Best Practices

1. **Use Redux for global state**: Store graphs that need to be shared across components
2. **Use hooks for API calls**: Use REST/GraphQL hooks to fetch data, then dispatch to Redux
3. **Use selectors for reading**: Always use selectors to read from Redux state
4. **Normalize data**: Graphs are stored by ID for efficient lookups
5. **Update timestamps**: The slice automatically updates `updatedAt` and `lastUpdated` timestamps

