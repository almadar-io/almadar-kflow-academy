import { Concept } from '../types/concept';
import { normalizeConcept } from './validation';
import { topologicalSequence, applySequenceToConcepts } from './graph';

/**
 * Sanitizes concept names by removing HTML-like tags and normalizing whitespace
 */
const sanitizeConceptName = (value: string): string =>
  value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Processes LLM response content to extract and structure concepts
 * This is the shared processing logic used by both streaming and non-streaming flows
 * 
 * @param content - The LLM response content containing tagged concepts
 * @param concept - The seed concept being expanded
 * @param previousLayers - Concepts from previous layers (for context and deduplication)
 * @param nextLayer - The layer number for the new concepts
 * @param extractGoal - Whether to extract goal from content
 * @param existingTopLevelConcepts - Existing top-level concepts (to filter out and exclude from parents)
 * @param allExistingConcepts - All existing concepts in the graph (to filter out duplicates)
 * @param finalLevelName - The final level name to use (with fallback applied)
 * @param nextSequence - The sequence number for the level concept
 * @returns Object containing level concept, processed concepts, and extracted goal
 */
export interface ProcessedProgressiveExpandResult {
  levelConcept: Concept;
  concepts: Concept[];
  goal?: string;
  levelName?: string;
  updatedSeedConcept?: Concept; // Updated seedConcept with level concept added to children
}

export function processProgressiveExpandContent(
  content: string,
  concept: Concept,
  previousLayers: Concept[],
  nextLayer: number,
  extractGoal: boolean = true,
  existingTopLevelConcepts: Concept[] = [],
  allExistingConcepts: Concept[] = [],
  finalLevelName: string,
  nextSequence: number
): ProcessedProgressiveExpandResult {
  const previousConceptMap = new Map<string, Concept>();
  // Include all previous layer concepts (not just main layer) to ensure we can find all parents
  // Use case-insensitive keys to handle name variations
  previousLayers.forEach(concept => {
    previousConceptMap.set(concept.name.toLowerCase(), {
      ...concept,
      children: Array.isArray(concept.children) ? [...concept.children] : [],
    });
  });
  // Also add the seed concept if it's not in previousLayers
  if (!previousConceptMap.has(concept.name.toLowerCase())) {
    previousConceptMap.set(concept.name.toLowerCase(), {
      ...concept,
      children: Array.isArray(concept.children) ? [...concept.children] : [],
    });
  }

  const existingNames = new Set<string>([
    concept.name,
    ...previousLayers.map(c => c.name),
  ]);

  const conceptBlockRegex = /<concept>(.*?)<\/concept>[\s.,;:!?"'\-]*<description>([\s\S]*?)<\/description>[\s.,;:!?"'\-]*<parents>([\s\S]*?)(?:<\/parents>|(?=<concept>)|$)/gi;
  const matches = [...content.matchAll(conceptBlockRegex)];

  const newConcepts: Concept[] = [];
  const addedNames = new Set<string>();
  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  matches.forEach((match, index) => {
    try {
      const rawName = match[1]?.trim();
      if (!rawName) {
        console.warn(`processProgressiveExpandContent: Missing concept tag content at match ${index + 1}`);
        return;
      }
      const normalizedName = sanitizeConceptName(rawName.replace(/\s+/g, ' ').trim());
      if (!normalizedName) {
        console.warn(`processProgressiveExpandContent: Sanitized concept name empty at match ${index + 1}`);
        return;
      }
      const key = normalizedName.toLowerCase();

      if (existingNames.has(normalizedName) || addedNames.has(key)) {
        console.warn(`processProgressiveExpandContent: Concept "${normalizedName}" already exists or duplicated at match ${index + 1}`);
        return;
      }

      const rawDescription = (match[2] ?? '').trim();
      if (!rawDescription) {
        console.warn(`processProgressiveExpandContent: No description provided for "${normalizedName}" at match ${index + 1}`);
      }
      const description = rawDescription.replace(/\n/g, '\n').replace(/\r/g, '\r').replace(/\t/g, '\t');

      const rawParentsText = (match[3] ?? '').trim();
      if (!rawParentsText) {
        console.warn(`processProgressiveExpandContent: No parents listed for "${normalizedName}" at match ${index + 1}`);
      }
      const sanitizedParentsText = rawParentsText
        .replace(/<\/?concept>/gi, '')
        .replace(/<\/?description>/gi, '')
        .replace(/<\/?parents>/gi, '')
        .trim();
      const rawParents = sanitizedParentsText
        .split(',')
        .map((p: string) => p.trim())
        .filter(Boolean);

      const parentsSet = new Set<string>();
      rawParents.forEach(parent => {
        if (parent.length > 0) {
          parentsSet.add(parent);
        }
      });

      const primaryParentLower = concept.name.toLowerCase();
      const hasPrimaryParent = Array.from(parentsSet).some(parent => parent.toLowerCase() === primaryParentLower);
      if (!hasPrimaryParent) {
        parentsSet.add(concept.name);
      }

      dependencies.set(normalizedName, parentsSet);
      parentsSet.forEach(parentName => {
        if (!dependents.has(parentName)) {
          dependents.set(parentName, new Set<string>());
        }
        dependents.get(parentName)!.add(normalizedName);
      });

      const parents = Array.from(parentsSet);

      const normalizedConcept = normalizeConcept({
        name: normalizedName,
        description,
        parents,
        children: [],
        // Don't set layer property - will be handled by level concept structure
      });

      const newConcept: Concept = {
        ...normalizedConcept,
        description,
        parents,
        children: normalizedConcept.children || [],
        // Don't set layer property - will be handled by level concept structure
      };

      newConcepts.push(newConcept);
      addedNames.add(key);
    } catch (error) {
      console.error(`processProgressiveExpandContent: Failed to parse concept at match ${index + 1}`, error);
    }
  });

  // Fallback: try to extract concepts with only concept tags
  if (newConcepts.length === 0) {
    const conceptOnlyRegex = /<concept>(.*?)<\/concept>/gi;
    const conceptOnlyMatches = [...content.matchAll(conceptOnlyRegex)];

    conceptOnlyMatches.forEach((match, index) => {
      try {
        const rawName = match[1]?.trim();
        if (!rawName) {
          console.warn(`processProgressiveExpandContent: Missing concept tag content (fallback) at match ${index + 1}`);
          return;
        }

        const normalizedName = sanitizeConceptName(rawName.replace(/\s+/g, ' ').trim());
        if (!normalizedName) {
          console.warn(`processProgressiveExpandContent: Sanitized concept name empty (fallback) at match ${index + 1}`);
          return;
        }
        const key = normalizedName.toLowerCase();

        if (existingNames.has(normalizedName) || addedNames.has(key)) {
          console.warn(`processProgressiveExpandContent: Concept "${normalizedName}" already exists or duplicated (fallback) at match ${index + 1}`);
          return;
        }

        const parentsSet = new Set<string>([concept.name]);
        dependencies.set(normalizedName, parentsSet);
        parentsSet.forEach(parentName => {
          if (!dependents.has(parentName)) {
            dependents.set(parentName, new Set<string>());
          }
          dependents.get(parentName)!.add(normalizedName);
        });

        const normalizedConcept = normalizeConcept({
          name: normalizedName,
          description: '',
          parents: [concept.name],
          children: [],
          // Don't set layer property - will be handled by level concept structure
        });

        const newConcept: Concept = {
          ...normalizedConcept,
          parents: [concept.name],
          children: [],
          // Don't set layer property - will be handled by level concept structure
        };

        newConcepts.push(newConcept);
        addedNames.add(key);
      } catch (error) {
        console.error(`processProgressiveExpandContent: Failed to parse concept (fallback) at match ${index + 1}`, error);
      }
    });
  }

  if (newConcepts.length === 0) {
    throw new Error('No new concepts were tagged in the response');
  }

  // Filter parents to only include known concepts
  const allKnownParents = new Set<string>([
    ...existingNames,
    ...newConcepts.map(concept => concept.name),
  ]);

  dependencies.forEach((parentsSet, conceptName) => {
    const filteredParents = Array.from(parentsSet)
      .map(parentName => sanitizeConceptName(parentName))
      .filter(parentName => allKnownParents.has(parentName));
    dependencies.set(conceptName, new Set(filteredParents));
  });

  newConcepts.forEach(concept => {
    concept.parents = concept.parents
      .map(parentName => sanitizeConceptName(parentName))
      .filter(parentName => allKnownParents.has(parentName));
    concept.name = sanitizeConceptName(concept.name);
  });

  // Apply topological sequencing
  const assignedSequence = topologicalSequence(newConcepts, dependencies, Date.now());
  applySequenceToConcepts(newConcepts, assignedSequence);

  const sequencedConcepts = newConcepts
    .slice()
    .sort((a, b) => {
      if (a.sequence === undefined && b.sequence === undefined) return 0;
      if (a.sequence === undefined) return 1;
      if (b.sequence === undefined) return -1;
      return a.sequence - b.sequence;
    });

  // Build parent-child relationships
  const newConceptMap = new Map<string, Concept>();
  // Also create a case-insensitive lookup map for new concepts
  const newConceptMapLower = new Map<string, Concept>();
  sequencedConcepts.forEach(concept => {
    if (!Array.isArray(concept.children)) {
      concept.children = [];
    }
    newConceptMap.set(concept.name, concept);
    newConceptMapLower.set(concept.name.toLowerCase(), concept);
  });

  const parentUpdates = new Map<string, Concept>();

  sequencedConcepts.forEach(childConcept => {
    childConcept.parents.forEach(parentName => {
      const sanitizedParent = sanitizeConceptName(parentName);
      if (!sanitizedParent) {
        return;
      }

      // Check if parent is in the new concepts (same layer) - try both exact and case-insensitive
      const newParent = newConceptMap.get(sanitizedParent) || newConceptMapLower.get(sanitizedParent.toLowerCase());
      if (newParent) {
        if (!newParent.children.includes(childConcept.name)) {
          newParent.children.push(childConcept.name);
        }
        return;
      }

      // Check if parent is in previous layers (case-insensitive lookup)
      const parentKey = sanitizedParent.toLowerCase();
      const existingParent = previousConceptMap.get(parentKey);
      if (existingParent) {
        // Check if we already have an update for this parent
        const existingUpdate = parentUpdates.get(existingParent.name);
        if (existingUpdate) {
          // Add child to existing update
          if (!existingUpdate.children.includes(childConcept.name)) {
            existingUpdate.children.push(childConcept.name);
          }
        } else {
          // Create a new update for this parent
          const updatedParent: Concept = {
            ...existingParent,
            name: existingParent.name, // Preserve original name (not lowercased)
            children: Array.isArray(existingParent.children) ? [...existingParent.children] : [],
          };
          if (!updatedParent.children.includes(childConcept.name)) {
            updatedParent.children.push(childConcept.name);
          }
          // Use original name as key
          parentUpdates.set(existingParent.name, updatedParent);
        }
      } else {
        // Parent not found - log warning with more context
        console.warn(`processProgressiveExpandContent: Parent "${sanitizedParent}" (key: "${parentKey}") not found in previous layers or new concepts for child "${childConcept.name}". Available parents in map: ${Array.from(previousConceptMap.keys()).slice(0, 10).join(', ')}`);
      }
    });
  });

  // Organize concepts (no longer using layer property)
  const conceptsByLayer: Map<number, Concept[]> = new Map();
  conceptsByLayer.set(nextLayer, sequencedConcepts.map(concept => ({
    ...concept,
    // Don't set layer property - will be handled by level concept structure
  })));

  parentUpdates.forEach(updatedParent => {
    const entryLayer = updatedParent.layer ?? (nextLayer - 1);
    if (!conceptsByLayer.has(entryLayer)) {
      conceptsByLayer.set(entryLayer, []);
    }
    conceptsByLayer.get(entryLayer)!.push(updatedParent);
  });

  const allConcepts: Concept[] = [];
  conceptsByLayer.forEach(layerConcepts => {
    layerConcepts.forEach(concept => {
      if (!Array.isArray(concept.children)) {
        concept.children = [];
      }
      allConcepts.push(concept);
    });
  });

  // Deduplicate concepts
  const uniqueConceptsMap = new Map<string, Concept>();
  allConcepts.forEach(concept => {
    const existing = uniqueConceptsMap.get(concept.name);
    if (!existing) {
      uniqueConceptsMap.set(concept.name, concept);
    } else {
      const mergedChildren = new Set([
        ...(existing.children || []),
        ...(concept.children || []),
      ]);
      uniqueConceptsMap.set(concept.name, {
        ...existing,
        ...concept,
        children: Array.from(mergedChildren),
        layer: concept.layer !== undefined ? concept.layer : existing.layer,
      });
    }
  });

  // Extract goal from content (if present and extraction is enabled)
  let goal: string | undefined;
  if (extractGoal) {
    const goalMatch = content.match(/<goal>([\s\S]*?)<\/goal>/i);
    goal = goalMatch ? goalMatch[1].trim() : undefined;
  }

  // Extract level name from content (if present)
  let levelName: string | undefined;
  const levelNameMatch = content.match(/<level-name>([\s\S]*?)<\/level-name>/i);
  levelName = levelNameMatch ? levelNameMatch[1].trim() : undefined;

  // Filter out any existing concepts (top-level concepts, seedConcept, or any existing concepts)
  // Only return NEW concepts that were just generated
  // This ensures existing top-level concepts and seedConcept are never returned or modified
  const seedConcept = concept;
  const existingConceptNames = new Set<string>([
    seedConcept.name,
    ...existingTopLevelConcepts.map(c => c.name),
    ...allExistingConcepts.map(c => c.name),
  ]);
  
  // Filter processed concepts to only include new concepts (not existing ones)
  const newConceptsOnly = Array.from(uniqueConceptsMap.values()).filter(concept => 
    !existingConceptNames.has(concept.name) && 
    concept.name !== seedConcept.name &&
    // Also exclude any concept that is an existing top-level concept
    !existingTopLevelConcepts.some(existing => existing.name === concept.name)
  );

  // Update layer concepts to:
  // 1. Remove seedConcept and existing top-level concepts from parents
  // 2. Add level concept as first parent using the final level name
  // This ensures existing top-level concepts and seedConcept remain unchanged
  const filteredConcepts = newConceptsOnly.map(layerConcept => {
    const existingParents = layerConcept.parents || [];
    // First, filter out seedConcept and existing top-level concepts
    const filteredParents = existingParents.filter(p => 
      p !== seedConcept.name && 
      !existingTopLevelConcepts.some(existing => existing.name === p)
    );
    
    // Add level concept as first parent using the final level name
    // This ensures the level concept is always the first parent
    const finalParents = [
      finalLevelName, 
      ...filteredParents.filter(p => p !== finalLevelName) // Add level as first, remove duplicates
    ];
    
    return {
      ...layerConcept,
      parents: finalParents, // Level concept as first parent, then filtered LLM-generated parents
      // Remove layer property if it exists
      layer: undefined,
    };
  });

  // Create level concept
  // Only include new concepts as children (not existing concepts)
  // seedConcept remains unchanged - it's only referenced as a parent, never modified
  const newConceptNames = filteredConcepts.map(c => c.name);
  const levelConcept: Concept = {
    name: finalLevelName,
    description: `Layer ${nextLayer} concepts`,
    goal: goal, // Store goal in level concept
    parents: [seedConcept.name], // Only seedConcept as parent - seedConcept remains unchanged
    children: newConceptNames, // Only new layer concepts as children
    sequence: nextSequence, // Preserve sequence order among top-level concepts
  };

  // Update seedConcept children to include the level concept
  // This will be returned so the frontend can save it
  const updatedSeedConcept = updateSeedConceptChildren(seedConcept, finalLevelName);

  return {
    levelConcept,
    concepts: filteredConcepts,
    goal,
    levelName,
    updatedSeedConcept, // Include updated seedConcept for frontend to save
  };
}

/**
 * Updates a seedConcept's children array to include a level concept if not already present
 * This is a pure function that returns an updated copy of the seedConcept
 * 
 * @param seedConcept - The seed concept to update
 * @param levelConceptName - The name of the level concept to add as a child
 * @returns Updated seedConcept with level concept added to children, or undefined if no update needed
 */
export function updateSeedConceptChildren(
  seedConcept: Concept,
  levelConceptName: string
): Concept | undefined {
  // Ensure children array exists (create a copy to avoid mutation)
  const children = Array.isArray(seedConcept.children) ? [...seedConcept.children] : [];
  
  // Add level concept if not already present
  if (!children.includes(levelConceptName)) {
    return {
      ...seedConcept,
      children: [...children, levelConceptName],
    };
  }
  
  // No update needed
  return undefined;
}

