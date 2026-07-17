import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { graphAccessDeps } from '../utils/graphHandlerDeps';
import { anonymousHandleFor } from '../utils/anonymousHandle';
import { touchNodeActivity } from './nodeActivityService';
import type { GraphNode } from '@almadar-io/knowledge';
import type { NodeKey } from '@kflow-academy/shared';

const log = createLogger('kflow:server:aiUserService');

export type AiArea = 'Formal' | 'Social' | 'Natural';

export interface AiUserRecord {
  uid: string;
  area: AiArea;
  subdomain: string;
  persona: string;
  anonymousHandle: string;
  concepts: string[];
  createdAt: number;
  lastProgressedAt?: number;
}

// Curated canonical concepts per subdomain — grounds each AI user in a real knowledge area
// so convergence surfaces them on the right nodes. Richer seeding from docs/knowledge/mindmaps
// is a fast-follow; this is sufficient for v1 matching.
const DOMAIN_CONCEPTS: Record<string, { area: AiArea; persona: string; concepts: string[] }> = {
  'formal-computer': {
    area: 'Formal', persona: 'a patient software engineer who loves fundamentals',
    concepts: ['Recursion', 'Data Structures', 'Algorithms', 'Big O Notation', 'Sorting', 'Graphs', 'Dynamic Programming', 'Object-Oriented Programming', 'Functional Programming', 'Concurrency', 'Memory Management', 'Databases', 'Networking', 'Operating Systems'],
  },
  'formal-math': {
    area: 'Formal', persona: 'a careful mathematician who values rigor',
    concepts: ['Linear Algebra', 'Calculus', 'Probability', 'Statistics', 'Discrete Mathematics', 'Geometry', 'Graph Theory', 'Combinatorics', 'Number Theory', 'Differential Equations', 'Logic', 'Abstract Algebra', 'Real Analysis', 'Optimization'],
  },
  'natural-physics': {
    area: 'Natural', persona: 'a curious physicist who thinks in models',
    concepts: ['Classical Mechanics', 'Thermodynamics', 'Electromagnetism', 'Quantum Mechanics', 'Relativity', 'Optics', 'Waves', 'Fluid Dynamics', 'Astrophysics', 'Statistical Mechanics', 'Kinematics', 'Energy', 'Magnetism'],
  },
  'natural-biology': {
    area: 'Natural', persona: 'a biology enthusiast who connects ideas across scales',
    concepts: ['Cell Biology', 'Genetics', 'Evolution', 'Ecology', 'Anatomy', 'Physiology', 'Molecular Biology', 'Microbiology', 'Neuroscience', 'Botany', 'Immunology', 'Biochemistry', 'Photosynthesis', 'DNA'],
  },
  'natural-chemistry': {
    area: 'Natural', persona: 'a chemist who loves how matter transforms',
    concepts: ['Atomic Structure', 'Chemical Bonding', 'Periodic Table', 'Stoichiometry', 'Acids and Bases', 'Organic Chemistry', 'Inorganic Chemistry', 'Electrochemistry', 'Kinetics', 'Equilibrium', 'Redox', 'Polymers', 'States of Matter'],
  },
  'social-art': {
    area: 'Social', persona: 'a working artist who teaches through practice',
    concepts: ['Drawing', 'Composition', 'Color Theory', 'Perspective', 'Painting', 'Sculpture', 'Digital Art', 'Art History', 'Design Principles', 'Typography', 'Lighting', 'Portraiture', 'Illustration'],
  },
  'social-economy': {
    area: 'Social', persona: 'an economist who explains intuition before equations',
    concepts: ['Supply and Demand', 'Microeconomics', 'Macroeconomics', 'Inflation', 'Monetary Policy', 'Fiscal Policy', 'Trade', 'GDP', 'Markets', 'Elasticity', 'Game Theory', 'Behavioral Economics', 'Interest Rates', 'Unemployment'],
  },
  'social-geography': {
    area: 'Social', persona: 'a geographer who sees people and place together',
    concepts: ['Maps', 'Climate', 'Topography', 'Population', 'Urbanization', 'Biomes', 'Geology', 'Rivers', 'Mountains', 'Cartography', 'Human Geography', 'Physical Geography', 'Ecosystems', 'Weather'],
  },
  'social-history': {
    area: 'Social', persona: 'a historian who tells the story behind events',
    concepts: ['Ancient Civilizations', 'Middle Ages', 'Renaissance', 'Industrial Revolution', 'World Wars', 'Cold War', 'Colonialism', 'Revolution', 'Empire', 'Democracy', 'Reformation', 'Enlightenment', 'Trade Routes'],
  },
  'social-languages-slovenian': {
    area: 'Social', persona: 'a language coach who makes grammar approachable',
    concepts: ['Grammar', 'Vocabulary', 'Pronunciation', 'Cases', 'Verbs', 'Nouns', 'Syntax', 'Slovenian Alphabet', 'Greetings', 'Conversation', 'Reading', 'Writing', 'Idioms', 'Tenses'],
  },
  'social-philosophy': {
    area: 'Social', persona: 'a philosopher who asks the better question',
    concepts: ['Ethics', 'Logic', 'Metaphysics', 'Epistemology', 'Existentialism', 'Stoicism', 'Free Will', 'Consciousness', 'Truth', 'Justice', 'Morality', 'Reason', 'Kant', 'Plato', 'Aristotle'],
  },
  'social-music': {
    area: 'Social', persona: 'a musician who teaches by ear and theory together',
    concepts: ['Scales', 'Chords', 'Rhythm', 'Harmony', 'Melody', 'Intervals', 'Keys', 'Counterpoint', 'Composition', 'Ear Training', 'Music Theory', 'Notation', 'Dynamics', 'Tempo'],
  },
};

export function aiUserUid(subdomain: string): string {
  return `ai-${subdomain}`;
}

export function allAiSubdomains(): string[] {
  return Object.keys(DOMAIN_CONCEPTS);
}

function conceptNodesFor(ownerUid: string, concepts: string[]): GraphNode[] {
  return concepts.map((name, i) => ({
    id: `${ownerUid}:c${i}`,
    type: 'Concept' as const,
    properties: { id: `${ownerUid}:c${i}`, name, description: name, canonicalName: name },
  }));
}

/** Write (or refresh) an AI user's registry doc + Chroma canonical set + node-activity presence. */
export async function seedAiUser(subdomain: string): Promise<AiUserRecord> {
  const spec = DOMAIN_CONCEPTS[subdomain];
  if (!spec) throw new Error(`Unknown AI subdomain: ${subdomain}`);
  const uid = aiUserUid(subdomain);
  const record: AiUserRecord = {
    uid,
    area: spec.area,
    subdomain,
    persona: spec.persona,
    anonymousHandle: anonymousHandleFor(uid),
    concepts: spec.concepts,
    createdAt: Date.now(),
  };
  const db = getFirestore();
  await db.collection('ai-users').doc(uid).set(record, { merge: true });

  // Chroma canonical set (ownerUid-tagged) — drives convergence + conceptsCompleted.
  await graphAccessDeps.accessLayer
    .getVectorService()
    .upsertNodes(`ai-graph-${uid}`, conceptNodesFor(uid, spec.concepts), uid);

  // Presence: appear in the peer pool on each owned concept ("always mixed").
  await touchPresenceForConcepts(uid, record.anonymousHandle, spec.concepts);

  log.info('seedAiUser', { uid, subdomain, concepts: spec.concepts.length });
  return record;
}

/** Touch presence on every owned concept so the AI user stays in the recency pool. */
export async function touchPresenceForConcepts(
  uid: string,
  anonymousHandle: string,
  concepts: string[],
): Promise<void> {
  await Promise.all(
    concepts.map((c) => touchNodeActivity(uid, `concept:${c}` as NodeKey, anonymousHandle, true)),
  );
}

export async function listAiUsers(): Promise<AiUserRecord[]> {
  const snap = await getFirestore().collection('ai-users').get();
  return snap.docs.map((d) => d.data() as AiUserRecord);
}

export async function getAiUser(uid: string): Promise<AiUserRecord | null> {
  const snap = await getFirestore().collection('ai-users').doc(uid).get();
  return snap.exists ? (snap.data() as AiUserRecord) : null;
}
