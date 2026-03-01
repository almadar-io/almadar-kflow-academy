import { Request, Response } from 'express';
import { getOpenAI } from '../config/openai';
import { extractTags, parseStructuredResponse, generateFallbackChildren } from '../utils/text';
import {
  GenerateNoteRequest,
  GenerateChildrenRequest,
  NoteResponse,
  GenerateChildrenResponse,
  HealthResponse,
  ExpandConceptRequest,
  GenerateNextLayerRequest,
  GenerateNextConceptRequest,
  DeriveParentsRequest,
  DeriveSummaryRequest,
  ConceptOperationResponse,
  ErrorResponse,
} from '../types';
import { expand, progressiveExpandMultiple, advanceNextMultiple, deriveParents, deriveSummary, explain, progressiveExpandMultipleFromText, generateLayerPractice, PracticeItem, answerQuestion, customOperation, synthesize, explore, tracePath, progressiveExpandSingle, progressiveExplore, generateFlashCards } from '../operations';
import { createGraph, addConceptsToGraph } from '../utils/graph';
import { ConceptGraph, Concept, GraphDifficulty } from '../types/concept';
import { ExplainConceptRequest, ProgressiveExpandMultipleFromTextRequest, GenerateLayerPracticeRequest, GenerateLayerPracticeResponse, AnswerQuestionRequest, AnswerQuestionResponse, CustomOperationRequest, SynthesizeRequest, ExploreRequest, TracePathRequest, ProgressiveExpandSingleRequest, ProgressiveExploreRequest, GenerateFlashCardsRequest } from '../types';
import { getUserGraphById } from '../services/graphService';
import { upsertUser } from '../services/userService';
import { saveLayer, getLayerByNumber } from '../services/layerService';
import { processPrerequisitesFromLesson } from '../utils/prerequisites';
import { handleStreamResponse } from '../utils/streamHandler';
import { processProgressiveExpandContent } from '../utils/progressiveExpandProcessor';
import { getGoalsByGraphId, markMilestoneCompleted } from '../services/goalService';
import type { LearningGoal } from '../types/goal';

const findConceptInRecord = (concepts: Record<string, Concept>, target?: Concept): Concept | undefined => {
  if (!target) {
    return undefined;
  }

  if (target.name && concepts[target.name]) {
    return concepts[target.name];
  }

  if (target.id) {
    return Object.values(concepts).find(concept => concept.id === target.id);
  }

  return undefined;
};

const mapConceptsFromRecord = (concepts: Record<string, Concept>, targets: Concept[]): Concept[] => {
  return targets.map(target => findConceptInRecord(concepts, target) ?? target);
};

const getSeedConceptFromRecord = (concepts: Record<string, Concept>, seedConceptId: string): Concept | undefined => {
  if (!seedConceptId) {
    return undefined;
  }

  return (
    Object.values(concepts).find(
      concept => concept.id === seedConceptId || concept.name === seedConceptId
    ) ?? concepts[seedConceptId]
  );
};

export async function generateNote(
  req: Request<{}, NoteResponse | { error: string; note?: string } | { error: string; details: string }, GenerateNoteRequest>,
  res: Response<NoteResponse | { error: string; note?: string } | { error: string; details: string }>
): Promise<void | Response> {
  try {
    const { prompt, parentTitle, parentContent, parentTags } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const openai = getOpenAI();
    if (!openai) {
      return res.status(500).json({
        error: 'OpenAI API key not configured',
        note: 'Please set OPENAI_API_KEY in your environment variables and restart the server',
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            "You are a helpful assistant that creates well-structured notes. Generate concise, organized content based on the user's request. Return the response in a structured format.",
        },
        {
          role: 'user',
          content: `Create a note about: ${prompt}. Make it informative and well-structured. ${parentTitle ? `Parent title: ${parentTitle}` : ''}  ${parentContent ? `Parent content: ${parentContent}` : ''} ${parentTags && parentTags.length > 0 ? `Parent tags: ${parentTags.join(', ')}` : ''}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const generatedContent = completion.choices[0]?.message?.content || '';

    const response: NoteResponse = {
      title: prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt,
      content: generatedContent,
      tags: extractTags(prompt),
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating note:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate note', details: errorMessage });
  }
}

export async function generateChildren(
  req: Request<{}, GenerateChildrenResponse | { error: string; note?: string } | { error: string; details: string }, GenerateChildrenRequest>,
  res: Response<GenerateChildrenResponse | { error: string; note?: string } | { error: string; details: string }>
): Promise<void | Response> {
  try {
    const { parentTitle, parentContent, parentTags } = req.body;

    if (!parentTitle) {
      return res.status(400).json({ error: 'Parent title is required' });
    }

    const openai = getOpenAI();
    if (!openai) {
      return res.status(500).json({
        error: 'OpenAI API key not configured',
        note: 'Please set OPENAI_API_KEY in your environment variables and restart the server',
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content:
            "You are a teacher that teaches topics by creating child notes for a parent note. Generate as many relevant child notes that would logically belong under the parent note. Each child should be a specific subtopic or aspect of the parent topic. the idea is to teach someone by walking them through this topic step by step. Return the response as a JSON array of objects with 'title', 'content', and 'tags' properties. keep it simple and give a general overview of the topic.",
        },
        {
          role: 'user',
          content: `Generate child notes for a parent note titled "${parentTitle}". ${parentContent ? `Parent content: ${parentContent}` : ''} ${parentTags && parentTags.length > 0 ? `Parent tags: ${parentTags.join(', ')}` : ''}. Create as many child notes that are logical subtopics.`,
        },
      ],
    });

    const generatedContent = completion.choices[0]?.message?.content || '';

    let children: Array<{ title: string; content: string; tags: string[] }> = [];
    try {
      const jsonMatch = generatedContent.match(/\[.*\]/s);
      if (jsonMatch) {
        children = JSON.parse(jsonMatch[0]) as Array<{ title: string; content: string; tags: string[] }>;
      } else {
        children = parseStructuredResponse(generatedContent);
      }
    } catch (parseError) {
      console.log('JSON parsing failed, using fallback parser');
      children = parseStructuredResponse(generatedContent);
    }

    if (!Array.isArray(children) || children.length === 0) {
      children = generateFallbackChildren(parentTitle);
    }

    const response: GenerateChildrenResponse = { children };
    res.json(response);
  } catch (error) {
    console.error('Error generating children:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate children', details: errorMessage });
  }
}

export function health(
  req: Request,
  res: Response<HealthResponse>
): void {
  res.json({ status: 'OK', message: 'KFlow API is running' });
}

/**
 * Expand a concept - generates 3-7 sub-concepts
 * POST /api/expand-concept
 */
export async function expandConcept(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, ExpandConceptRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void | Response> {
  try {
    const { concept, graph } = req.body;

    if (!concept || !concept.name) {
      return res.status(400).json({ error: 'Concept is required' });
    }

    // Build graph from request if provided, otherwise use empty graph
    let conceptGraph: ConceptGraph | undefined;
    if (graph && graph.concepts) {
      // Convert Record<string, Concept> to Map<string, Concept>
      const conceptsMap = new Map<string, Concept>();
      Object.values(graph.concepts).forEach(c => {
        conceptsMap.set(c.name, c);
      });
      conceptGraph = { concepts: conceptsMap };
    } else {
      conceptGraph = createGraph();
      // Add the concept to the graph if it's not already there
      conceptGraph = addConceptsToGraph(conceptGraph, [concept]);
    }

    const results = await expand(concept, conceptGraph);

    res.json({ concepts: results });
  } catch (error) {
    console.error('Error expanding concept:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to expand concept', details: errorMessage });
  }
}

/**
 * Generate next layer - generates multiple layers of concepts (progressiveExpandMultiple)
 * POST /api/generate-next-layer
 */
export async function generateNextLayer(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, GenerateNextLayerRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void | Response> {
  try {
    const { seedConcept, previousLayers, numLayers = 2 } = req.body;

    if (!seedConcept || !seedConcept.name) {
      return res.status(400).json({ error: 'Seed concept is required' });
    }

    if (!Array.isArray(previousLayers)) {
      return res.status(400).json({ error: 'Previous layers must be an array' });
    }

    if (numLayers < 1 || numLayers > 5) {
      return res.status(400).json({ error: 'Number of layers must be between 1 and 5' });
    }

    const result = await progressiveExpandMultiple(seedConcept, previousLayers, numLayers);

    res.json({ 
      concepts: result.concepts,
      model: result.model,
    });
  } catch (error) {
    console.error('Error generating next layer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate next layer', details: errorMessage });
  }
}

/**
 * Generate next concept - generates multiple sequential learning steps (advanceNextMultiple)
 * POST /api/generate-next-concept
 */
export async function generateNextConcept(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, GenerateNextConceptRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void | Response> {
  try {
    const { concept, numSteps = 3, graph } = req.body;

    if (!concept || !concept.name) {
      return res.status(400).json({ error: 'Concept is required' });
    }

    if (numSteps < 1 || numSteps > 5) {
      return res.status(400).json({ error: 'Number of steps must be between 1 and 5' });
    }

    // Build graph from request if provided, otherwise use empty graph
    let conceptGraph: ConceptGraph | undefined;
    if (graph && graph.concepts) {
      // Convert Record<string, Concept> to Map<string, Concept>
      const conceptsMap = new Map<string, Concept>();
      Object.values(graph.concepts).forEach(c => {
        conceptsMap.set(c.name, c);
      });
      conceptGraph = { concepts: conceptsMap };
    } else {
      conceptGraph = createGraph();
      // Add the concept to the graph if it's not already there
      conceptGraph = addConceptsToGraph(conceptGraph, [concept]);
    }

    const results = await advanceNextMultiple(concept, conceptGraph, numSteps);

    res.json({ concepts: results });
  } catch (error) {
    console.error('Error generating next concept:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate next concept', details: errorMessage });
  }
}

/**
 * Derive parents - generates prerequisite concepts
 * POST /api/derive-parents
 */
export async function deriveParentsHandler(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, DeriveParentsRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void | Response> {
  try {
    const { concept, seedConcept } = req.body;

    if (!concept || !concept.name) {
      return res.status(400).json({ error: 'Concept is required' });
    }

    const results = await deriveParents(concept, seedConcept);

    res.json({ concepts: results });
  } catch (error) {
    console.error('Error deriving parents:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to derive parents', details: errorMessage });
  }
}

/**
 * Derive summary - generates summary concepts for a layer
 * POST /api/derive-summary
 */
export async function deriveSummaryHandler(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, DeriveSummaryRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void | Response> {
  try {
    const { concepts, seedConcept } = req.body;

    if (!Array.isArray(concepts) || concepts.length === 0) {
      return res.status(400).json({ error: 'Concepts array is required and must not be empty' });
    }

    const results = await deriveSummary(concepts, seedConcept);

    res.json({ concepts: results });
  } catch (error) {
    console.error('Error deriving summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to derive summary', details: errorMessage });
  }
}

export async function explainConcept(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, ExplainConceptRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void | Response> {
  try {
    const { concept, seedConcept, simple, minimal, graphId, stream = false } = req.body;

    if (!concept || !concept.name) {
      return res.status(400).json({ error: 'Concept is required' });
    }

    const uid = req.firebaseUser?.uid;
    const email = req.firebaseUser?.email;

    // Save/update user data if authenticated
    if (uid && email) {
      await upsertUser(uid, email).catch((error) => {
        console.error('Error upserting user:', error);
      });
    }

    let resolvedConcept = concept;
    let resolvedSeedConcept = seedConcept;
    let conceptGraph: ConceptGraph | undefined;
    let learningGoal: LearningGoal | undefined = undefined;

    if (graphId) {
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const graph = await getUserGraphById(uid, graphId);

      if (!graph) {
        return res.status(404).json({ error: 'Graph not found' });
      }

      // Fetch learning goal for this graph
      try {
        const goals = await getGoalsByGraphId(uid, graphId);
        // Use primary goal (first one, or most recent)
        learningGoal = goals.length > 0 ? goals[0] : undefined;
        
        // If no goal found, log warning (existing graphs should have goals)
        if (!learningGoal) {
          console.warn(`No learning goal found for graph ${graphId}. User should create a goal for this graph.`);
          // Continue - operation will handle undefined goal gracefully
        }
      } catch (error) {
        console.error('Error fetching learning goal:', error);
        // Continue without goal - operation will handle gracefully
      }

      // Convert Record<string, Concept> to Map<string, Concept> for ConceptGraph
      const conceptsMap = new Map<string, Concept>();
      Object.values(graph.concepts).forEach(c => {
        conceptsMap.set(c.name, c);
      });
      conceptGraph = { concepts: conceptsMap };

      const storedConcept = findConceptInRecord(graph.concepts, concept);
      resolvedConcept = storedConcept ?? concept;

      if (!resolvedSeedConcept) {
        const seed = getSeedConceptFromRecord(graph.concepts, graph.seedConceptId);
        resolvedSeedConcept = seed ?? undefined;
      }
    }

    // Pass stream option to explain (from request, default false)
    const result = await explain(resolvedConcept, resolvedSeedConcept, {
      stream,
      simple, 
      minimal,
      uid, 
      graph: conceptGraph,
      learningGoal, // Pass fetched goal
    });

    // Extract prompt from result (if attached)
    const operationPrompt = 'prompt' in result ? result.prompt : undefined;

    // Check if result is a stream
    if (result && typeof result === 'object' && 'stream' in result && result.stream) {
      const stream = result.stream as any;
      
      // Use reusable stream handler with prerequisite processing callback
      await handleStreamResponse(stream, req, res, {
        onComplete: (fullContent) => {
          // Process prerequisites using centralized function
          const prerequisites = processPrerequisitesFromLesson(fullContent, resolvedConcept, conceptGraph);
          const streamPrompt = 'prompt' in result ? result.prompt : undefined;
          return { prerequisites, prompt: streamPrompt };
        },
        errorMessage: 'Stream error',
      });
      
      return;
    }

    // Non-streaming response (fallback)
    res.json({ concepts: result, prompt: operationPrompt });
  } catch (error) {
    console.error('Error generating lesson:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate lesson', details: errorMessage });
  }
}

export async function generateFlashCardsHandler(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, GenerateFlashCardsRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void> {
  try {
    const { concept, graphId } = req.body;

    if (!concept || !concept.name) {
      res.status(400).json({ error: 'Concept is required' });
      return;
    }

    const uid = req.firebaseUser?.uid;
    const email = req.firebaseUser?.email;

    // Save/update user data if authenticated
    if (uid && email) {
      await upsertUser(uid, email).catch((error) => {
        console.error('Error upserting user:', error);
      });
    }

    let resolvedConcept = concept;

    if (graphId) {
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const graph = await getUserGraphById(uid, graphId);

      if (!graph) {
        res.status(404).json({ error: 'Graph not found' });
        return;
      }

      const storedConcept = findConceptInRecord(graph.concepts, concept);
      resolvedConcept = storedConcept ?? concept;
    }

    // Check if concept has a lesson
    if (!resolvedConcept.lesson || resolvedConcept.lesson.trim().length === 0) {
      res.status(400).json({ error: 'Concept must have a lesson to generate flash cards' });
      return;
    }

    const result = await generateFlashCards(resolvedConcept);

    res.json({
      concepts: result,
      model: 'gpt-4o-mini', // Default model for flash cards
    });
  } catch (error) {
    console.error('Error generating flash cards:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate flash cards', details: errorMessage });
  }
}

export async function progressiveExpandMultipleFromTextHandler(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, ProgressiveExpandMultipleFromTextRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void | Response> {
  try {
    const { concept, previousLayers, numConcepts = 5, graphId, stream = false } = req.body;

    if (!concept || !concept.name) {
      return res.status(400).json({ error: 'Concept is required' });
    }

    if (!Array.isArray(previousLayers)) {
      return res.status(400).json({ error: 'Previous layers must be an array' });
    }

    const uid = req.firebaseUser?.uid;
    const email = req.firebaseUser?.email;

    // Save/update user data if authenticated
    if (uid && email) {
      await upsertUser(uid, email).catch((error) => {
        console.error('Error upserting user:', error);
      });
    }

    let resolvedConcept = concept;
    let resolvedLayers = previousLayers;
    let previousLayerGoal: string | undefined;
    let learningGoal: LearningGoal | undefined = undefined;

    if (graphId) {
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const graph = await getUserGraphById(uid, graphId);

      if (!graph) {
        return res.status(404).json({ error: 'Graph not found' });
      }

      // Fetch learning goal for this graph
      try {
        const goals = await getGoalsByGraphId(uid, graphId);
        // Use primary goal (first one, or most recent)
        learningGoal = goals.length > 0 ? goals[0] : undefined;
        
        // If no goal found, log warning (existing graphs should have goals)
        if (!learningGoal) {
          console.warn(`No learning goal found for graph ${graphId}. User should create a goal for this graph.`);
          // Continue - operation will handle undefined goal gracefully
        }
      } catch (error) {
        console.error('Error fetching learning goal:', error);
        // Continue without goal - operation will handle gracefully
      }

      resolvedConcept = findConceptInRecord(graph.concepts, concept) ?? concept;
      resolvedLayers = mapConceptsFromRecord(graph.concepts, previousLayers);
      
      // Calculate the previous layer number to fetch its goal
      const mainLayerConcepts = resolvedLayers.filter(c => !c.subLayer);
      const maxPreviousLayer = mainLayerConcepts.length > 0
        ? Math.max(...mainLayerConcepts.map(c => c.layer || 0))
        : resolvedConcept.layer !== undefined
          ? resolvedConcept.layer
          : 0;
      
      // Fetch the previous layer to get its goal
      if (maxPreviousLayer >= 0) {
        const previousLayer = await getLayerByNumber(uid, graphId, maxPreviousLayer);
        if (previousLayer?.goal) {
          previousLayerGoal = previousLayer.goal;
        }
      }

      // Get all concepts from graph for finding existing top-level concepts
      const allConcepts = Object.values(graph.concepts);
      
      var result = await progressiveExpandMultipleFromText(resolvedConcept, resolvedLayers, numConcepts, { 
        uid, 
        stream,
        graphId,
        learningGoal, // Pass fetched goal
        previousLayerGoal,
        allConcepts, // Pass all concepts for finding existing top-level concepts
      });
    } else {
      // No graphId - use empty array for allConcepts
      var result = await progressiveExpandMultipleFromText(resolvedConcept, resolvedLayers, numConcepts, { 
        uid, 
        stream,
        learningGoal: undefined, // No graph, no goal
      });
    }

    // Check if result is a stream
    if (result && typeof result === 'object' && 'stream' in result && result.stream) {
      const stream = result.stream as any;
      const model = result.model || 'deepseek-chat'; // Get model from result
      const operationPrompt = 'prompt' in result ? result.prompt : undefined; // Get prompt from result
      
      // Calculate next layer number based on new structure
      // Count existing top-level concepts (level concepts) to determine next layer number
      let nextLayer: number;
      if (graphId && uid) {
        try {
          const graph = await getUserGraphById(uid, graphId);
          if (graph) {
            const allConcepts = Object.values(graph.concepts);
            const existingTopLevelConcepts = allConcepts.filter(c => 
              c.parents.length === 1 && 
              c.parents[0] === resolvedConcept.name &&
              c.name !== resolvedConcept.name
            );
            nextLayer = existingTopLevelConcepts.length + 1;
          } else {
            // Fallback to old calculation
            const mainLayerConcepts = resolvedLayers.filter(c => !c.subLayer);
            const maxPreviousLayer = mainLayerConcepts.length > 0
              ? Math.max(...mainLayerConcepts.map(c => c.layer || 0))
              : resolvedConcept.layer !== undefined
                ? resolvedConcept.layer
                : 0;
            nextLayer = maxPreviousLayer + 1;
          }
        } catch (error) {
          // Fallback to old calculation
          const mainLayerConcepts = resolvedLayers.filter(c => !c.subLayer);
          const maxPreviousLayer = mainLayerConcepts.length > 0
            ? Math.max(...mainLayerConcepts.map(c => c.layer || 0))
            : resolvedConcept.layer !== undefined
              ? resolvedConcept.layer
              : 0;
          nextLayer = maxPreviousLayer + 1;
        }
      } else {
        // Fallback to old calculation
        const mainLayerConcepts = resolvedLayers.filter(c => !c.subLayer);
        const maxPreviousLayer = mainLayerConcepts.length > 0
          ? Math.max(...mainLayerConcepts.map(c => c.layer || 0))
          : resolvedConcept.layer !== undefined
            ? resolvedConcept.layer
            : 0;
        nextLayer = maxPreviousLayer + 1;
      }
      
      // Use reusable stream handler with onComplete to process final content
      await handleStreamResponse(stream, req, res, {
        onComplete: async (fullContent: string) => {
          try {
            // Always extract goal now (always goal-focused)
            const shouldExtractGoal = true; // Always goal-focused now
            
            // Create level concept structure (same as non-streaming path)
            let allConceptsForLevel: Concept[] = [];
            if (graphId && uid) {
              try {
                const graph = await getUserGraphById(uid, graphId);
                if (graph) {
                  allConceptsForLevel = Object.values(graph.concepts);
                }
              } catch (error) {
                console.warn('Could not fetch graph for level concept creation:', error);
              }
            }
            
            // If no graph concepts, use resolvedLayers
            if (allConceptsForLevel.length === 0) {
              allConceptsForLevel = [...resolvedLayers, resolvedConcept];
            }
            
            // Find existing top-level concepts
            const existingTopLevelConcepts = allConceptsForLevel.filter(c => 
              c.parents.length === 1 && 
              c.parents[0] === resolvedConcept.name &&
              c.name !== resolvedConcept.name
            );
            
            // Calculate next sequence number
            const maxSequence = existingTopLevelConcepts.length > 0
              ? Math.max(...existingTopLevelConcepts.map(c => c.sequence ?? 0))
              : 0;
            const nextSequence = maxSequence + 1;
            
            // Extract level name from LLM response first (before processing)
            // This avoids calling processProgressiveExpandContent twice
            let levelName: string | undefined;
            const levelNameMatch = fullContent.match(/<level-name>([\s\S]*?)<\/level-name>/i);
            levelName = levelNameMatch ? levelNameMatch[1].trim() : undefined;
            
            // Get level name from LLM response (suggested by the LLM)
            // If LLM didn't suggest a name, fall back to a default
            levelName = levelName || `Level ${existingTopLevelConcepts.length + 1}`;
            levelName = levelName.trim();
            if (!levelName || levelName.length === 0) {
              levelName = `Level ${existingTopLevelConcepts.length + 1}`;
            }
            
            // Process with final level name and sequence (only called once now)
            const processed = processProgressiveExpandContent(
              fullContent,
              resolvedConcept,
              resolvedLayers,
              nextLayer,
              shouldExtractGoal,
              existingTopLevelConcepts,
              allConceptsForLevel,
              levelName,
              nextSequence
            );
            
            // processed.concepts now contains only new concepts with:
            // - seedConcept and existing top-level concepts removed from parents
            // - level concept already added as first parent
            // processed.levelConcept contains the created level concept
            // processed.updatedSeedConcept contains the updated seedConcept if it was modified
            const updatedLayerConcepts = processed.concepts;
            
            // Combine level concept and layer concepts
            // Include updated seedConcept if it was modified (frontend will save it)
            const allReturnedConcepts = [processed.levelConcept, ...updatedLayerConcepts];
            if (processed.updatedSeedConcept) {
              allReturnedConcepts.push(processed.updatedSeedConcept);
            }
            
            // Track milestone progress: When generating a new layer, mark the PREVIOUS milestone as completed
            // Each top-level concept corresponds to a milestone
            if (graphId && uid && learningGoal && processed.levelConcept) {
              // Count existing top-level concepts (before this new one)
              // Mark the PREVIOUS milestone (existingTopLevelConcepts.length - 1)
              // If this is the first layer (0 existing), there's no previous milestone to mark
              if (existingTopLevelConcepts.length > 0) {
                const previousMilestoneIndex = existingTopLevelConcepts.length - 1;
                
                // Mark the previous milestone as completed
                await markMilestoneCompleted(uid, graphId, previousMilestoneIndex).catch(error => {
                  // Log error but don't fail the operation
                  console.error('Failed to mark milestone as completed:', error);
                });
              }
            }
            
            // Return concepts (including level concept) and model
            // Note: We no longer return layer data - level concepts are stored in the graph
            return { 
              concepts: allReturnedConcepts, 
              model,
              prompt: operationPrompt, // Use prompt from operation result
            };
          } catch (error) {
            console.error('Error processing streamed content:', error);
            return { error: 'Failed to process concepts' };
          }
        },
        errorMessage: 'Stream error',
      });
      
      return;
    }

    // Non-streaming response (fallback)
    // The operation already includes updated seedConcept in the returned concepts
    // Frontend will handle saving all concepts including the updated seedConcept
    if ('concepts' in result && Array.isArray(result.concepts) && result.concepts.length > 0) {
      // Track milestone progress: Check if a new top-level concept was generated
      if (graphId && uid && learningGoal) {
        try {
          // Get current graph to count existing top-level concepts
          const graph = await getUserGraphById(uid, graphId);
          if (graph) {
            const allConcepts = Object.values(graph.concepts);
            const existingTopLevelConcepts = allConcepts.filter(c => 
              c.parents.length === 1 && 
              c.parents[0] === resolvedConcept.name &&
              c.name !== resolvedConcept.name
            );
            
            // Check if any of the returned concepts is a new top-level concept
            const newTopLevelConcepts = result.concepts.filter(c => 
              c.parents.length === 1 && 
              c.parents[0] === resolvedConcept.name &&
              c.name !== resolvedConcept.name &&
              !existingTopLevelConcepts.some(existing => existing.name === c.name || existing.id === c.id)
            );
            
            // If a new top-level concept was created, mark the PREVIOUS milestone as completed
            if (newTopLevelConcepts.length > 0) {
              // Count existing top-level concepts (before this new one)
              // Mark the PREVIOUS milestone (existingTopLevelConcepts.length - 1)
              // If this is the first layer (0 existing), there's no previous milestone to mark
              if (existingTopLevelConcepts.length > 0) {
                const previousMilestoneIndex = existingTopLevelConcepts.length - 1;
                
                // Mark the previous milestone as completed
                await markMilestoneCompleted(uid, graphId, previousMilestoneIndex).catch(error => {
                  // Log error but don't fail the operation
                  console.error('Failed to mark milestone as completed:', error);
                });
              }
            }
          }
        } catch (error) {
          // Log error but don't fail the operation
          console.error('Error tracking milestone progress:', error);
        }
      }
      
      // Return concepts and model
      // Note: We no longer return layer data - level concepts are stored in the graph
      // The updated seedConcept is already included in result.concepts by the operation
      res.json({ 
        concepts: result.concepts,
        model: result.model,
        prompt: result.prompt, // Include prompt from operation
      });
    } else {
      res.status(500).json({ error: 'Unexpected response format' });
    }
  } catch (error) {
    console.error('Error generating layer from text:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate layer from text', details: errorMessage });
  }
}

export async function generateLayerPracticeHandler(
  req: Request<{}, GenerateLayerPracticeResponse | ErrorResponse, GenerateLayerPracticeRequest>,
  res: Response<GenerateLayerPracticeResponse | ErrorResponse>
): Promise<void> {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { concepts, layerGoal, layerNumber, graphId } = req.body;

    if (!concepts || !Array.isArray(concepts) || concepts.length === 0) {
      res.status(400).json({ error: 'concepts array is required and must not be empty' });
      return;
    }

    if (!layerGoal || typeof layerGoal !== 'string') {
      res.status(400).json({ error: 'layerGoal is required and must be a string' });
      return;
    }

    if (typeof layerNumber !== 'number' || layerNumber < 0) {
      res.status(400).json({ error: 'layerNumber is required and must be a non-negative number' });
      return;
    }

    // Get graph and seed concept if graphId is provided
    let seedConcept: Concept | undefined;
    let graphDifficulty: GraphDifficulty | undefined;
    let graphFocus: string | undefined;

    if (graphId) {
      try {
        const graph = await getUserGraphById(uid, graphId);
        if (graph) {
          graphDifficulty = graph.difficulty;
          graphFocus = graph.focus;
          
          // Get seed concept from graph
          if (graph.seedConceptId && graph.concepts) {
            seedConcept = getSeedConceptFromRecord(graph.concepts, graph.seedConceptId) ?? undefined;
          }
        }
      } catch (error) {
        console.error('Error fetching graph for layer practice:', error);
        // Continue without seed concept if graph fetch fails
      }
    }

    const result = await generateLayerPractice(concepts, layerGoal, layerNumber, {
      uid,
      stream: true, // Always stream for practice generation
      seedConcept,
      difficulty: graphDifficulty,
      focus: graphFocus,
    });

    // Check if result is a stream
    if (result && typeof result === 'object' && 'stream' in result && result.stream) {
      const stream = result.stream as any;
      const model = result.model || 'deepseek-chat';
      
      // Use reusable stream handler with onComplete to save the review
      await handleStreamResponse(stream, req, res, {
        onComplete: (fullContent: string) => {
          try {
            // Create practice item from the review content
            const reviewItems: PracticeItem[] = [{
              type: 'project',
              question: fullContent.trim(),
              answer: '', // No answer needed for review
            }];

            // Save review to the layer if graphId is provided
            if (graphId && reviewItems.length > 0) {
              getLayerByNumber(uid, graphId, layerNumber)
                .then(async (existingLayer) => {
                  await saveLayer(uid, graphId, {
                    layerNumber,
                    prompt: existingLayer?.prompt || '',
                    response: existingLayer?.response || '',
                    goal: existingLayer?.goal || layerGoal,
                    conceptIds: existingLayer?.conceptIds || concepts.map(c => c.id || c.name),
                    practiceExercises: reviewItems,
                  });
                  console.log(`Successfully saved review to layer ${layerNumber}`);
                })
                .catch((error) => {
                  console.error('Failed to save review to layer:', error);
                });
            }

            // Return items and model in the final event
            return { 
              items: reviewItems,
              model,
            };
          } catch (error) {
            console.error('Error processing streamed review:', error);
            return { error: 'Failed to process review' };
          }
        },
        errorMessage: 'Stream error',
      });
      
      return;
    }

    // Non-streaming response (fallback)
    // Save practice exercises to the layer if graphId is provided
    if (graphId && result.items && result.items.length > 0) {
      try {
        // Get existing layer or create new one
        const existingLayer = await getLayerByNumber(uid, graphId, layerNumber);
        
        console.log(`Saving practice exercises to layer ${layerNumber} for graph ${graphId}`, {
          itemsCount: result.items.length,
          hasExistingLayer: !!existingLayer,
        });
        
        await saveLayer(uid, graphId, {
          layerNumber,
          prompt: existingLayer?.prompt || '',
          response: existingLayer?.response || '',
          goal: existingLayer?.goal || layerGoal,
          conceptIds: existingLayer?.conceptIds || concepts.map(c => c.id || c.name),
          practiceExercises: result.items,
        });
        
        console.log(`Successfully saved practice exercises to layer ${layerNumber}`);
      } catch (error) {
        console.error('Failed to save practice exercises to layer:', error);
        // Continue even if saving fails
      }
    } else {
      console.log('Skipping save: graphId or items missing', {
        hasGraphId: !!graphId,
        itemsCount: result.items?.length || 0,
      });
    }

    res.json({
      items: result.items,
      model: result.model,
    });
  } catch (error) {
    console.error('Error generating layer practice:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate layer practice', details: errorMessage });
  }
}

export async function answerQuestionHandler(
  req: Request<{}, AnswerQuestionResponse | ErrorResponse, AnswerQuestionRequest>,
  res: Response<AnswerQuestionResponse | ErrorResponse>
): Promise<void> {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { conceptGraphId, conceptId, question, selectedText } = req.body;

    if (!conceptGraphId || typeof conceptGraphId !== 'string') {
      res.status(400).json({ error: 'conceptGraphId is required and must be a string' });
      return;
    }

    if (!conceptId || typeof conceptId !== 'string') {
      res.status(400).json({ error: 'conceptId is required and must be a string' });
      return;
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({ error: 'question is required and must be a non-empty string' });
      return;
    }

    // Get graph to access difficulty and concept
    const graph = await getUserGraphById(uid, conceptGraphId);
    if (!graph) {
      res.status(404).json({ error: 'Graph not found' });
      return;
    }

    // Find the concept
    const concept = Object.values(graph.concepts || {}).find(
      c => c.id === conceptId || c.name === conceptId
    );

    if (!concept) {
      res.status(404).json({ error: 'Concept not found' });
      return;
    }

    // Get difficulty from graph
    const difficulty = graph.difficulty || 'intermediate';

    // Check if client wants streaming (check for Accept header or query param)
    const wantsStream = req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';

    // Call answerQuestion operation
    const result = await answerQuestion(concept, {
      conceptGraphId,
      conceptId,
      question: selectedText ? `${question}\n\nSelected text: "${selectedText}"` : question,
      difficulty,
      uid,
      stream: wantsStream,
    });

    // Check if result is a stream
    if (result && typeof result === 'object' && 'stream' in result && result.stream) {
      const stream = result.stream as any;
      
      // Use reusable stream handler
      await handleStreamResponse(stream, req, res, {
        onComplete: (fullContent) => {
          return { answer: fullContent, model: result.model };
        },
        errorMessage: 'Stream error',
      });
      
      return;
    }

    // Non-streaming response
    res.json(result);
  } catch (error) {
    console.error('Error answering question:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to answer question', details: errorMessage });
  }
}

/**
 * Custom operation - performs user-prompted modifications to the concept graph
 * POST /api/custom-operation
 */
export async function customOperationHandler(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, CustomOperationRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void | Response> {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { concepts, prompt, seedConcept, graph, details, stream = false } = req.body;

    if (!concepts || !Array.isArray(concepts) || concepts.length === 0) {
      return res.status(400).json({ error: 'Concepts array is required and must not be empty' });
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required and must be a non-empty string' });
    }

    // Build graph from request if provided
    let conceptGraph: ConceptGraph | undefined;
    if (graph && graph.concepts) {
      // Convert Record<string, Concept> to Map<string, Concept>
      const conceptsMap = new Map<string, Concept>();
      Object.values(graph.concepts).forEach(c => {
        conceptsMap.set(c.name, c);
      });
      conceptGraph = { concepts: conceptsMap };
    }

    // Call customOperation
    const result = await customOperation(concepts, prompt, {
      seedConcept,
      graph: conceptGraph,
      details,
      stream,
      uid,
    });

    // Extract prompt from result (if attached)
    const operationPrompt = 'prompt' in result ? result.prompt : undefined;

    // Check if result is a stream
    if (result && typeof result === 'object' && 'stream' in result && result.stream) {
      const stream = result.stream as any;
      const model = (result as any).model || 'deepseek-chat';
      
      await handleStreamResponse(stream, req, res, {
        onComplete: (fullContent: string) => {
          try {
            // Parse the JSON array from the streamed content
            const { extractJSONArray } = require('../services/llm');
            const results = extractJSONArray(fullContent);
            
            // Separate deletions from additions/updates
            const additionsAndUpdates = results.filter((c: any) => !c.delete);
            const deletions = results.filter((c: any) => c.delete === true).map((c: any) => {
              const { delete: _, ...concept } = c;
              return concept;
            });
            
            return {
              concepts: additionsAndUpdates,
              deletions: deletions.length > 0 ? deletions : undefined,
              model,
              prompt: operationPrompt,
            };
          } catch (error) {
            throw new Error(`Failed to parse streamed response: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        },
        errorMessage: 'Stream error',
      });
      
      return;
    }

    // Non-streaming response
    const results = result as Concept[];
    
    // Separate deletions from additions/updates
    const additionsAndUpdates = results.filter((c: any) => !c.delete);
    const deletions = results.filter((c: any) => c.delete === true).map((c: any) => {
      const { delete: _, ...concept } = c;
      return concept;
    });

    res.json({ 
      concepts: additionsAndUpdates,
      deletions: deletions.length > 0 ? deletions : undefined,
      prompt: operationPrompt,
    });
  } catch (error) {
    console.error('Error performing custom operation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to perform custom operation', details: errorMessage });
  }
}

/**
 * Synthesize concepts - generates hybrid concepts combining multiple parents
 * POST /api/synthesize
 */
export async function synthesizeHandler(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, SynthesizeRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void | Response> {
  try {
    const { parents, seedConcept } = req.body;

    if (!Array.isArray(parents) || parents.length === 0) {
      return res.status(400).json({ error: 'Parents array is required and must not be empty' });
    }

    const results = await synthesize(parents, seedConcept);

    res.json({ concepts: results });
  } catch (error) {
    console.error('Error synthesizing concepts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to synthesize concepts', details: errorMessage });
  }
}

/**
 * Explore concept - generates related concepts (lateral exploration)
 * POST /api/explore
 */
export async function exploreHandler(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, ExploreRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void | Response> {
  try {
    const { concept, diversity = 'high', seedConcept } = req.body;

    if (!concept || !concept.name) {
      return res.status(400).json({ error: 'Concept is required' });
    }

    const results = await explore(concept, diversity, seedConcept);

    res.json({ concepts: results });
  } catch (error) {
    console.error('Error exploring concept:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to explore concept', details: errorMessage });
  }
}

/**
 * Trace path - generates an ordered learning path between two concepts
 * POST /api/trace-path
 */
export async function tracePathHandler(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, TracePathRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void | Response> {
  try {
    const { start, end, seedConcept } = req.body;

    if (!start || !start.name) {
      return res.status(400).json({ error: 'Start concept is required' });
    }

    if (!end || !end.name) {
      return res.status(400).json({ error: 'End concept is required' });
    }

    const results = await tracePath(start, end, seedConcept);

    res.json({ concepts: results });
  } catch (error) {
    console.error('Error tracing path:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to trace path', details: errorMessage });
  }
}

/**
 * Progressive expand single - generates one sub-layer under a specific concept
 * POST /api/progressive-expand-single
 */
export async function progressiveExpandSingleHandler(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, ProgressiveExpandSingleRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void | Response> {
  try {
    const { seedConcept, conceptToExpand, previousSubLayers, graph } = req.body;

    if (!seedConcept || !seedConcept.name) {
      return res.status(400).json({ error: 'Seed concept is required' });
    }

    if (!conceptToExpand || !conceptToExpand.name) {
      return res.status(400).json({ error: 'Concept to expand is required' });
    }

    if (!Array.isArray(previousSubLayers)) {
      return res.status(400).json({ error: 'Previous sub-layers must be an array' });
    }

    // Build graph from request if provided
    let conceptGraph: ConceptGraph | undefined;
    if (graph && graph.concepts) {
      const conceptsMap = new Map<string, Concept>();
      Object.values(graph.concepts).forEach(c => {
        conceptsMap.set(c.name, c);
      });
      conceptGraph = { concepts: conceptsMap };
    }

    const results = await progressiveExpandSingle(seedConcept, conceptToExpand, previousSubLayers, conceptGraph);

    res.json({ concepts: results });
  } catch (error) {
    console.error('Error in progressive expand single:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to progressive expand single', details: errorMessage });
  }
}

/**
 * Progressive explore - generates additional related concepts within the same layer
 * POST /api/progressive-explore
 */
export async function progressiveExploreHandler(
  req: Request<{}, ConceptOperationResponse | ErrorResponse, ProgressiveExploreRequest>,
  res: Response<ConceptOperationResponse | ErrorResponse>
): Promise<void | Response> {
  try {
    const { concept, seedConcept, previousLayer, currentLayer, nextLayer } = req.body;

    if (!concept || !concept.name) {
      return res.status(400).json({ error: 'Concept is required' });
    }

    if (!seedConcept || !seedConcept.name) {
      return res.status(400).json({ error: 'Seed concept is required' });
    }

    if (!Array.isArray(previousLayer)) {
      return res.status(400).json({ error: 'Previous layer must be an array' });
    }

    if (!Array.isArray(currentLayer)) {
      return res.status(400).json({ error: 'Current layer must be an array' });
    }

    if (!Array.isArray(nextLayer)) {
      return res.status(400).json({ error: 'Next layer must be an array' });
    }

    const results = await progressiveExplore(concept, seedConcept, previousLayer, currentLayer, nextLayer);

    res.json({ concepts: results });
  } catch (error) {
    console.error('Error in progressive explore:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to progressive explore', details: errorMessage });
  }
}

