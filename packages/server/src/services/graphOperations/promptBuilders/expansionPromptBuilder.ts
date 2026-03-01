/**
 * Prompt Builder for Progressive Expansion Operations
 * 
 * Generates clean, readable prompts for expanding knowledge graphs.
 */

import { createPromptBuilder } from './PromptBuilder';
import { GraphNode } from '../../../types/nodeBasedKnowledgeGraph';
import { LearningGoal } from '../../../types/goal';

export interface ExpansionPromptContext {
  seedConcept: GraphNode;
  previousLayers: GraphNode[];
  existingLayers?: GraphNode[];  // Layer nodes for tracking goals
  numConcepts: number;
  learningGoal?: LearningGoal;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  focus?: string;
  isFirstLayer: boolean;
  targetMilestone?: { index: number; title: string; description?: string };
  completedMilestonesCount?: number;
  totalMilestones?: number;
}

/**
 * Build system prompt for expansion operations
 */
export function buildExpansionSystemPrompt(): string {
  return createPromptBuilder()
    .section('Role', 'You are a learning architect who designs progressive learning paths. You create structured, goal-oriented educational content that builds knowledge incrementally.')
    .section('Output Format', 'You must return your response in a specific format:\n- Use <level-name>NAME</level-name> for the layer name\n- Use <goal>GOAL TEXT</goal> for the layer goal\n- Use <concept>CONCEPT NAME</concept> to tag concepts\n- Use <description>DESCRIPTION</description> for each concept\n- Use <parents>PARENT1, PARENT2</parents> for prerequisites')
    .buildSystem();
}

/**
 * Build user prompt for first layer expansion
 */
export function buildFirstLayerPrompt(context: ExpansionPromptContext): string {
  const builder = createPromptBuilder()
    .withContext({
      conceptName: context.seedConcept.properties.name,
      conceptDescription: context.seedConcept.properties.description || '',
      numConcepts: context.numConcepts,
      difficulty: context.difficulty || 'intermediate',
      focus: context.focus || ''
    });

  // Topic Introduction
  builder.section('Topic', `You are introducing a new learning path for: **{{conceptName}}**\n\n{{conceptDescription}}`);

  // Learning Goal Context with full milestone information
  if (context.learningGoal) {
    const goalParts: string[] = [
      `**Goal Title**: ${context.learningGoal.title}`,
      `**Goal Description**: ${context.learningGoal.description}`,
      `**Goal Type**: ${context.learningGoal.type}`
    ];
    if (context.learningGoal.target) {
      goalParts.push(`**Target**: ${context.learningGoal.target}`);
    }
    if (context.learningGoal.estimatedTime) {
      goalParts.push(`**Estimated Time**: ${context.learningGoal.estimatedTime} hours`);
    }
    
    // Add milestone context
    if (context.learningGoal.milestones && context.learningGoal.milestones.length > 0) {
      const completedCount = context.completedMilestonesCount ?? 0;
      const totalCount = context.totalMilestones ?? context.learningGoal.milestones.length;
      
      goalParts.push(`\n**Total Milestones**: ${totalCount}`);
      goalParts.push(`**Completed Milestones**: ${completedCount}/${totalCount}`);
      
      if (context.targetMilestone) {
        goalParts.push(`\n**Current Target Milestone**: Milestone ${context.targetMilestone.index + 1}: ${context.targetMilestone.title}`);
        if (context.targetMilestone.description) {
          goalParts.push(`**Milestone Description**: ${context.targetMilestone.description}`);
        }
      }
      
      // List all milestones with completion status
      const milestonesList = context.learningGoal.milestones
        .map((m, idx) => `${idx + 1}. ${m.title}${m.completed ? ' ✓' : ''}`)
        .join(', ');
      goalParts.push(`**All Milestones**: ${milestonesList}`);
    }
    
    builder.section('Learning Goal', goalParts.join('\n'));
  }

  // Build task with milestone-specific instructions
  let taskContent = `Create a simple project appropriate for {{conceptName}} at the {{difficulty}} level.

**Requirements:**
1. Suggest a name for this first layer (e.g., "Level 1", "Foundation", "Module 1") in a <level-name> tag
2. Define a project goal in a <goal> tag that advances toward the learning goal`;

  // Add CRITICAL milestone goal instructions
  if (context.targetMilestone) {
    taskContent += `

**CRITICAL MILESTONE GOAL REQUIREMENT:**
- This layer's goal **MUST be prefixed** with "Milestone ${context.targetMilestone.index + 1}: " in the <goal> tag
- **Example format**: \`<goal>Milestone ${context.targetMilestone.index + 1}: [your project goal that advances toward "${context.targetMilestone.title}"]</goal>\`
- The goal should directly contribute to achieving "${context.targetMilestone.title}"`;
    if (context.targetMilestone.description) {
      taskContent += `\n- **Milestone Context**: ${context.targetMilestone.description}`;
    }
  }

  taskContent += `

3. Generate a narrative introducing {{conceptName}} and describing approximately {{numConcepts}} foundational concepts
4. Tag each concept with <concept>CONCEPT NAME</concept>
5. Include <description>...</description> for each concept
6. Include <parents>...</parents> listing prerequisites for each concept

**IMPORTANT**: This project should be the first step toward achieving the learning goal: "${context.learningGoal?.title || 'the stated learning objective'}"`;

  builder.section('Task', taskContent);

  // Difficulty Guidance
  if (context.difficulty === 'beginner') {
    builder.section('Difficulty Level', 'Focus on absolute basics and fundamental principles. Use simple language and avoid advanced terminology. Prioritize concepts that build a strong foundation before moving to more complex topics.');
  } else if (context.difficulty === 'intermediate') {
    builder.section('Difficulty Level', 'Assume the learner has some basic knowledge. Focus on concepts that bridge basic understanding to more advanced topics.');
  } else if (context.difficulty === 'advanced') {
    builder.section('Difficulty Level', 'Assume substantial prior knowledge. Include sophisticated concepts that prepare for expert-level understanding.');
  }

  // Focus Alignment
  if (context.focus) {
    builder.section('Learning Focus', `**CRITICAL**: All concepts must align with and support the learning focus: "${context.focus}". Do not introduce concepts that stray from this focus.`);
  }

  // Rules
  builder.rules([
    'Each concept must be tagged exactly once with <concept>CONCEPT NAME</concept>',
    'Use simple, single-concept names (e.g., "arrays", "functions")',
    'Avoid long descriptive names, parentheses, or special characters',
    'Parents must reference either the seed concept or concepts introduced earlier',
    'Use Title Case for concept names',
    'Do NOT repeat concepts from previous layers',
    context.focus ? `All concepts must align with the learning focus "${context.focus}"` : null,
    'Return only the narrative text; no JSON'
  ].filter(Boolean) as string[]);

  return builder.buildUser();
}

/**
 * Build user prompt for subsequent layer expansion
 */
export function buildSubsequentLayerPrompt(context: ExpansionPromptContext): string {
  const previousConcepts = context.previousLayers
    .filter(n => n.type === 'Concept')
    .map(n => n.properties.name)
    .filter(Boolean);

  // Get existing layer nodes to show previous goals
  const existingLayerNodes = context.existingLayers || context.previousLayers.filter(n => n.type === 'Layer');
  const previousLayerGoals = existingLayerNodes
    .filter(n => n.properties.goal)
    .map(n => ({ name: n.properties.name, goal: n.properties.goal }));
  const lastLayerGoal = previousLayerGoals.length > 0 
    ? previousLayerGoals[previousLayerGoals.length - 1].goal 
    : undefined;

  const builder = createPromptBuilder()
    .withContext({
      conceptName: context.seedConcept.properties.name,
      numConcepts: context.numConcepts,
      previousConcepts: previousConcepts.slice(0, 20).join(', '),
      difficulty: context.difficulty || 'intermediate'
    });

  // Context with previous layer goals
  let contextContent = `You are expanding the learning path for **{{conceptName}}**.

**Previous Concepts**: {{previousConcepts}}`;
  
  if (previousConcepts.length > 20) {
    contextContent += `\n(And ${previousConcepts.length - 20} more concepts from previous layers)`;
  }

  // Show previous top-level concepts/layers with their goals
  if (previousLayerGoals.length > 0) {
    contextContent += `\n\n**Previous Layers:**`;
    previousLayerGoals.forEach((layer, idx) => {
      contextContent += `\n- ${layer.name || `Layer ${idx + 1}`}: ${layer.goal}`;
    });
  }

  builder.section('Context', contextContent);

  // Learning Goal Progress with full milestone information
  if (context.learningGoal) {
    const goalParts: string[] = [
      `**Long-term Goal**: ${context.learningGoal.title} - ${context.learningGoal.target || context.learningGoal.description}`,
      `**Goal Type**: ${context.learningGoal.type}`
    ];
    
    // Add milestone progress
    if (context.learningGoal.milestones && context.learningGoal.milestones.length > 0) {
      const completedCount = context.completedMilestonesCount ?? context.learningGoal.milestones.filter(m => m.completed).length;
      const totalCount = context.totalMilestones ?? context.learningGoal.milestones.length;
      
      if (context.targetMilestone) {
        goalParts.push(`\n**Current Target Milestone**: Milestone ${context.targetMilestone.index + 1}: ${context.targetMilestone.title}`);
        if (context.targetMilestone.description) {
          goalParts.push(`**Milestone Description**: ${context.targetMilestone.description}`);
        }
      }
      
      goalParts.push(`**Progress**: ${completedCount}/${totalCount} milestones completed`);
      
      // List all milestones with completion status
      const milestonesList = context.learningGoal.milestones
        .map((m, idx) => `${idx + 1}. ${m.title}${m.completed ? ' ✓' : ''}`)
        .join(', ');
      goalParts.push(`**All Milestones**: ${milestonesList}`);
    }
    
    if (context.learningGoal.estimatedTime) {
      goalParts.push(`**Total Estimated Time**: ${context.learningGoal.estimatedTime} hours`);
    }
    
    builder.section('Learning Goal Progress', goalParts.join('\n'));
  }

  // Build task with milestone-specific instructions
  let taskContent = `Generate the next layer of concepts that build upon the previous layers.

**Requirements:**
1. Suggest a layer name in <level-name> tag that follows the naming pattern of previous layers`;

  // Add goal with milestone context
  taskContent += `
2. Define a goal in <goal> tag that builds on previous layers`;

  // Add CRITICAL milestone goal instructions
  if (context.targetMilestone) {
    taskContent += `

**CRITICAL MILESTONE GOAL REQUIREMENT:**
- This layer's goal **MUST be prefixed** with "Milestone ${context.targetMilestone.index + 1}: " in the <goal> tag
- **Example format**: \`<goal>Milestone ${context.targetMilestone.index + 1}: [your project goal that advances toward "${context.targetMilestone.title}"]</goal>\`
- The goal should directly contribute to achieving "${context.targetMilestone.title}"`;
    if (context.targetMilestone.description) {
      taskContent += `\n- **Milestone Context**: ${context.targetMilestone.description}`;
    }
    taskContent += `\n- This layer should advance the learner closer to completing Milestone ${context.targetMilestone.index + 1}`;
  }

  // Add previous goal context for building upon
  if (lastLayerGoal) {
    taskContent += `

**Previous Layer Goal**: ${lastLayerGoal}

**IMPORTANT**: Build upon the previous goal. Your new goal should demonstrate a different use case or build on the skills from the previous layer, creating a natural learning progression.`;
  }

  taskContent += `

3. Generate a narrative describing approximately {{numConcepts}} new concepts
4. Tag each concept with <concept>CONCEPT NAME</concept>
5. Include <description> and <parents> for each concept

Only introduce concepts that are direct next steps beyond the current knowledge. Concepts should progress naturally from the current knowledge and build on previous concepts.`;

  builder.section('Task', taskContent);

  // Focus Alignment
  if (context.focus) {
    builder.section('Learning Focus', `**CRITICAL**: All concepts must align with and support the learning focus: "${context.focus}". Do not introduce concepts that stray from this focus.`);
  }

  // Rules
  builder.rules([
    'Each new concept must have at least one parent from previous layers',
    'Do NOT repeat concepts from previous layers',
    'Build progressively on existing knowledge',
    'Use simple, single-concept names (e.g., "arrays", "functions")',
    'Avoid long descriptive names, parentheses, or special characters',
    'Use Title Case for concept names',
    context.focus ? `All concepts must align with the learning focus "${context.focus}"` : null,
    'Return only the narrative text; no JSON'
  ].filter(Boolean) as string[]);

  return builder.buildUser();
}

/**
 * Main function to build expansion prompt
 */
export function buildExpansionPrompt(context: ExpansionPromptContext): { system: string; user: string } {
  return {
    system: buildExpansionSystemPrompt(),
    user: context.isFirstLayer 
      ? buildFirstLayerPrompt(context)
      : buildSubsequentLayerPrompt(context)
  };
}

