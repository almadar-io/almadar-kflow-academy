/**
 * Migration script to convert existing graphs from layer-based to level-concept-based structure
 * 
 * This script:
 * 1. Groups concepts by their layer property
 * 2. Creates level concepts (e.g., "Level 1", "Level 2") for each layer
 * 3. Sets level concepts' parent to seedConcept
 * 4. Updates layer concepts to have level concept as sole parent
 * 5. Removes layer property from concepts
 * 6. Preserves goals from layer documents in level concept's goal property
 * 
 * Usage:
 *   ts-node server/src/scripts/migrateLayersToConcepts.ts                    # Migrate all graphs for all users
 *   ts-node server/src/scripts/migrateLayersToConcepts.ts [uid]               # Migrate all graphs for a specific user
 *   ts-node server/src/scripts/migrateLayersToConcepts.ts [uid] [graphId]      # Migrate a specific graph
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { getFirestore } from '../config/firebaseAdmin';
import { getUserGraphById, upsertUserGraph } from '../services/graphService';
import { getLayerByNumber } from '../services/layerService';
import { Concept } from '../types/concept';

const getFirestoreInstance = () => {
  return getFirestore();
};

/**
 * Backup a user's entire collection to backup-{uid}
 * This includes:
 * - The user document
 * - All graphs subcollection
 * - All layers subcollections under each graph
 */
async function backupUserCollection(uid: string): Promise<void> {
  console.log(`\nCreating backup for user ${uid}...`);
  
  const db = getFirestoreInstance();
  const userDocRef = db.collection('users').doc(uid);
  const backupUserDocRef = db.collection(`backup-${uid}`).doc(uid);
  
  try {
    // Backup user document
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      await backupUserDocRef.set(userDoc.data() || {});
      console.log(`  ✓ Backed up user document`);
    } else {
      console.log(`  ⚠ User document does not exist`);
    }
    
    // Backup graphs subcollection
    const graphsSnapshot = await userDocRef.collection('graphs').get();
    if (graphsSnapshot.empty) {
      console.log(`  ⚠ No graphs found for user ${uid}`);
      return;
    }
    
    console.log(`  Found ${graphsSnapshot.size} graphs to backup`);
    
    for (const graphDoc of graphsSnapshot.docs) {
      const graphData = graphDoc.data();
      const backupGraphRef = backupUserDocRef.collection('graphs').doc(graphDoc.id);
      
      // Backup graph document
      await backupGraphRef.set(graphData);
      console.log(`    ✓ Backed up graph ${graphDoc.id}`);
      
      // Backup layers subcollection for this graph
      const layersSnapshot = await graphDoc.ref.collection('layers').get();
      if (!layersSnapshot.empty) {
        for (const layerDoc of layersSnapshot.docs) {
          const layerData = layerDoc.data();
          await backupGraphRef.collection('layers').doc(layerDoc.id).set(layerData);
        }
        console.log(`      ✓ Backed up ${layersSnapshot.size} layer documents`);
      }
    }
    
    console.log(`  ✓ Successfully created backup for user ${uid}`);
  } catch (error) {
    console.error(`  ✗ Error creating backup for user ${uid}:`, error);
    throw error;
  }
}

async function migrateGraph(uid: string, graphId: string): Promise<void> {
  console.log(`\nMigrating graph ${graphId} for user ${uid}...`);
  
  try {
    const graph = await getUserGraphById(uid, graphId);
    if (!graph) {
      console.log(`  Graph ${graphId} not found, skipping...`);
      return;
    }

    const concepts = Object.values(graph.concepts);
    if (concepts.length === 0) {
      console.log(`  Graph ${graphId} has no concepts, skipping...`);
      return;
    }

    // Check if any concepts have a layer property (only migrate graphs with layer numbers)
    const hasLayerConcepts = concepts.some(c => c.layer !== undefined);
    if (!hasLayerConcepts) {
      console.log(`  Graph ${graphId} has no concepts with layer property, skipping (already migrated or never had layers)...`);
      return;
    }

    // Find seed concept
    const seedConcept = concepts.find(c => c.isSeed);
    if (!seedConcept) {
      console.log(`  Seed concept not found for graph ${graphId}, skipping...`);
      return;
    }

    // Group concepts by layer, excluding seedConcept
    const conceptsByLayer = new Map<number, Concept[]>();
    concepts.forEach(concept => {
      // Skip seedConcept - it should never be in a level
      if (concept.isSeed || concept.name === seedConcept.name) {
        return;
      }
      const layer = concept.layer;
      if (layer !== undefined) {
        if (!conceptsByLayer.has(layer)) {
          conceptsByLayer.set(layer, []);
        }
        conceptsByLayer.get(layer)!.push(concept);
      }
    });

    if (conceptsByLayer.size === 0) {
      console.log(`  Graph ${graphId} has no concepts with layer property, skipping...`);
      return;
    }

    console.log(`  Found ${conceptsByLayer.size} layers to migrate`);

    // Find existing top-level concepts to determine sequence
    // Exclude concepts that will become level concepts (those with layer property)
    const existingTopLevelConcepts = concepts.filter(c => 
      c.parents.length === 1 && 
      c.parents[0] === seedConcept.name &&
      c.layer === undefined // Not a concept that will be migrated to a level
    );
    const maxExistingSequence = existingTopLevelConcepts.length > 0
      ? Math.max(...existingTopLevelConcepts.map(c => c.sequence ?? 0))
      : 0;

    console.log(`  Found ${existingTopLevelConcepts.length} existing top-level concepts (max sequence: ${maxExistingSequence})`);

    const updatedConcepts: Concept[] = [];
    const levelConceptNames: string[] = [];
    
    // Create level concepts, preserving sequence order
    let currentSequence = maxExistingSequence;
    const sortedLayers = Array.from(conceptsByLayer.entries()).sort(([a], [b]) => a - b);
    
    for (const [layerNum, layerConcepts] of sortedLayers) {
      currentSequence += 1;
      const levelName = `Level ${layerNum}`;
      levelConceptNames.push(levelName);
      
      // Get goal from layer document if available
      // Check if graph has a layers collection attached to it
      let levelGoal: string | undefined;
      const db = getFirestoreInstance();
      try {
        // Check if layers collection exists for this graph
        const layersCollectionRef = db
          .collection('users')
          .doc(uid)
          .collection('graphs')
          .doc(graphId)
          .collection('layers');
        
        const layersSnapshot = await layersCollectionRef.limit(1).get();
        
        if (!layersSnapshot.empty) {
          // Layers collection exists, try to get the goal from the layer document
          const layerDoc = await getLayerByNumber(uid, graphId, layerNum);
          levelGoal = layerDoc?.goal;
        }
      } catch (error) {
        console.warn(`    Could not fetch layer document for layer ${layerNum}:`, error);
      }
      
      // Filter out seedConcept from children (should never be a child of a level)
      const levelChildren = layerConcepts
        .filter(c => !c.isSeed && c.name !== seedConcept.name)
        .map(c => c.name);
      
      const levelConcept: Concept = {
        name: levelName,
        description: `Layer ${layerNum} concepts`,
        goal: levelGoal, // Preserve goal from layer document in concept.goal
        parents: [seedConcept.name],
        children: levelChildren,
        sequence: currentSequence, // Preserve sequence order among top-level concepts
      };
      
      console.log(`  Created level concept "${levelName}" with ${layerConcepts.length} children (sequence: ${currentSequence})`);
      
      // Update layer concepts - add level concept as first parent, preserve existing parents
      // Exclude seedConcept from being updated (it should never be in a level)
      layerConcepts
        .filter(concept => !concept.isSeed && concept.name !== seedConcept.name)
        .forEach(concept => {
          // Preserve existing parents, add level concept as first parent
          const existingParents = concept.parents || [];
          const updatedParents = [levelName, ...existingParents.filter(p => p !== levelName)]; // Add level as first, remove duplicates
          
          const updatedConcept: Concept = {
            ...concept,
            parents: updatedParents, // Level concept as first parent, then existing parents
          };
          // Remove layer property
          delete (updatedConcept as any).layer;
          updatedConcepts.push(updatedConcept);
        });
      
      updatedConcepts.push(levelConcept);
    }
    
    // Update seedConcept children (add level concepts)
    const updatedSeedConcept: Concept = {
      ...seedConcept,
      children: [...seedConcept.children, ...levelConceptNames],
    };
    updatedConcepts.push(updatedSeedConcept);

    // Add all other concepts that weren't in any layer (preserve them as-is)
    concepts.forEach(concept => {
      if (concept.layer === undefined && concept.name !== seedConcept.name) {
        // Check if this concept was already updated (is a level concept or was in a layer)
        const alreadyUpdated = updatedConcepts.some(c => c.name === concept.name);
        if (!alreadyUpdated) {
          updatedConcepts.push(concept);
        }
      }
    });

    // Convert updated concepts to Record format for storage
    const conceptsRecord: Record<string, Concept> = {};
    updatedConcepts.forEach(concept => {
      conceptsRecord[concept.name] = concept;
    });

    // Save updated graph
    await upsertUserGraph(uid, {
      id: graphId,
      seedConceptId: graph.seedConceptId,
      concepts: conceptsRecord,
      model: graph.model,
      goalFocused: graph.goalFocused,
      difficulty: graph.difficulty,
      focus: graph.focus,
    });

    console.log(`  ✓ Successfully migrated graph ${graphId}`);
    console.log(`    - Created ${levelConceptNames.length} level concepts`);
    console.log(`    - Updated ${conceptsByLayer.size} layers`);
    console.log(`    - Total concepts: ${updatedConcepts.length}`);
  } catch (error) {
    console.error(`  ✗ Error migrating graph ${graphId}:`, error);
    throw error;
  }
}

async function migrateUserGraphs(uid: string): Promise<void> {
  console.log(`\nStarting migration of all graphs for user ${uid}...`);
  
  // Create backup before migration
  await backupUserCollection(uid);
  
  const db = getFirestoreInstance();
  const graphsSnapshot = await db.collection('users').doc(uid).collection('graphs').get();
  
  if (graphsSnapshot.empty) {
    console.log(`  No graphs found for user ${uid}.`);
    return;
  }

  let totalGraphs = 0;
  let migratedGraphs = 0;
  let failedGraphs = 0;

  for (const graphDoc of graphsSnapshot.docs) {
    totalGraphs++;
    try {
      await migrateGraph(uid, graphDoc.id);
      migratedGraphs++;
    } catch (error) {
      failedGraphs++;
      console.error(`Failed to migrate graph ${graphDoc.id} for user ${uid}:`, error);
    }
  }

  console.log(`\nMigration complete for user ${uid}!`);
  console.log(`  Total graphs: ${totalGraphs}`);
  console.log(`  Migrated: ${migratedGraphs}`);
  console.log(`  Failed: ${failedGraphs}`);
}

async function migrateAllGraphs(): Promise<void> {
  console.log('Starting migration of all graphs for all users...');
  
  const db = getFirestoreInstance();
  const usersSnapshot = await db.collection('users').get();
  
  let totalGraphs = 0;
  let migratedGraphs = 0;
  let failedGraphs = 0;

  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    
    // Create backup before migrating this user's graphs
    try {
      await backupUserCollection(uid);
    } catch (error) {
      console.error(`Failed to backup user ${uid}, skipping migration:`, error);
      continue;
    }
    
    const graphsSnapshot = await db.collection('users').doc(uid).collection('graphs').get();
    
    for (const graphDoc of graphsSnapshot.docs) {
      totalGraphs++;
      try {
        await migrateGraph(uid, graphDoc.id);
        migratedGraphs++;
      } catch (error) {
        failedGraphs++;
        console.error(`Failed to migrate graph ${graphDoc.id} for user ${uid}:`, error);
      }
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`  Total graphs: ${totalGraphs}`);
  console.log(`  Migrated: ${migratedGraphs}`);
  console.log(`  Failed: ${failedGraphs}`);
}

async function main() {
  //only migrate graphs in development environment
  // if (process.env.NODE_ENV?.trim() !== 'development') {
  //   console.log('Migration is only allowed in development environment');
  //   process.exit(0);
  // }


  dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Migrate all graphs for all users
    await migrateAllGraphs();
  } else if (args.length === 1) {
    // Migrate all graphs for a specific user
    const [uid] = args;
    await migrateUserGraphs(uid);
  } else if (args.length === 2) {
    // Migrate specific graph
    const [uid, graphId] = args;
    // Create backup before migrating
    await backupUserCollection(uid);
    await migrateGraph(uid, graphId);
  } else {
    console.error('Usage: ts-node migrateLayersToConcepts.ts [uid] [graphId]');
    console.error('  No arguments: migrates all graphs for all users');
    console.error('  [uid]: migrates all graphs for a specific user');
    console.error('  [uid] [graphId]: migrates a specific graph');
    process.exit(1);
  }
}

// Run migration if executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\nMigration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nMigration script failed:', error);
      process.exit(1);
    });
}

export { migrateGraph, migrateUserGraphs, migrateAllGraphs };

