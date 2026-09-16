import firebaseConfig from '../firebase-applet-config.json';
import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getAuth, Auth } from 'firebase-admin/auth';

// Set project identity for gRPC and cloud libraries
if (firebaseConfig.projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
}

function getAdminApp(): App {
  if (getApps().length === 0) {
    return initializeApp();
  }
  return getApp();
}

let _db: Firestore | null = null;
export const adminDb = new Proxy({} as Firestore, {
  get(target, prop, receiver) {
    if (!_db) {
      const app = getAdminApp();
      _db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || undefined);
    }
    const val = Reflect.get(_db, prop);
    return typeof val === 'function' ? val.bind(_db) : val;
  }
});

let _messaging: Messaging | null = null;
export const adminMessaging = new Proxy({} as Messaging, {
  get(target, prop, receiver) {
    if (!_messaging) {
      const app = getAdminApp();
      _messaging = getMessaging(app);
    }
    const val = Reflect.get(_messaging, prop);
    return typeof val === 'function' ? val.bind(_messaging) : val;
  }
});

let _auth: Auth | null = null;
export const adminAuth = new Proxy({} as Auth, {
  get(target, prop, receiver) {
    if (!_auth) {
      const app = getAdminApp();
      _auth = getAuth(app);
    }
    const val = Reflect.get(_auth, prop);
    return typeof val === 'function' ? val.bind(_auth) : val;
  }
});

