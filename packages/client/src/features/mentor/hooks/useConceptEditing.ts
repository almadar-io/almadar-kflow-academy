import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { Concept } from '../types';
import { updateConcept, addConcepts, removeConcept } from '../mentorSlice';
import { wouldCreateCircularDependency } from '../../concepts/utils/graphHelpers';

interface UseConceptEditingProps {
  concept: Concept;
  conceptMap?: Map<string, Concept>;
}

export const useConceptEditing = ({ concept, conceptMap }: UseConceptEditingProps) => {
  const dispatch = useAppDispatch();
  
  const [editingField, setEditingField] = useState<'name' | 'description' | 'parents' | null>(null);
  const [editValues, setEditValues] = useState({
    name: concept.name,
    description: concept.description,
    parents: [...concept.parents],
  });
  const [newParentInput, setNewParentInput] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(-1);
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const parentInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Filter autocomplete suggestions based on input
  const autocompleteSuggestions = useMemo(() => {
    if (!conceptMap || !newParentInput.trim()) {
      return [];
    }

    const input = newParentInput.trim().toLowerCase();
    const suggestions: Concept[] = [];

    conceptMap.forEach((c) => {
      // Skip if it's the same concept
      if (c.name === concept.name) return;
      
      // Skip if already a parent
      if (editValues.parents.includes(c.name)) return;
      
      // Skip if it would create a circular dependency
      if (wouldCreateCircularDependency(concept, c, conceptMap)) return;
      
      // Check if name matches input
      if (c.name.toLowerCase().includes(input)) {
        suggestions.push(c);
      }
    });

    // Sort by relevance (exact match first, then by name)
    return suggestions.sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const aStartsWith = aLower.startsWith(input);
      const bStartsWith = bLower.startsWith(input);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return a.name.localeCompare(b.name);
    }).slice(0, 10); // Limit to 10 suggestions
  }, [conceptMap, newParentInput, concept, editValues.parents]);

  // Handle selecting a parent from autocomplete
  const handleSelectParent = useCallback((parentName: string) => {
    if (!conceptMap) return;
    
    const parent = conceptMap.get(parentName);
    if (!parent) return;

    setEditValues(prev => {
      // Check if already a parent
      if (prev.parents.includes(parentName)) {
        setNewParentInput('');
        setShowAutocomplete(false);
        return prev;
      }

      // Check for circular dependency
      if (parentName === concept.name) {
        alert('A concept cannot be its own parent.');
        setNewParentInput('');
        setShowAutocomplete(false);
        return prev;
      }

      // Check for circular dependency using the utility function
      if (wouldCreateCircularDependency(concept, parent, conceptMap)) {
        alert(`Cannot add "${concept.name}" as a child of "${parentName}". This would create a circular dependency.`);
        setNewParentInput('');
        setShowAutocomplete(false);
        return prev;
      }

      // Add the parent
      setNewParentInput('');
      setShowAutocomplete(false);
      setSelectedAutocompleteIndex(-1);
      return {
        ...prev,
        parents: [...prev.parents, parentName],
      };
    });
  }, [concept, conceptMap]);

  // Handle starting edit mode
  const handleStartEdit = useCallback((field: 'name' | 'description' | 'parents', e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingField(field);
    setEditValues({
      name: concept.name,
      description: concept.description,
      parents: [...concept.parents],
    });
    if (field === 'parents') {
      setNewParentInput('');
    }
  }, [concept]);

  // Handle canceling edit
  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValues({
      name: concept.name,
      description: concept.description,
      parents: [...concept.parents],
    });
    setNewParentInput('');
  }, [concept]);

  // Handle saving edits
  const handleSaveEdit = useCallback(() => {
    if (!conceptMap) return;

    const updatedConcept: Concept = {
      ...concept,
    };

    if (editingField === 'name') {
      const newName = editValues.name.trim();
      if (!newName || newName === concept.name) {
        handleCancelEdit();
        return;
      }
      
      // Check if name already exists
      if (conceptMap.has(newName) && newName !== concept.name) {
        alert(`A concept with the name "${newName}" already exists.`);
        return;
      }

      // Update name and update all references
      const oldName = concept.name;
      updatedConcept.name = newName;

      // Get the latest concept data from conceptMap to ensure we have all current parents
      const currentConcept = conceptMap.get(oldName) || concept;
      const allParents = currentConcept.parents;

      // Remove old concept and add new one (since the key is the name)
      dispatch(removeConcept({ conceptId: oldName }));
      dispatch(addConcepts({ concepts: [updatedConcept] }));

      // Update parent references in children
      currentConcept.children.forEach(childName => {
        const child = conceptMap.get(childName);
        if (child) {
          const updatedChild: Concept = {
            ...child,
            parents: child.parents.map(p => p === oldName ? newName : p),
          };
          dispatch(updateConcept(updatedChild));
        }
      });

      // Update children references in ALL parents
      // This ensures the concept name is updated in the children array of every parent
      allParents.forEach(parentName => {
        const parent = conceptMap.get(parentName);
        if (parent) {
          // Check if the parent's children array contains the old name
          if (parent.children.includes(oldName)) {
            const updatedParent: Concept = {
              ...parent,
              children: parent.children.map(c => c === oldName ? newName : c),
            };
            dispatch(updateConcept(updatedParent));
          }
        }
      });
    } else if (editingField === 'description') {
      updatedConcept.description = editValues.description.trim();
    } else if (editingField === 'parents') {
      // Validate parents exist and check for circular dependencies
      const validParents: string[] = [];
      for (const parentName of editValues.parents) {
        const parent = conceptMap.get(parentName);
        if (!parent) {
          alert(`Parent concept "${parentName}" not found.`);
          return;
        }
        // Check for circular dependency
        if (parentName === concept.name) {
          alert('A concept cannot be its own parent.');
          continue;
        }
        // Check for circular dependency using the utility function
        if (wouldCreateCircularDependency(concept, parent, conceptMap)) {
          alert(`Cannot add "${concept.name}" as a child of "${parentName}". This would create a circular dependency.`);
          continue;
        }
        validParents.push(parentName);
      }
      updatedConcept.parents = validParents;

      // Update parent's children arrays
      const oldParents = concept.parents;
      const newParents = validParents;

      // Remove from old parents' children
      oldParents.forEach(parentName => {
        if (!newParents.includes(parentName)) {
          const parent = conceptMap.get(parentName);
          if (parent) {
            const updatedParent: Concept = {
              ...parent,
              children: parent.children.filter(c => c !== concept.name),
            };
            dispatch(updateConcept(updatedParent));
          }
        }
      });

      // Add to new parents' children
      newParents.forEach(parentName => {
        if (!oldParents.includes(parentName)) {
          const parent = conceptMap.get(parentName);
          if (parent && !parent.children.includes(concept.name)) {
            const updatedParent: Concept = {
              ...parent,
              children: [...parent.children, concept.name],
            };
            dispatch(updateConcept(updatedParent));
          }
        }
      });
    }

    dispatch(updateConcept(updatedConcept));
    setEditingField(null);
    setNewParentInput('');
  }, [concept, conceptMap, editingField, editValues, handleCancelEdit, dispatch]);

  // Handle key down for inputs
  const handleKeyDown = useCallback((e: React.KeyboardEvent, field: 'name' | 'description' | 'parents') => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  // Handle adding a parent tag
  const handleAddParent = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If there's a selected autocomplete item, use that
      if (selectedAutocompleteIndex >= 0 && autocompleteSuggestions[selectedAutocompleteIndex]) {
        handleSelectParent(autocompleteSuggestions[selectedAutocompleteIndex].name);
        return;
      }
      
      // Otherwise, try to add the typed value
      if (newParentInput.trim()) {
        const parentName = newParentInput.trim();
        
        if (!conceptMap) return;
        
        // Check if parent exists
        const parent = conceptMap.get(parentName);
        if (!parent) {
          alert(`Concept "${parentName}" not found.`);
          return;
        }

        handleSelectParent(parentName);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowAutocomplete(true);
      setSelectedAutocompleteIndex(prev => 
        prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedAutocompleteIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
      setSelectedAutocompleteIndex(-1);
    }
  }, [concept, conceptMap, newParentInput, selectedAutocompleteIndex, autocompleteSuggestions, handleSelectParent]);

  // Handle input change for autocomplete
  const handleParentInputChange = useCallback((value: string) => {
    setNewParentInput(value);
    setShowAutocomplete(value.trim().length > 0);
    setSelectedAutocompleteIndex(-1);
  }, []);

  // Handle removing a parent tag
  const handleRemoveParent = useCallback((parentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValues({
      ...editValues,
      parents: editValues.parents.filter(p => p !== parentName),
    });
  }, [editValues]);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editingField === 'name' && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    } else if (editingField === 'description' && descriptionTextareaRef.current) {
      descriptionTextareaRef.current.focus();
    } else if (editingField === 'parents' && parentInputRef.current) {
      parentInputRef.current.focus();
    }
  }, [editingField]);

  // Update edit values when concept changes (e.g., from external updates)
  // Only update if we're NOT currently editing, to avoid resetting user's edits
  useEffect(() => {
    if (!editingField) {
      setEditValues({
        name: concept.name,
        description: concept.description,
        parents: [...concept.parents],
      });
    }
  }, [concept.name, concept.description, concept.parents, editingField]);

  return {
    editingField,
    editValues,
    newParentInput,
    setEditValues,
    setNewParentInput,
    nameInputRef,
    descriptionTextareaRef,
    parentInputRef,
    autocompleteRef,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleKeyDown,
    handleAddParent,
    handleRemoveParent,
    handleSelectParent,
    handleParentInputChange,
    autocompleteSuggestions,
    showAutocomplete,
    setShowAutocomplete,
    selectedAutocompleteIndex,
  };
};

