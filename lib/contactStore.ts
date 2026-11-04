import fs from "fs";
import path from "path";

export type ContactCategory =
  | "duvida"
  | "suporte"
  | "sugestao"
  | "elogio"
  | "parceria"
  | "outro";

export type ContactStatus =
  | "new"
  | "read"
  | "in_progress"
  | "resolved"
  | "archived";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  churchName?: string;
  category: ContactCategory;
  subject: string;
  message: string;
  status: ContactStatus;
  adminNotes?: string;
  userId?: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
}

const FALLBACK_CACHE_FILE = path.join("/tmp", "applaine_contact_messages.json");
let inMemoryMessages: ContactMessage[] = [];

function loadCache(): ContactMessage[] {
  try {
    if (fs.existsSync(FALLBACK_CACHE_FILE)) {
      const raw = fs.readFileSync(FALLBACK_CACHE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryMessages = parsed;
        return inMemoryMessages;
      }
    }
  } catch (err) {
    console.warn("[ContactStore] Cache read warning, using memory store:", err);
  }
  return inMemoryMessages;
}

function persistCache(): void {
  try {
    fs.writeFileSync(FALLBACK_CACHE_FILE, JSON.stringify(inMemoryMessages, null, 2), "utf-8");
  } catch (err) {
    console.warn("[ContactStore] Cache write warning:", err);
  }
}

export function getAllContactMessages(): ContactMessage[] {
  loadCache();
  return [...inMemoryMessages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function saveContactMessage(msg: Omit<ContactMessage, "id" | "createdAt" | "status"> & { id?: string }): ContactMessage {
  loadCache();
  const id = msg.id || "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();

  const newRecord: ContactMessage = {
    ...msg,
    id,
    status: "new",
    createdAt: now,
    updatedAt: now,
  };

  inMemoryMessages.unshift(newRecord);
  persistCache();
  return newRecord;
}

export function updateContactMessage(
  id: string,
  updates: Partial<Pick<ContactMessage, "status" | "adminNotes" | "resolvedAt">>
): ContactMessage | null {
  loadCache();
  const index = inMemoryMessages.findIndex((m) => m.id === id);
  if (index === -1) return null;

  const current = inMemoryMessages[index];
  const updated: ContactMessage = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (updates.status === "resolved" && !updated.resolvedAt) {
    updated.resolvedAt = new Date().toISOString();
  }

  inMemoryMessages[index] = updated;
  persistCache();
  return updated;
}

export function deleteContactMessage(id: string): boolean {
  loadCache();
  const initialLen = inMemoryMessages.length;
  inMemoryMessages = inMemoryMessages.filter((m) => m.id !== id);
  const removed = inMemoryMessages.length !== initialLen;
  if (removed) {
    persistCache();
  }
  return removed;
}
