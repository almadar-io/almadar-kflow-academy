/**
 * KnowledgeGraphTemplate - Template for displaying a knowledge graph with layer navigation
 *
 * Pure declarative wrapper for KnowledgeGraphBoard organism.
 * No hooks, no callbacks, no local state.
 *
 * Page: KnowledgeGraphPage
 * Entity: KnowledgeGraph
 * ViewType: detail
 *
 * Events Emitted (via KnowledgeGraphBoard):
 * - UI:SELECT_NODE - When a graph node is selected
 * - UI:TOGGLE_VIEW - When switching between graph and list view
 * - UI:VIEW_CONCEPT - When viewing a concept's details
 */

import React from "react";
import { KnowledgeGraphBoard } from "../organisms/KnowledgeGraphBoard";
import type { KnowledgeGraphEntity } from "../organisms/KnowledgeGraphBoard";

export type { KnowledgeGraphEntity } from "../organisms/KnowledgeGraphBoard";

/** Minimal graph shape emitted by the orbital compiler */
interface GraphLike {
  id: string;
  name: string;
  description?: string;
  seedConcept?: string;
  conceptCount?: number;
  levelCount?: number;
}

export interface KnowledgeGraphTemplateProps {
  entity?: KnowledgeGraphEntity | KnowledgeGraphEntity[] | GraphLike[];
  defaultView?: "graph" | "list";
  showLayerNav?: boolean;
  showLegend?: boolean;
  className?: string;
}

function isGraphLike(item: unknown): item is GraphLike {
  return (
    typeof item === "object" &&
    item !== null &&
    "name" in item &&
    !("nodes" in item)
  );
}

function fromGraphLike(g: GraphLike): KnowledgeGraphEntity {
  return {
    id: g.id,
    title: g.name,
    description: g.description,
    nodes: [],
    links: [],
    layers: Array.from({ length: g.levelCount ?? 1 }, (_, i) => ({
      number: i,
      name: `Layer ${i}`,
    })),
    currentLayer: 0,
    learningGoal: g.seedConcept,
  };
}

export const KnowledgeGraphTemplate = ({
  entity,
  defaultView,
  showLayerNav,
  showLegend,
  className,
}: KnowledgeGraphTemplateProps) => {
  if (!entity || (Array.isArray(entity) && entity.length === 0)) return null;

  let resolved: KnowledgeGraphEntity | KnowledgeGraphEntity[];
  if (Array.isArray(entity)) {
    const first = entity[0];
    resolved = isGraphLike(first)
      ? fromGraphLike(first as GraphLike)
      : (first as KnowledgeGraphEntity);
  } else {
    resolved = entity as KnowledgeGraphEntity;
  }

  return (
    <KnowledgeGraphBoard
      entity={resolved}
      defaultView={defaultView}
      showLayerNav={showLayerNav}
      showLegend={showLegend}
      selectNodeEvent="SELECT_NODE"
      toggleViewEvent="TOGGLE_VIEW"
      viewConceptEvent="VIEW_CONCEPT"
      className={className}
    />
  );
};

KnowledgeGraphTemplate.displayName = "KnowledgeGraphTemplate";
