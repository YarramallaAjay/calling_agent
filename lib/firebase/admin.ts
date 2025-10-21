// Server-side Firebase Admin SDK configuration
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

let adminApp: App;
let adminDb: Firestore;

function initializeAdminApp() {
  if (getApps().length === 0) {
    try {
      // Try to load from serviceAccountKey.json file first
      const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });

      console.log('✅ Firebase Admin initialized with service account file');
    } catch (fileError) {
      // Fallback to environment variables
      console.log('⚠️  Service account file not found, using environment variables');

      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    }
  } else {
    adminApp = getApps()[0];
  }

  adminDb = getFirestore(adminApp);
  return { adminApp, adminDb };
}

// Initialize on import for server-side usage
if (typeof window === 'undefined') {
  const { adminApp: app, adminDb: db } = initializeAdminApp();
  adminApp = app;
  adminDb = db;
}

export { adminApp, adminDb };
