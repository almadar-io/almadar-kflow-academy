import { getFirestore } from '../config/firebaseAdmin';

export interface DailyModelCost {
  totalInput: number;
  totalOutput: number;
  totalCost: number; // totalInput + totalOutput for this model
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface DailyCosts {
  [model: string]: DailyModelCost;
}

export interface ProviderDailyCosts {
  [provider: string]: DailyCosts;
}

export interface DailyCostDocument {
  totalCost: number;
  [provider: string]: DailyCosts | number;
}

/**
 * Gets today's date as a string in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Gets the cost document path for a user and date
 */
function getCostDocumentPath(uid: string, dateString: string): string {
  return `users/${uid}/costs/${dateString}`;
}

/**
 * Initializes the cost structure for a model if it doesn't exist
 */
function initializeModelCost(): DailyModelCost {
  return {
    totalInput: 0,
    totalOutput: 0,
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };
}

/**
 * Calculates total cost from provider costs
 */
function calculateTotalCost(data: DailyCostDocument): number {
  let total = 0;
  for (const key in data) {
    if (key === 'totalCost') {
      continue; // Skip the totalCost field itself
    }
    const providerCosts = data[key] as DailyCosts;
    if (providerCosts && typeof providerCosts === 'object') {
      for (const model in providerCosts) {
        const modelCost = providerCosts[model];
        if (modelCost && typeof modelCost === 'object' && 'totalCost' in modelCost) {
          total += modelCost.totalCost;
        }
      }
    }
  }
  return total;
}

/**
 * Adds cost to the daily tracking for a specific model
 */
export async function addCostToDailyTracking(
  uid: string,
  provider: 'openai' | 'gemini' | 'deepseek',
  model: string,
  inputTokens: number,
  outputTokens: number,
  inputCost: number,
  outputCost: number
): Promise<void> {
  try {
    
    const db = getFirestore();
    const dateString = getTodayDateString();
    const docPath = getCostDocumentPath(uid, dateString);
    const docRef = db.doc(docPath);

    // Get current document
    const doc = await docRef.get();
    const currentData = doc.exists ? (doc.data() as DailyCostDocument) : { totalCost: 0 };

    // Initialize provider if it doesn't exist
    if (!currentData[provider]) {
      currentData[provider] = {};
    }

    const providerCosts = currentData[provider] as DailyCosts;

    // Initialize model if it doesn't exist
    if (!providerCosts[model]) {
      providerCosts[model] = initializeModelCost();
    }

    // Add the new costs
    const modelCost = providerCosts[model];
    modelCost.totalInput += inputCost;
    modelCost.totalOutput += outputCost;
    modelCost.totalCost = modelCost.totalInput + modelCost.totalOutput;
    modelCost.totalInputTokens += inputTokens;
    modelCost.totalOutputTokens += outputTokens;

    // Update document-level total cost (sum of all models across all providers)
    currentData.totalCost = calculateTotalCost(currentData);

    // Save to Firestore
    await docRef.set(currentData, { merge: true });

  } catch (error) {
    console.error('[Cost Service] Error adding cost to daily tracking:', error);
    if (error instanceof Error) {
      console.error('[Cost Service] Error details:', error.message, error.stack);
    }
    // Don't throw - we don't want cost tracking failures to break the main flow
  }
}

/**
 * Gets the daily costs for a specific user and date (defaults to today)
 */
export async function getDailyCosts(uid: string, date?: string): Promise<DailyCostDocument | null> {
  try {
    const db = getFirestore();
    const dateString = date || getTodayDateString();
    const docPath = getCostDocumentPath(uid, dateString);
    const docRef = db.doc(docPath);

    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }

    return doc.data() as DailyCostDocument;
  } catch (error) {
    console.error('Error getting daily costs:', error);
    return null;
  }
}

/**
 * Gets costs for a date range for a specific user
 */
export async function getCostsForDateRange(
  uid: string,
  startDate: string,
  endDate: string
): Promise<{ [date: string]: DailyCostDocument }> {
  try {
    const db = getFirestore();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const results: { [date: string]: DailyCostDocument } = {};

    // Iterate through each date in the range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateString = currentDate.toISOString().split('T')[0];
      const docPath = getCostDocumentPath(uid, dateString);
      const docRef = db.doc(docPath);

      const doc = await docRef.get();
      if (doc.exists) {
        results[dateString] = doc.data() as DailyCostDocument;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;
  } catch (error) {
    console.error('Error getting costs for date range:', error);
    return {};
  }
}

