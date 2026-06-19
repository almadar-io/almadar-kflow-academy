import React from "react";
import {
  Badge,
  Box,
  Card,
  Icon,
  ProgressBar,
  Typography,
  HStack,
  VStack,
  useEventBus,
} from "@almadar/ui";
import { cn } from "@almadar/ui";
import { BookOpen, ExternalLink, Network } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { KnowledgeNode, KnowledgeNodeType, KnowledgeDomainType } from "../../types/knowledge";
import { DOMAIN_COLORS, DOMAIN_LABELS } from "../../utils/knowledgeConstants";

const NODE_TYPE_ICONS: Record<KnowledgeNodeType, LucideIcon> = {
  concept: BookOpen,
  resource: ExternalLink,
  root: Network,
};

export interface KnowledgeNodeCardProps {
  node: KnowledgeNode;
  selectNodeEvent?: string;
  className?: string;
}

export const KnowledgeNodeCard: React.FC<KnowledgeNodeCardProps> = ({
  node,
  selectNodeEvent,
  className,
}) => {
  const { emit } = useEventBus();

  const handleClick = () => {
    if (selectNodeEvent) emit(`UI:${selectNodeEvent}`, { nodeId: node.id });
  };

  const domainColors = DOMAIN_COLORS[node.domain] ?? DOMAIN_COLORS.formal;
  const domainLabel = DOMAIN_LABELS[node.domain] ?? node.domain;

  return (
    <Card
      className={className}
      onClick={handleClick}
      variant={selectNodeEvent ? "interactive" : "default"}
    >
      <VStack gap="sm" className="p-3">
        <HStack gap="sm" align="center">
          <Icon icon={NODE_TYPE_ICONS[node.nodeType]} size="sm" />
          <Typography variant="label" size="sm" truncate className="flex-1">
            {node.title}
          </Typography>
          <Badge
            size="sm"
            className={cn(domainColors.bg, domainColors.text, `border ${domainColors.border}`)}
          >
            {domainLabel}
          </Badge>
        </HStack>

        {node.description && (
          <Typography variant="body" size="xs" color="muted" overflow="clamp-2">
            {node.description}
          </Typography>
        )}

        <HStack gap="md" align="center">
          <ProgressBar
            value={node.depth}
            max={11}
            progressType="stepped"
            steps={12}
            variant="primary"
            label={`Depth ${node.depth}`}
          />
          {node.childIds.length > 0 && (
            <Typography variant="body" size="xs" color="muted">
              {node.childIds.length} children
            </Typography>
          )}
        </HStack>
      </VStack>
    </Card>
  );
};

KnowledgeNodeCard.displayName = "KnowledgeNodeCard";
