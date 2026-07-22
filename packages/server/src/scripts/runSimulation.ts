import { KnowledgeGraphAccessLayer, runSimulation, DEFAULT_PERSONAS, type KflowAgentConfig } from '@almadar-io/knowledge/server';
import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:server:scripts:runSimulation');

async function main() {
  const skillName = process.argv.find(a => a.startsWith('--skill='))?.split('=')[1] ?? 'deep-learner';
  const personaName = process.argv.find(a => a.startsWith('--persona='))?.split('=')[1] ?? 'curious-beginner';
  const uid = process.argv.find(a => a.startsWith('--uid='))?.split('=')[1];

  if (!uid) {
    console.error('Usage: npx tsx src/scripts/runSimulation.ts --uid=<synthetic-uid> [--skill=deep-learner] [--persona=curious-beginner]');
    process.exit(1);
  }

  const persona = DEFAULT_PERSONAS.find(p => p.name === personaName);
  if (!persona) {
    console.error(`Unknown persona: ${personaName}. Available: ${DEFAULT_PERSONAS.map(p => p.name).join(', ')}`);
    process.exit(1);
  }

  log.info('Starting simulation', { uid, skillName, personaName });

  const accessLayer = new KnowledgeGraphAccessLayer();
  const config: KflowAgentConfig = {
    accessLayer,
    uid,
    listGraphIds: async () => {
      const db = getFirestore();
      const snap = await db.collection('users').doc(uid).collection('knowledgeGraphs').select('id').get();
      return snap.docs.map(d => d.id);
    },
  };

  const result = await runSimulation({ config, skillName, persona });

  log.info('Simulation complete', { uid, ...result });
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
