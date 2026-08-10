/**
 * Wave F eval harness — builds the taxonomy-stratified interactive-orbital
 * eval corpus (docs/Almadar_Kflow_Sdk_Gaps.md, Phase 5).
 *
 * Only concept names/descriptions below are hand-authored data. The lesson
 * markdown — and therefore every visualization marker — is phrased by the
 * real kflow explain-concept LLM call, never hand-written.
 *
 * Usage:
 *   npx tsx src/scripts/runOrbitalEvalCorpus.ts
 *   pnpm run eval:orbital-corpus
 */
import '../config/env.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { LLMClient } from '@almadar/llm';
import { createGraphNode, isNodeType } from '@almadar-io/knowledge';
import type { ConceptNodeProperties, InteractiveOrbitalType } from '@almadar-io/knowledge';
import { buildExplainPrompt } from '@almadar-io/knowledge/server';
import { parseLessonSegments } from '@almadar/ui/lib';
import type { LessonSegment } from '@almadar/ui/lib';
import type { Concept } from '../types/concept';

type Branch = 'formal' | 'natural' | 'social';

interface ConceptSeed {
  name: string;
  description: string;
}

interface LeafSpec {
  leaf: string;
  branch: Branch;
  expectedTypes: InteractiveOrbitalType[];
  concepts: ConceptSeed[];
}

// Ground-truth taxonomy (Wikipedia branches-of-knowledge, drilled to leaves) +
// expected routing per docs/Almadar_Kflow_Sdk_Gaps.md. Two real textbook
// concepts per leaf for sub-topic diversity.
const TAXONOMY: LeafSpec[] = [
  {
    leaf: 'logic', branch: 'formal', expectedTypes: [],
    concepts: [
      { name: 'Truth Tables', description: 'Evaluating a compound proposition row-by-row for every combination of AND, OR, NOT, and implication.' },
      { name: 'Modus Ponens', description: 'A valid deductive inference form: from "if P then Q" and "P", conclude "Q".' },
    ],
  },
  {
    leaf: 'mathematics', branch: 'formal', expectedTypes: ['math'],
    concepts: [
      { name: 'Pythagorean Theorem', description: 'The relation a² + b² = c² between the sides of a right triangle.' },
      { name: 'The Derivative as a Limit', description: "A function's instantaneous rate of change, defined as the limit of the slope of secant lines." },
    ],
  },
  {
    leaf: 'statistics-probability', branch: 'formal', expectedTypes: ['probability'],
    concepts: [
      { name: "Bayes' Theorem", description: 'Updating a probability estimate for a hypothesis given new evidence.' },
      { name: 'Normal Distribution', description: 'The symmetric bell-shaped probability distribution characterized by its mean and standard deviation.' },
    ],
  },
  {
    leaf: 'computer-science', branch: 'formal', expectedTypes: ['algorithms'],
    concepts: [
      { name: 'Binary Search', description: 'Searching a sorted array by repeatedly halving the search interval.' },
      { name: 'Big-O Notation', description: "Describing how an algorithm's running time or space grows with input size." },
    ],
  },
  {
    leaf: 'physics', branch: 'natural', expectedTypes: ['physics'],
    concepts: [
      { name: "Newton's Second Law", description: 'The relation F = ma between the net force on an object, its mass, and its acceleration.' },
      { name: 'Projectile Motion', description: 'The parabolic trajectory of an object launched into the air under gravity.' },
    ],
  },
  {
    leaf: 'chemistry', branch: 'natural', expectedTypes: ['chemistry'],
    concepts: [
      { name: 'Acid-Base Titration', description: 'Determining the concentration of an acid or base via a controlled neutralization reaction.' },
      { name: 'Periodic Trends', description: 'How atomic radius, electronegativity, and ionization energy change across periods and groups.' },
    ],
  },
  {
    leaf: 'astronomy', branch: 'natural', expectedTypes: ['physics'],
    concepts: [
      { name: "Kepler's Laws of Planetary Motion", description: 'The three laws describing elliptical orbits, equal areas in equal times, and the period-distance relation.' },
      { name: 'Stellar Life Cycle', description: "How a star's mass determines its path from formation through main sequence to its eventual death." },
    ],
  },
  {
    leaf: 'earth-science', branch: 'natural', expectedTypes: [],
    concepts: [
      { name: 'Plate Tectonics', description: "The movement of Earth's lithospheric plates and how it drives earthquakes and volcanic activity." },
      { name: 'The Water Cycle', description: 'The continuous movement of water through evaporation, condensation, precipitation, and collection.' },
    ],
  },
  {
    leaf: 'biology', branch: 'natural', expectedTypes: ['biology'],
    concepts: [
      { name: 'Photosynthesis', description: 'How plants convert light energy into chemical energy stored in glucose.' },
      { name: 'Mitosis', description: 'The process of cell division that produces two genetically identical daughter cells.' },
    ],
  },
  {
    leaf: 'economics', branch: 'social', expectedTypes: [],
    concepts: [
      { name: 'Supply and Demand', description: 'How market price is determined by the intersection of the supply and demand curves.' },
      { name: 'Opportunity Cost', description: 'The value of the next-best alternative given up when making a choice.' },
    ],
  },
  {
    leaf: 'psychology', branch: 'social', expectedTypes: [],
    concepts: [
      { name: 'Classical Conditioning', description: "Pavlov's discovery that a neutral stimulus can come to trigger a reflexive response through repeated pairing." },
      { name: "Maslow's Hierarchy of Needs", description: 'A pyramid model ordering human motivations from basic physiological needs to self-actualization.' },
    ],
  },
  {
    leaf: 'sociology', branch: 'social', expectedTypes: [],
    concepts: [
      { name: 'Social Stratification', description: 'The hierarchical arrangement of individuals into social classes based on wealth, power, and status.' },
      { name: 'The Sociological Imagination', description: "C. Wright Mills' idea of connecting personal experience to broader social and historical forces." },
    ],
  },
  {
    leaf: 'linguistics', branch: 'social', expectedTypes: [],
    concepts: [
      { name: "Chomsky's Universal Grammar", description: 'The hypothesis that humans share an innate grammatical structure underlying all languages.' },
      { name: 'The Great Vowel Shift', description: 'The systematic change in English vowel pronunciation that occurred roughly between 1400 and 1700.' },
    ],
  },
  {
    leaf: 'history', branch: 'social', expectedTypes: [],
    concepts: [
      { name: 'Causes of World War I', description: 'The causation chain of alliances, militarism, nationalism, and the assassination of Archduke Franz Ferdinand.' },
      { name: 'The Fall of the Roman Empire', description: 'The causal chain of economic decline, invasions, and political instability that ended the Western Roman Empire.' },
    ],
  },
  {
    leaf: 'political-science-law', branch: 'social', expectedTypes: [],
    concepts: [
      { name: 'Separation of Powers', description: 'Dividing government authority among legislative, executive, and judicial branches to prevent abuse.' },
      { name: 'Judicial Review', description: "Courts' power to assess whether a law or government action is constitutional." },
    ],
  },
  {
    leaf: 'geography', branch: 'social', expectedTypes: [],
    concepts: [
      { name: 'Population Pyramid', description: "A population's age-sex structure shown as a bar chart of age cohorts by gender." },
      { name: 'Köppen Climate Classification', description: "A system classifying the world's climates by temperature and precipitation patterns." },
    ],
  },
];

interface CorpusMarker {
  type: InteractiveOrbitalType;
  description: string;
}

interface CorpusRow {
  id: string;
  branch: Branch;
  leaf: string;
  concept: Concept;
  expectedTypes: InteractiveOrbitalType[];
  markers: CorpusMarker[];
  primaryMarker: CorpusMarker | null;
  error?: string;
}

const LLM_TIMEOUT_MS = 240_000;

const ARTIFACT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../e2e/.artifacts/eval');
const CORPUS_PATH = resolve(ARTIFACT_DIR, 'corpus.json');

function isVisualizationSegment(segment: LessonSegment): segment is Extract<LessonSegment, { type: 'visualization' }> {
  return segment.type === 'visualization';
}

async function buildRow(leafSpec: LeafSpec, seed: ConceptSeed, index: number, llm: LLMClient): Promise<CorpusRow> {
  const id = `${leafSpec.leaf}-${index + 1}`;
  const concept: Concept = { id, name: seed.name, description: seed.description, parents: [], children: [] };
  const startedAt = Date.now();

  const properties: ConceptNodeProperties = { id, name: seed.name, description: seed.description };
  const rawNode = createGraphNode(id, 'Concept', properties);
  if (!isNodeType(rawNode, 'Concept')) {
    throw new Error(`unreachable: createGraphNode('Concept', ...) returned type=${rawNode.type}`);
  }

  try {
    const { system, user } = buildExplainPrompt({ concept: rawNode });
    const lesson = await llm.callRaw({ systemPrompt: system, userPrompt: user });
    const segments = parseLessonSegments(lesson);
    const markers: CorpusMarker[] = segments
      .filter(isVisualizationSegment)
      .map((s) => ({ type: s.visualizationType, description: s.description }));
    const primaryMarker = markers[0] ?? null;
    const durationMs = Date.now() - startedAt;

    if (!primaryMarker) {
      console.log(`⚠️  MARKER ABSENT — leaf=${leafSpec.leaf} concept="${seed.name}" — lesson produced no <visualize> tag`);
    }

    const expectedMatch = primaryMarker !== null && leafSpec.expectedTypes.includes(primaryMarker.type);
    console.log(
      `[corpus] ${leafSpec.leaf.padEnd(24)} "${seed.name}" markers=${markers.length} chosen=${primaryMarker?.type ?? '(none)'} expectedMatch=${expectedMatch} ${durationMs}ms`,
    );

    return { id, branch: leafSpec.branch, leaf: leafSpec.leaf, concept, expectedTypes: leafSpec.expectedTypes, markers, primaryMarker };
  } catch (e) {
    const durationMs = Date.now() - startedAt;
    const message = e instanceof Error ? e.message : String(e);
    console.log(`💥 [corpus] ${leafSpec.leaf} "${seed.name}" FAILED after ${durationMs}ms: ${message}`);
    return { id, branch: leafSpec.branch, leaf: leafSpec.leaf, concept, expectedTypes: leafSpec.expectedTypes, markers: [], primaryMarker: null, error: message };
  }
}

async function main() {
  mkdirSync(ARTIFACT_DIR, { recursive: true });

  const llm = new LLMClient({ provider: 'deepseek', model: 'deepseek-v4-flash', rawTimeoutMs: LLM_TIMEOUT_MS });
  const totalConcepts = TAXONOMY.reduce((sum, l) => sum + l.concepts.length, 0);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Orbital eval corpus — ${TAXONOMY.length} leaves, ${totalConcepts} concepts`);
  console.log(`${'='.repeat(70)}\n`);

  const rows: CorpusRow[] = [];
  for (const leafSpec of TAXONOMY) {
    for (let i = 0; i < leafSpec.concepts.length; i++) {
      const row = await buildRow(leafSpec, leafSpec.concepts[i], i, llm);
      rows.push(row);
    }
  }

  writeFileSync(CORPUS_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));

  console.table(rows.map((r) => ({
    leaf: r.leaf,
    concept: r.concept.name,
    markers: r.markers.length,
    chosenType: r.primaryMarker?.type ?? '(none)',
    expectedMatch: r.primaryMarker !== null && r.expectedTypes.includes(r.primaryMarker.type),
  })));

  const markerAbsentCount = rows.filter((r) => r.primaryMarker === null).length;
  const errorCount = rows.filter((r) => r.error !== undefined).length;
  const expectedMatchCount = rows.filter((r) => r.primaryMarker !== null && r.expectedTypes.includes(r.primaryMarker.type)).length;

  console.log(JSON.stringify({
    corpusPath: CORPUS_PATH,
    totalRows: rows.length,
    markerAbsentCount,
    errorCount,
    expectedMatchCount,
  }));
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
