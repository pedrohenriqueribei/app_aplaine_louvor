import fs from "fs";
import path from "path";

export interface VisitorRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  churchId: string;
  firstVisit: string;
  followupStatus: "pending" | "contacted" | "member";
  source?: string;
  acceptedJesus?: boolean;
  reconciliation?: boolean;
  wantsVisit?: boolean;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  howMet?: string;
  invitedBy?: string;
  ageGroup?: string;
  maritalStatus?: string;
  hasChildren?: string;
  prayerRequest?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

const FALLBACK_CACHE_FILE = path.join("/tmp", "applaine_visitors_cache.json");

let inMemoryVisitors: VisitorRecord[] = [];

function loadCache(): VisitorRecord[] {
  try {
    if (fs.existsSync(FALLBACK_CACHE_FILE)) {
      const raw = fs.readFileSync(FALLBACK_CACHE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryVisitors = parsed;
        return inMemoryVisitors;
      }
    }
  } catch (err) {
    console.warn("[VisitorsStore] Cache read warning, using memory store:", err);
  }
  return inMemoryVisitors;
}

function persistCache(): void {
  try {
    fs.writeFileSync(FALLBACK_CACHE_FILE, JSON.stringify(inMemoryVisitors, null, 2), "utf-8");
  } catch (err) {
    console.warn("[VisitorsStore] Cache write warning:", err);
  }
}

export function getVisitorsStore(churchId?: string): VisitorRecord[] {
  loadCache();
  if (churchId) {
    const cleanId = String(churchId).trim();
    return inMemoryVisitors.filter((v) => v.churchId === cleanId);
  }
  return [...inMemoryVisitors];
}

export function saveVisitorToStore(record: VisitorRecord): VisitorRecord {
  loadCache();
  const cleanId = String(record.id).trim();
  const existingIndex = inMemoryVisitors.findIndex((v) => v.id === cleanId);

  const updatedRecord: VisitorRecord = {
    ...record,
    id: cleanId,
    updatedAt: new Date().toISOString(),
    createdAt: record.createdAt || new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    inMemoryVisitors[existingIndex] = {
      ...inMemoryVisitors[existingIndex],
      ...updatedRecord,
    };
  } else {
    inMemoryVisitors.unshift(updatedRecord);
  }

  persistCache();
  return updatedRecord;
}
