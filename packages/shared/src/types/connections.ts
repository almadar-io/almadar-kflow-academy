// Peer-connection DTOs shared between kflow client and server.
// Privacy invariant: no DTO ever carries a uid. Peers are addressed by an opaque `peerRef`
// token that the server resolves to a uid; identity never crosses the trust boundary.

export type NodeKind = 'concept' | 'path';

/** Stable key for a peer-connectable node. */
export type NodeKey = `${NodeKind}:${string}`;

export function nodeKey(kind: NodeKind, canonicalId: string): NodeKey {
  return `${kind}:${canonicalId}` as NodeKey;
}

/** Anonymous peer row in the connect modal. */
export interface PeerDTO {
  /** Opaque, non-identifying token used to address a connect request (NOT a uid). */
  peerRef: string;
  /** Ephemeral display label; carries no identity. */
  anonymousHandle: string;
  /** Distinct canonical concepts the peer has engaged with (breadth signal). */
  conceptsCompleted: number;
  /** Trajectory convergence to the caller, 0–100. */
  convergencePct: number;
  /** Peer was active on this node within ~5 min. */
  activeNow: boolean;
}

export interface ConnectionBadge {
  id: string;
  label: string;
  /** v1: always 'subtopic' (AI-generated). 'friction' is a fast-follow. */
  kind: 'subtopic' | 'friction';
  active: boolean;
}

export interface MessageModeration {
  /** Relevance to the active badge, 0–1. */
  score: number;
  flagged: boolean;
  reason?: string;
}

export interface MessageDTO {
  id: string;
  /** True if this message was sent by the viewer (renders on the viewer's side). */
  fromViewer: boolean;
  content: string;
  createdAt: number;
  activeBadgeId?: string;
  moderation?: MessageModeration;
}

export interface PeerSnapshot {
  anonymousHandle: string;
  conceptsCompleted: number;
}

export interface ConnectionDTO {
  id: string;
  origin: { kind: NodeKind; canonicalId: string };
  badges: ConnectionBadge[];
  status: 'active' | 'archived';
  peer: PeerSnapshot;
  messages: MessageDTO[];
}

export interface CreateConnectionRequest {
  peerRef: string;
  origin: { kind: NodeKind; canonicalId: string };
}

export interface SendMessageRequest {
  content: string;
  activeBadgeId?: string;
}
