import fs from 'fs';
import firebaseConfig from '../firebase-applet-config.json';
import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getAuth, Auth } from 'firebase-admin/auth';

// Clean up invalid GOOGLE_APPLICATION_CREDENTIALS (e.g. local Windows path passed to Cloud/Linux environment)
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      console.warn(
        `GOOGLE_APPLICATION_CREDENTIALS path "${process.env.GOOGLE_APPLICATION_CREDENTIALS}" does not exist. Clearing environment variable.`
      );
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
  } catch {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
}

// Set project identity for gRPC and cloud libraries
if (firebaseConfig.projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
}

function getAdminApp(): App {
  if (getApps().length === 0) {
    return initializeApp({
      projectId: firebaseConfig.projectId,
    });
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
    if (typeof val === 'function') {
      return function (...args: any[]) {
        try {
          const result = val.apply(_auth, args);
          if (result && typeof result.then === 'function') {
            return result.catch((err: any) => {
              const msg = String(err?.message || err || '');
              // If Identity Toolkit API is disabled on the host Cloud project
              if (
                msg.includes('identitytoolkit.googleapis.com') ||
                (err?.code === 403 && msg.includes('PERMISSION_DENIED')) ||
                err?.errorInfo?.code === 'auth/configuration-not-found'
              ) {
                const safeErr = new Error('Identity Toolkit API is not available on this host environment.');
                (safeErr as any).code = 'auth/service-disabled';
                (safeErr as any).isServiceDisabled = true;
                throw safeErr;
              }
              throw err;
            });
          }
          return result;
        } catch (err: any) {
          const msg = String(err?.message || err || '');
          if (
            msg.includes('identitytoolkit.googleapis.com') ||
            (err?.code === 403 && msg.includes('PERMISSION_DENIED')) ||
            err?.errorInfo?.code === 'auth/configuration-not-found'
          ) {
            const safeErr = new Error('Identity Toolkit API is not available on this host environment.');
            (safeErr as any).code = 'auth/service-disabled';
            (safeErr as any).isServiceDisabled = true;
            throw safeErr;
          }
          throw err;
        }
      };
    }
    return val;
  }
});

