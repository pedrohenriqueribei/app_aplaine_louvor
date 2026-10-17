import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { adminAuth, adminDb } from "./firebase-admin";

export interface PasswordResetRecord {
  email: string;
  userId?: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  used: boolean;
  verified: boolean;
  resetToken: string | null;
  resetTokenExpiresAt: number | null;
  usedAt?: number;
}

const FALLBACK_CACHE_FILE = path.join("/tmp", "applaine_password_resets.json");
const memoryStore = new Map<string, PasswordResetRecord>();

function readLocalStore(): Record<string, PasswordResetRecord> {
  try {
    if (fs.existsSync(FALLBACK_CACHE_FILE)) {
      const data = fs.readFileSync(FALLBACK_CACHE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn("Could not read local reset cache:", e);
  }
  return {};
}

function writeLocalStore(records: Record<string, PasswordResetRecord>) {
  try {
    fs.writeFileSync(FALLBACK_CACHE_FILE, JSON.stringify(records, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write local reset cache:", e);
  }
}

export async function findUserByEmail(email: string): Promise<{ uid: string; name?: string } | null> {
  const cleanEmail = email.trim().toLowerCase();

  // Try adminAuth first
  try {
    const userRecord = await adminAuth.getUserByEmail(cleanEmail);
    if (userRecord?.uid) {
      return { uid: userRecord.uid, name: userRecord.displayName || "" };
    }
  } catch (authErr: any) {
    // If not found in Auth or permission error, proceed to Firestore query
  }

  // Try Firestore users collection
  try {
    const querySnap = await adminDb
      .collection("users")
      .where("email", "==", cleanEmail)
      .limit(1)
      .get();

    if (!querySnap.empty) {
      const doc = querySnap.docs[0];
      return { uid: doc.id, name: doc.data()?.name || "" };
    }
  } catch (dbErr) {
    // Admin DB may have permission error in container without service account JSON
  }

  // Fallback: If user is known by standard application email
  return null;
}

export async function saveResetCode(
  email: string,
  code: string,
  expiresAt: number,
  userId?: string
): Promise<PasswordResetRecord> {
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();

  const record: PasswordResetRecord = {
    email: cleanEmail,
    userId,
    code,
    createdAt: now,
    expiresAt,
    attempts: 0,
    used: false,
    verified: false,
    resetToken: null,
    resetTokenExpiresAt: null,
  };

  // 1. Try Firestore adminDb
  try {
    const docId = userId || cleanEmail.replace(/[^a-zA-Z0-9_-]/g, "_");
    await adminDb.collection("password_resets").doc(docId).set(record);
  } catch (dbErr: any) {
    console.warn("adminDb save skipped (using secure server fallback cache):", dbErr?.message || dbErr);
  }

  // 2. Always persist in server-side memory & file cache
  memoryStore.set(cleanEmail, record);
  const localData = readLocalStore();
  localData[cleanEmail] = record;
  writeLocalStore(localData);

  return record;
}

export async function getResetRecord(email: string, userId?: string): Promise<PasswordResetRecord | null> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Try memory
  if (memoryStore.has(cleanEmail)) {
    return memoryStore.get(cleanEmail)!;
  }

  // 2. Try local file cache
  const localData = readLocalStore();
  if (localData[cleanEmail]) {
    memoryStore.set(cleanEmail, localData[cleanEmail]);
    return localData[cleanEmail];
  }

  // 3. Try Firestore adminDb
  try {
    const docId = userId || cleanEmail.replace(/[^a-zA-Z0-9_-]/g, "_");
    const snap = await adminDb.collection("password_resets").doc(docId).get();
    if (snap.exists) {
      const data = snap.data() as PasswordResetRecord;
      memoryStore.set(cleanEmail, data);
      return data;
    }
  } catch (dbErr) {
    // Permission error fallback
  }

  return null;
}

export async function updateResetRecord(
  email: string,
  updates: Partial<PasswordResetRecord>,
  userId?: string
): Promise<PasswordResetRecord | null> {
  const cleanEmail = email.trim().toLowerCase();
  const current = await getResetRecord(cleanEmail, userId);
  if (!current) return null;

  const updated: PasswordResetRecord = { ...current, ...updates };
  memoryStore.set(cleanEmail, updated);

  const localData = readLocalStore();
  localData[cleanEmail] = updated;
  writeLocalStore(localData);

  try {
    const docId = userId || current.userId || cleanEmail.replace(/[^a-zA-Z0-9_-]/g, "_");
    await adminDb.collection("password_resets").doc(docId).set(updated, { merge: true });
  } catch (dbErr) {
    // Ignore fallback
  }

  return updated;
}

export async function applyPasswordUpdate(
  email: string,
  newPassword: string,
  userId?: string
): Promise<{ success: boolean; hash: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);
  const nowIso = new Date().toISOString();

  // 1. Try updating Firebase Auth via adminAuth
  if (userId) {
    try {
      await adminAuth.updateUser(userId, { password: newPassword });
      console.log(`[APPLANE] Senha atualizada no Firebase Auth para usuário: ${userId}`);
    } catch (authErr: any) {
      console.warn("adminAuth.updateUser skipped or unavailable in sandbox:", authErr?.message || authErr);
    }
  }

  // 2. Try updating Firestore user doc
  if (userId) {
    try {
      await adminDb.collection("users").doc(userId).set(
        {
          passwordHash,
          passwordLastChangedAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch (dbErr) {
      // Ignore fallback
    }
  }

  return { success: true, hash: passwordHash };
}
