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
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:server:scripts:copyGraphsToDev');

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

  const firestore = admin.firestore(app);
  firestore.settings({
    ignoreUndefinedProperties: true,
    databaseId,
  });

  return firestore;
}

async function copyGraphs(): Promise<void> {
  log.info('Starting graph copy operation', {
    sourceDatabase: SOURCE_DATABASE_ID,
    targetDatabase: TARGET_DATABASE_ID,
    userId: USER_ID,
  });

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
      log.info('No graphs found in source database.');
      return;
    }

    log.info(`Found ${sourceGraphsSnapshot.size} graph(s) to copy.`);

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
          log.warn(`Graph ${graphId} already exists in target database, skipping...`);
          skippedCount++;
          continue;
        }

        // Copy graph to target database
        await targetGraphsRef.doc(graphId).set(graphData);
        log.info(`Copied graph ${graphId}`);
        copiedCount++;
      } catch (error) {
        log.error(`Error copying graph ${graphId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        errorCount++;
      }
    }

    log.info('Copy Summary', {
      totalGraphsFound: sourceGraphsSnapshot.size,
      successfullyCopied: copiedCount,
      skipped: skippedCount,
      errors: errorCount,
    });
    log.info('Copy operation completed!');
  } catch (error) {
    log.error('Fatal error during copy operation', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Run the script
if (require.main === module) {
  copyGraphs()
    .then(() => {
      log.info('Script completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      log.error('Script failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    });
}

export { copyGraphs };

