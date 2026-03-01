/**
 * KnowledgeGraphTemplate Component
 * 
 * Mentor concept management with multiple visualization modes (List/Graph/Mindmap).
 * Uses AppLayoutTemplate for consistent layout structure.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  List,
  Network,
  GitBranch,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronRight,
  X,
  Sparkles,
  ArrowLeft,
  Target,
  Check,
  Calendar,
  Sparkles as SeedIcon,
  Edit2,
  Save,
  GraduationCap,
  Loader2,
  Plus
} from 'lucide-react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { GoalDisplay, Milestone } from '../../organisms/GoalDisplay';
import { ConceptCard, ConceptCardProps } from '../../organisms/ConceptCard';
import { Operation } from '../../organisms/OperationPanel';
import { Tooltip } from '../../molecules/Tooltip';
import { ForceGraph, ForceGraphNode, ForceGraphEdge } from '../../organisms/ForceGraph';
import { TreeMap, TreeMapNode } from '../../organisms/TreeMap';
import { LearningGoalDisplay } from '../../organisms/LearningGoalDisplay';
import { ConceptNavigation } from '../../molecules/ConceptNavigation';
import { Tabs, TabItem } from '../../molecules/Tabs';
import { Card } from '../../molecules/Card';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { SelectDropdown } from '../../molecules/SelectDropdown';
import { EmptyState } from '../../molecules/EmptyState';
import { FloatingActionButton, FloatingAction } from '../../molecules/FloatingActionButton';
import { SidePanel } from '../../molecules/SidePanel';
import { ChatBox, ChatMessage } from '../../molecules/ChatBox';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Divider } from '../../atoms/Divider';
import { Checkbox } from '../../atoms/Checkbox';
import { JsonViewer } from '../../JsonViewer';
import { Modal } from '../../molecules/Modal';
import { ProfilePopup } from '../../molecules/ProfilePopup/ProfilePopup';
import ThemeToggle from '../../ThemeToggle';
import { Avatar } from '../../atoms/Avatar';
import { cn } from '../../../utils/theme';

export interface ConceptLayer {
  /**
   * Level ID (e.g., 'L1', 'L2', 'L3')
   */
  id: string;

  /**
   * Level name
   */
  name: string;

  /**
   * Level color
   */
  color: string;

  /**
   * Concepts in this level
   */
  concepts: ConceptCardProps[];
}

export interface GraphNode {
  /**
   * Node ID
   */
  id: string;

  /**
   * Node label
   */
  label: string;

  /**
   * Node level
   */
  layer: string;

  /**
   * Node type (for coloring and legend)
   */
  nodeType?: string;

  /**
   * Full node data (for JSON viewer)
   */
  nodeData?: any;

  /**
   * X position
   */
  x?: number;

  /**
   * Y position
   */
  y?: number;
}

export interface GraphEdge {
  /**
   * Source node ID
   */
  source: string;

  /**
   * Target node ID
   */
  target: string;

  /**
   * Edge label
   */
  label?: string;
}

/**
 * Extended milestone type that supports both GoalDisplay.Milestone and LearningGoal.Milestone formats
 */
export interface ExtendedMilestone {
  id: string;
  title?: string;
  text?: string; // For backward compatibility with GoalDisplay.Milestone
  description?: string;
  targetDate?: number; // timestamp
  completed?: boolean;
}

export interface KnowledgeGraphTemplateProps {
  /**
   * Learning goal
   */
  goal?: {
    id: string;
    text: string;
    description?: string;
    milestones?: ExtendedMilestone[];
  };

  /**
   * Current difficulty level
   */
  difficulty?: 'beginner' | 'intermediate' | 'advanced';

  /**
   * Callback when goal is updated
   */
  onGoalUpdate?: (updates: { text?: string; description?: string }) => Promise<void>;

  /**
   * Callback when milestone is updated
   */
  onMilestoneUpdate?: (milestoneId: string, updates: { title?: string; completed?: boolean }) => Promise<void>;

  /**
   * Callback when difficulty is changed
   */
  onDifficultyChange?: (difficulty: 'beginner' | 'intermediate' | 'advanced') => Promise<void>;

  /**
   * Callback when a new milestone is added
   */
  onAddMilestone?: (title: string) => Promise<void>;

  /**
   * Callback to expand the graph (progressive expand)
   */
  onExpand?: () => Promise<void>;

  /**
   * Whether expand operation is running
   */
  isExpanding?: boolean;

  /**
   * On goal save (legacy)
   */
  onGoalSave?: (goal: string) => void;

  /**
   * Concept levels
   */
  layers: ConceptLayer[];

  /**
   * Graph nodes (for graph/mindmap views)
   */
  graphNodes?: GraphNode[];

  /**
   * Graph edges (for graph/mindmap views)
   */
  graphEdges?: GraphEdge[];

  /**
   * Operations available
   */
  operations?: Operation[];

  /**
   * On operation execute
   */
  onOperationExecute?: (operationId: string) => void;

  /**
   * Is operation running
   */
  isOperationRunning?: boolean;

  /**
   * Selected concept ID
   */
  selectedConceptId?: string;

  /**
   * On concept select
   */
  onConceptSelect?: (conceptId: string | null) => void;

  /**
   * On concept click (for card actions)
   */
  onConceptClick?: (conceptId: string) => void;

  /**
   * On add concept
   */
  onAddConcept?: (layerId: string) => void;

  /**
   * Search query
   */
  searchQuery?: string;

  /**
   * On search change
   */
  onSearchChange?: (query: string) => void;

  /**
   * Active layer filters
   */
  activeLayerFilters?: string[];

  /**
   * On layer filter change
   */
  onLayerFilterChange?: (layers: string[]) => void;

  /**
   * User information for header
   */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };

  /**
   * Navigation items for sidebar
   */
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;

  /**
   * Logo element
   */
  logo?: React.ReactNode;

  /**
   * On logo click
   */
  onLogoClick?: () => void;

  /**
   * On logout handler
   */
  onLogout?: () => void;

  /**
   * On back navigation (for detail pages)
   */
  onBack?: () => void;

  /**
   * Back button label
   * @default 'Back'
   */
  backLabel?: string;

  /**
   * Detail page header content (for customMainContent pages)
   * Shows concept name, badges, etc. in a header above the content
   */
  detailPageHeader?: React.ReactNode;

  /**
   * Detail panel content (deprecated - use customMainContent instead)
   * @deprecated Use customMainContent for full-page detail views
   */
  detailPanelContent?: React.ReactNode;

  /**
   * Show detail panel (deprecated)
   * @deprecated Use customMainContent for full-page detail views
   */
  showDetailPanel?: boolean;

  /**
   * On close detail panel (deprecated)
   * @deprecated Use customMainContent for full-page detail views
   */
  onCloseDetailPanel?: () => void;

  /**
   * Custom main content to render instead of view tabs (list/graph/mindmap)
   * When provided, replaces the default view content
   */
  customMainContent?: React.ReactNode;

  /**
   * On LLM chat message send
   */
  onLLMMessageSend?: (message: string) => void;

  /**
   * LLM chat messages
   */
  llmMessages?: ChatMessage[];

  /**
   * Is LLM loading
   */
  isLLMLoading?: boolean;

  /**
   * Graph mutations from LLM interaction
   */
  graphMutations?: Array<{
    id: string;
    type: 'add' | 'update' | 'delete';
    description: string;
    timestamp: Date;
  }>;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Learning goals for each level (key: level ID like 'L1', value: goal text)
   */
  layerGoals?: Record<string, string>;

  /**
   * Callback when level goal is updated
   */
  onLayerGoalUpdate?: (layerId: string, goal: string) => void;

  /**
   * Graph ID for saving level goals (optional, can use onLayerGoalUpdate instead)
   */
  graphId?: string;

  /**
   * Previous concept for navigation
   */
  previousConcept?: {
    id: string;
    name: string;
  };

  /**
   * Next concept for navigation
   */
  nextConcept?: {
    id: string;
    name: string;
  };

  /**
   * Callback when previous concept is clicked
   */
  onPreviousConceptClick?: (concept: { id: string; name: string }) => void;

  /**
   * Callback when next concept is clicked
   */
  onNextConceptClick?: (concept: { id: string; name: string }) => void;
}

type ViewMode = 'list' | 'graph' | 'mindmap';
type MindmapLayout = 'radial' | 'horizontal' | 'vertical';

// Node type color mapping for legend
const NODE_TYPE_COLORS: Record<string, { color: string; label: string }> = {
  Concept: { color: '#3b82f6', label: 'Concept' },
  SeedConcept: { color: '#8b5cf6', label: 'Seed Concept' },
  Layer: { color: '#10b981', label: 'Level' },
  LearningGoal: { color: '#f59e0b', label: 'Learning Goal' },
  Milestone: { color: '#ec4899', label: 'Milestone' },
  Lesson: { color: '#06b6d4', label: 'Lesson' },
  PracticeExercise: { color: '#84cc16', label: 'Practice Exercise' },
  FlashCard: { color: '#a855f7', label: 'Flash Card' },
  ConceptMetadata: { color: '#64748b', label: 'Concept Metadata' },
  GraphMetadata: { color: '#64748b', label: 'Graph Metadata' },
  Graph: { color: '#1e293b', label: 'Graph' },
  Other: { color: '#6b7280', label: 'Other' },
};

// Get node color based on type
const getNodeColor = (nodeType?: string, isSeed?: boolean): string => {
  if (!nodeType) return NODE_TYPE_COLORS.Other.color;
  if (nodeType === 'Concept' && isSeed) {
    return NODE_TYPE_COLORS.SeedConcept.color;
  }
  return NODE_TYPE_COLORS[nodeType]?.color || NODE_TYPE_COLORS.Other.color;
};

export const KnowledgeGraphTemplate: React.FC<KnowledgeGraphTemplateProps> = ({
  goal,
  difficulty,
  onGoalUpdate,
  onMilestoneUpdate,
  onDifficultyChange,
  onAddMilestone,
  onExpand,
  isExpanding = false,
  onGoalSave,
  layers,
  graphNodes = [],
  graphEdges = [],
  operations = [],
  onOperationExecute,
  isOperationRunning = false,
  selectedConceptId,
  onConceptSelect,
  onConceptClick,
  onAddConcept,
  searchQuery = '',
  onSearchChange,
  activeLayerFilters = [],
  onLayerFilterChange,
  user,
  navigationItems = [],
  logo,
  onLogoClick,
  onLogout,
  onBack,
  backLabel = 'Back',
  detailPageHeader,
  detailPanelContent,
  showDetailPanel = false,
  onCloseDetailPanel,
  customMainContent,
  onLLMMessageSend,
  llmMessages = [],
  isLLMLoading = false,
  graphMutations = [],
  className,
  layerGoals = {},
  onLayerGoalUpdate,
  graphId,
  previousConcept,
  nextConcept,
  onPreviousConceptClick,
  onNextConceptClick,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [mindmapLayout, setMindmapLayout] = useState<MindmapLayout>('radial');
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Goal/Milestone editing state
  const [editingGoalField, setEditingGoalField] = useState<'text' | 'description' | null>(null);
  const [editedGoalValue, setEditedGoalValue] = useState('');
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editedMilestoneValue, setEditedMilestoneValue] = useState('');
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [isSavingMilestone, setIsSavingMilestone] = useState(false);
  const [isSavingDifficulty, setIsSavingDifficulty] = useState(false);
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [isSavingNewMilestone, setIsSavingNewMilestone] = useState(false);

  // Goal editing handlers
  const handleStartEditGoal = useCallback((field: 'text' | 'description') => {
    if (!goal) return;
    setEditingGoalField(field);
    setEditedGoalValue(field === 'text' ? goal.text : (goal.description || ''));
  }, [goal]);

  const handleSaveGoal = useCallback(async () => {
    if (!editingGoalField || !onGoalUpdate) return;
    setIsSavingGoal(true);
    try {
      await onGoalUpdate({ [editingGoalField]: editedGoalValue });
      setEditingGoalField(null);
      setEditedGoalValue('');
    } catch (error) {
      console.error('Failed to save goal:', error);
    } finally {
      setIsSavingGoal(false);
    }
  }, [editingGoalField, editedGoalValue, onGoalUpdate]);

  const handleCancelEditGoal = useCallback(() => {
    setEditingGoalField(null);
    setEditedGoalValue('');
  }, []);

  // Milestone editing handlers
  const handleStartEditMilestone = useCallback((milestone: ExtendedMilestone) => {
    setEditingMilestoneId(milestone.id);
    setEditedMilestoneValue(milestone.title || milestone.text || '');
  }, []);

  const handleSaveMilestone = useCallback(async () => {
    if (!editingMilestoneId || !onMilestoneUpdate) return;
    setIsSavingMilestone(true);
    try {
      await onMilestoneUpdate(editingMilestoneId, { title: editedMilestoneValue });
      setEditingMilestoneId(null);
      setEditedMilestoneValue('');
    } catch (error) {
      console.error('Failed to save milestone:', error);
    } finally {
      setIsSavingMilestone(false);
    }
  }, [editingMilestoneId, editedMilestoneValue, onMilestoneUpdate]);

  const handleCancelEditMilestone = useCallback(() => {
    setEditingMilestoneId(null);
    setEditedMilestoneValue('');
  }, []);

  // Difficulty change handler
  const handleDifficultyClick = useCallback(async (level: 'beginner' | 'intermediate' | 'advanced') => {
    if (!onDifficultyChange || level === difficulty) return;
    setIsSavingDifficulty(true);
    try {
      await onDifficultyChange(level);
    } catch (error) {
      console.error('Failed to change difficulty:', error);
    } finally {
      setIsSavingDifficulty(false);
    }
  }, [difficulty, onDifficultyChange]);

  // Add milestone handler
  const handleAddMilestone = useCallback(async () => {
    if (!onAddMilestone || !newMilestoneTitle.trim()) return;
    setIsSavingNewMilestone(true);
    try {
      await onAddMilestone(newMilestoneTitle.trim());
      setNewMilestoneTitle('');
      setIsAddingMilestone(false);
    } catch (error) {
      console.error('Failed to add milestone:', error);
    } finally {
      setIsSavingNewMilestone(false);
    }
  }, [newMilestoneTitle, onAddMilestone]);

  const handleCancelAddMilestone = useCallback(() => {
    setIsAddingMilestone(false);
    setNewMilestoneTitle('');
  }, []);

  // Separate seed concept (level 0) from other levels
  const seedLayer = useMemo(() => {
    return layers.find(layer => layer.id === 'L0' || layer.id === 'Level 0');
  }, [layers]);

  const filteredLayers = useMemo(() => {
    // Filter out level 0 (seed concept) and renumber levels starting from 1
    return layers
      .filter(layer => {
        const layerNum = parseInt(layer.id.replace('L', '')) || 0;
        return layerNum !== 0; // Exclude seed concept level
      })
      .map((layer, index) => {
        // Renumber levels: first filtered level becomes Level 1, etc.
        return {
          ...layer,
          id: `L${index + 1}`, // Renumber to start from 1
          name: `Level ${index + 1}`,
        };
      });
  }, [layers]);

  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(() => {
    const allLayerIds = new Set(layers.map(l => l.id));
    return allLayerIds;
  });
  const [llmPanelOpen, setLlmPanelOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Memoize graph data transformation to prevent unnecessary re-renders
  // This ensures the graph doesn't restart when selectedNode changes
  const forceGraphNodes = useMemo(() => {
    return graphNodes.map(node => {
      const nodeType = node.nodeType || 'Other';
      const seedConceptId = graphNodes.find(n => n.nodeType === 'Graph')?.nodeData?.properties?.seedConceptId;
      const isSeed = node.nodeData?.properties?.isSeed ||
        node.nodeData?.properties?.id === seedConceptId;
      return {
        id: node.id,
        label: node.label,
        group: nodeType, // Use node type as group for coloring
        size: 1,
        isPrimary: isSeed,
        color: getNodeColor(nodeType, isSeed),
        nodeType: nodeType,
        nodeData: node.nodeData,
      } as ForceGraphNode;
    });
  }, [graphNodes]);

  const forceGraphEdges = useMemo(() => {
    return graphEdges.map(edge => ({
      source: edge.source,
      target: edge.target,
      label: edge.label,
    } as ForceGraphEdge));
  }, [graphEdges]);

  const legendItemsMemo = useMemo(() => {
    // Get unique node types from graphNodes
    const nodeTypes = new Set<string>();
    const seedConceptId = graphNodes.find(n => n.nodeType === 'Graph')?.nodeData?.properties?.seedConceptId;

    graphNodes.forEach(node => {
      const nodeType = node.nodeType || 'Other';
      if (nodeType === 'Concept' &&
        (node.nodeData?.properties?.isSeed || node.id === seedConceptId)) {
        nodeTypes.add('SeedConcept');
      } else {
        nodeTypes.add(nodeType);
      }
    });

    return Array.from(nodeTypes).map(type => ({
      key: type,
      label: NODE_TYPE_COLORS[type]?.label || type,
      color: NODE_TYPE_COLORS[type]?.color || NODE_TYPE_COLORS.Other.color,
    }));
  }, [graphNodes]);

  // Memoize node click handler to prevent recreation
  const handleNodeClick = useCallback((nodeId: string, node: ForceGraphNode) => {
    // Find the graph node and set it as selected for JSON viewer
    const graphNode = graphNodes.find(n => n.id === nodeId);
    if (graphNode) {
      setSelectedNode(graphNode);
    }
  }, [graphNodes]);

  // Handle node deselection
  const handleNodeDeselect = useCallback(() => {
    setSelectedNode(null);
  }, []);


  const viewTabs: TabItem[] = [
    { id: 'list', label: 'List', icon: List, content: null },
    { id: 'graph', label: 'Graph', icon: Network, content: null },
    { id: 'mindmap', label: 'Mindmap', icon: GitBranch, content: null },
  ];

  const toggleLayerExpanded = (layerId: string) => {
    setExpandedLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  const totalConcepts = layers.reduce((acc, l) => acc + l.concepts.length, 0);

  // Custom mobile header actions (includes back button)
  const customMobileHeaderActions = (
    <div className="flex items-center gap-2">
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          icon={ArrowLeft}
          onClick={onBack}
        >
          <span className="text-sm font-medium">{backLabel}</span>
        </Button>
      )}
      <ThemeToggle />
      {user && onLogout && (
        <ProfilePopup
          userName={user.name}
          userEmail={user.email}
          userAvatar={user.avatar}
          onLogout={onLogout}
          trigger={
            <button
              className={cn(
                'w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center',
                'text-indigo-700 dark:text-indigo-300 font-bold text-xs',
                'hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-700 transition-all cursor-pointer'
              )}
            >
              {user.avatar ? (
                <Avatar src={user.avatar} initials={user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'} size="sm" />
              ) : (
                user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
              )}
            </button>
          }
        />
      )}
    </div>
  );

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      brandName="KFlow"
      onLogoClick={onLogoClick}
      mobileHeaderActions={customMobileHeaderActions}
      pageHeader={detailPageHeader && customMainContent ? detailPageHeader : undefined}
      className={className}
    >
      {/* Difficulty Selector */}
      {(difficulty || onDifficultyChange) && (
        <div className="mb-4">
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <Typography variant="body" weight="semibold">
                  Difficulty Level
                </Typography>
              </div>
              <div className="flex gap-2">
                {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleDifficultyClick(level)}
                    disabled={isSavingDifficulty || !onDifficultyChange}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
                      difficulty === level
                        ? level === 'beginner'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 ring-2 ring-green-500'
                          : level === 'intermediate'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 ring-2 ring-yellow-500'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 ring-2 ring-red-500'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
                      isSavingDifficulty && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Goal Display with Editing */}
      {goal && (
        <div className="mb-4 sm:mb-6">
          <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white">
            <div className="p-4 sm:p-6 space-y-4">
              {/* Goal Title */}
              <div className="flex items-start gap-3">
                <Target className="w-6 h-6 flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  {editingGoalField === 'text' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editedGoalValue}
                        onChange={(e) => setEditedGoalValue(e.target.value)}
                        className="w-full px-3 py-2 text-lg font-semibold text-gray-900 dark:text-white bg-white/90 dark:bg-gray-800/90 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                        disabled={isSavingGoal}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveGoal();
                          if (e.key === 'Escape') handleCancelEditGoal();
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveGoal}
                          disabled={isSavingGoal}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-white hover:bg-gray-100 disabled:opacity-50 rounded-lg transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          {isSavingGoal ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditGoal}
                          disabled={isSavingGoal}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <Typography variant="h4" className="text-white">
                        {goal.text}
                      </Typography>
                      {onGoalUpdate && (
                        <button
                          type="button"
                          onClick={() => handleStartEditGoal('text')}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors flex-shrink-0"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Goal Description */}
              {(goal.description || onGoalUpdate) && (
                <div className="pl-9">
                  {editingGoalField === 'description' ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedGoalValue}
                        onChange={(e) => setEditedGoalValue(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 text-sm text-gray-900 dark:text-white bg-white/90 dark:bg-gray-800/90 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-white resize-none"
                        disabled={isSavingGoal}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') handleCancelEditGoal();
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveGoal}
                          disabled={isSavingGoal}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-white hover:bg-gray-100 disabled:opacity-50 rounded-lg transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          {isSavingGoal ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditGoal}
                          disabled={isSavingGoal}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <Typography variant="body" className="text-white/90">
                        {goal.description || 'No description'}
                      </Typography>
                      {onGoalUpdate && (
                        <button
                          type="button"
                          onClick={() => handleStartEditGoal('description')}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors flex-shrink-0"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Milestones with Edit and Add */}
              {(goal.milestones?.length || onAddMilestone) && (
                <div className="pt-2 border-t border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <Typography variant="small" className="text-white/80">
                      Milestones:
                    </Typography>
                    {onAddMilestone && !isAddingMilestone && (
                      <button
                        type="button"
                        onClick={() => setIsAddingMilestone(true)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
                      >
                        <span className="text-lg leading-none">+</span>
                        Add
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {goal.milestones?.map((milestone) => (
                      <div key={milestone.id} className="flex items-center gap-1">
                        {editingMilestoneId === milestone.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editedMilestoneValue}
                              onChange={(e) => setEditedMilestoneValue(e.target.value)}
                              className="px-2 py-1 text-sm text-gray-900 dark:text-white bg-white/90 dark:bg-gray-800/90 border-0 rounded focus:outline-none focus:ring-2 focus:ring-white"
                              disabled={isSavingMilestone}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveMilestone();
                                if (e.key === 'Escape') handleCancelEditMilestone();
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleSaveMilestone}
                              disabled={isSavingMilestone}
                              className="p-1 text-white hover:bg-white/20 rounded"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditMilestone}
                              disabled={isSavingMilestone}
                              className="p-1 text-white/70 hover:bg-white/20 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <Badge
                            variant={milestone.completed ? 'success' : 'default'}
                            size="sm"
                            className={cn(
                              'flex items-center gap-1',
                              milestone.completed
                                ? 'bg-green-500 text-white'
                                : 'bg-white/20 text-white'
                            )}
                          >
                            {milestone.title || milestone.text}
                            {onMilestoneUpdate && (
                              <button
                                type="button"
                                onClick={() => handleStartEditMilestone(milestone)}
                                className="ml-1 p-0.5 hover:bg-white/20 rounded"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </Badge>
                        )}
                      </div>
                    ))}
                    
                    {/* Add new milestone input */}
                    {isAddingMilestone && (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newMilestoneTitle}
                          onChange={(e) => setNewMilestoneTitle(e.target.value)}
                          placeholder="New milestone..."
                          className="px-2 py-1 text-sm text-gray-900 dark:text-white bg-white/90 dark:bg-gray-800/90 border-0 rounded focus:outline-none focus:ring-2 focus:ring-white"
                          disabled={isSavingNewMilestone}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddMilestone();
                            if (e.key === 'Escape') handleCancelAddMilestone();
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddMilestone}
                          disabled={isSavingNewMilestone || !newMilestoneTitle.trim()}
                          className="p-1 text-white hover:bg-white/20 rounded disabled:opacity-50"
                        >
                          <Save className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelAddMilestone}
                          disabled={isSavingNewMilestone}
                          className="p-1 text-white/70 hover:bg-white/20 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* View tabs - hide if customMainContent is provided */}
      {!customMainContent && (
        <div className="mb-6">
          <Tabs
            items={viewTabs}
            activeTab={viewMode}
            onTabChange={(id: string) => setViewMode(id as ViewMode)}
          />
        </div>
      )}

      {/* View content */}
      <div className="flex-1 min-w-0">
        {/* Custom main content (for detail pages) */}
        {customMainContent ? (
          <div className="space-y-4">
            {/* Back button for detail pages (mobile only - desktop uses header) */}
            {onBack && !detailPageHeader && (
              <div className="mb-4 lg:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={ArrowLeft}
                  onClick={onBack}
                >
                  {backLabel}
                </Button>
              </div>
            )}
            {customMainContent}
          </div>
        ) : (
          <>
            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                {/* Progress Stepper - Show if milestones exist */}
                {goal?.milestones && goal.milestones.length > 0 && (
                  <Card className="p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <Typography variant="h6" weight="semibold">
                        Learning Progress
                      </Typography>
                      <Badge variant="primary">
                        {goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} Milestones
                      </Badge>
                    </div>
                    <div className="w-full pb-2">
                      <div className="flex items-start w-full gap-1 sm:gap-2">
                        {goal.milestones.map((milestone, index) => {
                          const isCompleted = milestone.completed || false;
                          const previousCompleted = index > 0 ? (goal.milestones?.[index - 1]?.completed || false) : false;
                          const isInProgress = !isCompleted && (index === 0 || previousCompleted);
                          const milestoneTitle = milestone.title || milestone.text || `Milestone ${index + 1}`;

                          return (
                            <Tooltip
                              key={milestone.id}
                              content={
                                <div className="max-w-xs break-words">
                                  <div className="font-semibold mb-1 break-words">{milestoneTitle}</div>
                                  {milestone.description && (
                                    <div className="text-sm opacity-90 break-words whitespace-normal">{milestone.description}</div>
                                  )}
                                </div>
                              }
                              position="top"
                            >
                              <div className="flex-1 flex flex-col items-center min-w-0">
                                {/* Stepper line and circle */}
                                <div className="flex items-center w-full">
                                  {index > 0 && (
                                    <div className={`flex-1 h-0.5 sm:h-1 rounded ${previousCompleted
                                        ? 'bg-green-500 dark:bg-green-600'
                                        : 'bg-gray-300 dark:bg-gray-700'
                                      }`} />
                                  )}
                                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all flex-shrink-0 ${isCompleted
                                      ? 'bg-green-500 dark:bg-green-600 text-white shadow-md'
                                      : isInProgress
                                        ? 'bg-indigo-500 dark:bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-700 animate-pulse'
                                        : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}>
                                    {isCompleted ? (
                                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    ) : (
                                      <span className="text-[10px] sm:text-xs">{index + 1}</span>
                                    )}
                                  </div>
                                  {index < (goal.milestones?.length || 0) - 1 && (
                                    <div className={`flex-1 h-0.5 sm:h-1 rounded ${isCompleted
                                        ? 'bg-green-500 dark:bg-green-600'
                                        : 'bg-gray-300 dark:bg-gray-700'
                                      }`} />
                                  )}
                                </div>
                                {/* Milestone text - hidden on mobile, shown on md+ screens */}
                                <Typography
                                  variant="small"
                                  className="hidden md:block mt-1.5 sm:mt-2 text-center px-0.5 text-[10px] sm:text-xs leading-tight w-full"
                                  color={isCompleted ? 'muted' : isInProgress ? 'default' : 'muted'}
                                >
                                  {isInProgress ? (
                                    <span className="line-clamp-2 break-words block">{milestoneTitle}</span>
                                  ) : (
                                    <span className="line-clamp-2 break-words block" title={milestoneTitle}>
                                      {milestoneTitle.length > 12
                                        ? `${milestoneTitle.substring(0, 12)}...`
                                        : milestoneTitle}
                                    </span>
                                  )}
                                </Typography>
                              </div>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Seed Concept Card (if exists) - Simple clickable card */}
                {seedLayer && seedLayer.concepts.length > 0 && seedLayer.concepts[0] && (
                  <Card
                    className="border-2 border-purple-200 dark:border-purple-800 mb-4 cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => seedLayer.concepts[0] && onConceptClick?.(seedLayer.concepts[0].id)}
                  >
                    <div className="p-4 sm:p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                          <SeedIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Typography
                            variant="h5"
                            className="font-semibold text-gray-900 dark:text-gray-100 mb-2"
                          >
                            {seedLayer.concepts[0].name}
                          </Typography>
                          {seedLayer.concepts[0].description && (
                            <Typography
                              variant="body"
                              className="text-gray-700 dark:text-gray-300 line-clamp-3"
                            >
                              {seedLayer.concepts[0].description}
                            </Typography>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Milestone-Level Cards (Level 1 -> Milestone 1, Level 2 -> Milestone 2, etc.) */}
                {filteredLayers.map((layer, layerIndex) => {
                  // Map level index to milestone index (Level 1 -> Milestone 1)
                  const milestone = goal?.milestones?.[layerIndex];
                  const layerNumber = layerIndex + 1; // Levels now start from 1
                  const isCompleted = milestone?.completed || false;
                  const previousCompleted = layerIndex > 0 ? (goal?.milestones?.[layerIndex - 1]?.completed || false) : false;
                  const isInProgress = !isCompleted && (layerIndex === 0 || previousCompleted);

                  // Format target date if available
                  const formatTargetDate = (timestamp?: number): string => {
                    if (!timestamp) return '';
                    try {
                      return new Date(timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                    } catch {
                      return '';
                    }
                  };

                  return (
                    <Card
                      key={layer.id}
                      className={`border-2 transition-all ${isCompleted
                          ? 'border-green-200 dark:border-green-800'
                          : isInProgress
                            ? 'border-indigo-200 dark:border-indigo-800'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                    >
                      {/* Milestone Header */}
                      {milestone && (
                        <>
                          <div className={`p-4 rounded-t-lg transition-colors ${isCompleted
                              ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30'
                              : isInProgress
                                ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30'
                                : 'bg-gray-50 dark:bg-gray-800/70'
                            }`}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={`p-2 rounded-lg flex-shrink-0 ${isCompleted
                                    ? 'bg-green-100 dark:bg-green-900/40'
                                    : isInProgress
                                      ? 'bg-indigo-100 dark:bg-indigo-900/40'
                                      : 'bg-gray-100 dark:bg-gray-700'
                                  }`}>
                                  <Target
                                    className={`w-4 h-4 sm:w-5 sm:h-5 ${isCompleted
                                        ? 'text-green-600 dark:text-green-400'
                                        : isInProgress
                                          ? 'text-indigo-600 dark:text-indigo-400'
                                          : 'text-gray-500 dark:text-gray-400'
                                      }`}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Typography
                                      variant="h6"
                                      className="font-semibold truncate text-gray-900 dark:text-gray-100"
                                    >
                                      Milestone {layerNumber}: {milestone.title || milestone.text || `Milestone ${layerNumber}`}
                                    </Typography>
                                    <Badge
                                      size="sm"
                                      variant={
                                        isCompleted ? 'success' :
                                          isInProgress ? 'primary' : 'default'
                                      }
                                    >
                                      {isCompleted ? 'Completed' :
                                        isInProgress ? 'In Progress' : 'Upcoming'}
                                    </Badge>
                                  </div>
                                  {milestone.description && (
                                    <Typography
                                      variant="small"
                                      className="mb-1 text-gray-700 dark:text-gray-300"
                                    >
                                      {milestone.description}
                                    </Typography>
                                  )}
                                  {milestone.targetDate && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <Calendar className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                      <Typography variant="small" className="text-gray-600 dark:text-gray-400">
                                        Target: {formatTargetDate(milestone.targetDate)}
                                      </Typography>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Divider />
                        </>
                      )}

                      {/* Level Section */}
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleLayerExpanded(layer.id)}
                          className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {expandedLayers.has(layer.id) ? (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: layer.color }}
                            />
                            <Badge variant="primary" size="md">
                              Level {layerNumber}
                            </Badge>
                            <Typography variant="small" color="muted">
                              ({layer.concepts.length} concepts)
                            </Typography>
                          </div>
                        </button>

                        {expandedLayers.has(layer.id) && (
                          <div className="px-4 pb-4">
                            {/* Learning Goal Display for Level */}
                            {layerGoals[layer.id] !== undefined && (
                              <div className="mb-4">
                                <LearningGoalDisplay
                                  goal={layerGoals[layer.id]}
                                  layerNumber={layerNumber}
                                  graphId={graphId}
                                  onGoalUpdated={(newGoal) => {
                                    onLayerGoalUpdate?.(layer.id, newGoal);
                                  }}
                                  onSave={async (goal) => {
                                    onLayerGoalUpdate?.(layer.id, goal);
                                  }}
                                />
                              </div>
                            )}
                            <div className="space-y-3">
                              {layer.concepts.map(concept => (
                                <ConceptCard
                                  key={concept.id}
                                  {...concept}
                                  onClick={() => onConceptClick?.(concept.id)}
                                />
                              ))}
                              {layer.concepts.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                  No concepts in this level
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}

                {/* Load Next Level Button - shown after all layers */}
                {onExpand && filteredLayers.length > 0 && (
                  <div className="flex justify-center pt-6 pb-2">
                    <button
                      type="button"
                      onClick={onExpand}
                      disabled={isExpanding}
                      className={cn(
                        'flex items-center gap-2 px-6 py-3 text-base font-medium rounded-xl transition-all shadow-md hover:shadow-lg',
                        'bg-gradient-to-r from-indigo-600 to-purple-600 text-white',
                        'hover:from-indigo-700 hover:to-purple-700',
                        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md'
                      )}
                    >
                      {isExpanding ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          Load Next Level
                        </>
                      )}
                    </button>
                  </div>
                )}

                {filteredLayers.length === 0 && (
                  <div className="space-y-6">
                    <EmptyState
                      title="No concepts found"
                      description="Start by loading the first level of concepts"
                      actionLabel={onExpand ? undefined : "Add Concept"}
                      onAction={onExpand ? undefined : () => onAddConcept?.(layers[0]?.id)}
                    />
                    {/* Load First Level Button when no layers exist */}
                    {onExpand && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={onExpand}
                          disabled={isExpanding}
                          className={cn(
                            'flex items-center gap-2 px-6 py-3 text-base font-medium rounded-xl transition-all shadow-md hover:shadow-lg',
                            'bg-gradient-to-r from-indigo-600 to-purple-600 text-white',
                            'hover:from-indigo-700 hover:to-purple-700',
                            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md'
                          )}
                        >
                          {isExpanding ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Plus className="w-5 h-5" />
                              Load First Level
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Graph View */}
            {viewMode === 'graph' && (
              <div className="min-h-[400px] sm:min-h-[500px] md:min-h-[600px] relative">
                <ForceGraph
                  nodes={forceGraphNodes}
                  edges={forceGraphEdges}
                  onNodeClick={handleNodeClick}
                  onNodeDeselect={handleNodeDeselect}
                  selectedNodeId={selectedNode?.id || null}
                  showLabels={true}
                  showZoomControls={true}
                  showLegend={true}
                  legendItems={legendItemsMemo}
                  colorPalette={Object.values(NODE_TYPE_COLORS).map(nt => nt.color)}
                  emptyMessage="No graph data available"
                  className="h-full"
                />

                {/* JSON Viewer for selected node */}
                {selectedNode && selectedNode.nodeData && (
                  <>
                    {/* Desktop: Side panel */}
                    {typeof window !== 'undefined' && window.innerWidth >= 1024 && (
                      <div className="absolute top-4 right-4 z-10 w-96 max-h-[calc(100%-2rem)] hidden lg:block">
                        <Card className="p-4 bg-white dark:bg-gray-800 shadow-lg">
                          <div className="flex items-center justify-between mb-3">
                            <Typography variant="h6" className="truncate">
                              {selectedNode.label}
                            </Typography>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={X}
                              onClick={() => setSelectedNode(null)}
                              aria-label="Close JSON viewer"
                            >
                              <span className="sr-only">Close</span>
                            </Button>
                          </div>
                          <JsonViewer
                            data={selectedNode.nodeData}
                            title={`Node: ${selectedNode.nodeType || 'Unknown'}`}
                            maxHeight="calc(100vh - 200px)"
                          />
                        </Card>
                      </div>
                    )}

                    {/* Mobile: Modal */}
                    {typeof window !== 'undefined' && window.innerWidth < 1024 && (
                      <Modal
                        isOpen={true}
                        onClose={() => setSelectedNode(null)}
                        title={`Node: ${selectedNode.label}`}
                        size="lg"
                      >
                        <JsonViewer
                          data={selectedNode.nodeData}
                          title={`Node: ${selectedNode.nodeType || 'Unknown'}`}
                          maxHeight="calc(90vh - 150px)"
                        />
                      </Modal>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Mindmap View */}
            {viewMode === 'mindmap' && (
              <div className="min-h-[400px] sm:min-h-[500px] md:min-h-[600px] relative">
                {/* Layout controls */}
                <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-20 flex items-center gap-2">
                  <Typography variant="small" className="text-gray-500 text-xs sm:text-sm hidden sm:block">
                    Layout:
                  </Typography>
                  <SelectDropdown
                    options={[
                      { value: 'horizontal', label: 'Horizontal' },
                      { value: 'vertical', label: 'Vertical' },
                    ]}
                    value={mindmapLayout === 'radial' ? 'horizontal' : mindmapLayout}
                    onChange={(value) => setMindmapLayout(value as MindmapLayout)}
                    className="w-24 sm:w-32"
                  />
                </div>

                <TreeMap
                  data={(() => {
                    // Build tree from goal and layers
                    const rootNode: TreeMapNode = {
                      id: goal?.id || 'root',
                      label: goal?.text || 'Knowledge Graph',
                      isRoot: true,
                      children: layers.map(layer => ({
                        id: layer.id,
                        label: layer.name,
                        color: layer.color,
                        children: layer.concepts.map(concept => ({
                          id: concept.id,
                          label: concept.name,
                          description: concept.description,
                          color: layer.color,
                        })),
                      })),
                    };
                    return rootNode;
                  })()}
                  selectedId={selectedConceptId}
                  onNodeClick={(nodeId) => onConceptClick?.(nodeId)}
                  layout={mindmapLayout === 'radial' ? 'horizontal' : mindmapLayout}
                  collapsible={true}
                  defaultExpanded={true}
                  showZoomControls={true}
                  colorPalette={['#8b5cf6', ...layers.map(l => l.color)]}
                  emptyMessage="No concepts to display"
                  className="h-full"
                />

                {/* Expand/Collapse controls */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2">
                  <Button variant="secondary" size="sm">
                    Expand All
                  </Button>
                  <Button variant="secondary" size="sm">
                    Collapse All
                  </Button>
                  <Button variant="secondary" size="sm">
                    Center View
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* Concept Navigation Footer */}
      {(previousConcept || nextConcept) && (
        <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
          <ConceptNavigation
            previousConcept={previousConcept}
            nextConcept={nextConcept}
            onPreviousClick={onPreviousConceptClick}
            onNextClick={onNextConceptClick}
          />
        </div>
      )}

      {/* Detail panel (deprecated - use customMainContent for full-page detail views) */}
      {showDetailPanel && detailPanelContent && !customMainContent && (
        <>
          {/* Desktop: Side Panel */}
          {typeof window !== 'undefined' && window.innerWidth >= 1024 && (
            <SidePanel
              title="Concept Details"
              isOpen={showDetailPanel}
              onClose={onCloseDetailPanel || (() => { })}
            >
              {detailPanelContent}
            </SidePanel>
          )}

          {/* Mobile: Modal */}
          {typeof window !== 'undefined' && window.innerWidth < 1024 && (
            <Modal
              isOpen={showDetailPanel}
              onClose={onCloseDetailPanel || (() => { })}
              title="Concept Details"
              size="lg"
            >
              {detailPanelContent}
            </Modal>
          )}
        </>
      )}

      {/* LLM Chat Panel */}
      <SidePanel
        title="AI Assistant"
        isOpen={llmPanelOpen}
        onClose={() => setLlmPanelOpen(false)}
        width="w-96"
      >
        <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
          {/* Graph Mutations Section */}
          {graphMutations && graphMutations.length > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <Typography variant="h6" className="mb-3">Recent Changes</Typography>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {graphMutations.map((mutation: { id: string; type: 'add' | 'update' | 'delete'; description: string; timestamp: Date }) => (
                  <Card key={mutation.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <Badge
                        variant={
                          mutation.type === 'add' ? 'success' :
                            mutation.type === 'update' ? 'warning' : 'danger'
                        }
                        size="sm"
                      >
                        {mutation.type}
                      </Badge>
                      <Typography variant="small" className="flex-1">
                        {mutation.description}
                      </Typography>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Chat Box */}
          <div className="flex-1 min-h-0">
            <ChatBox
              messages={llmMessages || []}
              onSend={onLLMMessageSend || (() => { })}
              loading={isLLMLoading || false}
              placeholder="Ask about your knowledge graph..."
            />
          </div>
        </div>
      </SidePanel>

      {/* Floating Action Button */}
      <FloatingActionButton
        action={{
          icon: Sparkles,
          onClick: () => setLlmPanelOpen(true),
          label: 'Open AI Assistant',
          variant: 'primary',
        }}
        position="bottom-right"
      />
    </AppLayoutTemplate>
  );
};

KnowledgeGraphTemplate.displayName = 'KnowledgeGraphTemplate';

