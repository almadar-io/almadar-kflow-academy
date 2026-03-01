/**
 * One-off script to copy graphs from kflow database to kflow-dev database
 * 
 * This script:
 * 1. Reads all graphs from source database (kflow) for a specific user
 * 2. Copies them to target database (kflow-dev) for the same user
 * 
 * Usage:
 *   ts-node server/src/scripts/copyGraphsToDev.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import admin from 'firebase-admin';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SOURCE_DATABASE_ID = 'kflow';
const TARGET_DATABASE_ID = 'kflow-dev';
const USER_ID = 'zo0dtBneKjbpy9Xg9u4DkAxs1PT2';

/**
 * Get Firestore instance for a specific database
 * Uses separate app instances for each database to allow accessing multiple databases
 */
function getFirestoreForDatabase(databaseId: string): admin.firestore.Firestore {
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  const privateKey = process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials are not configured. Please set FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY.'
    );
  }

  // Initialize app with a unique name for each database to allow multiple instances
  const appName = `app-${databaseId}`;
  let app: admin.app.App;
  try {
    app = admin.app(appName);
  } catch (error) {
    app = admin.initializeApp(
      {
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      },
      appName
    );
  }

  // Get Firestore instance for the specific database
  // For named databases, we need to use the database URL format
  // The databaseId parameter in firestore() is not in TypeScript types but works at runtime
  const firestore = (app.firestore as any)(databaseId) as admin.firestore.Firestore;
  firestore.settings({
    ignoreUndefinedProperties: true,
    databaseId: databaseId
  });

  return firestore;
}

async function copyGraphs(): Promise<void> {
  console.log('Starting graph copy operation...');
  console.log(`Source database: ${SOURCE_DATABASE_ID}`);
  console.log(`Target database: ${TARGET_DATABASE_ID}`);
  console.log(`User ID: ${USER_ID}\n`);

  const sourceDb = getFirestoreForDatabase(SOURCE_DATABASE_ID);
  const targetDb = getFirestoreForDatabase(TARGET_DATABASE_ID);

  try {
    // Get all graphs from source database
    const sourceGraphsRef = sourceDb
      .collection('users')
      .doc(USER_ID)
      .collection('graphs');

    const sourceGraphsSnapshot = await sourceGraphsRef.get();

    if (sourceGraphsSnapshot.empty) {
      console.log('No graphs found in source database.');
      return;
    }

    console.log(`Found ${sourceGraphsSnapshot.size} graph(s) to copy.\n`);

    const targetGraphsRef = targetDb
      .collection('users')
      .doc(USER_ID)
      .collection('graphs');

    let copiedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Copy each graph
    for (const doc of sourceGraphsSnapshot.docs) {
      const graphId = doc.id;
      const graphData = doc.data();

      try {
        // Check if graph already exists in target
        const targetDoc = await targetGraphsRef.doc(graphId).get();
        if (targetDoc.exists) {
          console.log(`  ⚠️  Graph ${graphId} already exists in target database, skipping...`);
          skippedCount++;
          continue;
        }

        // Copy graph to target database
        await targetGraphsRef.doc(graphId).set(graphData);
        console.log(`  ✅ Copied graph ${graphId}`);
        copiedCount++;
      } catch (error) {
        console.error(`  ❌ Error copying graph ${graphId}:`, error);
        errorCount++;
      }
    }

    console.log('\n=== Copy Summary ===');
    console.log(`Total graphs found: ${sourceGraphsSnapshot.size}`);
    console.log(`Successfully copied: ${copiedCount}`);
    console.log(`Skipped (already exists): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('\n✅ Copy operation completed!');
  } catch (error) {
    console.error('❌ Fatal error during copy operation:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  copyGraphs()
    .then(() => {
      console.log('\nScript completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nScript failed:', error);
      process.exit(1);
    });
}

export { copyGraphs };

