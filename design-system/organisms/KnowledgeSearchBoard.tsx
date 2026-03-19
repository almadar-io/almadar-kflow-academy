/**
 * KnowledgeSearchBoard Organism
 *
 * Global search across all knowledge nodes. Results grouped by domain with
 * filter tabs and depth range filtering.
 *
 * Events Emitted:
 * - UI:SELECT_NODE — When a result node is clicked
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  Box,
  VStack,
  HStack,
  Typography,
  Input,
  Button,
  EmptyState,
  useEventBus,
  type EntityDisplayProps,
} from "@almadar/ui";
import { Search } from "lucide-react";
import type { KnowledgeNode, KnowledgeDomainType } from "../types/knowledge";
import { KnowledgeNodeCard } from "../molecules/KnowledgeNodeCard";
import { DomainBadge } from "../atoms/DomainBadge";
import { DOMAIN_LABELS } from "../utils/knowledgeConstants";

type DomainFilter = "all" | KnowledgeDomainType;

export interface KnowledgeSearchEntity {
  nodes: KnowledgeNode[];
}

export interface KnowledgeSearchBoardProps extends EntityDisplayProps<KnowledgeSearchEntity> {
  selectNodeEvent?: string;
  query?: string;
}

const MAX_RESULTS = 50;

export function KnowledgeSearchBoard({
  entity,
  selectNodeEvent,
  query = "",
  className = "",
}: KnowledgeSearchBoardProps): React.JSX.Element | null {
  const { emit } = useEventBus();
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");

  const data = (entity && typeof entity === 'object' && !Array.isArray(entity)) ? entity as KnowledgeSearchEntity : undefined;
  const nodes = data?.nodes ?? [];

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    let filtered = nodes.filter((node) => {
      const matchesQuery =
        node.title.toLowerCase().includes(q) ||
        node.description.toLowerCase().includes(q) ||
        node.subject.toLowerCase().includes(q) ||
        node.discipline.toLowerCase().includes(q);
      return matchesQuery;
    });

    if (domainFilter !== "all") {
      filtered = filtered.filter((n) => n.domain === domainFilter);
    }

    filtered.sort((a, b) => {
      const aExact = a.title.toLowerCase() === q ? 0 : 1;
      const bExact = b.title.toLowerCase() === q ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.depth - b.depth;
    });

    return filtered.slice(0, MAX_RESULTS);
  }, [nodes, query, domainFilter]);

  const domainCounts = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { all: 0, formal: 0, natural: 0, social: 0 };

    const counts = { all: 0, formal: 0, natural: 0, social: 0 };
    for (const node of nodes) {
      const matchesQuery =
        node.title.toLowerCase().includes(q) ||
        node.description.toLowerCase().includes(q) ||
        node.subject.toLowerCase().includes(q) ||
        node.discipline.toLowerCase().includes(q);
      if (matchesQuery) {
        counts.all++;
        counts[node.domain]++;
      }
    }
    return counts;
  }, [nodes, query]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    emit('UI:SEARCH_QUERY_CHANGE', { query: e.target.value });
  }, [emit]);

  const handleClear = useCallback(() => {
    emit('UI:SEARCH_QUERY_CHANGE', { query: '' });
  }, [emit]);

  const domainTabs: Array<{ key: DomainFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "formal", label: DOMAIN_LABELS.formal },
    { key: "natural", label: DOMAIN_LABELS.natural },
    { key: "social", label: DOMAIN_LABELS.social },
  ];

  return (
    <VStack gap="md" className={className}>
      <Typography variant="h2" size="xl">
        Knowledge Search
      </Typography>

      <Input
        inputType="search"
        placeholder="Search concepts, subjects, disciplines..."
        value={query}
        onChange={handleSearchChange}
        icon={Search}
        clearable
        onClear={handleClear}
      />

      {query.trim() && (
        <HStack gap="xs">
          {domainTabs.map(({ key, label }) => {
            const handleFilterClick = () => setDomainFilter(key);
            return (
            <Button
              key={key}
              variant={domainFilter === key ? "primary" : "ghost"}
              size="sm"
              onClick={handleFilterClick}
            >
              <HStack gap="xs" align="center">
                {key !== "all" && <DomainBadge domain={key} size="sm" />}
                {key === "all" ? label : ""}
                <Typography variant="body" size="xs">
                  ({domainCounts[key]})
                </Typography>
              </HStack>
            </Button>
            );
          })}
        </HStack>
      )}

      <Box>
        {!query.trim() && (
          <EmptyState
            icon={Search}
            title="Search your knowledge"
            description={`Type to search across ${nodes.length.toLocaleString()} knowledge nodes.`}
          />
        )}

        {query.trim() && results.length === 0 && (
          <EmptyState
            icon={Search}
            title="No results"
            description={`No results found for "${query}".`}
          />
        )}

        {results.length > 0 && (
          <VStack gap="sm">
            <Typography variant="body" size="xs" color="muted">
              {domainCounts[domainFilter] > MAX_RESULTS
                ? `Showing ${MAX_RESULTS} of ${domainCounts[domainFilter]} results`
                : `${results.length} results`}
            </Typography>
            {results.map((node) => (
              <Box key={node.id} data-entity-row={node.id}>
                <KnowledgeNodeCard
                  node={node}
                  selectNodeEvent={selectNodeEvent}
                />
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
  );
}

KnowledgeSearchBoard.displayName = "KnowledgeSearchBoard";
