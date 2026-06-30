import { Request, Response } from 'express';
import { extractJSONArray } from '../services/llm';
import {
  HealthResponse,
  ExpandConceptRequest,
  GenerateNextLayerRequest,
  GenerateNextConceptRequest,
  DeriveParentsRequest,
  DeriveSummaryRequest,
  ConceptOperationResponse,
  ErrorResponse,
} from '../types';
import { expand, progressiveExpandMultiple, advanceNextMultiple, deriveParents, deriveSummary, explain, generateLayerPractice, PracticeItem, answerQuestion, customOperation, synthesize, explore, tracePath, progressiveExplore, generateFlashCards, runCodeSimulation, generateInteractiveOrbital, type ExplainStreamResult } from '../operations';
import { createGraph, addConceptsToGraph } from '../utils/graph';
import { ConceptGraph, Concept, GraphDifficulty } from '../types/concept';
import { ExplainConceptRequest, GenerateLayerPracticeRequest, GenerateLayerPracticeResponse, AnswerQuestionRequest, AnswerQuestionResponse, CustomOperationRequest, SynthesizeRequest, ExploreRequest, TracePathRequest, ProgressiveExploreRequest, GenerateFlashCardsRequest, RunCodeSimulationRequest, RunCodeSimulationResponse, GenerateInteractiveOrbitalRequest, GenerateInteractiveOrbitalResponse } from '../types';
import { GenerateLayerPracticeResult, GenerateLayerPracticeStreamResult } from '../operations/generateLayerPractice';
import { getUserGraphById } from '../services/graphService';
import { upsertUser } from '../services/userService';
import { saveLayer, getLayerByNumber } from '../services/layerService';
import { processPrerequisitesFromLesson } from '../utils/prerequisites';
import { setupSSE, sendSSEEvent, sendSSEDone, closeSSE } from '@almadar/server';
type StreamChunk = { choices?: Array<{ delta?: { content?: string } }>; content?: string };

async function streamToSSE<T extends object>(
  stream: AsyncIterable<StreamChunk>,
  req: import('express').Request,
  res: import('express').Response,
  options: {
    onComplete?: (fullContent: string) => T | Promise<T> | undefined;
    errorMessage?: string;
  }
): Promise<string> {
  const { onComplete, errorMessage = 'Stream error' } = options;
  setupSSE(res);
  let fullContent = '';
  let clientDisconnected = false;
  const cleanup = () => { clientDisconnected = true; if (!res.writableEnded) res.end(); };
  req.on('close', cleanup);
  req.on('aborted', cleanup);
  try {
    for await (const chunk of stream) {
      if (clientDisconnected) break;
      const content = chunk.choices?.[0]?.delta?.content ?? chunk.content ?? '';
      if (content) {
        fullContent += content;
        if (!clientDisconnected && !res.writableEnded) {
          try { sendSSEEvent(res, { type: 'message', data: { content }, timestamp: Date.now() }); }
          catch { clientDisconnected = true; break; }
        }
      }
    }
    if (!clientDisconnected && !res.writableEnded) {
      const additionalData = onComplete ? await onComplete(fullContent) : undefined;
      sendSSEEvent(res, { type: 'complete', data: { content: '', ...additionalData }, timestamp: Date.now() });
      sendSSEDone(res);
    }
  } catch (streamError) {
    if (!clientDisconnected && !res.writableEnded) {
      try { sendSSEEvent(res, { type: 'error', data: { error: errorMessage }, timestamp: Date.now() }); }
      catch { /* client gone */ }
    }
  } finally {
    req.removeListener('close', cleanup);
    req.removeListener('aborted', cleanup);
    if (!res.writableEnded) closeSSE(res);
  }
  return fullContent;
}
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
      const streamResult = result as ExplainStreamResult;
      await streamToSSE(streamResult.stream, req, res, {
        onComplete: (fullContent) => {
          const prerequisites = processPrerequisitesFromLesson(fullContent, resolvedConcept, conceptGraph);
          return { prerequisites, prompt: streamResult.prompt };
        },
        errorMessage: 'Stream error',
      });
      
      return;
    }

    // Non-streaming response (fallback) — result is OperationResult here (stream branch returned above)
    res.json({ concepts: result as import('../types').OperationResult, prompt: operationPrompt });
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


export async function runCodeSimulationHandler(
  req: Request<{}, RunCodeSimulationResponse | ErrorResponse, RunCodeSimulationRequest>,
  res: Response<RunCodeSimulationResponse | ErrorResponse>
): Promise<void> {
  try {
    const { language, code, testCases } = req.body;

    if (!language || typeof language !== 'string') {
      res.status(400).json({ error: 'language is required and must be a string' });
      return;
    }

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'code is required and must be a string' });
      return;
    }

    const uid = req.firebaseUser?.uid;
    const email = req.firebaseUser?.email;

    if (uid && email) {
      await upsertUser(uid, email).catch((error) => {
        console.error('Error upserting user:', error);
      });
    }

    const result = await runCodeSimulation(
      { language, code, testCases },
      { uid },
    );

    res.json(result);
  } catch (error) {
    console.error('Error running code simulation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to run code simulation', details: errorMessage });
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
      const streamResult = result as GenerateLayerPracticeStreamResult;
      const stream = streamResult.stream as AsyncIterable<StreamChunk>;
      const model = streamResult.model || 'deepseek-chat';
      
      // Use reusable stream handler with onComplete to save the review
      await streamToSSE(stream, req, res, {
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
    const practiceResult = result as GenerateLayerPracticeResult;
    // Save practice exercises to the layer if graphId is provided
    if (graphId && practiceResult.items && practiceResult.items.length > 0) {
      try {
        // Get existing layer or create new one
        const existingLayer = await getLayerByNumber(uid, graphId, layerNumber);
        
        console.log(`Saving practice exercises to layer ${layerNumber} for graph ${graphId}`, {
          itemsCount: practiceResult.items.length,
          hasExistingLayer: !!existingLayer,
        });
        
        await saveLayer(uid, graphId, {
          layerNumber,
          prompt: existingLayer?.prompt || '',
          response: existingLayer?.response || '',
          goal: existingLayer?.goal || layerGoal,
          conceptIds: existingLayer?.conceptIds || concepts.map(c => c.id || c.name),
          practiceExercises: practiceResult.items,
        });
        
        console.log(`Successfully saved practice exercises to layer ${layerNumber}`);
      } catch (error) {
        console.error('Failed to save practice exercises to layer:', error);
        // Continue even if saving fails
      }
    } else {
      console.log('Skipping save: graphId or items missing', {
        hasGraphId: !!graphId,
        itemsCount: practiceResult.items?.length || 0,
      });
    }

    res.json({
      items: practiceResult.items,
      model: practiceResult.model,
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
      const stream = result.stream as AsyncIterable<StreamChunk>;
      
      // Use reusable stream handler
      await streamToSSE(stream, req, res, {
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
      const stream = result.stream as AsyncIterable<StreamChunk>;
      const model = (result as { model?: string }).model || 'deepseek-chat';
      
      await streamToSSE(stream, req, res, {
        onComplete: (fullContent: string) => {
          try {
            // Parse the JSON array from the streamed content
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

export async function generateInteractiveOrbitalHandler(
  req: Request<{}, GenerateInteractiveOrbitalResponse | ErrorResponse, GenerateInteractiveOrbitalRequest>,
  res: Response<GenerateInteractiveOrbitalResponse | ErrorResponse>
): Promise<void> {
  try {
    const { type, concept, markerDescription } = req.body;

    const validTypes = ['chart', 'simulation', 'math', 'physics', 'biology', 'chemistry', 'probability'] as const;
    if (!type || !validTypes.includes(type)) {
      res.status(400).json({ error: 'type is required and must be one of: chart, simulation, math, physics, biology, chemistry, probability' });
      return;
    }

    if (!concept || !concept.name) {
      res.status(400).json({ error: 'concept with a name is required' });
      return;
    }

    if (!markerDescription || typeof markerDescription !== 'string') {
      res.status(400).json({ error: 'markerDescription is required and must be a string' });
      return;
    }

    const uid = req.firebaseUser?.uid;
    const email = req.firebaseUser?.email;

    if (uid && email) {
      await upsertUser(uid, email).catch((error) => {
        console.error('Error upserting user:', error);
      });
    }

    const schema = await generateInteractiveOrbital({ type, concept, markerDescription });

    res.json({ schema });
  } catch (error) {
    console.error('Error generating interactive orbital:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate interactive orbital', details: errorMessage });
  }
}

