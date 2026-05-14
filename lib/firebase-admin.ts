import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: "gen-lang-client-0915512211"
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminDb = admin.firestore();
export const adminMessaging = admin.messaging();
export const adminAuth = admin.auth();
