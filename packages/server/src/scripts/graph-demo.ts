/**
 * Interactive Graph Demo Script for Phase 1
 * 
 * REPL-style interface to test all operations interactively
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
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
  progressiveExpandSingle,
  progressiveExplore,
  advanceNext,
  advanceNextMultiple,
  explain,
  progressiveExpandMultipleFromText,
} from '../operations';
import { createGraph, addConceptsToGraph, getAllConcepts, getConcept } from '../utils/graph';
import { setLLMProvider } from '../config/llmConfig';
import { LLMProvider } from '../services/llm';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

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
  console.log(`\n${title}:\n`);
  if (concepts.length === 0) {
    console.log('  (no concepts)');
    return;
  }
  concepts.forEach((concept, i) => {
    console.log(`  ${i + 1}. ${concept.name}`);
    if (concept.layer !== undefined) {
      console.log(`     Layer: ${concept.layer}${concept.subLayer ? ` (Sub-layer: ${concept.subLayer})` : ''}`);
    }
    console.log(`     ${concept.description}`);
    if (concept.parents.length > 0) {
      console.log(`     Parents: ${concept.parents.join(', ')}`);
    }
    if (concept.children.length > 0) {
      console.log(`     Children: ${concept.children.join(', ')}`);
    }
    console.log('');
  });
}

/**
 * Select a concept by name or index
 */
async function selectConcept(promptText: string = 'Select a concept'): Promise<Concept | null> {
  const allConcepts = getAllConcepts(graph);
  if (allConcepts.length === 0) {
    console.log('\n⚠️  No concepts in graph. Please create some first.\n');
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

  console.log('❌ Concept not found');
  return null;
}

/**
 * Select multiple concepts
 */
async function selectConcepts(promptText: string = 'Select concepts'): Promise<Concept[]> {
  const allConcepts = getAllConcepts(graph);
  if (allConcepts.length === 0) {
    console.log('\n⚠️  No concepts in graph. Please create some first.\n');
    return [];
  }

  console.log('\nOptions:');
  console.log('  1. Use all concepts from graph');
  console.log('  2. Select specific concepts');
  console.log('  3. Cancel');

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
        console.log(`✓ Added: ${concept.name}`);
      } else if (concept) {
        console.log('⚠️  Already selected');
      } else {
        console.log('❌ Concept not found');
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
  console.log('\n📖 Expand Operation');
  console.log('Generates 3-7 sub-concepts of a concept\n');
  
  const concept = await selectConcept('Select concept to expand');
  if (!concept) return;

  // Get the latest concept from graph to ensure we have current children list
  const latestConcept = getConcept(graph, concept.name) || concept;

  try {
    console.log('\n⏳ Generating...');
    const results = await expand(latestConcept, graph);
    graph = addConceptsToGraph(graph, results);
    
    // Filter out the updated parent concept from display
    const newChildren = results.filter(r => r.name !== latestConcept.name);
    const updatedParent = results.find(r => r.name === latestConcept.name);
    
    console.log(`\n✅ Generated ${newChildren.length} child concepts:`);
    displayConcepts(newChildren, 'New Concepts');
    if (updatedParent) {
      console.log(`\n✓ Updated parent "${latestConcept.name}" children list: ${updatedParent.children.join(', ')}`);
    }
    console.log('\n✓ Added to graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: expandList
 */
async function runExpandList() {
  console.log('\n📋 Expand List Operation');
  console.log('Generates concepts from multiple parents\n');
  
  const concepts = await selectConcepts('Select parent concepts');
  if (concepts.length === 0) return;

  try {
    console.log('\n⏳ Generating...');
    const results = await expandList(concepts, seedConcept);
    graph = addConceptsToGraph(graph, results);
    
    console.log(`\n✅ Generated ${results.length} concepts:`);
    displayConcepts(results, 'New Concepts');
    console.log('✓ Added to graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: synthesize
 */
async function runSynthesize() {
  console.log('\n🔀 Synthesize Operation');
  console.log('Generates hybrid concepts combining multiple parents\n');
  
  const concepts = await selectConcepts('Select parent concepts to synthesize');
  if (concepts.length === 0) return;

  try {
    console.log('\n⏳ Generating...');
    const results = await synthesize(concepts, seedConcept);
    
    console.log(`\n📋 Generated ${results.length} hybrid concepts:`);
    displayConcepts(results, 'Generated Concepts');
    console.log('\n⚠️  Review the concepts above. These have not been added to the graph yet.');
    
    const confirm = await question('\nAdd these concepts to the graph? (yes/no) [yes]: ');
    if (confirm.toLowerCase() !== 'no' && confirm.toLowerCase() !== 'n') {
      graph = addConceptsToGraph(graph, results);
      console.log('\n✅ Concepts added to graph\n');
    } else {
      console.log('\n❌ Concepts not added to graph\n');
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: deriveParents
 */
async function runDeriveParents() {
  console.log('\n⬆️  Derive Parents Operation');
  console.log('Generates prerequisite concepts\n');
  
  const concept = await selectConcept('Select concept to derive parents for');
  if (!concept) return;

  // Get the latest concept from graph to ensure we have current state including layer
  const latestConcept = getConcept(graph, concept.name) || concept;

  try {
    console.log('\n⏳ Generating...');
    const results = await deriveParents(latestConcept, seedConcept);
    graph = addConceptsToGraph(graph, results);
    
    console.log(`\n✅ Generated ${results.length} prerequisite concepts:`);
    displayConcepts(results, 'New Concepts');
    
    console.log('✓ Added to graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: explore
 */
async function runExplore() {
  console.log('\n🔍 Explore Operation');
  console.log('Generates related concepts (lateral exploration)\n');
  
  const concept = await selectConcept('Select concept to explore');
  if (!concept) return;

  // Get the latest concept from graph to ensure we have current state
  const latestConcept = getConcept(graph, concept.name) || concept;

  const diversityInput = await question('Diversity level (low/medium/high) [high]: ');
  const diversity = ['low', 'medium', 'high'].includes(diversityInput.toLowerCase())
    ? diversityInput.toLowerCase() as 'low' | 'medium' | 'high'
    : 'high';

  try {
    console.log('\n⏳ Generating...');
    const results = await explore(latestConcept, diversity, seedConcept);
    graph = addConceptsToGraph(graph, results);
    
    // Filter out updated parent concepts from display
    const newSiblings = results.filter(r => !latestConcept.parents.includes(r.name) && r.name !== latestConcept.name);
    const updatedParents = results.filter(r => latestConcept.parents.includes(r.name));
    
    console.log(`\n✅ Generated ${newSiblings.length} sibling concepts:`);
    displayConcepts(newSiblings, 'New Sibling Concepts');
    if (updatedParents.length > 0) {
      console.log(`\n✓ Updated ${updatedParents.length} parent concept(s) to include siblings`);
    } else if (latestConcept.parents.length === 0) {
      console.log(`\n✓ Root-level concepts (siblings of "${latestConcept.name}")`);
    }
    console.log('\n✓ Added to graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: refocus
 */
async function runRefocus() {
  console.log('\n🎯 Refocus Operation');
  console.log('Updates attention scores based on a goal\n');
  
  const concepts = await selectConcepts('Select concepts to refocus');
  if (concepts.length === 0) return;

  const goal = await question('Enter learning goal: ');
  if (!goal.trim()) {
    console.log('❌ Goal is required');
    return;
  }

  try {
    console.log('\n⏳ Generating...');
    const results = await refocus(concepts, goal.trim(), seedConcept);
    graph = addConceptsToGraph(graph, results.map(r => ({
      name: r.name,
      description: r.description,
      parents: r.parents,
      children: r.children,
    })));
    
    console.log(`\n✅ Updated ${results.length} concepts with attention scores:`);
    results.forEach((result, i) => {
      console.log(`\n  ${i + 1}. ${result.name}`);
      console.log(`     Attention: ${result.attention_score?.toFixed(2) || 'N/A'}`);
      console.log(`     Importance: ${result.importance || 'N/A'}`);
    });
    console.log('\n✓ Updated in graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: tracePath
 */
async function runTracePath() {
  console.log('\n🛤️  Trace Path Operation');
  console.log('Generates learning path between two concepts\n');
  
  console.log('Select start concept:');
  const start = await selectConcept('Start');
  if (!start) return;

  console.log('\nSelect end concept:');
  const end = await selectConcept('End');
  if (!end) return;

  try {
    console.log('\n⏳ Generating path...');
    const results = await tracePath(start, end, seedConcept);
    graph = addConceptsToGraph(graph, results);
    
    console.log(`\n✅ Generated path with ${results.length} concepts:`);
    results.forEach((concept, i) => {
      console.log(`  ${i + 1}. ${concept.name}`);
    });
    console.log('\n✓ Added to graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: deriveSummary
 */
async function runDeriveSummary() {
  console.log('\n📝 Derive Summary Operation');
  console.log('Generates summary concepts for a specific layer\n');
  
  // Get all concepts with layer numbers
  const allConcepts = getAllConcepts(graph);
  const conceptsWithLayers = allConcepts.filter(c => c.layer !== undefined);
  
  if (conceptsWithLayers.length === 0) {
    console.log('\n⚠️  No concepts with layer numbers found. Please create concepts with layers first.\n');
    return;
  }
  
  // Find available layer numbers
  const availableLayers = Array.from(new Set(conceptsWithLayers.map(c => c.layer!))).sort((a, b) => a - b);
  
  console.log('\nAvailable layers:');
  availableLayers.forEach(layer => {
    const layerConcepts = conceptsWithLayers.filter(c => c.layer === layer);
    console.log(`  Layer ${layer}: ${layerConcepts.length} concept(s)`);
  });
  console.log('');
  
  // Ask for layer number
  const layerInput = await question('Enter layer number to summarize: ');
  const layerNumber = parseInt(layerInput, 10);
  
  if (isNaN(layerNumber) || !availableLayers.includes(layerNumber)) {
    console.log(`\n❌ Invalid layer number. Please choose from: ${availableLayers.join(', ')}\n`);
    return;
  }
  
  // Filter concepts by layer number
  const concepts = conceptsWithLayers.filter(c => c.layer === layerNumber);
  
  if (concepts.length === 0) {
    console.log(`\n⚠️  No concepts found for layer ${layerNumber}\n`);
    return;
  }
  
  console.log(`\n📚 Found ${concepts.length} concept(s) in layer ${layerNumber}:`);
  concepts.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name}`);
  });
  console.log('');

  try {
    console.log('⏳ Generating summary...');
    const results = await deriveSummary(concepts, seedConcept);
    graph = addConceptsToGraph(graph, results);
    
    console.log(`\n✅ Generated ${results.length} summary concepts:`);
    displayConcepts(results, 'Summary Concepts');
    console.log('✓ Added to graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: progressiveExpand
 */
async function runProgressiveExpand() {
  console.log('\n⚙️  Progressive Expand Operation');
  console.log('Generates next layer of concepts building on previous layers\n');
  
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
    console.log(`\n📚 Automatically found ${previousLayers.length} concept(s) from previous layers:`);
    previousLayers.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name}${c.layer !== undefined ? ` (Layer ${c.layer})` : ''}`);
    });
    console.log('');
  } else {
    console.log('\n📚 No previous layers found - this will be the first layer\n');
  }
  
  try {
    console.log('⏳ Generating next layer...');
    const results = await progressiveExpand(latestSeedConcept, previousLayers);
    graph = addConceptsToGraph(graph, results);
    
    // Filter out updated parent concepts from display
    const newConcepts = results.filter(r => !previousLayers.find(p => p.name === r.name));
    const updatedParents = results.filter(r => previousLayers.find(p => p.name === r.name));
    
    console.log(`\n✅ Generated ${newConcepts.length} concepts for next layer:`);
    newConcepts.forEach((concept, i) => {
      console.log(`\n  ${i + 1}. ${concept.name} (Layer ${concept.layer || 'N/A'})`);
      console.log(`     ${concept.description}`);
      if (concept.parents.length > 0) {
        console.log(`     Parents: ${concept.parents.join(', ')}`);
      }
    });
    
    if (updatedParents.length > 0) {
      console.log(`\n✓ Updated ${updatedParents.length} parent concept(s) from previous layer`);
    }
    console.log('\n✓ Added to graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: progressiveExpandSingle
 */
async function runProgressiveExpandSingle() {
  console.log('\n⚙️  Progressive Expand Single Operation');
  console.log('Generates sub-layers under a specific concept (e.g., 1.1a, 1.2a, 2.1b)\n');
  
  if (!seedConcept) {
    console.log('❌ No seed concept set. Please create a seed concept first.\n');
    return;
  }
  
  // Select a concept to expand (should be from a main layer)
  const concept = await selectConcept('Select concept to expand with sub-layers');
  if (!concept) return;
  
  // Get the latest concept from graph
  const latestConcept = getConcept(graph, concept.name) || concept;
  
  // Check if concept has a layer number
  if (latestConcept.layer === undefined) {
    console.log('\n⚠️  Selected concept does not have a layer number.');
    console.log('   Progressive Expand Single works with concepts that have layer numbers.');
    console.log('   Consider using progressiveExpand first to generate layered concepts.\n');
    
    const proceed = await question('Continue anyway? (y/n) [n]: ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('❌ Operation cancelled.\n');
      return;
    }
  }
  
  // Check if concept already has sub-layers
  const allConcepts = getAllConcepts(graph);
  
  // Find the concept's letter in its layer
  const mainLayer = latestConcept.layer || 1;
  const layerConcepts = allConcepts
    .filter(cc => cc.layer === mainLayer && !cc.subLayer)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const conceptIndex = layerConcepts.findIndex(cc => cc.name === latestConcept.name);
  const conceptLetter = conceptIndex >= 0 ? String.fromCharCode(97 + conceptIndex) : 'a';
  
  // Find all existing sub-layers under this concept
  const existingSubLayers = allConcepts.filter(c => {
    if (!c.subLayer) return false;
    // Extract main layer and letter from subLayer (e.g., "1.2a" -> layer 1, letter "a")
    const match = c.subLayer.match(/^(\d+)\.\d+([a-z])$/);
    if (!match) return false;
    const subLayerMainLayer = parseInt(match[1], 10);
    const subLayerLetter = match[2];
    
    return subLayerMainLayer === mainLayer && subLayerLetter === conceptLetter;
  });
  
  // Determine which sub-layer we're working with
  let targetSubLayerNum = 1;
  if (existingSubLayers.length > 0) {
    const subLayerNumbers = existingSubLayers
      .map(c => {
        if (!c.subLayer) return 0;
        const match = c.subLayer.match(/^\d+\.(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    
    if (subLayerNumbers.length > 0) {
      targetSubLayerNum = Math.max(...subLayerNumbers);
    }
  }
  
  const targetSubLayerId = `${mainLayer}.${targetSubLayerNum}${conceptLetter}`;
  
  // Find concepts already in the target sub-layer
  const existingInTargetSubLayer = existingSubLayers.filter(c => c.subLayer === targetSubLayerId);
  
  if (existingInTargetSubLayer.length > 0) {
    console.log(`\n📚 Found ${existingInTargetSubLayer.length} existing concept(s) in sub-layer ${targetSubLayerId}:`);
    existingInTargetSubLayer.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name}`);
    });
    console.log(`\n⏳ Generating NEW concepts for sub-layer ${targetSubLayerId}...`);
  } else {
    console.log(`\n📚 No existing concepts in sub-layer ${targetSubLayerId}`);
    console.log(`⏳ Generating first batch of concepts for sub-layer ${targetSubLayerId}...`);
  }
  
  try {
    const results = await progressiveExpandSingle(seedConcept, latestConcept, existingSubLayers, graph);
    graph = addConceptsToGraph(graph, results);
    
    // Filter out updated parent concepts from display
    const newConcepts = results.filter(r => r.subLayer === targetSubLayerId);
    const updatedParents = results.filter(r => r.name === latestConcept.name || (r.subLayer && r.subLayer !== targetSubLayerId));
    
    console.log(`\n✅ Generated ${newConcepts.length} NEW concept(s) for sub-layer ${targetSubLayerId}:`);
    newConcepts.forEach((concept, i) => {
      console.log(`\n  ${i + 1}. ${concept.name}`);
      console.log(`     ${concept.description}`);
      if (concept.parents.length > 0) {
        console.log(`     Parents: ${concept.parents.join(', ')}`);
      }
    });
    
    if (updatedParents.length > 0) {
      console.log(`\n✓ Updated ${updatedParents.length} parent concept(s)`);
    }
    console.log('\n✓ Added to graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: advanceNext
 */
async function runAdvanceNext() {
  console.log('\n➡️  Advance Next Operation');
  console.log('Determines the next logical learning step that advances forward in the learning path\n');
  
  // Select a concept
  const concept = await selectConcept('Select current concept to advance from');
  if (!concept) return;
  
  // Get the latest concept from graph
  const latestConcept = getConcept(graph, concept.name) || concept;
  
  try {
    console.log(`\n⏳ Analyzing learning context and determining next step...`);
    const results = await advanceNext(latestConcept, graph);
    graph = addConceptsToGraph(graph, results);
    
    // Filter out updated current concept from display
    const nextConcept = results.find(r => r.name !== latestConcept.name);
    const updatedCurrentConcept = results.find(r => r.name === latestConcept.name);
    
    if (nextConcept) {
      console.log(`\n✅ Next learning step: "${nextConcept.name}"`);
      console.log(`   ${nextConcept.description}`);
      if (nextConcept.parents.length > 0) {
        console.log(`   Parent: ${nextConcept.parents.join(', ')}`);
      }
      if (nextConcept.layer !== undefined) {
        console.log(`   Layer: ${nextConcept.layer}`);
      }
    } else {
      console.log('\n⚠️  No next concept generated');
    }
    
    if (updatedCurrentConcept) {
      console.log(`\n✓ Updated "${latestConcept.name}" to include "${nextConcept?.name || 'next concept'}" as a child`);
    }
    console.log('\n✓ Added to graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: advanceNextMultiple
 */
async function runAdvanceNextMultiple() {
  console.log('\n➡️➡️➡️  Advance Next Multiple Operation');
  console.log('Generates multiple sequential learning steps that advance forward in the learning path\n');
  
  // Select a concept
  const concept = await selectConcept('Select current concept to advance from');
  if (!concept) return;
  
  // Get the latest concept from graph
  const latestConcept = getConcept(graph, concept.name) || concept;
  
  // Ask for number of steps
  const numStepsInput = await question('Number of steps to advance (1-5) [3]: ');
  const numSteps = numStepsInput.trim() ? parseInt(numStepsInput, 10) : 3;
  
  if (isNaN(numSteps) || numSteps < 1 || numSteps > 5) {
    console.log('\n❌ Invalid number of steps. Must be between 1 and 5.\n');
    return;
  }
  
  try {
    console.log(`\n⏳ Analyzing learning context and generating ${numSteps} sequential steps...`);
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
      console.log(`\n✅ Generated ${newSteps.length} sequential learning step(s):`);
      newSteps.forEach((step, i) => {
        console.log(`\n  Step ${i + 1}: ${step.name}`);
        console.log(`     ${step.description}`);
        if (step.parents.length > 0) {
          console.log(`     Parent: ${step.parents.join(', ')}`);
        }
        if (step.layer !== undefined) {
          console.log(`     Layer: ${step.layer}`);
        }
      });
    } else {
      console.log('\n⚠️  No next steps generated');
    }
    
    if (updatedParents.length > 0) {
      console.log(`\n✓ Updated ${updatedParents.length} parent concept(s) to include children`);
    }
    console.log('\n✓ Added to graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: progressiveExplore
 */
async function runProgressiveExplore() {
  console.log('\n🔍 Progressive Explore Operation');
  console.log('Generates additional related concepts within the same layer (horizontal expansion)\n');
  console.log('Note: The selected concept should have a layer number (use progressiveExpand first)\n');
  
  if (!seedConcept) {
    console.log('❌ No seed concept set. Please create a seed concept first.\n');
    return;
  }
  
  // Select a concept directly
  const concept = await selectConcept('Select concept to explore');
  if (!concept) return;
  
  // Get the latest concept from graph to ensure we have current state
  const latestConcept = getConcept(graph, concept.name) || concept;
  
  // Check if concept has a layer number
  if (latestConcept.layer === undefined) {
    console.log('\n⚠️  Selected concept does not have a layer number.');
    console.log('   Progressive Explore works best with concepts that have layer numbers.');
    console.log('   Consider using progressiveExpand first to generate layered concepts.\n');
    
    const proceed = await question('Continue anyway? (y/n) [n]: ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('❌ Operation cancelled.\n');
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
    console.log(`\n📚 Adjacent layers for deduplication:`);
    if (prevLayerNum && previousLayer.length > 0) {
      console.log(`   Layer ${prevLayerNum} (previous): ${previousLayer.length} concept(s)`);
    }
    if (currentLayer.length > 0) {
      console.log(`   Layer ${targetLayer} (current): ${currentLayer.length} concept(s)`);
    }
    if (nextLayer.length > 0) {
      console.log(`   Layer ${nextLayerNum} (next): ${nextLayer.length} concept(s)`);
    }
    console.log('');
  }
  
  try {
    console.log('⏳ Generating additional concepts related to the selected concept...');
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
    
    console.log(`\n✅ Generated ${newConcepts.length} additional concept(s) related to "${latestConcept.name}":`);
    newConcepts.forEach((concept, i) => {
      console.log(`\n  ${i + 1}. ${concept.name}${concept.layer !== undefined ? ` (Layer ${concept.layer})` : ''}`);
      console.log(`     ${concept.description}`);
      if (concept.parents.length > 0) {
        console.log(`     Parents: ${concept.parents.join(', ')}`);
      }
    });
    
    if (updatedParents.length > 0) {
      console.log(`\n✓ Updated ${updatedParents.length} parent concept(s) from previous layer`);
    }
    console.log('\n✓ Added to graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: explain
 */
async function runExplain() {
  console.log('\n🧠 Explain Operation');
  console.log('Generates a detailed Markdown lesson for a concept\n');

  const concept = await selectConcept('Select concept to explain');
  if (!concept) return;

  const latestConcept = getConcept(graph, concept.name) || concept;

  try {
    const simpleInput = await question('Generate simple lesson? (y/n) [n]: ');
    const simple = simpleInput.trim().toLowerCase() === 'y';

    console.log('\n⏳ Crafting lesson...');
    const results = await explain(latestConcept, seedConcept, { simple });
    graph = addConceptsToGraph(graph, results);

    const lessonConcept = results[0];

    if (!lessonConcept) {
      console.log('\n⚠️ No lesson content returned.\n');
      return;
    }

    const lessonMarkdown = lessonConcept.lesson ?? lessonConcept.description ?? '';
    if (!lessonMarkdown.trim()) {
      console.log('\n⚠️ Lesson content was empty.\n');
      return;
    }

    console.log('\n✅ Lesson stored on concept (lesson field).\n');
    console.log('\n--- Lesson (Markdown) ---\n');
    console.log(lessonMarkdown);
    console.log('\n--------------------------\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: progressiveExpandMultipleFromText
 */
async function runProgressiveExpandMultipleFromText() {
  console.log('\n📝 Progressive Expand Multiple (Text) Operation');
  console.log('Generates the next learning layer using narrative text with tagged concepts\n');

  const concept = await selectConcept('Select concept to expand (text mode)');
  if (!concept) return;

  const latestConcept = getConcept(graph, concept.name) || concept;

  const allConcepts = getAllConcepts(graph);
  const conceptsWithLayers = allConcepts.filter(c => c.layer !== undefined);
  const maxLayer = conceptsWithLayers.length > 0
    ? Math.max(...conceptsWithLayers.map(c => c.layer!))
    : 0;
  const nextLayer = (latestConcept.layer !== undefined ? latestConcept.layer + 1 : maxLayer + 1);

  const previousLayers = allConcepts.filter(c => {
    if (c.name === latestConcept.name) return false;
    if (c.layer === undefined) return false;
    return c.layer <= (nextLayer - 1);
  });

  if (previousLayers.length > 0) {
    console.log(`\n📚 Previous knowledge (${previousLayers.length} concept(s)) considered for context:`);
    previousLayers.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name}${c.layer !== undefined ? ` (Layer ${c.layer})` : ''}`);
    });
    console.log('');
  }

  const numConceptsInput = await question('Number of concepts to generate (1-10) [5]: ');
  const numConcepts = numConceptsInput.trim()
    ? parseInt(numConceptsInput, 10)
    : 5;

  if (isNaN(numConcepts) || numConcepts < 1 || numConcepts > 10) {
    console.log('\n❌ Invalid number of concepts. Must be between 1 and 10.\n');
    return;
  }

  try {
    console.log('\n⏳ Generating layer from narrative text...');
    const result = await progressiveExpandMultipleFromText(latestConcept, previousLayers, numConcepts);
    
    // Extract concepts from result (non-streaming returns ProgressiveExpandMultipleFromTextResult)
    if ('stream' in result && result.stream) {
      console.error('❌ Streaming is not supported in this script');
      return;
    }
    
    // Type guard: if it's not a stream, it must be ProgressiveExpandMultipleFromTextResult
    if (!('concepts' in result)) {
      console.error('❌ Unexpected result format');
      return;
    }
    
    const results = result.concepts;
    graph = addConceptsToGraph(graph, results);

    const newConcepts = results.filter((r: Concept) => r.name !== latestConcept.name);
    const updatedParent = results.find((r: Concept) => r.name === latestConcept.name);

    console.log(`\n✅ Generated ${newConcepts.length} concepts for Layer ${nextLayer}:`);
    newConcepts.forEach((concept: Concept, i: number) => {
      console.log(`  ${i + 1}. ${concept.name}`);
    });

    if (updatedParent) {
      console.log(`\n✓ Updated "${latestConcept.name}" children: ${updatedParent.children.join(', ')}`);
    }

    console.log('\n✓ Added to graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Operation: progressiveExpandMultiple
 */
async function runProgressiveExpandMultiple() {
  console.log('\n⚙️  Progressive Expand Multiple Operation');
  console.log('Generates multiple layers of concepts building on previous layers\n');
  
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
    console.log(`\n📚 Automatically found ${previousLayers.length} concept(s) from previous layers:`);
    previousLayers.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name}${c.layer !== undefined ? ` (Layer ${c.layer})` : ''}`);
    });
    console.log('');
  } else {
    console.log('\n📚 No previous layers found - this will start from the first layer\n');
  }
  
  // Ask for number of layers to generate
  const numLayersInput = await question('Number of layers to generate (1-5) [2]: ');
  const numLayers = numLayersInput.trim() ? parseInt(numLayersInput, 10) : 2;
  
  if (isNaN(numLayers) || numLayers < 1 || numLayers > 5) {
    console.log('\n❌ Invalid number of layers. Must be between 1 and 5.\n');
    return;
  }
  
  try {
    console.log(`\n⏳ Generating ${numLayers} layer(s)...`);
    const result = await progressiveExpandMultiple(latestSeedConcept, previousLayers, numLayers);
    const results = result.concepts;
    const modelUsed = result.model;

    console.log(`\n✅ Generated using model: ${modelUsed}\n`);

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
    
    console.log(`\n✅ Generated ${newConcepts.length} concepts across ${numLayers} layer(s):`);
    const sortedLayers = Array.from(conceptsByLayer.keys()).sort((a, b) => a - b);
    sortedLayers.forEach(layer => {
      const layerConcepts = conceptsByLayer.get(layer) || [];
      console.log(`\n  Layer ${layer} (${layerConcepts.length} concepts):`);
      layerConcepts.forEach((concept, i) => {
        console.log(`    ${i + 1}. ${concept.name}`);
        console.log(`       ${concept.description}`);
        if (concept.parents.length > 0) {
          console.log(`       Parents: ${concept.parents.join(', ')}`);
        }
      });
    });
    
    if (updatedParents.length > 0) {
      console.log(`\n✓ Updated ${updatedParents.length} parent concept(s) from previous layer`);
    }
    console.log('\n✓ Added to graph\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Create a seed concept
 */
async function createSeed() {
  console.log('\n🌱 Create Seed Concept\n');
  
  const name = await question('Concept name: ');
  if (!name.trim()) {
    console.log('❌ Name is required');
    return;
  }

  const description = await question('Description: ');
  if (!description.trim()) {
    console.log('❌ Description is required');
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
  console.log(`\n✅ Created seed concept: ${seed.name}\n`);
}

/**
 * Switch LLM provider
 */
async function switchLLMProvider() {
  console.log('\n🔄 Switch LLM Provider\n');
  console.log(`Current provider: ${llmProvider.toUpperCase()}`);
  console.log('\nOptions:');
  console.log('  1. OpenAI');
  console.log('  2. Gemini');
  console.log('  3. Deepseek');

  const choice = await question('Select provider (1-3): ');

  if (choice === '1') {
    llmProvider = 'openai';
    setLLMProvider('openai');
    console.log('\n✅ Switched to OpenAI\n');
  } else if (choice === '2') {
    llmProvider = 'gemini';
    setLLMProvider('gemini');
    console.log('\n✅ Switched to Gemini\n');
  } else if (choice === '3') {
    llmProvider = 'deepseek';
    setLLMProvider('deepseek');
    console.log('\n✅ Switched to Deepseek\n');
  } else {
    console.log('\n❌ Invalid choice. Provider unchanged.\n');
  }
}

/**
 * Display graph statistics
 */
function showGraphStats() {
  const allConcepts = getAllConcepts(graph);
  const rootConcepts = allConcepts.filter(c => c.parents.length === 0);
  const childConcepts = allConcepts.filter(c => c.parents.length > 0);

  console.log('\n📊 Graph Statistics\n');
  console.log(`Total Concepts: ${allConcepts.length}`);
  console.log(`Root Concepts: ${rootConcepts.length}`);
  console.log(`Child Concepts: ${childConcepts.length}`);
  console.log('');
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
      console.log('\n⚠️  Graph is empty. Nothing to export.\n');
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

    console.log(`\n✅ Graph exported successfully!`);
    console.log(`   File: ${filepath}`);
    console.log(`   Concepts: ${allConcepts.length}`);
    console.log(`   Seed: ${seedConcept?.name || 'None'}\n`);
  } catch (error) {
    console.error('\n❌ Error exporting graph:', error instanceof Error ? error.message : error);
    console.log('');
  }
}

/**
 * Load graph from JSON file
 */
async function loadGraph() {
  try {
    const graphsDir = getGraphsDirectory();
    
    if (!fs.existsSync(graphsDir)) {
      console.log('\n⚠️  Graphs directory does not exist. No graphs to load.\n');
      return;
    }

    // Get all JSON files in graphs directory
    const files = fs.readdirSync(graphsDir)
      .filter(file => file.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first

    if (files.length === 0) {
      console.log('\n⚠️  No graph files found in docs/graphs/ directory.\n');
      return;
    }

    // Display available graphs
    console.log('\n📂 Available Graphs:\n');
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
        
        console.log(`  ${index + 1}. ${file}`);
        console.log(`     Seed: ${seedName} | Concepts: ${conceptCount} | Size: ${fileSize} KB | Exported: ${date}\n`);
      } catch (e) {
        console.log(`  ${index + 1}. ${file} (Error reading file)\n`);
      }
    });

    // Prompt user to select
    const choice = await question(`Select graph to load (1-${files.length}) or 'c' to cancel: `);
    
    if (choice.toLowerCase() === 'c') {
      console.log('\n❌ Load cancelled.\n');
      return;
    }

    const fileIndex = parseInt(choice, 10) - 1;
    if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= files.length) {
      console.log('\n❌ Invalid selection.\n');
      return;
    }

    const selectedFile = files[fileIndex];
    const filepath = path.join(graphsDir, selectedFile);

    // Confirm if current graph has data
    const currentConcepts = getAllConcepts(graph);
    if (currentConcepts.length > 0) {
      const confirm = await question(`\n⚠️  Current graph has ${currentConcepts.length} concepts. Loading will replace it. Continue? (y/n): `);
      if (confirm.toLowerCase() !== 'y') {
        console.log('\n❌ Load cancelled.\n');
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

    console.log(`\n✅ Graph loaded successfully!`);
    console.log(`   File: ${selectedFile}`);
    console.log(`   Concepts: ${exportData.concepts.length}`);
    console.log(`   Seed: ${exportData.seedConcept?.name || 'None'}`);
    console.log(`   LLM Provider: ${llmProvider.toUpperCase()}\n`);
  } catch (error) {
    console.error('\n❌ Error loading graph:', error instanceof Error ? error.message : error);
    console.log('');
  }
}

/**
 * Main menu
 */
async function showMenu() {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 KFlow Interactive Demo - Phase 1');
  console.log('='.repeat(60));
  console.log(`\nCurrent LLM Provider: ${llmProvider.toUpperCase()}`);
  console.log('\nOperations:');
  console.log('  1. 📖 Expand - Generate sub-concepts');
  console.log('  2. 📋 Expand List - Generate from multiple parents');
  console.log('  3. 🔀 Synthesize - Generate hybrid concepts');
  console.log('  4. ⬆️  Derive Parents - Generate prerequisites');
  console.log('  5. 🔍 Explore - Generate related concepts');
  console.log('  6. 🎯 Refocus - Update attention scores');
  console.log('  7. 🛤️  Trace Path - Generate learning path');
  console.log('  8. 📝 Derive Summary - Generate layer summary');
  console.log('  9. ⚙️  Progressive Expand - Generate next learning layer');
  console.log('  10. ⚙️  Progressive Expand Multiple - Generate multiple layers at once');
  console.log('  11. ⚙️  Progressive Expand Single - Generate sub-layers under a concept');
  console.log('  12. 🔍 Progressive Explore - Generate more concepts in the same layer');
  console.log('  13. ➡️  Advance Next - Determine next logical learning step');
  console.log('  14. ➡️➡️➡️  Advance Next Multiple - Generate multiple sequential learning steps');
  console.log('  15. 🧠 Explain - Design a Markdown lesson for a concept');
  console.log('  16. 📝 Progressive Expand Multiple (Text) - Generate layer via narrative');
  console.log('\nUtilities:');
  console.log('  17. 🌱 Create Seed - Add a new concept');
  console.log('  18. 📊 Show Graph Stats - Display statistics');
  console.log('  19. 📋 Show All Concepts - List all concepts');
  console.log('  20. 💾 Export Graph - Save graph to JSON file');
  console.log('  21. 📂 Load Graph - Load graph from JSON file');
  console.log('  22. 🔄 Switch LLM Provider - Change between OpenAI, Gemini, Deepseek');
  console.log('  23. ❌ Exit');
  console.log('');
}

/**
 * Main loop
 */
async function runDemo() {
  console.log('🚀 Starting KFlow Interactive Demo\n');
  console.log('Note: Make sure OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY is set in your .env file\n');

  // Optionally create an initial seed
  const createInitial = await question('Create an initial seed concept? (y/n) [y]: ');
  if (createInitial.toLowerCase() !== 'n') {
    await createSeed();
  }

  // Select LLM provider at the beginning
  console.log('\n🤖 Select LLM Provider\n');
  console.log('  1. OpenAI');
  console.log('  2. Gemini');
  console.log('  3. Deepseek');
  const providerChoice = await question('Select provider (1-3) [1]: ');

  switch (providerChoice) {
    case '2':
      llmProvider = 'gemini';
      setLLMProvider('gemini');
      console.log('\n✅ Using Gemini as LLM provider\n');
      break;
    case '3':
      llmProvider = 'deepseek';
      setLLMProvider('deepseek');
      console.log('\n✅ Using Deepseek as LLM provider\n');
      break;
    default:
      llmProvider = 'openai';
      setLLMProvider('openai');
      console.log('\n✅ Using OpenAI as LLM provider\n');
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
      case '11':
        await runProgressiveExpandSingle();
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
      case '16':
        await runProgressiveExpandMultipleFromText();
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
        console.log('\n👋 Goodbye!\n');
        rl.close();
        return;
      default:
        console.log('\n❌ Invalid choice. Please select 1-23.\n');
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
    console.error('\n❌ Error:', error);
    if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
      console.error('\n⚠️  Please set OPENAI_API_KEY in your .env file\n');
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
