import { getFirestore } from '../config/firebaseAdmin';

export interface UserData {
  uid: string;
  email: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Creates or updates user data in Firestore
 */
export async function upsertUser(uid: string, email: string): Promise<UserData> {
  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const now = Date.now();

    const userDoc = await userRef.get();
    const existingData = userDoc.exists ? (userDoc.data() as UserData) : null;

    const userData: UserData = {
      uid,
      email,
      createdAt: existingData?.createdAt ?? now,
      updatedAt: now,
    };

    await userRef.set(userData, { merge: true });

    return userData;
  } catch (error) {
    console.error('Error upserting user:', error);
    throw error;
  }
}

/**
 * Gets user data from Firestore
 */
export async function getUser(uid: string): Promise<UserData | null> {
  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return null;
    }

    return userDoc.data() as UserData;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

