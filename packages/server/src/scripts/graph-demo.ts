/**
 * Interactive Graph Demo Script for Phase 1
 *
 * REPL-style interface to test all operations interactively
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { createLogger } from '@almadar/logger';
import { Concept } from '../types/concept';
import {
  expand,
  expandList,
  synthesize,
  deriveParents,
  explore,
  refocus,
  tracePath,
  deriveSummary,
  progressiveExpand,
  progressiveExpandMultiple,
  progressiveExplore,
  advanceNext,
  advanceNextMultiple,
  explain,
} from '../operations';
import { createGraph, addConceptsToGraph, getAllConcepts, getConcept } from '../utils/graph';
import { setLLMProvider } from '../config/llmConfig';
import { LLMProvider } from '../services/llm';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const log = createLogger('kflow:server:scripts:graph-demo');

// Global state
let graph = createGraph();
let seedConcept: Concept | undefined = undefined; // Store user-created seed concept
let llmProvider: LLMProvider = 'openai'; // Global variable to determine which LLM provider to use
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Initialize LLM provider in config
setLLMProvider(llmProvider);

/**
 * Prompt user for input
 */
function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * Display concept list
 */
function displayConcepts(concepts: Concept[], title: string = 'Concepts') {
  log.debug(`${title}:`, { conceptCount: concepts.length });
  if (concepts.length === 0) {
    log.debug('(no concepts)');
    return;
  }
  concepts.forEach((concept, i) => {
    log.debug(`${i + 1}. ${concept.name}`, {
      layer: concept.layer,
      subLayer: concept.subLayer,
      description: concept.description,
      parents: concept.parents,
      children: concept.children
    });
  });
}

/**
 * Select a concept by name or index
 */
async function selectConcept(promptText: string = 'Select a concept'): Promise<Concept | null> {
  const allConcepts = getAllConcepts(graph);
  if (allConcepts.length === 0) {
    log.info('No concepts in graph. Please create some first');
    return null;
  }

  displayConcepts(allConcepts);
  const input = await question(`${promptText} (name or number, or 'cancel'): `);

  if (input.toLowerCase() === 'cancel') {
    return null;
  }

  // Try as index
  const index = parseInt(input, 10);
  if (!isNaN(index) && index > 0 && index <= allConcepts.length) {
    return allConcepts[index - 1];
  }

  // Try as name
  const concept = allConcepts.find(c => c.name.toLowerCase() === input.toLowerCase());
  if (concept) {
    return concept;
  }

  log.info('Concept not found');
  return null;
}

/**
 * Select multiple concepts
 */
async function selectConcepts(promptText: string = 'Select concepts'): Promise<Concept[]> {
  const allConcepts = getAllConcepts(graph);
  if (allConcepts.length === 0) {
    log.info('No concepts in graph. Please create some first');
    return [];
  }

  log.info('Selection Options:\n  1. Use all concepts from graph\n  2. Select specific concepts\n  3. Cancel');

  const choice = await question('\nChoice (1-3): ');

  if (choice === '1') {
    return allConcepts;
  } else if (choice === '2') {
    const selected: Concept[] = [];
    displayConcepts(allConcepts, 'Available Concepts');

    while (true) {
      const input = await question('Enter concept number/name (or "done" to finish): ');
      if (input.toLowerCase() === 'done') {
        break;
      }

      const index = parseInt(input, 10);
      let concept: Concept | undefined;

      if (!isNaN(index) && index > 0 && index <= allConcepts.length) {
        concept = allConcepts[index - 1];
      } else {
        concept = allConcepts.find(c => c.name.toLowerCase() === input.toLowerCase());
      }

      if (concept && !selected.find(c => c.name === concept!.name)) {
        selected.push(concept);
        log.debug(`Added: ${concept.name}`);
      } else if (concept) {
        log.debug('Already selected');
      } else {
        log.debug('Concept not found');
      }
    }

    return selected;
  }

  return [];
}

/**
 * Operation: expand
 */
async function runExpand() {
  log.info('Expand Operation - Generates 3-7 sub-concepts of a concept');

  const concept = await selectConcept('Select concept to expand');
  if (!concept) return;

  // Get the latest concept from graph to ensure we have current children list
  const latestConcept = getConcept(graph, concept.name) || concept;

  try {
    log.info('Generating...');
    const results = await expand(latestConcept, graph);
    graph = addConceptsToGraph(graph, results);

    // Filter out the updated parent concept from display
    const newChildren = results.filter(r => r.name !== latestConcept.name);
    const updatedParent = results.find(r => r.name === latestConcept.name);

    log.info('Generated child concepts', { count: newChildren.length });
    displayConcepts(newChildren, 'New Concepts');
    if (updatedParent) {
      log.info(`Updated parent children list`, { parent: latestConcept.name, children: updatedParent.children });
    }
    log.info('Added to graph');
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Operation: expandList
 */
async function runExpandList() {
  log.info('Expand List Operation - Generates concepts from multiple parents');

  const concepts = await selectConcepts('Select parent concepts');
  if (concepts.length === 0) return;

  try {
    log.info('Generating...');
    const results = await expandList(concepts, seedConcept);
    graph = addConceptsToGraph(graph, results);

    log.info('Generated concepts', { count: results.length });
    displayConcepts(results, 'New Concepts');
    log.info('Added to graph');
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Operation: synthesize
 */
async function runSynthesize() {
  log.info('Synthesize Operation - Generates hybrid concepts combining multiple parents');

  const concepts = await selectConcepts('Select parent concepts to synthesize');
  if (concepts.length === 0) return;

  try {
    log.info('Generating...');
    const results = await synthesize(concepts, seedConcept);

    log.info('Generated hybrid concepts', { count: results.length });
    displayConcepts(results, 'Generated Concepts');
    log.info('Review the concepts above. These have not been added to the graph yet');

    const confirm = await question('\nAdd these concepts to the graph? (yes/no) [yes]: ');
    if (confirm.toLowerCase() !== 'no' && confirm.toLowerCase() !== 'n') {
      graph = addConceptsToGraph(graph, results);
      log.info('Concepts added to graph');
    } else {
      log.info('Concepts not added to graph');
    }
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Operation: deriveParents
 */
async function runDeriveParents() {
  log.info('Derive Parents Operation - Generates prerequisite concepts');

  const concept = await selectConcept('Select concept to derive parents for');
  if (!concept) return;

  // Get the latest concept from graph to ensure we have current state including layer
  const latestConcept = getConcept(graph, concept.name) || concept;

  try {
    log.info('Generating...');
    const results = await deriveParents(latestConcept, seedConcept);
    graph = addConceptsToGraph(graph, results);

    log.info('Generated prerequisite concepts', { count: results.length });
    displayConcepts(results, 'New Concepts');

    log.info('Added to graph');
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Operation: explore
 */
async function runExplore() {
  log.info('Explore Operation - Generates related concepts (lateral exploration)');

  const concept = await selectConcept('Select concept to explore');
  if (!concept) return;

  // Get the latest concept from graph to ensure we have current state
  const latestConcept = getConcept(graph, concept.name) || concept;

  const diversityInput = await question('Diversity level (low/medium/high) [high]: ');
  const diversity = ['low', 'medium', 'high'].includes(diversityInput.toLowerCase())
    ? diversityInput.toLowerCase() as 'low' | 'medium' | 'high'
    : 'high';

  try {
    log.info('Generating...', { diversity });
    const results = await explore(latestConcept, diversity, seedConcept);
    graph = addConceptsToGraph(graph, results);

    // Filter out updated parent concepts from display
    const newSiblings = results.filter(r => !latestConcept.parents.includes(r.name) && r.name !== latestConcept.name);
    const updatedParents = results.filter(r => latestConcept.parents.includes(r.name));

    log.info('Generated sibling concepts', { count: newSiblings.length });
    displayConcepts(newSiblings, 'New Sibling Concepts');
    if (updatedParents.length > 0) {
      log.info(`Updated parent concepts to include siblings`, { count: updatedParents.length });
    } else if (latestConcept.parents.length === 0) {
      log.info(`Root-level concepts`, { concept: latestConcept.name });
    }
    log.info('Added to graph');
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Operation: refocus
 */
async function runRefocus() {
  log.info('Refocus Operation - Updates attention scores based on a goal');

  const concepts = await selectConcepts('Select concepts to refocus');
  if (concepts.length === 0) return;

  const goal = await question('Enter learning goal: ');
  if (!goal.trim()) {
    log.info('Goal is required');
    return;
  }

  try {
    log.info('Generating...');
    const results = await refocus(concepts, goal.trim(), seedConcept);
    graph = addConceptsToGraph(graph, results.map(r => ({
      name: r.name,
      description: r.description,
      parents: r.parents,
      children: r.children,
    })));

    log.info('Updated concepts with attention scores', { count: results.length });
    results.forEach((result, i) => {
      log.debug(`${i + 1}. ${result.name}`, {
        attention: result.attention_score?.toFixed(2) || 'N/A',
        importance: result.importance || 'N/A'
      });
    });
    log.info('Updated in graph');
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Operation: tracePath
 */
async function runTracePath() {
  log.info('Trace Path Operation - Generates learning path between two concepts');

  log.info('Select start concept');
  const start = await selectConcept('Start');
  if (!start) return;

  log.info('Select end concept');
  const end = await selectConcept('End');
  if (!end) return;

  try {
    log.info('Generating path...');
    const results = await tracePath(start, end, seedConcept);
    graph = addConceptsToGraph(graph, results);

    log.info('Generated path', { conceptCount: results.length });
    results.forEach((concept, i) => {
      log.debug(`${i + 1}. ${concept.name}`);
    });
    log.info('Added to graph');
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Operation: deriveSummary
 */
async function runDeriveSummary() {
  log.info('Derive Summary Operation - Generates summary concepts for a specific layer');

  // Get all concepts with layer numbers
  const allConcepts = getAllConcepts(graph);
  const conceptsWithLayers = allConcepts.filter(c => c.layer !== undefined);

  if (conceptsWithLayers.length === 0) {
    log.info('No concepts with layer numbers found. Please create concepts with layers first');
    return;
  }

  // Find available layer numbers
  const availableLayers = Array.from(new Set(conceptsWithLayers.map(c => c.layer!))).sort((a, b) => a - b);

  log.info('Available layers:', { layers: availableLayers.map(l => `Layer ${l}: ${conceptsWithLayers.filter(c => c.layer === l).length} concept(s)`) });

  // Ask for layer number
  const layerInput = await question('Enter layer number to summarize: ');
  const layerNumber = parseInt(layerInput, 10);

  if (isNaN(layerNumber) || !availableLayers.includes(layerNumber)) {
    log.info(`Invalid layer number. Please choose from`, { layers: availableLayers });
    return;
  }

  // Filter concepts by layer number
  const concepts = conceptsWithLayers.filter(c => c.layer === layerNumber);

  if (concepts.length === 0) {
    log.info(`No concepts found for layer`, { layer: layerNumber });
    return;
  }

  log.info(`Found concepts in layer`, { layer: layerNumber, count: concepts.length });
  concepts.forEach((c, i) => {
    log.debug(`${i + 1}. ${c.name}`);
  });

  try {
    log.info('Generating summary...');
    const results = await deriveSummary(concepts, seedConcept);
    graph = addConceptsToGraph(graph, results);

    log.info('Generated summary concepts', { count: results.length });
    displayConcepts(results, 'Summary Concepts');
    log.info('Added to graph');
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Operation: progressiveExpand
 */
async function runProgressiveExpand() {
  log.info('Progressive Expand Operation - Generates next layer of concepts building on previous layers');

  const seedConcept = await selectConcept('Select seed concept for learning path');
  if (!seedConcept) return;

  // Get the latest concept from graph
  const latestSeedConcept = getConcept(graph, seedConcept.name) || seedConcept;

  // Automatically determine previous layers based on layer numbers
  const allConcepts = getAllConcepts(graph);

  // Calculate what the next layer number will be
  const conceptsWithLayers = allConcepts.filter(c => c.layer !== undefined);

  const maxLayer = conceptsWithLayers.length > 0
    ? Math.max(...conceptsWithLayers.map(c => c.layer!))
    : 0;
  const nextLayer = maxLayer + 1;

  // Find all concepts from previous layers (ONLY those with layer numbers)
  const previousLayers = allConcepts.filter(c => {
    // Only include concepts that have a layer number
    if (c.layer === undefined) {
      return false;
    }
    // Exclude the seed concept itself
    if (c.name === latestSeedConcept.name) {
      return false;
    }
    // Only include concepts from previous layers (lower layer numbers)
    return c.layer < nextLayer;
  });

  if (previousLayers.length > 0) {
    log.info(`Automatically found concepts from previous layers`, { count: previousLayers.length });
    previousLayers.forEach((c, i) => {
      log.debug(`${i + 1}. ${c.name}${c.layer !== undefined ? ` (Layer ${c.layer})` : ''}`);
    });
  } else {
    log.info('No previous layers found - this will be the first layer');
  }

  try {
    log.info('Generating next layer...');
    const results = await progressiveExpand(latestSeedConcept, previousLayers);
    graph = addConceptsToGraph(graph, results);

    // Filter out updated parent concepts from display
    const newConcepts = results.filter(r => !previousLayers.find(p => p.name === r.name));
    const updatedParents = results.filter(r => previousLayers.find(p => p.name === r.name));

    log.info('Generated concepts for next layer', { count: newConcepts.length });
    newConcepts.forEach((concept, i) => {
      log.debug(`${i + 1}. ${concept.name}`, {
        layer: concept.layer || 'N/A',
        description: concept.description,
        parents: concept.parents
      });
    });

    if (updatedParents.length > 0) {
      log.info(`Updated parent concepts from previous layer`, { count: updatedParents.length });
    }
    log.info('Added to graph');
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Operation: advanceNext
 */
async function runAdvanceNext() {
  log.info('Advance Next Operation - Determines the next logical learning step');

  // Select a concept
  const concept = await selectConcept('Select current concept to advance from');
  if (!concept) return;

  // Get the latest concept from graph
  const latestConcept = getConcept(graph, concept.name) || concept;

  try {
    log.info('Analyzing learning context and determining next step');
    const results = await advanceNext(latestConcept, graph);
    graph = addConceptsToGraph(graph, results);

    // Filter out updated current concept from display
    const nextConcept = results.find(r => r.name !== latestConcept.name);
    const updatedCurrentConcept = results.find(r => r.name === latestConcept.name);

    if (nextConcept) {
      log.info('Next learning step', {
        name: nextConcept.name,
        description: nextConcept.description,
        parent: nextConcept.parents,
        layer: nextConcept.layer
      });
    } else {
      log.info('No next concept generated');
    }

    if (updatedCurrentConcept) {
      log.info(`Updated concept to include child`, { concept: latestConcept.name, child: nextConcept?.name || 'next concept' });
    }
    log.info('Added to graph');
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Operation: advanceNextMultiple
 */
async function runAdvanceNextMultiple() {
  log.info('Advance Next Multiple Operation - Generates multiple sequential learning steps');

  // Select a concept
  const concept = await selectConcept('Select current concept to advance from');
  if (!concept) return;

  // Get the latest concept from graph
  const latestConcept = getConcept(graph, concept.name) || concept;

  // Ask for number of steps
  const numStepsInput = await question('Number of steps to advance (1-5) [3]: ');
  const numSteps = numStepsInput.trim() ? parseInt(numStepsInput, 10) : 3;

  if (isNaN(numSteps) || numSteps < 1 || numSteps > 5) {
    log.info('Invalid number of steps. Must be between 1 and 5');
    return;
  }

  try {
    log.info(`Analyzing learning context and generating sequential steps`, { stepCount: numSteps });
    const results = await advanceNextMultiple(latestConcept, graph, numSteps);
    graph = addConceptsToGraph(graph, results);

    // Separate new steps from updated parents
    const updatedParents: Concept[] = [];
    const newSteps: Concept[] = [];

    results.forEach(r => {
      if (r.name === latestConcept.name) {
        updatedParents.push(r);
      } else {
        // Check if this step has children (meaning it's been updated)
        const hasChildren = r.children && r.children.length > 0;
        if (hasChildren) {
          updatedParents.push(r);
        } else {
          newSteps.push(r);
        }
      }
    });

    if (newSteps.length > 0) {
      log.info('Generated sequential learning steps', { count: newSteps.length });
      newSteps.forEach((step, i) => {
        log.debug(`Step ${i + 1}: ${step.name}`, {
          description: step.description,
          parent: step.parents,
          layer: step.layer
        });
      });
    } else {
      log.info('No next steps generated');
    }

    if (updatedParents.length > 0) {
      log.info(`Updated parent concepts to include children`, { count: updatedParents.length });
    }
    log.info('Added to graph');
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Operation: progressiveExplore
 */
async function runProgressiveExplore() {
  log.info('Progressive Explore Operation - Generates additional related concepts within the same layer');

  if (!seedConcept) {
    log.info('No seed concept set. Please create a seed concept first');
    return;
  }

  // Select a concept directly
  const concept = await selectConcept('Select concept to explore');
  if (!concept) return;

  // Get the latest concept from graph to ensure we have current state
  const latestConcept = getConcept(graph, concept.name) || concept;

  // Check if concept has a layer number
  if (latestConcept.layer === undefined) {
    log.info('Selected concept does not have a layer number. Progressive Explore works best with layered concepts. Consider using progressiveExpand first');

    const proceed = await question('Continue anyway? (y/n) [n]: ');
    if (proceed.toLowerCase() !== 'y') {
      log.info('Operation cancelled');
      return;
    }
  }

  // Get all concepts from graph
  const allConcepts = getAllConcepts(graph);

  // Get concepts from one layer before, current layer, and one layer after
  const targetLayer = latestConcept.layer || 1;
  const prevLayerNum = targetLayer > 1 ? targetLayer - 1 : undefined;
  const nextLayerNum = targetLayer + 1;

  const previousLayer = allConcepts.filter(c => {
    if (c.name === latestConcept.name) return false;
    return c.layer === prevLayerNum;
  });

  const currentLayer = allConcepts.filter(c => {
    if (c.name === latestConcept.name) return false;
    return c.layer === targetLayer;
  });

  const nextLayer = allConcepts.filter(c => {
    if (c.name === latestConcept.name) return false;
    return c.layer === nextLayerNum;
  });

  if (previousLayer.length > 0 || currentLayer.length > 0 || nextLayer.length > 0) {
    log.info('Adjacent layers for deduplication', {
      previous: `Layer ${prevLayerNum}: ${previousLayer.length} concept(s)`,
      current: `Layer ${targetLayer}: ${currentLayer.length} concept(s)`,
      next: `Layer ${nextLayerNum}: ${nextLayer.length} concept(s)`
    });
  }

  try {
    log.info('Generating additional concepts related to the selected concept');
    const results = await progressiveExplore(latestConcept, seedConcept, previousLayer, currentLayer, nextLayer);
    graph = addConceptsToGraph(graph, results);

    // Filter out updated parent concepts from display
    const adjacentLayers = [...previousLayer, ...currentLayer, ...nextLayer];
    const newConcepts = results.filter(r => {
      // Check if it's not the selected concept
      if (r.name === latestConcept.name) {
        return false;
      }
      // Check if it's not an updated parent
      const isUpdatedParent = adjacentLayers.some(p => p.name === r.name);
      return !isUpdatedParent;
    });
    const updatedParents = results.filter(r => adjacentLayers.some(p => p.name === r.name));

    log.info(`Generated additional concepts`, { count: newConcepts.length, relatedTo: latestConcept.name });
    newConcepts.forEach((concept, i) => {
      log.debug(`${i + 1}. ${concept.name}${concept.layer !== undefined ? ` (Layer ${concept.layer})` : ''}`, {
        description: concept.description,
        parents: concept.parents
      });
    });

    if (updatedParents.length > 0) {
      log.info(`Updated parent concepts from previous layer`, { count: updatedParents.length });
    }
    log.info('Added to graph');
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Operation: explain
 */
async function runExplain() {
  log.info('Explain Operation - Generates a detailed Markdown lesson for a concept');

  const concept = await selectConcept('Select concept to explain');
  if (!concept) return;

  const latestConcept = getConcept(graph, concept.name) || concept;

  try {
    const simpleInput = await question('Generate simple lesson? (y/n) [n]: ');
    const simple = simpleInput.trim().toLowerCase() === 'y';

    log.info('Crafting lesson', { simple });
    const explainResult = await explain(latestConcept, seedConcept, { simple });
    if ('stream' in explainResult) throw new Error('Unexpected stream result in script');
    const results = explainResult;
    graph = addConceptsToGraph(graph, results);

    const lessonConcept = results[0];

    if (!lessonConcept) {
      log.info('No lesson content returned');
      return;
    }

    const lessonMarkdown = lessonConcept.lesson ?? lessonConcept.description ?? '';
    if (!lessonMarkdown.trim()) {
      log.info('Lesson content was empty');
      return;
    }

    log.info('Lesson stored on concept', { field: 'lesson' });
    log.debug('Lesson content', { content: lessonMarkdown });
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Operation: progressiveExpandMultiple
 */
async function runProgressiveExpandMultiple() {
  log.info('Progressive Expand Multiple Operation - Generates multiple layers of concepts');

  const seedConcept = await selectConcept('Select seed concept for learning path');
  if (!seedConcept) return;

  // Get the latest concept from graph
  const latestSeedConcept = getConcept(graph, seedConcept.name) || seedConcept;

  // Automatically determine previous layers based on layer numbers
  const allConcepts = getAllConcepts(graph);

  // Calculate what the next layer number will be
  const conceptsWithLayers = allConcepts.filter(c => c.layer !== undefined);

  const maxLayer = conceptsWithLayers.length > 0
    ? Math.max(...conceptsWithLayers.map(c => c.layer!))
    : 0;
  const nextLayer = maxLayer + 1;

  // Find all concepts from previous layers (ONLY those with layer numbers)
  const previousLayers = allConcepts.filter(c => {
    // Only include concepts that have a layer number
    if (c.layer === undefined) {
      return false;
    }
    // Exclude the seed concept itself
    if (c.name === latestSeedConcept.name) {
      return false;
    }
    // Only include concepts from previous layers (lower layer numbers)
    return c.layer < nextLayer;
  });

  if (previousLayers.length > 0) {
    log.info('Automatically found concepts from previous layers', { count: previousLayers.length });
    previousLayers.forEach((c, i) => {
      log.debug(`${i + 1}. ${c.name}${c.layer !== undefined ? ` (Layer ${c.layer})` : ''}`);
    });
  } else {
    log.info('No previous layers found - this will start from the first layer');
  }

  // Ask for number of layers to generate
  const numLayersInput = await question('Number of layers to generate (1-5) [2]: ');
  const numLayers = numLayersInput.trim() ? parseInt(numLayersInput, 10) : 2;

  if (isNaN(numLayers) || numLayers < 1 || numLayers > 5) {
    log.info('Invalid number of layers. Must be between 1 and 5');
    return;
  }

  try {
    log.info(`Generating layers`, { layerCount: numLayers });
    const result = await progressiveExpandMultiple(latestSeedConcept, previousLayers, numLayers);
    const results = result.concepts;
    const modelUsed = result.model;

    log.info('Generated using model', { model: modelUsed });

    graph = addConceptsToGraph(graph, results);

    // Filter out updated parent concepts from display
    const newConcepts = results.filter(r => !previousLayers.find(p => p.name === r.name));
    const updatedParents = results.filter(r => previousLayers.find(p => p.name === r.name));

    // Group new concepts by layer
    const conceptsByLayer = new Map<number, Concept[]>();
    newConcepts.forEach(concept => {
      if (concept.layer !== undefined) {
        if (!conceptsByLayer.has(concept.layer)) {
          conceptsByLayer.set(concept.layer, []);
        }
        conceptsByLayer.get(concept.layer)!.push(concept);
      }
    });

    log.info('Generated concepts across layers', { conceptCount: newConcepts.length, layerCount: numLayers });
    const sortedLayers = Array.from(conceptsByLayer.keys()).sort((a, b) => a - b);
    sortedLayers.forEach(layer => {
      const layerConcepts = conceptsByLayer.get(layer) || [];
      log.debug(`Layer ${layer}`, { conceptCount: layerConcepts.length });
      layerConcepts.forEach((concept, i) => {
        log.debug(`${i + 1}. ${concept.name}`, {
          description: concept.description,
          parents: concept.parents
        });
      });
    });

    if (updatedParents.length > 0) {
      log.info(`Updated parent concepts from previous layer`, { count: updatedParents.length });
    }
    log.info('Added to graph');
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Create a seed concept
 */
async function createSeed() {
  log.info('Create Seed Concept');

  const name = await question('Concept name: ');
  if (!name.trim()) {
    log.info('Name is required');
    return;
  }

  const description = await question('Description: ');
  if (!description.trim()) {
    log.info('Description is required');
    return;
  }

  const seed: Concept = {
    name: name.trim(),
    description: description.trim(),
    parents: [],
    children: [],
  };

  graph = addConceptsToGraph(graph, [seed]);
  seedConcept = seed; // Store as global seed concept
  log.info('Created seed concept', { name: seed.name });
}

/**
 * Switch LLM provider
 */
async function switchLLMProvider() {
  log.info('Switch LLM Provider', { currentProvider: llmProvider.toUpperCase() });

  const choice = await question('Select provider (1-3): ');

  if (choice === '1') {
    llmProvider = 'openai';
    setLLMProvider('openai');
    log.info('Switched to OpenAI');
  } else if (choice === '2') {
    llmProvider = 'gemini';
    setLLMProvider('gemini');
    log.info('Switched to Gemini');
  } else if (choice === '3') {
    llmProvider = 'deepseek';
    setLLMProvider('deepseek');
    log.info('Switched to Deepseek');
  } else {
    log.info('Invalid choice. Provider unchanged');
  }
}

/**
 * Display graph statistics
 */
function showGraphStats() {
  const allConcepts = getAllConcepts(graph);
  const rootConcepts = allConcepts.filter(c => c.parents.length === 0);
  const childConcepts = allConcepts.filter(c => c.parents.length > 0);

  log.info('Graph Statistics', {
    totalConcepts: allConcepts.length,
    rootConcepts: rootConcepts.length,
    childConcepts: childConcepts.length
  });
}

/**
 * Display all concepts in graph
 */
function showAllConcepts() {
  const allConcepts = getAllConcepts(graph);
  displayConcepts(allConcepts, 'All Concepts in Graph');
}

/**
 * Get graphs directory path
 */
function getGraphsDirectory(): string {
  const projectRoot = path.join(process.cwd(), '..');
  return path.join(projectRoot, 'docs', 'graphs');
}

/**
 * Export graph to JSON file
 */
async function exportGraph() {
  try {
    const allConcepts = getAllConcepts(graph);

    if (allConcepts.length === 0) {
      log.info('Graph is empty. Nothing to export');
      return;
    }

    // Create export data structure
    const exportData = {
      seedConcept: seedConcept || null,
      llmProvider: llmProvider,
      exportTimestamp: new Date().toISOString(),
      totalConcepts: allConcepts.length,
      concepts: allConcepts,
    };

    // Create graphs directory if it doesn't exist
    const graphsDir = getGraphsDirectory();
    if (!fs.existsSync(graphsDir)) {
      fs.mkdirSync(graphsDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, -5); // Remove milliseconds and timezone
    const filename = `graph_${timestamp}.json`;
    const filepath = path.join(graphsDir, filename);

    // Write to file
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf-8');

    log.info('Graph exported successfully', {
      file: filepath,
      conceptCount: allConcepts.length,
      seed: seedConcept?.name || 'None'
    });
  } catch (error) {
    log.error('Error exporting graph', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Load graph from JSON file
 */
async function loadGraph() {
  try {
    const graphsDir = getGraphsDirectory();

    if (!fs.existsSync(graphsDir)) {
      log.info('Graphs directory does not exist. No graphs to load');
      return;
    }

    // Get all JSON files in graphs directory
    const files = fs.readdirSync(graphsDir)
      .filter(file => file.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first

    if (files.length === 0) {
      log.info('No graph files found in docs/graphs/ directory');
      return;
    }

    // Display available graphs
    log.info('Available Graphs:');
    files.forEach((file, index) => {
      const filepath = path.join(graphsDir, file);
      const stats = fs.statSync(filepath);
      const fileSize = (stats.size / 1024).toFixed(2); // KB

      try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        const conceptCount = data.totalConcepts || data.concepts?.length || 0;
        const seedName = data.seedConcept?.name || 'None';
        const exportTime = data.exportTimestamp || stats.mtime.toISOString();
        const date = new Date(exportTime).toLocaleString();

        log.debug(`${index + 1}. ${file}`, {
          seed: seedName,
          concepts: conceptCount,
          sizeKB: fileSize,
          exported: date
        });
      } catch (e) {
        log.debug(`${index + 1}. ${file}`, { error: 'Error reading file' });
      }
    });

    // Prompt user to select
    const choice = await question(`Select graph to load (1-${files.length}) or 'c' to cancel: `);

    if (choice.toLowerCase() === 'c') {
      log.info('Load cancelled');
      return;
    }

    const fileIndex = parseInt(choice, 10) - 1;
    if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= files.length) {
      log.info('Invalid selection');
      return;
    }

    const selectedFile = files[fileIndex];
    const filepath = path.join(graphsDir, selectedFile);

    // Confirm if current graph has data
    const currentConcepts = getAllConcepts(graph);
    if (currentConcepts.length > 0) {
      const confirm = await question(`Current graph has ${currentConcepts.length} concepts. Loading will replace it. Continue? (y/n): `);
      if (confirm.toLowerCase() !== 'y') {
        log.info('Load cancelled');
        return;
      }
    }

    // Read and parse the file
    const fileContent = fs.readFileSync(filepath, 'utf-8');
    const exportData = JSON.parse(fileContent);

    // Validate structure
    if (!exportData.concepts || !Array.isArray(exportData.concepts)) {
      throw new Error('Invalid graph file format: missing concepts array');
    }

    // Restore graph
    graph = createGraph();
    graph = addConceptsToGraph(graph, exportData.concepts);

    // Restore seed concept if available
    if (exportData.seedConcept) {
      seedConcept = exportData.seedConcept;
    }

    // Restore LLM provider if available
    if (exportData.llmProvider) {
      const validProviders: LLMProvider[] = ['openai', 'gemini', 'deepseek'];
      if (validProviders.includes(exportData.llmProvider as LLMProvider)) {
        llmProvider = exportData.llmProvider as LLMProvider;
        setLLMProvider(llmProvider);
      }
    }

    log.info('Graph loaded successfully', {
      file: selectedFile,
      conceptCount: exportData.concepts.length,
      seed: exportData.seedConcept?.name || 'None',
      llmProvider: llmProvider.toUpperCase()
    });
  } catch (error) {
    log.error('Error loading graph', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Main menu
 */
async function showMenu() {
  log.info('KFlow Interactive Demo - Phase 1', { llmProvider: llmProvider.toUpperCase() });
  log.info('Operations: 1=Expand, 2=ExpandList, 3=Synthesize, 4=DeriveParents, 5=Explore, 6=Refocus, 7=TracePath, 8=DeriveSummary, 9=ProgressiveExpand, 10=ProgressiveExpandMultiple, 11=ProgressiveExpandSingle, 12=ProgressiveExplore, 13=AdvanceNext, 14=AdvanceNextMultiple, 15=Explain, 16=ProgressiveExpandMultipleText');
  log.info('Utilities: 17=CreateSeed, 18=ShowGraphStats, 19=ShowAllConcepts, 20=ExportGraph, 21=LoadGraph, 22=SwitchLLMProvider, 23=Exit');
}

/**
 * Main loop
 */
async function runDemo() {
  log.info('Starting KFlow Interactive Demo');
  log.info('Ensure OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY is set in .env file');

  // Optionally create an initial seed
  const createInitial = await question('Create an initial seed concept? (y/n) [y]: ');
  if (createInitial.toLowerCase() !== 'n') {
    await createSeed();
  }

  // Select LLM provider at the beginning
  log.info('Select LLM Provider: 1=OpenAI, 2=Gemini, 3=Deepseek');
  const providerChoice = await question('Select provider (1-3) [1]: ');

  switch (providerChoice) {
    case '2':
      llmProvider = 'gemini';
      setLLMProvider('gemini');
      log.info('Using Gemini as LLM provider');
      break;
    case '3':
      llmProvider = 'deepseek';
      setLLMProvider('deepseek');
      log.info('Using Deepseek as LLM provider');
      break;
    default:
      llmProvider = 'openai';
      setLLMProvider('openai');
      log.info('Using OpenAI as LLM provider');
      break;
  }

  while (true) {
    await showMenu();
    const choice = await question('Select operation (1-23): ');

    switch (choice) {
      case '1':
        await runExpand();
        break;
      case '2':
        await runExpandList();
        break;
      case '3':
        await runSynthesize();
        break;
      case '4':
        await runDeriveParents();
        break;
      case '5':
        await runExplore();
        break;
      case '6':
        await runRefocus();
        break;
      case '7':
        await runTracePath();
        break;
      case '8':
        await runDeriveSummary();
        break;
      case '9':
        await runProgressiveExpand();
        break;
      case '10':
        await runProgressiveExpandMultiple();
        break;
      case '12':
        await runProgressiveExplore();
        break;
      case '13':
        await runAdvanceNext();
        break;
      case '14':
        await runAdvanceNextMultiple();
        break;
      case '15':
        await runExplain();
        break;
      case '17':
        await createSeed();
        break;
      case '18':
        showGraphStats();
        break;
      case '19':
        showAllConcepts();
        break;
      case '20':
        await exportGraph();
        break;
      case '21':
        await loadGraph();
        break;
      case '22':
        await switchLLMProvider();
        break;
      case '23':
      case 'exit':
      case 'quit':
        log.info('Goodbye');
        rl.close();
        return;
      default:
        log.info('Invalid choice. Please select 1-23');
    }

    // Small pause before showing menu again
    await question('\nPress Enter to continue...');
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await runDemo();
  } catch (error) {
    log.error('Error', { error: error instanceof Error ? error.message : String(error) });
    if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
      log.error('Please set OPENAI_API_KEY in your .env file');
    }
    rl.close();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runDemo };
