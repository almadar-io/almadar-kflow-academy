import admin from "firebase-admin";

let app: admin.app.App | null = null;

const getFirebaseApp = (): admin.app.App => {
  if (app) {
    return app;
  }

  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  const privateKey = process.env.FB_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseId = process.env.FB_DB_ID;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    })
  });

  // 2. Get the Firestore instance
  const firestoreInstance = admin.firestore();

  // 3. Apply the ignoreUndefinedProperties setting to the Firestore instance
  firestoreInstance.settings({
    ignoreUndefinedProperties: true,
    databaseId: databaseId,
  });

  return app;
};

export const getFirebaseAdmin = () => getFirebaseApp();

export const getFirebaseAuth = () => getFirebaseApp().auth();

export const getFirestore = () => getFirebaseApp().firestore();
