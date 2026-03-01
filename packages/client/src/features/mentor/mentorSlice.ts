// Re-export and use the same slice as concepts for now
// In the future, we might want a separate slice for mentor mode
export {
  addConcepts,
  updateConcept,
  removeConcept,
  selectConcept,
  setCurrentGraph,
  selectLastDiff,
  type ConceptDiff,
} from '../concepts/conceptSlice';

