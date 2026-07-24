import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import type { Suggestion, SuggestionType, SuggestionAction, SuggestionParams } from '@kflow-academy/shared';
import { analyzeTrajectory } from './companionService';
import { getGraphVersion } from './graphVersionService';

const log = createLogger('kflow:server:services:companionSuggestionService');

const COLLECTION = 'companionSuggestions';
const STALE_MS = 24 * 60 * 60 * 1000;

type SuggestionStatus = 'active' | 'accepted' | 'dismissed' | 'superseded';

interface StoredSuggestion {
  uid: string;
  sig: string;
  type: SuggestionType;
  action: SuggestionAction;
  target: string;
  nodeId: string | null;
  params: SuggestionParams;
  status: SuggestionStatus;
  graphVersion: number;
  createdAt: number;
  resolvedAt: number | null;
}

export function suggestionSig(s: Pick<Suggestion, 'type' | 'action' | 'target' | 'nodeId'>): string {
  return `${s.type}:${s.action}:${s.target}:${s.nodeId ?? ''}`;
}

function collection(uid: string) {
  return getFirestore().collection(`users/${uid}/${COLLECTION}`);
}

export async function getActiveSuggestions(uid: string): Promise<Suggestion[]> {
  const snapshot = await collection(uid)
    .where('status', '==', 'active')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data() as StoredSuggestion;
    return {
      type: data.type,
      action: data.action,
      target: data.target,
      nodeId: data.nodeId ?? undefined,
      params: data.params,
    } satisfies Suggestion;
  });
}

export async function resolveSuggestion(uid: string, sig: string, status: 'accepted' | 'dismissed'): Promise<void> {
  const snapshot = await collection(uid).where('sig', '==', sig).limit(1).get();
  if (snapshot.empty) {
    log.debug('resolveSuggestion: not found', { uid, sig });
    return;
  }
  await snapshot.docs[0].ref.update({ status, resolvedAt: Date.now() });
  log.info('resolveSuggestion', { uid, sig, status });
}

async function getDismissedSigs(uid: string): Promise<Set<string>> {
  const snapshot = await collection(uid)
    .where('status', '==', 'dismissed')
    .get();
  return new Set(snapshot.docs.map(doc => (doc.data() as StoredSuggestion).sig));
}

async function clearActiveSuggestions(uid: string): Promise<void> {
  const snapshot = await collection(uid)
    .where('status', '==', 'active')
    .get();
  const batch = getFirestore().batch();
  for (const doc of snapshot.docs) {
    batch.update(doc.ref, { status: 'superseded', resolvedAt: Date.now() });
  }
  await batch.commit();
}

async function storeSuggestion(uid: string, suggestion: Suggestion, graphVersion: number): Promise<void> {
  const sig = suggestionSig(suggestion);
  const existing = await collection(uid).where('sig', '==', sig).limit(1).get();
  if (!existing.empty) return;

  const stored: StoredSuggestion = {
    uid,
    sig,
    type: suggestion.type,
    action: suggestion.action,
    target: suggestion.target,
    nodeId: suggestion.nodeId ?? null,
    params: suggestion.params,
    status: 'active',
    graphVersion,
    createdAt: Date.now(),
    resolvedAt: null,
  };
  await collection(uid).add(stored);
}

export interface EnsureSuggestionsResult {
  suggestions: Suggestion[];
  fromCache: boolean;
}

export async function ensureSuggestions(
  uid: string,
  skillName?: string,
  locale?: string,
): Promise<EnsureSuggestionsResult> {
  const currentVersion = await getGraphVersion(uid);

  const active = await getActiveSuggestions(uid);

  if (active.length > 0) {
    const newestDoc = await collection(uid)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    const newest = newestDoc.docs[0]?.data() as StoredSuggestion | undefined;
    const isStale = newest ? Date.now() - newest.createdAt > STALE_MS : true;
    const graphChanged = newest ? newest.graphVersion !== currentVersion : true;

    if (!isStale && !graphChanged) {
      log.info('ensureSuggestions: serving from cache', { uid, count: active.length, version: currentVersion });
      return { suggestions: active, fromCache: true };
    }

    log.info('ensureSuggestions: cache stale, re-analyzing', { uid, isStale, graphChanged });
    await clearActiveSuggestions(uid);
  }

  log.info('ensureSuggestions: running fresh analysis', { uid, skillName, locale });
  const result = await analyzeTrajectory(uid, skillName, locale);
  const dismissed = await getDismissedSigs(uid);

  const candidate = result.suggestion;
  const sig = suggestionSig(candidate);

  if (dismissed.has(sig)) {
    log.info('ensureSuggestions: top suggestion was previously dismissed, skipping', { uid, sig });
    return { suggestions: [], fromCache: false };
  }

  await storeSuggestion(uid, candidate, currentVersion);

  return { suggestions: [candidate], fromCache: false };
}
