import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:server:services:graphVersionService');

const STATE_DOC = 'companionState';

function docRef(uid: string) {
  return getFirestore().doc(`users/${uid}/profile/${STATE_DOC}`);
}

export async function getGraphVersion(uid: string): Promise<number> {
  const snap = await docRef(uid).get();
  const data = snap.data();
  return typeof data?.graphVersion === 'number' ? data.graphVersion : 0;
}

export async function bumpGraphVersion(uid: string): Promise<void> {
  const ref = docRef(uid);
  const snap = await ref.get();
  const current = snap.exists && typeof snap.data()?.graphVersion === 'number'
    ? snap.data()!.graphVersion
    : 0;
  await ref.set({ graphVersion: current + 1 }, { merge: true });
  log.debug('bumpGraphVersion', { uid, version: current + 1 });
}
