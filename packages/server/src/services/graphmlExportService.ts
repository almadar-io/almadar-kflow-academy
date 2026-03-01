/**
 * GraphML Export Service
 * 
 * Exports NodeBasedKnowledgeGraph to GraphML XML format for visualization tools.
 * Compatible with Gephi, yEd, Cytoscape, and Graphviz.
 * Part of Phase 2: Concept Graph to Knowledge Graph Conversion
 */

import type { NodeBasedKnowledgeGraph, GraphNode, Relationship } from '../types/nodeBasedKnowledgeGraph';
import { getConnectedNodes } from '../utils/nodeBasedGraphQueries';
import type { EnhancedConcept } from '../types/knowledgeGraph';

export interface GraphMLExportOptions {
  includeEmbeddings?: boolean;  // Include embedding vectors (default: false)
  includeMetadata?: boolean;    // Include full metadata (default: true)
  simplified?: boolean;         // Simplified format for visualization (default: false)
}

/**
 * Export NodeBasedKnowledgeGraph to GraphML XML format
 */
export function exportToGraphML(
  nodeBasedGraph: NodeBasedKnowledgeGraph,
  options: GraphMLExportOptions = {}
): string {
  const {
    includeEmbeddings = false,
    includeMetadata = true,
    simplified = false,
  } = options;

  // Build GraphML XML
  const lines: string[] = [];
  
  // XML header and root element
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<graphml xmlns="http://graphml.graphdrawing.org/xmlns"');
  lines.push('         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  lines.push('         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns');
  lines.push('         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">');

  // Define keys for node attributes
  const nodeKeys = defineNodeKeys(lines, includeEmbeddings, includeMetadata, simplified);
  
  // Define keys for edge attributes
  defineEdgeKeys(lines, includeMetadata);

  // Create graph element
  lines.push(`  <graph id="${escapeXml(nodeBasedGraph.id)}" edgedefault="directed">`);

  // Get all nodes (all types)
  const allNodes = Object.values(nodeBasedGraph.nodes);
  
  // Build a map of all nodes for quick lookup
  const nodeMap = new Map<string, GraphNode>();
  for (const node of allNodes) {
    nodeMap.set(node.id, node);
  }

  // Add all nodes
  for (const node of allNodes) {
    if (node.type === 'Concept') {
      // Convert concept nodes to EnhancedConcept format for compatibility
      const enhancedConcept = convertNodeToEnhancedConcept(node, nodeBasedGraph);
      addNode(lines, node.id, enhancedConcept, nodeKeys, includeEmbeddings, simplified);
    } else {
      // Add other node types (Layer, LearningGoal, Milestone, etc.)
      addNodeFromGraphNode(lines, node, nodeKeys, simplified);
    }
  }

  // Add all edges from relationships array (all relationships between all node types)
  for (const rel of nodeBasedGraph.relationships) {
    // Only add edges if both source and target nodes exist
    if (nodeMap.has(rel.source) && nodeMap.has(rel.target)) {
      addEdgeFromRelationship(lines, rel, includeMetadata);
    }
  }

  lines.push('  </graph>');
  lines.push('</graphml>');

  return lines.join('\n');
}

/**
 * Convert a GraphNode to EnhancedConcept format for compatibility with existing addNode function
 */
function convertNodeToEnhancedConcept(
  conceptNode: GraphNode,
  graph: NodeBasedKnowledgeGraph
): EnhancedConcept {
  const props = conceptNode.properties;
  
  // Get parent/child relationships
  const parentNodes = getConnectedNodes(graph, conceptNode.id, 'hasParent', 'outgoing');
  const childNodes = getConnectedNodes(graph, conceptNode.id, 'hasChild', 'outgoing');
  const prerequisiteNodes = getConnectedNodes(graph, conceptNode.id, 'hasPrerequisite', 'outgoing');
  
  // Get layer relationship
  const layerNodes = getConnectedNodes(graph, conceptNode.id, 'belongsToLayer', 'outgoing');
  const layer = layerNodes.length > 0 ? layerNodes[0].properties.layerNumber : undefined;
  
  // Get lesson
  const lessonNode = getConnectedNodes(graph, conceptNode.id, 'hasLesson', 'outgoing')
    .find(n => n.type === 'Lesson');
  const lesson = lessonNode?.properties.content;
  
  // Get metadata - check both separate metadata node and direct properties
  const metadataNode = getConnectedNodes(graph, conceptNode.id, 'hasMetadata', 'outgoing')
    .find(n => n.type === 'ConceptMetadata');
  const metadataFromNode = metadataNode ? {
    difficulty: metadataNode.properties.difficulty,
    timeEstimate: metadataNode.properties.timeEstimate,
    domain: metadataNode.properties.domain,
    tags: metadataNode.properties.tags,
    resourceLinks: metadataNode.properties.resourceLinks,
  } : undefined;
  
  // Also check if metadata is directly in properties (for backward compatibility)
  const metadataFromProps = props.metadata ? {
    difficulty: props.metadata.difficulty,
    timeEstimate: props.metadata.timeEstimate,
    domain: props.metadata.domain,
    tags: props.metadata.tags,
    resourceLinks: props.metadata.resourceLinks,
  } : undefined;
  
  // Prefer metadata from node, fallback to properties
  const metadata = metadataFromNode || metadataFromProps;
  
  // Get embeddings from properties (if stored directly in concept node)
  const embeddings = props.embeddings ? {
    node2vec: props.embeddings.node2vec,
    dimensions: props.embeddings.dimensions,
    model: props.embeddings.model,
  } : undefined;
  
  // Get flash cards
  const flashCardNodes = getConnectedNodes(graph, conceptNode.id, 'hasFlashCard', 'outgoing')
    .filter(n => n.type === 'FlashCard');
  const flash = flashCardNodes.length > 0
    ? flashCardNodes.map(card => ({
        front: card.properties.front,
        back: card.properties.back,
      }))
    : undefined;

  return {
    id: props.id || conceptNode.id,
    name: props.name,
    description: props.description,
    parents: parentNodes.map(n => n.id),
    children: childNodes.map(n => n.id),
    prerequisites: prerequisiteNodes.map(n => n.id),
    lesson,
    flash,
    sequence: props.sequence,
    focus: props.focus,
    isSeed: props.isSeed || false,
    isAutoGenerated: props.isAutoGenerated || false,
    isPrerequisite: props.isPrerequisite || false,
    layer,
    metadata,
    embeddings,
    goal: props.goal,
  };
}

/**
 * Define GraphML keys for node attributes
 */
function defineNodeKeys(
  lines: string[],
  includeEmbeddings: boolean,
  includeMetadata: boolean,
  simplified: boolean
): Set<string> {
  const keys = new Set<string>();

  // Label key (required by Gephi for visualization)
  lines.push('  <key id="label" for="node" attr.name="label" attr.type="string"/>');
  keys.add('label');

  // Node type (always included to distinguish node types)
  lines.push('  <key id="nodeType" for="node" attr.name="Node type" attr.type="string"/>');
  keys.add('nodeType');

  // Basic attributes (always included)
  lines.push('  <key id="name" for="node" attr.name="Name" attr.type="string"/>');
  keys.add('name');
  
  lines.push('  <key id="description" for="node" attr.name="Description" attr.type="string"/>');
  keys.add('description');

  if (!simplified) {
    // Concept-specific attributes
    lines.push('  <key id="isSeed" for="node" attr.name="Is seed concept" attr.type="boolean"/>');
    keys.add('isSeed');

    // Layer-specific attributes
    lines.push('  <key id="layerNumber" for="node" attr.name="Layer number" attr.type="int"/>');
    keys.add('layerNumber');

    // LearningGoal-specific attributes
    lines.push('  <key id="goalTitle" for="node" attr.name="Goal title" attr.type="string"/>');
    keys.add('goalTitle');

    // Milestone-specific attributes
    lines.push('  <key id="milestoneTitle" for="node" attr.name="Milestone title" attr.type="string"/>');
    keys.add('milestoneTitle');

    if (includeMetadata) {
      lines.push('  <key id="difficulty" for="node" attr.name="Difficulty level (1-5)" attr.type="int"/>');
      keys.add('difficulty');
      
      lines.push('  <key id="timeEstimate" for="node" attr.name="Time estimate (hours)" attr.type="double"/>');
      keys.add('timeEstimate');
      
      lines.push('  <key id="domain" for="node" attr.name="Domain/category" attr.type="string"/>');
      keys.add('domain');
      
      lines.push('  <key id="tags" for="node" attr.name="Tags (comma-separated)" attr.type="string"/>');
      keys.add('tags');

      if (includeEmbeddings) {
        lines.push('  <key id="embedding" for="node" attr.name="Node2Vec embedding (comma-separated)" attr.type="string"/>');
        keys.add('embedding');
      }
    }
  }

  return keys;
}

/**
 * Define GraphML keys for edge attributes
 */
function defineEdgeKeys(lines: string[], includeMetadata: boolean): void {
  lines.push('  <key id="type" for="edge" attr.name="Relationship type" attr.type="string"/>');

  if (includeMetadata) {
    lines.push('  <key id="strength" for="edge" attr.name="Relationship strength" attr.type="double"/>');
    lines.push('  <key id="direction" for="edge" attr.name="Edge direction" attr.type="string"/>');
    lines.push('  <key id="confidence" for="edge" attr.name="Confidence score" attr.type="double"/>');
    lines.push('  <key id="extractedFrom" for="edge" attr.name="Source of relationship" attr.type="string"/>');
  }
}

/**
 * Add a node element to GraphML (for Concept nodes using EnhancedConcept format)
 */
function addNode(
  lines: string[],
  conceptName: string,
  concept: EnhancedConcept,
  nodeKeys: Set<string>,
  includeEmbeddings: boolean,
  simplified: boolean
): void {
  const nodeId = concept.id || conceptName;
  lines.push(`    <node id="${escapeXml(nodeId)}">`);

  // Node type
  if (nodeKeys.has('nodeType')) {
    lines.push('      <data key="nodeType">Concept</data>');
  }

  // Label (required by Gephi for visualization)
  if (nodeKeys.has('label')) {
    lines.push(`      <data key="label">${escapeXml(concept.name)}</data>`);
  }

  // Name
  if (nodeKeys.has('name')) {
    lines.push(`      <data key="name">${escapeXml(concept.name)}</data>`);
  }

  // Description (limit length for visualization)
  if (nodeKeys.has('description') && concept.description) {
    const desc = concept.description.length > 500 
      ? concept.description.substring(0, 500) + '...'
      : concept.description;
    lines.push(`      <data key="description">${escapeXml(desc)}</data>`);
  }

  if (!simplified) {
    // Is seed
    if (nodeKeys.has('isSeed') && concept.isSeed) {
      lines.push('      <data key="isSeed">true</data>');
    }

    // Layer number
    if (nodeKeys.has('layerNumber') && concept.layer !== undefined) {
      lines.push(`      <data key="layerNumber">${concept.layer}</data>`);
    }

    // Metadata
    if (concept.metadata) {
      if (nodeKeys.has('difficulty') && concept.metadata.difficulty) {
        lines.push(`      <data key="difficulty">${concept.metadata.difficulty}</data>`);
      }

      if (nodeKeys.has('timeEstimate') && concept.metadata.timeEstimate) {
        lines.push(`      <data key="timeEstimate">${concept.metadata.timeEstimate}</data>`);
      }

      if (nodeKeys.has('domain') && concept.metadata.domain) {
        lines.push(`      <data key="domain">${escapeXml(concept.metadata.domain)}</data>`);
      }

      if (nodeKeys.has('tags') && concept.metadata.tags && concept.metadata.tags.length > 0) {
        lines.push(`      <data key="tags">${escapeXml(concept.metadata.tags.join(','))}</data>`);
      }
    }

    // Embeddings (optional, can be large)
    if (includeEmbeddings && nodeKeys.has('embedding') && concept.embeddings?.node2vec) {
      const embeddingStr = concept.embeddings.node2vec.map(x => x.toString()).join(',');
      lines.push(`      <data key="embedding">${escapeXml(embeddingStr)}</data>`);
    }
  }

  lines.push('    </node>');
}

/**
 * Add a node element to GraphML (for non-Concept nodes)
 */
function addNodeFromGraphNode(
  lines: string[],
  node: GraphNode,
  nodeKeys: Set<string>,
  simplified: boolean
): void {
  const props = node.properties;
  lines.push(`    <node id="${escapeXml(node.id)}">`);

  // Node type
  if (nodeKeys.has('nodeType')) {
    lines.push(`      <data key="nodeType">${escapeXml(node.type)}</data>`);
  }

  // Label (required by Gephi for visualization)
  if (nodeKeys.has('label')) {
    const label = getNodeLabel(node);
    lines.push(`      <data key="label">${escapeXml(label)}</data>`);
  }

  // Name
  if (nodeKeys.has('name') && props.name) {
    lines.push(`      <data key="name">${escapeXml(props.name)}</data>`);
  }

  // Description
  if (nodeKeys.has('description') && props.description) {
    const desc = typeof props.description === 'string' && props.description.length > 500
      ? props.description.substring(0, 500) + '...'
      : String(props.description || '');
    lines.push(`      <data key="description">${escapeXml(desc)}</data>`);
  }

  if (!simplified) {
    // Layer-specific attributes
    if (node.type === 'Layer') {
      if (nodeKeys.has('layerNumber') && props.layerNumber !== undefined) {
        lines.push(`      <data key="layerNumber">${props.layerNumber}</data>`);
      }
      if (nodeKeys.has('description') && props.goal) {
        lines.push(`      <data key="description">${escapeXml(props.goal)}</data>`);
      }
    }

    // LearningGoal-specific attributes
    if (node.type === 'LearningGoal') {
      if (nodeKeys.has('goalTitle') && props.name) {
        lines.push(`      <data key="goalTitle">${escapeXml(props.name)}</data>`);
      }
    }

    // Milestone-specific attributes
    if (node.type === 'Milestone') {
      if (nodeKeys.has('milestoneTitle') && props.name) {
        lines.push(`      <data key="milestoneTitle">${escapeXml(props.name)}</data>`);
      }
    }
  }

  lines.push('    </node>');
}

/**
 * Get a human-readable label for a node
 */
function getNodeLabel(node: GraphNode): string {
  const props = node.properties;
  
  switch (node.type) {
    case 'Concept':
      return props.name || node.id;
    case 'Layer':
      // Prefer name property, fallback to layerNumber
      return props.name || `Layer ${props.layerNumber || ''}`.trim() || 'Layer';
    case 'LearningGoal':
      return props.name || 'Learning Goal';
    case 'Milestone':
      return props.name || 'Milestone';
    case 'Lesson':
      return 'Lesson';
    case 'PracticeExercise':
      return 'Practice Exercise';
    case 'FlashCard':
      return 'Flash Card';
    case 'ConceptMetadata':
      return 'Metadata';
    case 'GraphMetadata':
      return 'Graph Metadata';
    case 'Graph':
      return props.name || 'Graph';
    default:
      return node.type;
  }
}

/**
 * Add an edge element to GraphML from a Relationship
 */
function addEdgeFromRelationship(
  lines: string[],
  rel: Relationship,
  includeMetadata: boolean
): void {
  lines.push(`    <edge source="${escapeXml(rel.source)}" target="${escapeXml(rel.target)}">`);

  // Type (always included)
  lines.push(`      <data key="type">${escapeXml(rel.type)}</data>`);

  if (includeMetadata) {
    // Strength
    if (rel.strength !== undefined) {
      lines.push(`      <data key="strength">${rel.strength}</data>`);
    }

    // Direction
    if (rel.direction) {
      lines.push(`      <data key="direction">${escapeXml(rel.direction)}</data>`);
    }

    // Metadata
    if (rel.metadata) {
      if (rel.metadata.confidence !== undefined) {
        lines.push(`      <data key="confidence">${rel.metadata.confidence}</data>`);
      }

      if (rel.metadata.extractedFrom) {
        lines.push(`      <data key="extractedFrom">${escapeXml(rel.metadata.extractedFrom)}</data>`);
      }
    }
  }

  lines.push('    </edge>');
}


/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

