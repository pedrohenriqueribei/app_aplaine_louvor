import firebaseConfig from '../firebase-applet-config.json';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

// Set project identity for gRPC and cloud libraries
if (firebaseConfig.projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
}

const app = getApps().length === 0 
  ? initializeApp() 
  : getApp();

// Use modular API which is recommended for v13
export const adminDb = getFirestore(app);
export const adminMessaging = getMessaging(app);
export const adminAuth = getAuth(app);
