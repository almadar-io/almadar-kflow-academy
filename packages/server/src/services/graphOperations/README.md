# Graph Operations Service

## Location

**Folder**: `server/src/services/graphOperations/`

**Why Services?**: These operations are services that work with NodeBasedKnowledgeGraph. They're not just operations - they're graph services that generate mutations.

## Purpose

These operations work directly with `NodeBasedKnowledgeGraph` and generate mutations. They are designed for the new node-based architecture and do NOT call the original operations.

## Relationship to Existing Operations

- **Old Operations**: Remain in `server/src/operations/` (e.g., `progressiveExpandMultipleFromText.ts`, `explain.ts`)
- **New Operations**: Live in `server/src/services/graphOperations/` (e.g., `progressiveExpandMultipleFromText.ts`, `explain.ts`)

The new operations:
- Work directly with NodeBasedKnowledgeGraph
- Accept GraphNode inputs (not Concept objects)
- Use prompt builders for clean, readable prompts
- Generate mutations directly
- Return standardized format: `{ mutations, content, prompt }`

## Operations

### 1. `progressiveExpandMultipleFromText`

**File**: `progressiveExpandMultipleFromText.ts`

Generates mutations for:
- Layer node creation
- Concept node creation/updates
- Relationships: `hasLayer`, `containsConcept`, `hasChild`, `hasPrerequisite`

**Usage**:
```typescript
import { progressiveExpandMultipleFromText } from '../services/graphOperations';

const result = await progressiveExpandMultipleFromText({
  graph: nodeBasedGraph,
  mutationContext: {
    graphId: 'graph-123',
    seedConceptId: 'concept-seed',
    existingNodes: graph.nodes,
    existingRelationships: graph.relationships
  },
  numConcepts: 5,
  learningGoal: goal
});

// Apply mutations
const updatedGraph = applyMutationBatch(graph, result.mutations);
```

### 2. `explain`

**File**: `explain.ts`

Generates mutations for:
- Lesson node creation
- Relationship: `hasLesson` (Concept → Lesson)

**Usage**:
```typescript
import { explain } from '../services/graphOperations';

const result = await explain({
  graph: nodeBasedGraph,
  mutationContext: { ... },
  targetNodeId: 'concept-123',
  learningGoal: goal
});

// Apply mutations
const updatedGraph = applyMutationBatch(graph, result.mutations);
```

### 3. `answerQuestion`

**File**: `answerQuestion.ts`

Generates mutations for (optional):
- ConceptMetadata node creation/update
- Relationship: `hasMetadata` (Concept → ConceptMetadata)

**Usage**:
```typescript
import { answerQuestion } from '../services/graphOperations';

const result = await answerQuestion({
  graph: nodeBasedGraph,
  mutationContext: { ... },
  targetNodeId: 'concept-123',
  question: 'What is X?',
  storeQA: true, // Set to true to store Q&A in graph
});

// Apply mutations (may be empty if storeQA: false)
const updatedGraph = applyMutationBatch(graph, result.mutations);
```

### 4. `generateGoals`

**File**: `generateGoals.ts`

Generates mutations for:
- LearningGoal node creation
- Milestone node creation
- Relationships: `hasLearningGoal` (Graph → LearningGoal), `hasMilestone` (LearningGoal → Milestone)

**Usage**:
```typescript
import { generateGoals } from '../services/graphOperations';

const result = await generateGoals({
  graph: nodeBasedGraph,
  mutationContext: { ... },
  anchorAnswer: 'I want to learn machine learning',
  questionAnswers: [ /* user answers */ ],
  // ... other options
});

// Apply mutations
const updatedGraph = applyMutationBatch(graph, result.mutations);
```

## Design Pattern

All graph operations follow this pattern:

1. **Accept `NodeBasedKnowledgeGraph`**: Direct graph input
2. **Accept `MutationContext`**: Required parameter providing graph context
3. **Use Prompt Builders**: Generate clean, readable prompts
4. **Call LLM**: Get response from LLM
5. **Generate Mutations**: Create mutations directly from LLM response
6. **Return Standardized Format**: `{ mutations, content, prompt }`

## Prompt Builders

All operations use the prompt builder system located in `promptBuilders/`:
- `PromptBuilder.ts` - Base builder class
- `expansionPromptBuilder.ts` - Expansion prompts
- `explainPromptBuilder.ts` - Explanation prompts
- `goalPromptBuilder.ts` - Goal generation prompts
- `customOperationPromptBuilder.ts` - Custom operation prompts
- `layerPracticePromptBuilder.ts` - Layer practice prompts

This replaces huge string concatenations with clean, maintainable prompt generation.

## Migration Path

1. **Phase 1**: Create graph operations alongside old ones ✅
2. **Phase 2**: Update controllers to use graph operations
3. **Phase 3**: Gradually migrate frontend to new endpoints
4. **Phase 4**: Eventually deprecate old operations (future)

## Benefits

- **No Parsers Needed**: Mutations generated directly
- **Type Safe**: Mutations are part of return type
- **Clean Prompts**: Prompt builders replace string concatenation
- **Node-Based**: Works directly with NodeBasedKnowledgeGraph
- **Testable**: Can test mutation generation independently
- **Maintainable**: Single source of truth (operation generates mutations)
