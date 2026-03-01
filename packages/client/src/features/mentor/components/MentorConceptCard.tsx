import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Concept, ConceptGraph } from '../types';
import { ChevronDown, ChevronRight, Layers, Eye, Trash2, GripVertical, Edit2, X, Check, Target } from 'lucide-react';
import OperationButtons from './OperationButtons';
import { OperationType, OperationResult } from '../hooks/useMentorOperations';
import { useAppDispatch } from '../../../app/hooks';
import { removeConcept, updateConcept } from '../mentorSlice';
import { getConceptRouteId } from '../../concepts/utils/graphHelpers';
import { useConceptDragHandlers } from '../hooks/useConceptDragHandlers';
import { useConceptEditing } from '../hooks/useConceptEditing';

interface MentorConceptCardProps {
  concept: Concept;
  selectedConcept: Concept | null;
  onSelectConcept: (concept: Concept) => void;
  onOperation: (operation: OperationType, concept: Concept | Concept[], ...args: any[]) => Promise<OperationResult>;
  conceptMap?: Map<string, Concept>;
  children?: Concept[];
  level?: number;
  isLoading?: boolean;
  graph?: ConceptGraph;
  graphId?: string;
  isNewlyAdded?: boolean;
  onConceptsAdded?: (concepts: Concept[]) => void;
  onOpenCustomPanel?: (concepts: Concept[], primaryConcept?: Concept) => void;
  onViewGoal?: () => void; // Callback to open goal modal
  // Drag and drop props
  siblingConcepts?: Concept[]; // Concepts in the same layer for reordering
  parentConcept?: Concept; // Parent concept (when this is a nested child)
  onReorder?: (draggedConcept: Concept, targetIndex: number, parentConcept?: Concept) => void;
  onAddAsChild?: (draggedConcept: Concept, parentConcept: Concept) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (concept: Concept) => void;
  onDragEnd?: () => void;
  onDragOver?: (concept: Concept) => void;
  onDragLeave?: () => void;
  onDrop?: (concept: Concept) => void;
  draggedConcept?: Concept | null; // The concept currently being dragged (if any)
}

const MentorConceptCard: React.FC<MentorConceptCardProps> = ({
  concept,
  selectedConcept,
  onSelectConcept,
  onOperation,
  conceptMap,
  children = [],
  level = 0,
  isLoading = false,
  graph,
  graphId,
  isNewlyAdded = false,
  onConceptsAdded,
  onOpenCustomPanel,
  onViewGoal,
  siblingConcepts = [],
  parentConcept,
  onReorder,
  onAddAsChild,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragEnd,
  onDragOver: handleDragOver,
  onDragLeave,
  onDrop: handleDrop,
  draggedConcept,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default
  const [isDeleting, setIsDeleting] = useState(false);
  const isSelected = selectedConcept?.id === concept.id;
  const cardRef = useRef<HTMLDivElement>(null);

  // Use editing hook
  const {
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
  } = useConceptEditing({ concept, conceptMap });

  // Use drag handlers hook
  const {
    localIsDragOver,
    isDraggingLocal,
    dropPosition,
    handleDragStart,
    handleDragEnd,
    handleDragOverCard,
    handleDragLeaveCard,
    handleDropCard,
    handleDropZone,
  } = useConceptDragHandlers({
    concept,
    conceptMap,
    siblingConcepts,
    parentConcept,
    onDragStart,
    onDragEnd,
    onDragOver: handleDragOver,
    onDragLeave,
    onDrop: handleDrop,
    onReorder,
    onAddAsChild,
    onExpand: () => {
      // Auto-expand when dragging over a concept with children
      if (children.length > 0 && !isExpanded) {
        setIsExpanded(true);
      }
    },
    draggedConcept: isDragging ? concept : undefined,
  });

  // Scroll to this card if it's newly added
  React.useEffect(() => {
    if (isNewlyAdded && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [isNewlyAdded]);

  const cardBaseClasses = 'p-4 border rounded-lg mb-3 transition-all duration-200';
  const cardStateClasses = isSelected
    ? 'border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-md'
    : isNewlyAdded
    ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/30 shadow-md'
    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm';

  const indentStyle = level > 0 ? { marginLeft: `${level * 1}rem` } : {};

  const handleOpenDetail = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    // Don't navigate if we just finished dragging
    if (isDraggingLocal) return;
    if (!graphId) return;
    onSelectConcept(concept);
    navigate(`/mentor/${graphId}/concept/${getConceptRouteId(concept)}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Prevent deleting seed concept
    if (concept.isSeed) {
      alert('Cannot delete the seed concept. It is the root of the learning path.');
      return;
    }

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${concept.name}"? This will also remove all its relationships.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      dispatch(removeConcept({ conceptId: concept.id || concept.name }));
    } catch (error) {
      console.error('Error deleting concept:', error);
      alert('Failed to delete concept. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };



  const showDragOver = isDragOver || localIsDragOver;
  const dragOverClasses = showDragOver 
    ? dropPosition === 'inside'
      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-300 dark:ring-blue-600'
      : 'border-blue-400 dark:border-blue-500 bg-blue-100 dark:bg-blue-800/40'
    : '';
  const draggingClasses = isDragging ? 'opacity-50' : '';

  // Show drop zone indicator - only show if:
  // 1. We're not dragging this card itself (!isDragging)
  // 2. We're dragging over this card (showDragOver)
  // 3. We have a valid drop position (dropPosition !== null)
  // Note: When drag ends, dropPosition is set to null, which will hide all drop zones
  const isDraggingDifferent = !isDragging && showDragOver && dropPosition !== null;
  const showDropZoneBefore = isDraggingDifferent && dropPosition === 'before';
  const showDropZoneAfter = isDraggingDifferent && dropPosition === 'after';

  return (
    <>
      {/* Drop zone indicator before */}
      {showDropZoneBefore && (
        <div 
          className="h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg mb-2 mx-1 shadow-lg transition-all duration-200 border-2 border-dashed border-blue-500 dark:border-blue-400 flex items-center justify-center"
          style={indentStyle}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => handleDropZone(e, 'before')}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1.5 w-3/4 bg-blue-400 dark:bg-blue-500 rounded-full" />
        </div>
      )}
      
      <div 
        style={indentStyle} 
        ref={cardRef}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOverCard}
        onDragLeave={handleDragLeaveCard}
        onDrop={handleDropCard}
        className={`${draggingClasses} transition-all duration-200`}
        data-concept-id={concept.id || concept.name}
        data-concept-name={concept.name}
      >
        <div 
          className={`card-content ${cardBaseClasses} ${cardStateClasses} ${dragOverClasses} cursor-pointer`}
          onClick={handleOpenDetail}
        >
        {/* Concept Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {/* Drag Handle */}
              <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0">
                <GripVertical size={16} />
              </div>
              
              {children.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </button>
              )}
              {editingField === 'name' ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editValues.name}
                    onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, 'name')}
                    onBlur={handleCancelEdit}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 px-2 py-1 border-2 border-blue-500 dark:border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-lg font-semibold"
                    placeholder="Enter concept name..."
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveEdit();
                    }}
                    className="p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                    title="Save (Ctrl+Enter)"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEdit();
                    }}
                    className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    title="Cancel (Esc)"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-2 group">
                  <h4 
                    onClick={handleOpenDetail}
                    className={`flex-1 text-lg font-semibold cursor-pointer hover:underline ${isNewlyAdded ? 'text-green-700 dark:text-green-300' : 'text-indigo-600 dark:text-indigo-300'}`}
                  >
                    {concept.name}
                    {isNewlyAdded && (
                      <span className="ml-2 text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                  </h4>
                  <button
                    onClick={(e) => handleStartEdit('name', e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity"
                    title="Edit name"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {editingField === 'description' ? (
              <div className="mb-2">
                <textarea
                  ref={descriptionTextareaRef}
                  value={editValues.description}
                  onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                  onKeyDown={(e) => handleKeyDown(e, 'description')}
                  onBlur={handleCancelEdit}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1 border-2 border-blue-500 dark:border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none"
                  rows={3}
                  placeholder="Enter concept description..."
                />
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveEdit();
                    }}
                    className="p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-xs"
                    title="Save (Ctrl+Enter)"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEdit();
                    }}
                    className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-xs"
                    title="Cancel (Esc)"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="group relative mb-2">
                <p 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit('description', e);
                  }}
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded cursor-pointer transition-all duration-200"
                  title="Click to edit description"
                >
                  {concept.description || 'No description (click to add)'}
                </p>
                <button
                  onClick={(e) => handleStartEdit('description', e)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity"
                  title="Edit description"
                >
                  <Edit2 size={12} />
                </button>
              </div>
            )}

            {editingField === 'parents' ? (
              <div className="mb-2">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Parents:</span>
                  {editValues.parents.map(parentName => (
                    <span
                      key={parentName}
                      className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs flex items-center gap-1"
                    >
                      {parentName}
                      <button
                        onClick={(e) => handleRemoveParent(parentName, e)}
                        className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5"
                        title="Remove parent"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <div className="relative">
                    <input
                      ref={parentInputRef}
                      type="text"
                      value={newParentInput}
                      onChange={(e) => handleParentInputChange(e.target.value)}
                      onKeyDown={handleAddParent}
                      onFocus={() => {
                        if (newParentInput.trim()) {
                          setShowAutocomplete(true);
                        }
                      }}
                      onBlur={(e) => {
                        // Delay hiding autocomplete to allow click events
                        setTimeout(() => {
                          if (!autocompleteRef.current?.contains(document.activeElement)) {
                            setShowAutocomplete(false);
                          }
                        }, 200);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded-full text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                      placeholder="Add parent (Enter or click)"
                    />
                    {showAutocomplete && autocompleteSuggestions.length > 0 && (
                      <div
                        ref={autocompleteRef}
                        className="absolute z-50 mt-1 w-64 max-h-60 overflow-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {autocompleteSuggestions.map((suggestion: Concept, index: number) => (
                          <button
                            key={suggestion.name}
                            type="button"
                            onClick={() => handleSelectParent(suggestion.name)}
                            onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors ${
                              index === selectedAutocompleteIndex
                                ? 'bg-indigo-100 dark:bg-indigo-900/50'
                                : 'bg-white dark:bg-gray-800'
                            }`}
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {suggestion.name}
                            </div>
                            {suggestion.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {suggestion.description}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveEdit();
                    }}
                    className="p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-xs"
                    title="Save (Ctrl+Enter)"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEdit();
                    }}
                    className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-xs"
                    title="Cancel (Esc)"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="group relative mb-2">
                {concept.parents.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Parents:</span>
                    {concept.parents.map(parentName => (
                      <span
                        key={parentName}
                        className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs"
                      >
                        {parentName}
                      </span>
                    ))}
                    <button
                      onClick={(e) => handleStartEdit('parents', e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity"
                      title="Edit parents"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Parents:</span>
                    <button
                      onClick={(e) => handleStartEdit('parents', e)}
                      className="text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                      title="Add parents"
                    >
                      + Add parents
                    </button>
                  </div>
                )}
              </div>
            )}

            {concept.layer !== undefined && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                <Layers size={12} />
                <span>Level {concept.layer}</span>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {/* Open Detail Button */}
            <button
              onClick={handleOpenDetail}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="View concept details"
            >
              <Eye size={18} />
            </button>
            
            {/* View Goal Button - Only for seed concept */}
            {concept.isSeed && onViewGoal && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewGoal();
                }}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="View learning goal"
              >
                <Target size={18} />
              </button>
            )}
            
            {/* Delete Button */}
            {!concept.isSeed && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete concept"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Operation Buttons */}
        <OperationButtons
          concept={concept}
          onOperation={onOperation}
          isLoading={isLoading}
          conceptMap={conceptMap}
          onConceptsAdded={onConceptsAdded}
        />
      </div>

        {/* Nested Children */}
        {isExpanded && children.length > 0 && (
          <div className="mt-2 space-y-2">
            {children.map(child => (
              <MentorConceptCard
                key={child.id || child.name}
                concept={child}
                selectedConcept={selectedConcept}
                onSelectConcept={onSelectConcept}
                onOperation={onOperation}
                conceptMap={conceptMap}
                children={getChildrenForConcept(child, conceptMap)}
                level={level + 1}
                isLoading={isLoading}
                graph={graph}
                graphId={graphId}
                isNewlyAdded={isNewlyAdded}
                onConceptsAdded={onConceptsAdded}
                onOpenCustomPanel={onOpenCustomPanel}
                siblingConcepts={children}
                parentConcept={concept}
                onReorder={onReorder}
                onAddAsChild={onAddAsChild}
                isDragging={isDragging}
                isDragOver={isDragOver}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={onDragLeave}
                onDrop={handleDrop}
                draggedConcept={draggedConcept}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Drop zone indicator after */}
      {showDropZoneAfter && (
        <div 
          className="h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg mt-2 mx-1 shadow-lg transition-all duration-200 border-2 border-dashed border-blue-500 dark:border-blue-400 flex items-center justify-center"
          style={indentStyle}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => handleDropZone(e, 'after')}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1.5 w-3/4 bg-blue-400 dark:bg-blue-500 rounded-full" />
        </div>
      )}
    </>
  );
};

// Helper function to get children for a concept
function getChildrenForConcept(
  concept: Concept,
  conceptMap?: Map<string, Concept>
): Concept[] {
  if (!conceptMap || concept.children.length === 0) {
    return [];
  }

  return concept.children
    .map(childName => conceptMap.get(childName))
    .filter((c): c is Concept => c !== undefined);
}

export default MentorConceptCard;

