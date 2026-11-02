import fs from "fs";
import path from "path";

export interface ChurchRecord {
  id: string;
  name: string;
  address?: string;
  pastor?: string;
  worshipMinistryName?: string;
  worshipMinistryAcronym?: string;
  danceMinistryName?: string;
  danceMinistryAcronym?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const FALLBACK_CACHE_FILE = path.join("/tmp", "applaine_churches_cache.json");

const INITIAL_CHURCHES: ChurchRecord[] = [
  {
    id: "7",
    name: "Igreja Central da Fé",
    address: "Av. Principal, 700 - Centro",
    pastor: "Pr. Marcos Oliveira",
    worshipMinistryName: "Ministério de Louvor Aplaine",
    worshipMinistryAcronym: "MLA",
    danceMinistryName: "Ministério de Dança Shekinah",
    danceMinistryAcronym: "MDS",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "church_central",
    name: "Igreja Batista Renovada",
    address: "Rua das Oliveiras, 120 - Jardim Esperança",
    pastor: "Pr. Roberto Silva",
    worshipMinistryName: "Ministério de Louvor Som da Graça",
    worshipMinistryAcronym: "MSG",
    danceMinistryName: "Ministério de Dança Kadosh",
    danceMinistryAcronym: "MDK",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "church_sede",
    name: "Comunidade Cristã Vida Nova",
    address: "Av. Brasil, 1540 - Setor Sul",
    pastor: "Pr. André Santos",
    worshipMinistryName: "Ministério de Louvor & Adoração",
    worshipMinistryAcronym: "MLA",
    danceMinistryName: "Companhia de Louvor e Dança",
    danceMinistryAcronym: "CLD",
    active: true,
    createdAt: new Date().toISOString(),
  },
];

let inMemoryChurches: ChurchRecord[] = [...INITIAL_CHURCHES];

function loadCache(): ChurchRecord[] {
  try {
    if (fs.existsSync(FALLBACK_CACHE_FILE)) {
      const raw = fs.readFileSync(FALLBACK_CACHE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with initial churches so default IDs like '7' always exist
        const map = new Map<string, ChurchRecord>();
        INITIAL_CHURCHES.forEach((c) => map.set(c.id, c));
        parsed.forEach((c: ChurchRecord) => map.set(c.id, { ...(map.get(c.id) || {}), ...c }));
        inMemoryChurches = Array.from(map.values());
        return inMemoryChurches;
      }
    }
  } catch (err) {
    console.warn("[ChurchesStore] Cache read warning, using memory store:", err);
  }
  return inMemoryChurches;
}

function persistCache(): void {
  try {
    fs.writeFileSync(FALLBACK_CACHE_FILE, JSON.stringify(inMemoryChurches, null, 2), "utf-8");
  } catch (err) {
    console.warn("[ChurchesStore] Cache write warning:", err);
  }
}

export function getChurchesStore(): ChurchRecord[] {
  if (inMemoryChurches.length === 0) {
    loadCache();
  }
  return [...inMemoryChurches];
}

export function getChurchById(id: string): ChurchRecord | null {
  loadCache();
  const cleanId = String(id).trim();
  const found = inMemoryChurches.find((c) => c.id === cleanId);
  if (found) return { ...found };

  // Fallback match by partial or numeric id if applicable
  const numericMatch = inMemoryChurches.find(
    (c) => c.id.endsWith(`_${cleanId}`) || c.id === `church_${cleanId}`
  );
  if (numericMatch) return { ...numericMatch };

  return null;
}

export function saveChurchToStore(church: ChurchRecord): ChurchRecord {
  loadCache();
  const cleanId = String(church.id).trim();
  const existingIndex = inMemoryChurches.findIndex((c) => c.id === cleanId);

  const updatedRecord: ChurchRecord = {
    ...church,
    id: cleanId,
    updatedAt: new Date().toISOString(),
    createdAt: church.createdAt || new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    inMemoryChurches[existingIndex] = {
      ...inMemoryChurches[existingIndex],
      ...updatedRecord,
    };
  } else {
    inMemoryChurches.push(updatedRecord);
  }

  persistCache();
  return updatedRecord;
}
