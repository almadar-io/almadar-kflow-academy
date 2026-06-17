/**
 * KnowledgeExplorerTemplate - Main entry point for knowledge exploration
 *
 * Pure declarative wrapper for DomainExplorerBoard organism.
 * No hooks, no callbacks, no local state.
 *
 * Page: KnowledgeExplorerPage
 * Entity: KnowledgeDomain[] + KnowledgeSubject[]
 * ViewType: explorer
 *
 * Events Emitted (via DomainExplorerBoard):
 * - UI:SELECT_SUBJECT — When a subject row is clicked
 */

import React from "react";
import { DomainExplorerBoard } from "../organisms/DomainExplorerBoard";
import type { DomainExplorerEntity } from "../organisms/DomainExplorerBoard";
import type { KnowledgeNode, KnowledgeDomain, KnowledgeSubject, KnowledgeDomainType } from "../types/knowledge";

export type { DomainExplorerEntity } from "../organisms/DomainExplorerBoard";

/** Minimal node shape emitted by the orbital compiler */
interface NodeLike {
  id: string;
  title: string;
  domain: string;
  discipline: string;
  subject: string;
  depth: number;
  parentId?: string;
}

export interface KnowledgeExplorerTemplateProps {
  entity?: DomainExplorerEntity | NodeLike[];
  className?: string;
}

const DOMAIN_NAMES: Record<string, string> = {
  formal: "Formal Sciences",
  natural: "Natural Sciences",
  social: "Social Sciences",
};

function fromNodeArray(nodes: NodeLike[]): DomainExplorerEntity {
  const domainTypes: KnowledgeDomainType[] = ["formal", "natural", "social"];

  const domains: KnowledgeDomain[] = domainTypes.map((dt) => {
    const dn = nodes.filter((n) => n.domain === dt);
    return {
      id: dt,
      name: DOMAIN_NAMES[dt] ?? dt,
      domain: dt,
      description: "",
      subjectCount: new Set(dn.map((n) => n.subject)).size,
      nodeCount: dn.length,
      maxDepth: dn.reduce((m, n) => Math.max(m, n.depth), 0),
    };
  });

  const subjectMap = new Map<string, NodeLike[]>();
  for (const node of nodes) {
    const key = `${node.domain}:${node.subject}`;
    const bucket = subjectMap.get(key);
    if (bucket) bucket.push(node);
    else subjectMap.set(key, [node]);
  }

  const subjects: KnowledgeSubject[] = Array.from(subjectMap.entries()).map(
    ([, bucket]) => {
      const first = bucket[0];
      return {
        id: `${first.domain}:${first.subject}`,
        name: first.subject,
        domain: first.domain as KnowledgeDomainType,
        discipline: first.discipline,
        nodeCount: bucket.length,
        maxDepth: bucket.reduce((m, n) => Math.max(m, n.depth), 0),
        fileSize: 0,
        rootNodeId: bucket.find((n) => !n.parentId)?.id ?? first.id,
      };
    }
  );

  return { domains, subjects };
}

export const KnowledgeExplorerTemplate = ({
  entity,
  className,
}: KnowledgeExplorerTemplateProps) => {
  if (!entity || (Array.isArray(entity) && entity.length === 0)) return null;

  const resolved: DomainExplorerEntity = Array.isArray(entity)
    ? fromNodeArray(entity as NodeLike[])
    : (entity as DomainExplorerEntity);

  return (
    <DomainExplorerBoard
      entity={resolved}
      selectSubjectEvent="SELECT_SUBJECT"
      className={className}
    />
  );
};

KnowledgeExplorerTemplate.displayName = "KnowledgeExplorerTemplate";
