import fs from "fs";
import path from "path";
import { adminAuth, adminDb } from "./firebase-admin";

export interface VerificationCodeRecord {
  userId: string;
  email: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  used: boolean;
  verifiedAt?: number;
}

const FALLBACK_CACHE_FILE = path.join("/tmp", "applaine_verification_codes.json");
const memoryStore = new Map<string, VerificationCodeRecord>();

function readLocalStore(): Record<string, VerificationCodeRecord> {
  try {
    if (fs.existsSync(FALLBACK_CACHE_FILE)) {
      const data = fs.readFileSync(FALLBACK_CACHE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn("Could not read local verification code cache:", e);
  }
  return {};
}

function writeLocalStore(records: Record<string, VerificationCodeRecord>) {
  try {
    fs.writeFileSync(FALLBACK_CACHE_FILE, JSON.stringify(records, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write local verification code cache:", e);
  }
}

export async function getVerificationRecord(userId: string): Promise<VerificationCodeRecord | null> {
  if (!userId) return null;
  const cleanId = userId.trim();

  // 1. Check in-memory store
  if (memoryStore.has(cleanId)) {
    return memoryStore.get(cleanId)!;
  }

  // 2. Check local file cache
  const localData = readLocalStore();
  if (localData[cleanId]) {
    memoryStore.set(cleanId, localData[cleanId]);
    return localData[cleanId];
  }

  // 3. Try Firestore adminDb safely (gracefully handle PERMISSION_DENIED / server IAM limits)
  try {
    const snap = await adminDb.collection("verification_codes").doc(cleanId).get();
    if (snap.exists) {
      const data = snap.data() as VerificationCodeRecord;
      memoryStore.set(cleanId, data);
      return data;
    }
  } catch (dbErr: any) {
    console.warn(
      "adminDb getVerificationRecord skipped (using server memory/file fallback):",
      dbErr?.message || dbErr
    );
  }

  return null;
}

export async function saveVerificationRecord(
  userId: string,
  email: string,
  code: string,
  expiresAt: number
): Promise<VerificationCodeRecord> {
  const cleanId = userId.trim();
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();

  const record: VerificationCodeRecord = {
    userId: cleanId,
    email: cleanEmail,
    code,
    createdAt: now,
    expiresAt,
    attempts: 0,
    used: false,
  };

  // 1. Try Firestore adminDb safely
  try {
    await adminDb.collection("verification_codes").doc(cleanId).set(record);
  } catch (dbErr: any) {
    console.warn(
      "adminDb saveVerificationRecord skipped (using server memory/file fallback):",
      dbErr?.message || dbErr
    );
  }

  // 2. Always persist in server-side memory & file cache
  memoryStore.set(cleanId, record);
  const localData = readLocalStore();
  localData[cleanId] = record;
  writeLocalStore(localData);

  return record;
}

export async function updateVerificationRecord(
  userId: string,
  updates: Partial<VerificationCodeRecord>
): Promise<VerificationCodeRecord | null> {
  const cleanId = userId.trim();
  const existing = await getVerificationRecord(cleanId);
  if (!existing) return null;

  const updated: VerificationCodeRecord = {
    ...existing,
    ...updates,
  };

  // 1. Update in memory & file cache
  memoryStore.set(cleanId, updated);
  const localData = readLocalStore();
  localData[cleanId] = updated;
  writeLocalStore(localData);

  // 2. Try Firestore adminDb safely
  try {
    await adminDb.collection("verification_codes").doc(cleanId).set(updated, { merge: true });
  } catch (dbErr: any) {
    console.warn(
      "adminDb updateVerificationRecord skipped (saved to server cache):",
      dbErr?.message || dbErr
    );
  }

  return updated;
}

export async function markUserVerifiedServer(userId: string): Promise<void> {
  const cleanId = userId.trim();
  const nowIso = new Date().toISOString();

  // Try Firestore adminDb
  try {
    await adminDb.collection("users").doc(cleanId).set(
      {
        emailVerified: true,
        email_verified: true,
        emailVerifiedAt: nowIso,
        updatedAt: nowIso,
      },
      { merge: true }
    );
  } catch (dbErr: any) {
    console.warn(
      "adminDb markUserVerifiedServer skipped (client updates via authenticated session):",
      dbErr?.message || dbErr
    );
  }

  // Try Firebase Auth admin
  try {
    await adminAuth.updateUser(cleanId, {
      emailVerified: true,
    });
  } catch (authErr: any) {
    console.warn(
      "adminAuth updateUser skipped:",
      authErr?.message || authErr
    );
  }
}
