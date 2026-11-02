import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  memoryLocalCache,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const dbInstance = (() => {
  const dbId = (firebaseConfig as any).firestoreDatabaseId || undefined;

  // If already initialized for this databaseId, re-use the existing instance
  try {
    const existing = getFirestore(app, dbId);
    if (existing) return existing;
  } catch {
    // Proceed to initialize below
  }

  const isBrowser = typeof window !== 'undefined';
  let localCacheSetting: any = memoryLocalCache();

  if (isBrowser && typeof window.indexedDB !== 'undefined') {
    try {
      localCacheSetting = persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      });
    } catch {
      localCacheSetting = memoryLocalCache();
    }
  }

  try {
    return initializeFirestore(app, {
      localCache: localCacheSetting,
      experimentalAutoDetectLongPolling: true,
    }, dbId);
  } catch {
    return getFirestore(app, dbId);
  }
})();

export const db = dbInstance;
export const auth = getAuth(app);

// Messaging initialization - check for browser support and window existence
export const messaging = typeof window !== 'undefined' 
  ? async () => {
      const supported = await isSupported();
      return supported ? getMessaging(app) : null;
    }
  : null;

// Validate Connection to Firestore on startup as specified in the Firebase skill
if (typeof window !== 'undefined') {
  (async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('offline') || error?.code === 'unavailable') {
        console.warn('Firestore is running in offline/cached mode until backend reconnects.');
      }
    }
  })();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || '';

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  const isOfflineOrUnavailable =
    errCode === 'unavailable' ||
    errMsg.includes('unavailable') ||
    errMsg.includes('offline') ||
    errMsg.includes('The operation could not be completed') ||
    errMsg.includes('client is offline');

  // If transient network unavailable or offline, log warning and do not crash the React component
  if (isOfflineOrUnavailable) {
    console.warn('Firestore is temporarily unavailable or offline. Operating in offline/cached mode:', errMsg);
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}


