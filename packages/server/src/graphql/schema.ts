/**
 * GraphQL Schema for Knowledge Graph Access API
 * 
 * Phase 3: GraphQL Schema & Resolvers
 */

import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar JSON
  scalar DateTime

  # Node Types
  enum NodeType {
    Graph
    Concept
    Layer
    LearningGoal
    Milestone
    PracticeExercise
    Lesson
    ConceptMetadata
    GraphMetadata
    FlashCard
  }

  enum RelationshipType {
    # Hierarchical
    hasParent
    hasChild
    # Containment
    containsConcept
    belongsToLayer
    hasLesson
    hasFlashCard
    hasMetadata
    # Sequence
    precedesLayer
    precedesConcept
    # Prerequisites
    hasPrerequisite
    isPrerequisiteOf
    # Goals
    hasLearningGoal
    hasMilestone
    # Practice
    hasPracticeExercise
    # Metadata
    hasGraphMetadata
    hasConceptMetadata
  }

  enum RelationshipDirection {
    forward
    backward
    bidirectional
  }

  # Core Types
  type GraphNode {
    id: ID!
    type: NodeType!
    properties: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Relationship {
    id: ID!
    source: ID!
    target: ID!
    type: RelationshipType!
    direction: RelationshipDirection!
    strength: Float
    metadata: JSON
    createdAt: DateTime!
  }

  type NodeBasedKnowledgeGraph {
    id: ID!
    seedConceptId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    nodes: [GraphNode!]!
    relationships: [Relationship!]!
    nodeTypes: NodeTypeIndex!
  }

  type NodeTypeIndex {
    Graph: [ID!]!
    Concept: [ID!]!
    Layer: [ID!]!
    LearningGoal: [ID!]!
    Milestone: [ID!]!
    PracticeExercise: [ID!]!
    Lesson: [ID!]!
    ConceptMetadata: [ID!]!
    GraphMetadata: [ID!]!
    FlashCard: [ID!]!
  }

  # Query Input Types
  input NodeFilter {
    type: NodeType
    properties: JSON
  }

  input RelationshipFilter {
    type: RelationshipType
    source: ID
    target: ID
    direction: RelationshipDirection
  }

  input TraverseOptions {
    relationshipTypes: [RelationshipType!]
    direction: RelationshipDirection
    maxDepth: Int
    limit: Int
  }

  # Query Results
  type PathResult {
    path: [GraphNode!]!
    length: Int!
  }

  type TraverseResult {
    nodes: [GraphNode!]!
    relationships: [Relationship!]!
    depth: Int!
    visited: [ID!]!
  }

  type NodesResult {
    nodes: [GraphNode!]!
    count: Int!
  }

  type RelationshipsResult {
    relationships: [Relationship!]!
    count: Int!
  }

  # Optimized Query Types (Phase 3.2 - Mentor Pages)
  type LearningPathSummary {
    id: ID!
    title: String!
    description: String
    conceptCount: Int!
    seedConcept: SeedConceptInfo
    updatedAt: DateTime!
    createdAt: DateTime!
  }

  type SeedConceptInfo {
    id: ID!
    name: String!
    description: String
  }

  type GraphSummary {
    id: ID!
    goal: LearningGoalInfo
    milestones: [MilestoneInfo!]!
    conceptCount: Int!
    layerCount: Int!
    seedConcept: SeedConceptInfo
    updatedAt: DateTime!
  }

  type LearningGoalInfo {
    id: ID!
    title: String!
    description: String
    type: String
    target: String
  }

  type MilestoneInfo {
    id: ID!
    title: String!
    description: String
    targetDate: DateTime
    completed: Boolean!
  }

  type ConceptsResponse {
    concepts: [ConceptDisplay!]!
    groupedByLayer: [LayerGroup!]
    layerInfo: [LayerInfo!]!
  }

  type ConceptDisplay {
    id: ID!
    name: String!
    description: String
    layer: Int!
    isSeed: Boolean!
    sequence: Int
    parents: [String!]!
    children: [String!]!
    prerequisites: [String!]!
    properties: JSON!
  }

  type LayerGroup {
    layerNumber: Int!
    concepts: [ConceptDisplay!]!
  }

  type LayerInfo {
    layerNumber: Int!
    conceptCount: Int!
    goal: String
  }

  type ConceptDetail {
    concept: ConceptDisplay!
    lesson: LessonInfo
    flashcards: [FlashCardInfo!]!
    metadata: ConceptMetadataInfo
    relationships: ConceptRelationships!
  }

  type LessonInfo {
    id: ID!
    content: String!
    prerequisites: [String!]!
  }

  type FlashCardInfo {
    id: ID!
    front: String!
    back: String!
  }

  type ConceptMetadataInfo {
    qa: [QAInfo!]!
  }

  type QAInfo {
    question: String!
    answer: String!
  }

  type ConceptRelationships {
    parents: [RelatedConcept!]!
    children: [RelatedConcept!]!
    prerequisites: [RelatedConcept!]!
  }

  type RelatedConcept {
    id: ID!
    name: String!
  }

  # Queries
  type Query {
    # Optimized queries for Mentor pages (Phase 3.2)
    learningPaths: [LearningPathSummary!]!
    graphSummary(graphId: ID!): GraphSummary!
    concepts(
      graphId: ID!
      includeRelationships: Boolean = true
      groupByLayer: Boolean = true
    ): ConceptsResponse!
    conceptDetail(graphId: ID!, conceptId: ID!): ConceptDetail!
    
    # Graph queries
    graph(graphId: ID!): NodeBasedKnowledgeGraph
    
    # Node queries
    node(graphId: ID!, nodeId: ID!): GraphNode
    nodes(graphId: ID!, type: NodeType, filter: NodeFilter): NodesResult!
    findNodes(graphId: ID!, filter: NodeFilter!): NodesResult!
    
    # Relationship queries
    relationships(
      graphId: ID!
      filter: RelationshipFilter
    ): RelationshipsResult!
    nodeRelationships(
      graphId: ID!
      nodeId: ID!
      direction: RelationshipDirection
      type: RelationshipType
    ): RelationshipsResult!
    
    # Graph algorithms
    path(
      graphId: ID!
      from: ID!
      to: ID!
      maxDepth: Int
    ): PathResult
    traverse(
      graphId: ID!
      startNodeId: ID!
      options: TraverseOptions
    ): TraverseResult!
    subgraph(
      graphId: ID!
      nodeIds: [ID!]!
      depth: Int
    ): NodeBasedKnowledgeGraph!
  }

  # Mutation Input Types
  input CreateNodeInput {
    type: NodeType!
    properties: JSON!
  }

  input UpdateNodeInput {
    properties: JSON!
  }

  input CreateRelationshipInput {
    source: ID!
    target: ID!
    type: RelationshipType!
    direction: RelationshipDirection
    strength: Float
    metadata: JSON
  }

  input DeleteNodeOptions {
    cascade: Boolean
  }

  # Direct Mutation Input Types (Phase 3)
  enum MutationType {
    CREATE_NODE
    UPDATE_NODE
    DELETE_NODE
    CREATE_RELATIONSHIP
    DELETE_RELATIONSHIP
    UPDATE_NODE_TYPE_INDEX
  }

  input GraphMutationInput {
    type: MutationType!
    node: CreateNodeInput
    nodeId: ID
    properties: JSON
    relationship: CreateRelationshipInput
    relationshipId: ID
    updateIndex: Boolean
    updateTimestamp: Boolean
    cascade: Boolean
  }

  type GraphMutation {
    type: MutationType!
    node: GraphNode
    nodeId: ID
    properties: JSON
    relationship: Relationship
    relationshipId: ID
    updateIndex: Boolean
    updateTimestamp: Boolean
    cascade: Boolean
  }

  type MutationValidationResult {
    valid: Boolean!
    errors: [MutationError!]!
  }

  type MutationError {
    mutation: JSON!
    error: String!
  }

  # Graph Operation Result Types (Phase 3.1)
  type ProgressiveExpandResult {
    graph: NodeBasedKnowledgeGraph!
    mutations: MutationBatch!
    content: ProgressiveExpandContent!
    errors: [MutationError!]!
  }

  type ProgressiveExpandContent {
    narrative: String!
    goal: String
    levelName: String
    concepts: [ConceptInfo!]!
  }

  type ConceptInfo {
    name: String!
    description: String
    layer: Int
  }

  type ExplainConceptResult {
    graph: NodeBasedKnowledgeGraph!
    mutations: MutationBatch!
    content: ExplainContent!
    errors: [MutationError!]!
  }

  type ExplainContent {
    lesson: String!
    prerequisites: [String!]!
  }

  type AnswerQuestionResult {
    graph: NodeBasedKnowledgeGraph!
    mutations: MutationBatch!
    content: AnswerContent!
    errors: [MutationError!]!
  }

  type AnswerContent {
    answer: String!
  }

  type GenerateGoalsResult {
    graph: NodeBasedKnowledgeGraph!
    mutations: MutationBatch!
    content: GoalContent!
    errors: [MutationError!]!
  }

  type GoalContent {
    goal: LearningGoalInfo!
  }

  type GenerateLayerPracticeResult {
    graph: NodeBasedKnowledgeGraph!
    mutations: MutationBatch!
    content: LayerPracticeContent!
    errors: [MutationError!]!
  }

  type LayerPracticeContent {
    review: String!
  }

  type CustomOperationResult {
    graph: NodeBasedKnowledgeGraph!
    mutations: MutationBatch!
    content: CustomOperationContent!
    errors: [MutationError!]!
  }

  type CustomOperationContent {
    concepts: [ConceptAction!]!
  }

  type ConceptAction {
    name: String!
    action: String!
  }

  type MutationBatch {
    mutations: [GraphMutation!]!
    metadata: MutationMetadata
  }

  type MutationMetadata {
    operation: String!
    timestamp: DateTime!
    model: String
  }

  # Graph Operation Input Types (Phase 3.1)
  input GenerateLayerPracticeInput {
    targetNodeId: ID!
    layerNumber: Int!
  }

  input CustomOperationInput {
    targetNodeIds: [ID!]!
    userPrompt: String!
    details: CustomOperationDetails
    parentForNewConcepts: String
  }

  input CustomOperationDetails {
    lesson: Boolean
    flashCards: Boolean
  }

  # Mutations
  type Mutation {
    # Graph mutations
    saveGraph(graphId: ID!, graph: JSON!): NodeBasedKnowledgeGraph!
    
    # Node mutations
    createNode(graphId: ID!, input: CreateNodeInput!): GraphNode!
    updateNode(graphId: ID!, nodeId: ID!, input: UpdateNodeInput!): GraphNode!
    deleteNode(graphId: ID!, nodeId: ID!, options: DeleteNodeOptions): Boolean!
    
    # Relationship mutations
    createRelationship(graphId: ID!, input: CreateRelationshipInput!): Relationship!
    deleteRelationship(graphId: ID!, relId: ID!): Boolean!
    
    # Direct mutation operations (Phase 3)
    applyMutations(
      graphId: ID!
      mutations: [GraphMutationInput!]!
    ): NodeBasedKnowledgeGraph!
    
    validateMutations(
      graphId: ID!
      mutations: [GraphMutationInput!]!
    ): MutationValidationResult!
    
    # Graph operation mutations (Phase 3.1)
    progressiveExpand(
      graphId: ID!
      numConcepts: Int
    ): ProgressiveExpandResult!
    
    explainConcept(
      graphId: ID!
      targetNodeId: ID!
    ): ExplainConceptResult!
    
    answerQuestion(
      graphId: ID!
      targetNodeId: ID!
      question: String!
    ): AnswerQuestionResult!
    
    generateGoals(
      graphId: ID!
      anchorAnswer: String!
      questionAnswers: [QuestionAnswerInput!]!
    ): GenerateGoalsResult!
    
    generateLayerPractice(
      graphId: ID!
      targetNodeId: ID!
      layerNumber: Int!
    ): GenerateLayerPracticeResult!
    
    customOperation(
      graphId: ID!
      targetNodeIds: [ID!]!
      userPrompt: String!
      details: CustomOperationDetails
      parentForNewConcepts: String
    ): CustomOperationResult!
  }

  input QuestionAnswerInput {
    questionId: String!
    answer: String
    answers: [String!]
    isOther: Boolean
    otherValue: String
    skipped: Boolean
  }
`;

