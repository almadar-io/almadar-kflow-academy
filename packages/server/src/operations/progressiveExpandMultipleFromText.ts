import { Concept } from '../types/concept';
import { progressiveExpandMultipleFromTextSystemPrompt, progressiveExpandMultipleFromTextSystemPromptFirstLayer } from '../prompts';
import { callLLM } from '../services/llm';
import { validateConcept, validateConceptArray } from '../utils/validation';
import { processProgressiveExpandContent } from '../utils/progressiveExpandProcessor';
import type { LearningGoal, Milestone } from '../types/goal';
import { getGoalTypeGuidance } from '../utils/goalGuidance';

/**
 * Result type for progressiveExpandMultipleFromText that includes the prompt used
 */
export interface ProgressiveExpandMultipleFromTextResult {
  concepts: Concept[];
  prompt: string;
  response: string;
  goal?: string;
  model?: string; // The LLM model that was used
}

/**
 * Generates the next layer of concepts using narrative text output where concepts are tagged
 * with <concept> tags. Each tagged concept becomes a new concept with empty description.
 *
 * @param concept - The concept to expand from
 * @param previousLayers - Concepts already known (for context/deduplication)
 * @param numConcepts - Number of concepts to request (default 5)
 */
export interface ProgressiveExpandMultipleFromTextOptions {
  uid?: string;
  stream?: boolean;
  graphId?: string; // Optional, for reference only (not used for fetching)
  learningGoal?: LearningGoal; // REQUIRED: Must be passed from controller (can be undefined for backward compatibility)
  previousLayerGoal?: string; // Goal from the previous layer to build upon
  // REMOVED: goalFocused (always goal-focused now)
  // REMOVED: difficulty (comes from LearningGoal or graph metadata)
  // REMOVED: focus (comes from LearningGoal or graph metadata)
  allConcepts?: Concept[]; // All concepts in the graph (for finding existing top-level concepts)
}

export async function progressiveExpandMultipleFromText(
  concept: Concept,
  previousLayers: Concept[],
  numConcepts: number = 5,
  options: ProgressiveExpandMultipleFromTextOptions | string = {}
): Promise<ProgressiveExpandMultipleFromTextResult | { stream: any; model: string }> {
  // Handle backward compatibility: if options is a string, treat it as uid
  const opts: ProgressiveExpandMultipleFromTextOptions = typeof options === 'string' 
    ? { uid: options } 
    : options;
  
  const { uid, stream = false, learningGoal } = opts;
  if (!validateConcept(concept)) {
    throw new Error('Invalid concept input for progressiveExpandMultipleFromText operation');
  }

  if (!validateConceptArray(previousLayers)) {
    throw new Error('Invalid previous layers input for progressiveExpandMultipleFromText operation');
  }

  if (numConcepts < 1 || numConcepts > 10) {
    throw new Error('Number of concepts must be between 1 and 10');
  }

  const mainLayerConcepts = previousLayers.filter(c => !c.subLayer);
  const previousConceptMap = new Map<string, Concept>();
  mainLayerConcepts.forEach(concept => {
    previousConceptMap.set(concept.name, {
      ...concept,
      children: Array.isArray(concept.children) ? [...concept.children] : [],
    });
  });

  // Calculate next layer number based on new structure
  // In new structure: level concepts are top-level (seedConcept as sole parent)
  // Count existing top-level concepts to determine next level number
  // Don't match on "Level" name - all top-level concepts are levels
  let nextLayer: number;
  if (opts.allConcepts && opts.allConcepts.length > 0) {
    // Find existing top-level concepts (level concepts)
    const existingTopLevelConcepts = opts.allConcepts.filter(c => 
      c.parents.length === 1 && 
      c.parents[0] === concept.name &&
      c.name !== concept.name
    );
    
    // Count existing top-level concepts to determine next level number
    // The LLM will infer the naming pattern from previousLayers
    nextLayer = existingTopLevelConcepts.length + 1;
  } else {
    // Fallback to old layer-based calculation for backward compatibility
    const maxPreviousLayer = mainLayerConcepts.length > 0
      ? Math.max(...mainLayerConcepts.map(c => c.layer || 0))
      : concept.layer !== undefined
        ? concept.layer
        : 0;
    nextLayer = maxPreviousLayer + 1;
  }

  const previousLayersInfo = mainLayerConcepts.length > 0
    ? mainLayerConcepts.map(c => `- ${c.name}`).join('\n')
    : '(No previous concepts - this is the first layer)';

  const hasNoPreviousLayers = mainLayerConcepts.length === 0 || (mainLayerConcepts.length === 1 && mainLayerConcepts[0].name === concept.name);

  const seedConcept = concept;

  // Filter level concepts first (needed for milestone calculation)
  const levelConceptsOnly = previousLayers.filter(c => 
    c.parents.length === 1 && 
    c.parents[0] === seedConcept.name &&
    c.name !== seedConcept.name
  );

  // Extract difficulty and focus from LearningGoal (not from options)
  // Priority: assessedLevel from placement test > customMetadata.difficulty > concept difficulty > default
  const difficulty = learningGoal?.assessedLevel 
    ?? learningGoal?.customMetadata?.difficulty 
    ?? (opts.allConcepts?.[0]?.difficulty) // Fallback to first concept's difficulty
    ?? (hasNoPreviousLayers 
      ? (concept.difficulty)
      : (seedConcept?.difficulty))
    ?? 'intermediate'; // Default fallback
  
  const focus = learningGoal?.customMetadata?.focus 
    ?? learningGoal?.description 
    ?? (opts.allConcepts?.[0]?.focus) // Fallback to first concept's focus
    ?? (seedConcept?.focus);

  const difficultyText = difficulty 
    ? difficulty === 'beginner' 
      ? 'beginner-level' 
      : difficulty === 'intermediate' 
        ? 'intermediate-level' 
        : 'advanced-level'
    : '';

  // Build prompts - extract shared parts and use if-else for clarity
  
  // Determine target milestone for this layer
  const incompleteMilestones = learningGoal?.milestones?.filter(m => !m.completed) || [];
  const completedMilestones = learningGoal?.milestones?.filter(m => m.completed) || [];
  const totalMilestones = learningGoal?.milestones?.length || 0;
  
  // Calculate which milestone this layer should target
  // For first layer: target first incomplete milestone (or first milestone if all incomplete)
  // For subsequent layers: count existing top-level concepts with goals to determine which milestone to target
  let targetMilestoneIndex = 0;
  let targetMilestone: Milestone | undefined;
  
  if (incompleteMilestones.length > 0 && learningGoal) {
    if (hasNoPreviousLayers) {
      // First layer targets the first incomplete milestone
      targetMilestoneIndex = completedMilestones.length;
      targetMilestone = incompleteMilestones[0];
    } else {
      // Subsequent layers: count existing top-level concepts that have goals
      // Filter top-level concepts that have a goal property
      const topLevelConceptsWithGoals = levelConceptsOnly
        .filter(c => c.goal && c.goal.trim().length > 0)
        .sort((a, b) => {
          // Order by sequence if available, otherwise maintain insertion order
          if (a.sequence !== undefined && b.sequence !== undefined) {
            return a.sequence - b.sequence;
          }
          if (a.sequence !== undefined) return -1;
          if (b.sequence !== undefined) return 1;
          return 0;
        });
      
      // Count how many top-level concepts have goals
      const existingLevelsWithGoalsCount = topLevelConceptsWithGoals.length;
      
      // Each level with a goal should advance toward the next milestone
      // If we have 2 levels with goals, we might be working on milestone 2 or 3, etc.
      targetMilestoneIndex = Math.min(completedMilestones.length + existingLevelsWithGoalsCount, totalMilestones - 1);
      const milestoneIndex = Math.min(targetMilestoneIndex, incompleteMilestones.length - 1);
      targetMilestone = incompleteMilestones[milestoneIndex];
    }
  }

  // Build milestone context for prompts
  const milestoneContext = targetMilestone ? `
- **Current Target Milestone**: Milestone ${targetMilestoneIndex + 1}: ${targetMilestone.title}
${targetMilestone.description ? `- **Milestone Description**: ${targetMilestone.description}` : ''}
${targetMilestone.targetDate ? `- **Milestone Deadline**: ${new Date(targetMilestone.targetDate).toLocaleDateString()}` : ''}
` : '';

  // Goal context for first layer
  const goalContext = learningGoal ? `
## Learning Goal Context
- **Goal Title**: ${learningGoal.title}
- **Goal Description**: ${learningGoal.description}
- **Goal Type**: ${learningGoal.type}
- **Target**: ${learningGoal.target}
${learningGoal.estimatedTime ? `- **Estimated Time**: ${learningGoal.estimatedTime} hours` : ''}
${learningGoal.milestones && learningGoal.milestones.length > 0 ? `
- **Total Milestones**: ${totalMilestones}
- **Completed Milestones**: ${completedMilestones.length}/${totalMilestones}
${milestoneContext}
- **All Milestones**: ${learningGoal.milestones.map((m, idx) => `${idx + 1}. ${m.title}${m.completed ? ' ✓' : ''}`).join(', ')}` : ''}
${learningGoal.customMetadata ? `- **Additional Context**: ${JSON.stringify(learningGoal.customMetadata)}` : ''}
` : '';

  // Shared topic introduction section for first layer
  const firstLayerTopicIntroduction = `You are a learning architect introducing a new learning path for the topic "${concept.name}".
${goalContext}
## Topic Introduction
- The core topic is: "${concept.name}"
- Description: ${concept.description}${difficulty ? `\n- Learner Level: ${difficultyText}` : ''}${focus ? `\n- Learning Focus: ${focus}` : ''}`;

  // Shared focus reminder text
  const focusReminderText = focus 
    ? `\n\n**IMPORTANT: Maintain focus on "${focus}" throughout all generated concepts. All foundational concepts should align with and support this learning focus.`
    : '';

  // Use the extracted function for goal type guidance
  const goalTypeGuidance = getGoalTypeGuidance(learningGoal);

  // Build milestone-specific goal instruction
  const milestoneGoalInstruction = targetMilestone 
    ? `- **CRITICAL: This layer's goal MUST be prefixed with "Milestone ${targetMilestoneIndex + 1}: " in the <goal></goal> tag.**
- **Example format**: <goal>Milestone ${targetMilestoneIndex + 1}: [your project goal that advances toward "${targetMilestone.title}"]</goal>
- **IMPORTANT: The goal should directly contribute to achieving "${targetMilestone.title}".**
${targetMilestone.description ? `- **Milestone Context**: ${targetMilestone.description}` : ''}`
    : '';

  // Always goal-focused now (no goalFocused flag)
  const firstLayerTask = `## Task
Pick a simple project appropriate to ${concept.name} and the current ${difficulty} level of the learner.
${goalTypeGuidance}
- The project should be as simple as possible since this is the first layer of the learning path.
- **IMPORTANT: This project should be the first step toward achieving the learning goal: "${learningGoal?.title || 'the stated learning objective'}"**
${milestoneGoalInstruction}
- **IMPORTANT: Suggest a name for this first top-level concept** (e.g., "Level 1", "Module 1", "Foundation", etc.). Place this name in a <level-name></level-name> tag at the beginning of your response, before the goal tag.
- **IMPORTANT: You MUST include this goal in your response using a <goal></goal> tag. Place the goal tag after the level-name tag, before the narrative.**
- Based on this project goal, generate a narrative that introduces this concept and describes the foundational concepts that a learner needs to understand "${concept.name}" while working toward "${learningGoal?.target || concept.name}".
- ${focusReminderText}`;

  // Build first layer prompt (always goal-focused)
  const firstLayerPromptBase = `${firstLayerTopicIntroduction}\n\n${firstLayerTask}`;

  // Difficulty-specific guidance for first layer
  let firstLayerPromptDifficultyGuidance: string;
  if (difficulty === 'beginner') {
    firstLayerPromptDifficultyGuidance = `- Tailor the foundational concepts to a beginner level: focus on absolute basics, fundamental principles, and concepts that require minimal prior knowledge.
- Use simple language and avoid assuming advanced background knowledge.
- Prioritize concepts that build a strong foundation before moving to more complex topics.`;
  } else if (difficulty === 'intermediate') {
    firstLayerPromptDifficultyGuidance = `- Tailor the foundational concepts to an intermediate level: assume the learner has some basic knowledge and can handle moderately complex concepts.
- Focus on concepts that bridge basic understanding to more advanced topics.
- Include both foundational concepts and some that require basic prerequisite knowledge.`;
  } else if (difficulty === 'advanced') {
    firstLayerPromptDifficultyGuidance = `- Tailor the foundational concepts to an advanced level: assume the learner has substantial prior knowledge and can handle complex, nuanced concepts.
- Focus on sophisticated foundational concepts that prepare for expert-level understanding.
- Include concepts that require significant prerequisite knowledge and deeper theoretical understanding.`;
  } else {
    firstLayerPromptDifficultyGuidance = '';
  }

  // Shared focus emphasis text for first layer instructions
  const firstLayerFocusEmphasis = focus 
    ? `, emphasizing the focus on "${focus}"`
    : '';
  
  const firstLayerFocusAlignment = focus 
    ? `, all aligned with the learning focus: "${focus}"`
    : '';

  const firstLayerFocusCritical = focus 
    ? `- **CRITICAL**: Every concept you generate must be relevant to and support the learning focus: "${focus}". Do not introduce concepts that stray from this focus.\n`
    : '';

  const firstLayerFocusMaintain = focus 
    ? `\n- **Maintain Focus**: All concepts must align with the learning focus "${focus}". Avoid introducing concepts that are not directly related to this focus.`
    : '';

  const firstLayerPromptInstructions = `
Your narrative should:
- Introduce "${concept.name}" based on its name and description${firstLayerFocusEmphasis}
- Describe approximately ${numConcepts} foundational and prerequisite concepts that are essential building blocks for understanding "${concept.name}"${firstLayerFocusAlignment}
${firstLayerPromptDifficultyGuidance ? `${firstLayerPromptDifficultyGuidance}\n` : ''}${firstLayerFocusCritical}
- Tag each foundational concept using <concept>CONCEPT NAME</concept> tags
- For each tagged concept, immediately include a <description>...</description> block summarizing it
- Follow each description with a <parents>...</parents> block listing prerequisite concepts or foundational knowledge needed (separated by commas if multiple)
- Ensure every <parents> block closes before introducing the next concept

## Rules
- Each concept MUST be tagged exactly once in your narrative using <concept>CONCEPT NAME</concept>
- Each concept name must be unique
- Use simple, single-concept names only (e.g., "arrays", "functions", "variables"). Avoid long descriptive names, parentheses, or special characters.
- Parents must reference either "${concept.name}" or concepts introduced earlier in this narrative
- Use distinctive, Title Case names for each concept
- Do NOT repeat any concept from the current knowledge list or reuse the same new concept twice${firstLayerFocusMaintain}
- Return only the narrative text; no JSON.`;

  // Shared header for subsequent layers
  // previousLayers now contains all concepts from previous levels (level concepts + their children)
  // levelConceptsOnly was already calculated above for milestone determination

  // Recalculate target milestone for subsequent layers (may have changed)
  let subsequentTargetMilestone: Milestone | undefined;
  let subsequentTargetMilestoneIndex = 0;
  
  if (learningGoal && incompleteMilestones.length > 0) {
    // Count existing top-level concepts that have goals to determine which milestone to target
    // Filter top-level concepts that have a goal property
    const topLevelConceptsWithGoals = levelConceptsOnly
      .filter(c => c.goal && c.goal.trim().length > 0)
      .sort((a, b) => {
        // Order by sequence if available, otherwise maintain insertion order
        if (a.sequence !== undefined && b.sequence !== undefined) {
          return a.sequence - b.sequence;
        }
        if (a.sequence !== undefined) return -1;
        if (b.sequence !== undefined) return 1;
        return 0;
      });
    
    // Count how many top-level concepts have goals
    const existingLevelsWithGoalsCount = topLevelConceptsWithGoals.length;
    
    subsequentTargetMilestoneIndex = Math.min(completedMilestones.length + existingLevelsWithGoalsCount, totalMilestones - 1);
    const milestoneIndex = Math.min(subsequentTargetMilestoneIndex, incompleteMilestones.length - 1);
    subsequentTargetMilestone = incompleteMilestones[milestoneIndex];
  }

  // Build milestone context for subsequent layers
  const subsequentMilestoneContext = subsequentTargetMilestone ? `
- **Current Target Milestone**: Milestone ${subsequentTargetMilestoneIndex + 1}: ${subsequentTargetMilestone.title}
${subsequentTargetMilestone.description ? `- **Milestone Description**: ${subsequentTargetMilestone.description}` : ''}
${subsequentTargetMilestone.targetDate ? `- **Milestone Deadline**: ${new Date(subsequentTargetMilestone.targetDate).toLocaleDateString()}` : ''}
- **Progress**: ${completedMilestones.length}/${totalMilestones} milestones completed
` : '';

  // Goal progression context for subsequent layers
  const goalProgressionContext = learningGoal ? `
## Learning Goal Progress
- **Long-term Goal**: ${learningGoal.title} - ${learningGoal.target}
- **Goal Type**: ${learningGoal.type}
${learningGoal.milestones && learningGoal.milestones.length > 0 ? `
${subsequentMilestoneContext}
- **All Milestones**: ${learningGoal.milestones.map((m, idx) => `${idx + 1}. ${m.title}${m.completed ? ' ✓' : ''}`).join(', ')}` : ''}
${learningGoal.estimatedTime ? `- **Total Estimated Time**: ${learningGoal.estimatedTime} hours` : ''}
` : '';

  const subsequentLayersHeader = `You are expanding the learning path for "${concept.name}".
${goalProgressionContext}
Current focus description: ${concept.description}${focus ? `\n\n**Learning Focus**: ${focus}` : ''}

## Previous Top-Level Concepts
The following top-level concepts already exist in this learning path:
${levelConceptsOnly.length > 0 ? levelConceptsOnly.map(c => `- ${c.name}${c.goal ? ` (Goal: ${c.goal})` : ''}`).join('\n') : '- None (this will be the first top-level concept)'}

## Current Knowledge
${previousLayersInfo}`;

  // Shared focus reminders for subsequent layers
  const subsequentLayersFocusReminder = focus 
    ? `\n\n**IMPORTANT: Maintain focus on "${focus}" throughout all generated concepts. All concepts in this layer must align with and support this learning focus.`
    : '';

  const subsequentLayersFocusRelevance = focus 
    ? ` All concepts must be relevant to the learning focus: "${focus}".`
    : '';

  const subsequentLayersFocusMaintain = focus 
    ? `\n- **Maintain Focus**: All concepts must align with the learning focus "${focus}". Do not introduce concepts that stray from this focus.`
    : '';

  // Shared concept tagging rules for subsequent layers
  const subsequentLayersConceptRules = `- Each new concept MUST be tagged exactly once in your narrative using <concept>CONCEPT NAME</concept>.
- Use simple, single-concept names only (e.g., "arrays", "functions", "variables"). Avoid long descriptive names, parentheses, or special characters.
- Immediately after introducing a concept, include a <description>...</description> block summarizing it.
- Follow each description with a <parents>...</parents> block listing prerequisite concepts separated by commas.
- Parents must reference either the provided current knowledge or concepts introduced earlier in this narrative.
- Ensure every <parents> block closes before introducing the next concept.
- Use distinctive, Title Case names for each concept.
- Do NOT repeat any concept from the current knowledge list or reuse the same new concept twice.${subsequentLayersFocusMaintain}
- Return only the narrative text; no JSON.`;

  // Subsequent layers task section - goal-focused version
  const previousGoalDifferentUseCase = opts.previousLayerGoal 
    ? ` This goal should demonstrate a different use case from the previous goal: "${opts.previousLayerGoal}".`
    : '';

  const previousGoalBuildUpon = opts.previousLayerGoal 
    ? `\n\n**Previous Layer Goal**: ${opts.previousLayerGoal}\n\n**IMPORTANT**: Build upon the previous goal. Your new goal should be a different use case, creating a natural learning progression.`
    : '';

  // Build milestone-specific goal instruction for subsequent layers
  const subsequentMilestoneGoalInstruction = subsequentTargetMilestone 
    ? `
- **CRITICAL: This layer's goal MUST be prefixed with "Milestone ${subsequentTargetMilestoneIndex + 1}: " in the <goal></goal> tag.**
- **Example format**: <goal>Milestone ${subsequentTargetMilestoneIndex + 1}: [your project goal that advances toward "${subsequentTargetMilestone.title}"]</goal>
- **IMPORTANT: The goal should directly contribute to achieving "${subsequentTargetMilestone.title}".**
${subsequentTargetMilestone.description ? `- **Milestone Context**: ${subsequentTargetMilestone.description}` : ''}
- **Milestone Progress**: This layer should advance the learner closer to completing Milestone ${subsequentTargetMilestoneIndex + 1}.`
    : '';

  // Goal-aligned task for subsequent layers
  const goalAlignedTaskGuidance = learningGoal ? (() => {
    const completedMilestones = learningGoal.milestones?.filter(m => m.completed).length || 0;
    const totalMilestones = learningGoal.milestones?.length || 0;
    const progressText = totalMilestones > 0 
      ? ` (${completedMilestones}/${totalMilestones} milestones completed)`
      : '';
    
    return `
- **Goal Alignment**: This layer should advance the learner toward "${learningGoal.target}"${progressText}
${subsequentMilestoneGoalInstruction}
- Consider the remaining milestones and ensure concepts support upcoming milestone completion.
${learningGoal.type === 'certification' && learningGoal.customMetadata?.examDate ? `- **Time Constraint**: Exam on ${learningGoal.customMetadata.examDate} - prioritize high-value concepts.` : ''}
${learningGoal.estimatedTime ? `- **Pacing**: With ${learningGoal.estimatedTime} total hours estimated, ensure this layer's concepts fit within the overall timeline.` : ''}`;
  })() : '';

  // Always goal-focused for subsequent layers
  const subsequentLayersTask = `## Task
Pick a real world project appropriate to ${concept.name} and the current ${difficulty} level of the learner (display this goal in a <goal></goal> tag) as well as the current knowledge.
${goalAlignedTaskGuidance}
- ${previousGoalDifferentUseCase}${previousGoalBuildUpon}
- **IMPORTANT: Suggest a name for this new top-level concept** that follows the naming pattern of the previous top-level concepts listed above. Place this name in a <level-name></level-name> tag at the beginning of your response, before the goal tag. For example, if previous concepts are "Level 1", "Level 2", suggest "Level 3". If they are "Module 1", "Module 2", suggest "Module 3". If they have different names, infer a logical continuation pattern.
- Based on this implicit project, generate a narrative describing the next layer of approximately ${numConcepts} concepts the learner should study to achieve this goal.
- ${subsequentLayersFocusReminder}
- Only introduce concepts that are direct next steps beyond the current knowledge.${subsequentLayersFocusRelevance}
- Concepts should progress naturally from the current knowledge and build on previous concepts.
${subsequentLayersConceptRules}`;

  // Build subsequent layers prompt (always goal-focused)
  const subsequentLayersPrompt = `${subsequentLayersHeader}\n\n${subsequentLayersTask}`;

  // Select the appropriate prompt
  const userPrompt = hasNoPreviousLayers
    ? `${firstLayerPromptBase}${firstLayerPromptInstructions}`
    : subsequentLayersPrompt;

  // Build full prompt (system + user) for return - do this before streaming check
  const systemPrompt = hasNoPreviousLayers 
    ? progressiveExpandMultipleFromTextSystemPromptFirstLayer 
    : progressiveExpandMultipleFromTextSystemPrompt;
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    provider: 'deepseek',
    model: 'deepseek-chat',
    uid,
    stream: stream,
  });

  // If streaming, return the stream with prompt
  if (response.stream && response.raw) {
    return {
      stream: response.raw,
      model: response.model,
      prompt: fullPrompt,
    } as any;
  }

  const content = response.content ?? '';

  // Store the prompt and response for return
  const llmPrompt = fullPrompt;
  const llmResponse = content;

  // Create level concept structure
  // Find all existing top-level concepts (concepts with seedConcept as their sole parent)
  const allConcepts = opts.allConcepts || [...previousLayers, concept];
  const existingTopLevelConcepts = allConcepts.filter(c => 
    c.parents.length === 1 && 
    c.parents[0] === seedConcept.name &&
    c.name !== seedConcept.name // Exclude seed concept itself
  );

  // Calculate next sequence number for level concept
  const maxSequence = existingTopLevelConcepts.length > 0
    ? Math.max(...existingTopLevelConcepts.map(c => c.sequence ?? 0))
    : 0;
  const nextSequence = maxSequence + 1;

  // Extract level name from LLM response first (before processing)
  // This avoids calling processProgressiveExpandContent twice
  // IMPORTANT: Only take the FIRST level-name tag if multiple are present
  let levelName: string | undefined;
  const levelNameMatches = content.matchAll(/<level-name>([\s\S]*?)<\/level-name>/gi);
  const firstLevelNameMatch = Array.from(levelNameMatches)[0];
  levelName = firstLevelNameMatch ? firstLevelNameMatch[1].trim() : undefined;
  
  // If multiple level-name tags were found, log a warning
  const allLevelNameMatches = Array.from(content.matchAll(/<level-name>([\s\S]*?)<\/level-name>/gi));
  if (allLevelNameMatches.length > 1) {
    console.warn(`Multiple level-name tags found in LLM response (${allLevelNameMatches.length}). Using only the first one: "${levelName}"`);
  }
  
  // Get level name from LLM response (suggested by the LLM based on previous top-level concepts)
  // If LLM didn't suggest a name, fall back to a default
  levelName = levelName || `Level ${existingTopLevelConcepts.length + 1}`;
  
  // Sanitize level name (remove any extra whitespace, ensure it's a valid concept name)
  levelName = levelName.trim();
  
  // If level name is empty or invalid, use fallback
  if (!levelName || levelName.length === 0) {
    levelName = `Level ${existingTopLevelConcepts.length + 1}`;
  }

  // Use shared processing utility
  // Always extract goal now (always goal-focused)
  const shouldExtractGoal = true; // Always goal-focused now
  
  // Process with final level name and sequence (only called once now)
  const processed = processProgressiveExpandContent(
    content, 
    concept, 
    previousLayers, 
    nextLayer, 
    shouldExtractGoal,
    existingTopLevelConcepts,
    allConcepts,
    levelName,
    nextSequence
  );

  // processed.concepts now contains only new concepts with:
  // - seedConcept and existing top-level concepts removed from parents
  // - level concept already added as first parent
  // processed.levelConcept contains the created level concept
  const updatedLayerConcepts = processed.concepts;

  // Return only NEW concepts: level concept + updated layer concepts
  // Also include updated seedConcept if it was modified (frontend will save it)
  // IMPORTANT: Only return ONE level concept (processed.levelConcept)
  const allReturnedConcepts = [processed.levelConcept, ...updatedLayerConcepts];
  if (processed.updatedSeedConcept) {
    allReturnedConcepts.push(processed.updatedSeedConcept);
  }
  
  // CRITICAL: Ensure only ONE top-level concept is returned
  // Count concepts that have seedConcept as their only parent (excluding seedConcept itself)
  // These are top-level concepts (level concepts)
  const returnedTopLevelConcepts = allReturnedConcepts.filter(c => 
    c.parents.length === 1 && 
    c.parents[0] === seedConcept.name &&
    c.name !== seedConcept.name &&
    !c.isSeed
  );
  
  // If multiple top-level concepts were accidentally created, only keep the first one
  if (returnedTopLevelConcepts.length > 1) {
    console.warn(`Multiple top-level concepts detected (${returnedTopLevelConcepts.length}). Keeping only the first one: "${returnedTopLevelConcepts[0].name}"`);
    // Keep only the first top-level concept (should be processed.levelConcept)
    // Filter out extra top-level concepts from the return array
    const otherTopLevelNames = new Set(returnedTopLevelConcepts.slice(1).map(c => c.name));
    const finalReturnedConcepts = allReturnedConcepts.filter(c => 
      !otherTopLevelNames.has(c.name)
    );
    
    return {
      concepts: finalReturnedConcepts,
      prompt: llmPrompt,
      response: llmResponse,
      goal: processed.goal,
      model: response.model,
    };
  }

  return {
    concepts: allReturnedConcepts,
    prompt: llmPrompt,
    response: llmResponse,
    goal: processed.goal,
    model: response.model,
  };
}