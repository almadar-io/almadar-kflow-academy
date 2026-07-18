import { convergenceScore } from '@almadar-io/knowledge/server';
import { createLogger } from '@almadar/logger';
import { graphAccessDeps } from '../utils/graphHandlerDeps';
import { anonymousHandleFor } from '../utils/anonymousHandle';
import { listRecentMembers, isActiveNow } from './nodeActivityService';
import { issuePeerToken } from './peerTokenService';
import type { NodeKey, PeerDTO } from '@kflow-academy/shared';

const log = createLogger('kflow:server:peerMatchService');

/**
 * Build the anonymous peer list for a node: recent human members (node-activity) enriched
 * with Chroma-derived canonical sets + convergence to the caller. No uid or node text
 * leaves this function — peers are addressed by opaque tokens.
 */
export async function listPeersForNode(
  callerUid: string,
  nodeKey: NodeKey,
): Promise<PeerDTO[]> {
  const members = await listRecentMembers(nodeKey, callerUid);
  if (members.length === 0) return [];

  const vector = graphAccessDeps.accessLayer.getVectorService();
  const callerSet = await vector.getCanonicalConceptsByOwner(callerUid);

  const enriched = await Promise.all(
    members.map(async (m) => ({
      m,
      set: await vector.getCanonicalConceptsByOwner(m.uid),
    })),
  );

  const now = Date.now();
  const rows: PeerDTO[] = await Promise.all(
    enriched.map(async ({ m, set }) => ({
      peerRef: await issuePeerToken(m.uid, nodeKey),
      anonymousHandle: m.anonymousHandle || anonymousHandleFor(m.uid),
      conceptsCompleted: set.count,
      convergencePct: Math.round(
        convergenceScore(callerSet.canonicalNames, set.canonicalNames) * 100,
      ),
      activeNow: isActiveNow(m.lastSeenOnNode, now),
    })),
  );

  rows.sort((a, b) => b.convergencePct - a.convergencePct || Number(b.activeNow) - Number(a.activeNow));
  log.debug('listPeersForNode', { nodeKey, callerConvergence: callerSet.count, peers: rows.length });
  return rows;
}
