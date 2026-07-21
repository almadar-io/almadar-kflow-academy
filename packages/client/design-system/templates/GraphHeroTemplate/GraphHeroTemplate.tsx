/**
 * GraphHeroTemplate
 *
 * Shared layout rhythm for any "graph detail" surface: a full-bleed hero region
 * (the knowledge graph canvas) on top, a narrower content/list region below —
 * both centered, the list visually subordinate to the canvas. The canvas is
 * capped at max-w-4xl, the list/toolbar at max-w-2xl, so the page reads as a
 * focused column regardless of viewport width.
 *
 * Pure layout: owns only the max-width + centering rhythm. Each slot provides
 * its own Card / content; this template never double-wraps.
 */

import React from 'react';
import { VStack } from '@almadar/ui';

export interface GraphHeroTemplateProps {
  /** Optional content above the canvas (page title, goal header, stats). Full width. */
  heroSlot?: React.ReactNode;
  /** The graph-canvas region. Centered, capped at max-w-4xl. */
  canvasSlot?: React.ReactNode;
  /** Content between canvas and list (level stepper, or search/filter). Capped at max-w-2xl. */
  toolbarSlot?: React.ReactNode;
  /** The list region. Centered, capped at max-w-2xl (narrower than the canvas). */
  listSlot?: React.ReactNode;
  /** Optional content below the list. Full width. */
  footerSlot?: React.ReactNode;
  className?: string;
}

export const GraphHeroTemplate: React.FC<GraphHeroTemplateProps> = ({
  heroSlot,
  canvasSlot,
  toolbarSlot,
  listSlot,
  footerSlot,
  className,
}) => (
  <VStack gap="xl" className={className}>
    {heroSlot && <div className="w-full">{heroSlot}</div>}
    {canvasSlot && <div className="w-full max-w-4xl mx-auto">{canvasSlot}</div>}
    {toolbarSlot && <div className="w-full max-w-2xl mx-auto">{toolbarSlot}</div>}
    {listSlot && <div className="w-full max-w-2xl mx-auto">{listSlot}</div>}
    {footerSlot && <div className="w-full">{footerSlot}</div>}
  </VStack>
);

GraphHeroTemplate.displayName = 'GraphHeroTemplate';
