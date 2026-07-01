import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { AlmadarClient } from '@almadar/sdk/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env.development') });

const apiKey = process.env.ALMADAR_API_KEY;
const baseUrl = process.env.ALMADAR_BASE_URL || 'http://localhost:3003';

if (!apiKey) {
  console.error('ALMADAR_API_KEY not set');
  process.exit(1);
}

const client = new AlmadarClient({ apiKey, baseUrl });

const type = process.argv[2] || 'chart';

const CONCEPTS = {
  chart: { id: 'diag-chart', name: 'quadratic functions', description: 'Intro to parabolas.' },
  simulation: { id: 'diag-sim', name: 'wave motion', description: 'Intro to propagating waves.' },
  math: { id: 'diag-math', name: 'vector addition', description: 'Intro to visualizing vectors.' },
  physics: { id: 'diag-physics', name: 'electric fields', description: 'Intro to field visualizations.' },
  biology: { id: 'diag-bio', name: 'cell structure', description: 'Intro to eukaryotic cell parts.' },
  chemistry: { id: 'diag-chem', name: 'molecular bonds', description: 'Intro to simple molecules.' },
  probability: { id: 'diag-prob', name: 'dice distributions', description: 'Intro to probability distributions.' },
};

const MARKERS = {
  chart: 'Show a parabola y = x^2 with a slider for the coefficient.',
  simulation: 'Show a transverse wave with a slider for amplitude and frequency.',
  math: 'Show two vectors and their sum on a coordinate plane.',
  physics: 'Show the electric field around a point charge.',
  biology: 'Show a labeled diagram of an animal cell.',
  chemistry: 'Show a ball-and-stick model of a water molecule.',
  probability: 'Show the distribution of rolling two dice.',
};

const CATALOG = {
  // NOTE: the intended learning-* organisms are not present in the current
  // @almadar-io/behaviors registry, so we verify the allow-list plumbing with
  // real organisms that exist today. Replace once learning-* are shipped.
  chart: ['std-embedded-dashboard'],
  simulation: ['std-stem-lab'],
  math: ['std-embedded-dashboard'],
  physics: ['std-stem-lab'],
  biology: ['std-stem-lab'],
  chemistry: ['std-stem-lab'],
  probability: ['std-embedded-dashboard'],
};

const concept = CONCEPTS[type] || CONCEPTS.chart;
const markerDescription = MARKERS[type] || MARKERS.chart;
const stdAllowList = CATALOG[type] || CATALOG.chart;

const label =
  type === 'chart'
    ? 'chart visualization'
    : type === 'simulation'
      ? 'physics simulation'
      : `${type} visualization`;

const prompt = `Create a single interactive ${label} for a lesson about "${concept.name}".
Concept description: ${concept.description}
Learner context: ${markerDescription}
Requirements:
- Compose the result as one Orbital schema using ONLY the allowed std behaviors.
- For field-scoped "learning-*-lab" organisms, set the "@config.mode" knob to the specific visualization that matches the learner context (e.g. function-plot, wave, cell, molecule, dice, etc.).
- Keep the UI focused on the learning goal: no navigation, no authentication, no complex app chrome.
- Use realistic, pedagogically useful data.
- Return a valid, compilable OrbitalSchema.`;

console.log(`Calling ${baseUrl}/api/v1/agent/generate (type=${type})`);

try {
  const result = await client.generate({
    prompt,
    endUserId: concept.id,
    provider: 'deepseek',
    model: 'deepseek-chat',
    catalogMode: 'subset',
    stdAllowList,
    onEvent: (event) => {
      const dataSummary = event.data && typeof event.data === 'object'
        ? Object.keys(event.data).join(',')
        : event.data;
      console.log(`EVENT type=${event.type} timestamp=${event.timestamp} keys=${dataSummary}`);
      if (event.type === 'complete') {
        console.log('COMPLETE data:', JSON.stringify(event.data, null, 2).slice(0, 2000));
      }
      if (event.type === 'error') {
        console.log('ERROR data:', JSON.stringify(event.data, null, 2));
      }
    },
  });
  console.log('RESULT schema.name=', result.schema?.name, 'appId=', result.appId);
} catch (err) {
  console.error('THREW:', err.name, err.message);
  if (err.details) console.error('DETAILS:', JSON.stringify(err.details));
  process.exit(1);
}
