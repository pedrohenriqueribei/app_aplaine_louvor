import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

// Messaging initialization - check for browser support and window existence
export const messaging = typeof window !== 'undefined' 
  ? async () => {
      const supported = await isSupported();
      return supported ? getMessaging(app) : null;
    }
  : null;

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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (errInfo.error.includes('offline')) {
    console.error('CRITICAL: Firestore is offline. Check databaseId and network.');
  }
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    if (typeof window !== 'undefined') {
      await getDocFromServer(doc(db, 'test', 'connection'));
    }
  } catch (error: any) {
    if (error.message && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Firestore is unreachable.");
    }
  }
}
testConnection();
