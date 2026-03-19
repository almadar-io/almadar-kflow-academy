/**
 * LearningPathTemplate - AI-suggested learning journeys across domains.
 *
 * Pure declarative wrapper for LearningPathBoard organism.
 * No hooks, no callbacks, no local state.
 *
 * Page: LearningPathPage
 * Entity: KnowledgeNode[] path + connections + domain endpoints
 * ViewType: detail
 *
 * Events Emitted (via LearningPathBoard):
 * - UI:SELECT_NODE — When a path node is clicked
 */

import React from "react";
import { LearningPathBoard } from "../organisms/LearningPathBoard";
import type { LearningPathEntity } from "../organisms/LearningPathBoard";
import type { KnowledgeDomainType } from "../types/knowledge";

export type { LearningPathEntity } from "../organisms/LearningPathBoard";

/** Minimal node shape emitted by the orbital compiler */
interface NodeLike {
  id: string;
  title: string;
  description?: string;
  domain: string;
  discipline: string;
  subject: string;
  depth: number;
  parentId?: string;
  childIds?: string[];
  resourceUrls?: string[];
  nodeType?: string;
}

export interface LearningPathTemplateProps {
  entity?: LearningPathEntity | NodeLike[] | unknown[];
  className?: string;
}

export const LearningPathTemplate = ({
  entity,
  className,
}: LearningPathTemplateProps) => {
  if (!entity || (Array.isArray(entity) && entity.length === 0)) return null;

  const resolved: LearningPathEntity = Array.isArray(entity)
    ? {
        path: (entity as NodeLike[]).map((n) => ({
          id: n.id,
          title: n.title,
          description: n.description ?? "",
          domain: n.domain as KnowledgeDomainType,
          discipline: n.discipline,
          subject: n.subject,
          depth: n.depth,
          parentId: n.parentId ?? "",
          childIds: n.childIds ?? [],
          resourceUrls: n.resourceUrls ?? [],
          notes: "",
          nodeType: (n.nodeType ?? "concept") as "concept" | "resource" | "root",
        })),
        connections: [],
        startDomain:
          ((entity as NodeLike[])[0]?.domain as KnowledgeDomainType) ??
          "formal",
        endDomain:
          ((entity as NodeLike[])[(entity as NodeLike[]).length - 1]
            ?.domain as KnowledgeDomainType) ?? "formal",
      }
    : (entity as LearningPathEntity);

  return (
    <LearningPathBoard
      entity={resolved}
      selectNodeEvent="SELECT_NODE"
      className={className}
    />
  );
};

LearningPathTemplate.displayName = "LearningPathTemplate";
