import { useCallback } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { addConcepts, updateConcept, removeConcept, ConceptDiff } from '../mentorSlice';
import { MentorAPI } from '../mentorApi';
import { Concept } from '../types';
import { buildGraphRecord, ensureSequenceForGraph } from '../../concepts/utils/graphHelpers';
import { store } from '../../../app/store';

interface UseMentorOperationsOptions {
  graphId: string;
  concepts: Concept[];
  seedConcept?: Concept;
}

export type OperationType =
  | 'expand'
  | 'synthesize'
  | 'explore'
  | 'tracePath'
  | 'progressiveExpandSingle'
  | 'progressiveExplore'
  | 'progressiveExpandMultipleFromText'
  | 'deriveParents'
  | 'deriveSummary'
  | 'explain'
  | 'generateNextConcept'
  | 'generateFlashCards'
  | 'custom';

export interface OperationResult {
  addedConcepts: Concept[];
  diff: ConceptDiff | null;
  prompt?: string; // The prompt used to generate this operation
}

export const useMentorOperations = ({
  graphId,
  concepts,
  seedConcept,
}: UseMentorOperationsOptions) => {
  const dispatch = useAppDispatch();

  const executeOperation = useCallback(
    async (
      operation: OperationType,
      concept: Concept | Concept[],
      ...args: any[]
    ): Promise<OperationResult> => {
      // Extract streaming callback if provided as last argument
      const lastArg = args[args.length - 1];
      const onStream = typeof lastArg === 'function' ? lastArg : undefined;
      const actualArgs = typeof lastArg === 'function' ? args.slice(0, -1) : args;
      const graphRecord = buildGraphRecord(concepts);
      const graph = { concepts: graphRecord };
      let addedConcepts: Concept[] = [];
      let operationPrompt: string | undefined;

      try {
        switch (operation) {
          case 'expand': {
            const singleConcept = Array.isArray(concept) ? concept[0] : concept;
            const expandResponse = await MentorAPI.expandConcept({
              concept: singleConcept,
              graph,
            });
            addedConcepts = expandResponse.concepts;
            dispatch(addConcepts({ concepts: addedConcepts }));
            break;
          }

          case 'synthesize': {
            const parents = Array.isArray(concept) ? concept : [concept];
            const synthesizeResponse = await MentorAPI.synthesizeConcepts({
              parents,
              seedConcept,
            });
            addedConcepts = synthesizeResponse.concepts;
            dispatch(addConcepts({ concepts: addedConcepts }));
            break;
          }

          case 'explore': {
            const exploreConcept = Array.isArray(concept) ? concept[0] : concept;
            const exploreResponse = await MentorAPI.exploreConcept({
              concept: exploreConcept,
              diversity: 'high',
              seedConcept,
            });
            addedConcepts = exploreResponse.concepts;
            dispatch(addConcepts({ concepts: addedConcepts }));
            break;
          }

          case 'tracePath': {
            // tracePath can be called with:
            // 1. concept as array [start, end]
            // 2. concept as start, args[0] as end
            // 3. args[0] as start, args[1] as end (from GraphOperationButtons)
            let start: Concept;
            let end: Concept;
            
            if (Array.isArray(concept) && concept.length >= 2) {
              [start, end] = concept;
            } else if (args[0] && args[1]) {
              // Both start and end passed as args
              start = args[0];
              end = args[1];
            } else if (args[0]) {
              // Start is concept, end is in args
              start = Array.isArray(concept) ? concept[0] : concept;
              end = args[0];
            } else {
              throw new Error('Both start and end concepts required for tracePath');
            }
            
            if (!start || !end) {
              throw new Error('Both start and end concepts required for tracePath');
            }
            
            const traceResponse = await MentorAPI.tracePath({
              start,
              end,
              seedConcept,
            });
            addedConcepts = traceResponse.concepts;
            dispatch(addConcepts({ concepts: addedConcepts }));
            break;
          }

          case 'progressiveExpandSingle': {
            const conceptToExpand = Array.isArray(concept) ? concept[0] : concept;
            if (!seedConcept) throw new Error('Seed concept required for progressiveExpandSingle');
            
            // Find previous sub-layers under the same parent
            const previousSubLayers = concepts.filter(c => {
              // Same parent concepts
              const sameParents = c.parents.length > 0 && 
                conceptToExpand.parents.length > 0 &&
                c.parents.some(p => conceptToExpand.parents.includes(p));
              // Has a subLayer property (indicating it's a sub-layer)
              const hasSubLayer = c.subLayer !== undefined;
              // Same main layer
              const sameLayer = c.layer === conceptToExpand.layer;
              return sameParents && hasSubLayer && sameLayer;
            });

            const progressiveExpandResponse = await MentorAPI.progressiveExpandSingle({
              seedConcept,
              conceptToExpand,
              previousSubLayers,
              graph,
            });
            addedConcepts = progressiveExpandResponse.concepts;
            dispatch(addConcepts({ concepts: addedConcepts }));
            break;
          }

          case 'progressiveExplore': {
            // For layer operations, concept is an array of all concepts in the layer
            const layerConcepts = Array.isArray(concept) ? concept : [concept];
            if (layerConcepts.length === 0) throw new Error('No concepts provided for progressiveExplore');
            if (!seedConcept) throw new Error('Seed concept required for progressiveExplore');
            
            // Use the first concept in the layer as the reference concept
            const exploreConcept = layerConcepts[0];
            const targetLayer = exploreConcept.layer || 1;
            const previousLayerNum = targetLayer - 1;
            const nextLayerNum = targetLayer + 1;

            // Find concepts in adjacent layers
            const previousLayer = concepts.filter(c => c.layer === previousLayerNum);
            const currentLayer = concepts.filter(c => c.layer === targetLayer && !layerConcepts.some(lc => lc.id === c.id || lc.name === c.name));
            const nextLayer = concepts.filter(c => c.layer === nextLayerNum);

            const progressiveExploreResponse = await MentorAPI.progressiveExplore({
              concept: exploreConcept,
              seedConcept,
              previousLayer,
              currentLayer,
              nextLayer,
            });
            addedConcepts = progressiveExploreResponse.concepts;
            dispatch(addConcepts({ concepts: addedConcepts }));
            break;
          }

          case 'progressiveExpandMultipleFromText': {
            // For layer operations, concept is an array of all concepts in the layer
            const layerConcepts = Array.isArray(concept) ? concept : [concept];
            if (layerConcepts.length === 0) throw new Error('No concepts provided for progressiveExpandMultipleFromText');
            if (!seedConcept) throw new Error('Seed concept required for progressiveExpandMultipleFromText');
            
            // Use the seed concept or first concept in the layer
            const expandConcept = seedConcept || layerConcepts[0];
            
            // Get ALL previous layers using the new level concept structure
            // In the new structure: level concepts are top-level (seedConcept as sole parent)
            // previousLayers = all existing top-level concepts (level concepts) + all concepts within those levels
            const levelConcepts = concepts.filter(c => 
              c.parents.length === 1 && 
              c.parents[0] === seedConcept.name &&
              c.name !== seedConcept.name
            );
            
            let previousLayers: Concept[];
            
            if (levelConcepts.length > 0) {
              // Get all concepts from previous levels (level concepts + all their child concepts)
              previousLayers = [];
              levelConcepts.forEach(levelConcept => {
                // Add the level concept itself
                previousLayers.push(levelConcept);
                // Add all concepts that belong to this level (have this level concept as a parent)
                const levelConceptsList = concepts.filter(c => 
                  c.parents.includes(levelConcept.name) && 
                  c.name !== levelConcept.name &&
                  c.name !== seedConcept.name
                );
                previousLayers.push(...levelConceptsList);
              });
            } else {
              // Fallback: if no level concepts found, use old layer-based approach for backward compatibility
              // This handles unmigrated graphs that still use the layer property
              previousLayers = concepts.filter(c => 
                c.layer !== undefined && 
                c.layer >= 0
              );
            }
            
            // Use goalFocused from graph if available, default to true
            const goalFocused = true; // Default to true for mentor mode
            
            const progressiveExpandResponse = await MentorAPI.progressiveExpandMultipleFromText({
              concept: expandConcept,
              previousLayers,
              numConcepts: 10,
              graphId,
              goalFocused,
              stream: !!onStream, // Enable streaming if callback provided
            }, onStream);
            
            // Use layer data from backend response
            addedConcepts = progressiveExpandResponse.concepts;
            dispatch(addConcepts({ 
              concepts: addedConcepts,
              model: progressiveExpandResponse.model,
            }));
            operationPrompt = progressiveExpandResponse.prompt;
            break;
          }

          case 'deriveParents': {
            const parentConcept = Array.isArray(concept) ? concept[0] : concept;
            const parentsResponse = await MentorAPI.deriveParents({
              concept: parentConcept,
              seedConcept,
            });
            addedConcepts = parentsResponse.concepts;
            dispatch(addConcepts({ concepts: addedConcepts }));
            break;
          }

          case 'deriveSummary': {
            // For layer operations, concept is an array of all concepts in the layer
            const layerConcepts = Array.isArray(concept) ? concept : [concept];
            if (layerConcepts.length === 0) throw new Error('No concepts provided for deriveSummary');
            
            const summaryResponse = await MentorAPI.deriveSummary({
              concepts: layerConcepts,
              seedConcept,
            });
            addedConcepts = summaryResponse.concepts;
            dispatch(addConcepts({ concepts: addedConcepts }));
            break;
          }

          case 'explain': {
            const explainConcept = Array.isArray(concept) ? concept[0] : concept;
            const simple = actualArgs[0] as boolean | undefined;
            const explainResponse = await MentorAPI.explainConcept({
              concept: explainConcept,
              seedConcept,
              graphId,
              simple,
              stream: !!onStream, // Enable streaming if callback provided
            }, onStream);
            // Explain updates the concept, doesn't add new ones
            dispatch(updateConcept(explainResponse.concepts[0]));
            addedConcepts = []; // No new concepts added
            operationPrompt = explainResponse.prompt;
            break;
          }

                      case 'generateNextConcept': {
                        const nextConcept = Array.isArray(concept) ? concept[0] : concept;
                        const graphRecord = buildGraphRecord(concepts);
                        const graph = { concepts: graphRecord };
                        
                        const generateNextResponse = await MentorAPI.generateNextConcept({
                          concept: nextConcept,
                          numSteps: 1,
                          graph,
                        });
                        addedConcepts = generateNextResponse.concepts;
                        dispatch(addConcepts({ concepts: addedConcepts }));
                        break;
                      }

                      case 'generateFlashCards': {
                        const flashCardConcept = Array.isArray(concept) ? concept[0] : concept;
                        const flashCardsResponse = await MentorAPI.generateFlashCards({
                          concept: flashCardConcept,
                          graphId,
                        });
                        // Flash cards update the concept, doesn't add new ones
                        dispatch(updateConcept(flashCardsResponse.concepts[0]));
                        addedConcepts = []; // No new concepts added
                        break;
                      }

                      case 'custom': {
            const customConcepts = Array.isArray(concept) ? concept : [concept];
            const prompt = actualArgs[0];
            const details = actualArgs[1]; // Optional details (lesson, flash cards)
            if (!prompt) throw new Error('Prompt required for custom operation');
            const customResponse = await MentorAPI.customOperation({
              concepts: customConcepts,
              prompt,
              seedConcept,
              graph,
              details,
            }, onStream);
            // Handle additions/updates
            if (customResponse.concepts.length > 0) {
              addedConcepts = customResponse.concepts;
              dispatch(addConcepts({ concepts: addedConcepts }));
            }
            // Handle deletions
            if (customResponse.deletions && customResponse.deletions.length > 0) {
              customResponse.deletions.forEach((c: Concept) => {
                dispatch(removeConcept({ conceptId: c.id || c.name }));
              });
            }
            operationPrompt = customResponse.prompt;
            break;
          }

          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
        
        // Get the diff from the Redux store after dispatch
        // Since Redux updates are synchronous, we can read it immediately after dispatch
        const state = store.getState();
        const diff: ConceptDiff | null = state.concepts.lastDiff || null;

        return {
          addedConcepts,
          diff,
          prompt: operationPrompt,
        };
      } catch (error) {
        console.error(`Error executing ${operation}:`, error);
        throw error;
      }
    },
    [graphId, concepts, seedConcept, dispatch]
  );

  return { executeOperation };
};

