import fs from 'fs';
import path from 'path';

export interface EventRecord {
  id: string;
  churchId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  endTime?: string; // HH:mm
  category: 'culto' | 'ensaio' | 'reuniao' | 'vigilia' | 'especial' | 'outro';
  location?: string;
  description?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

const FALLBACK_CACHE_FILE = path.join('/tmp', 'applaine_events_cache.json');

const INITIAL_EVENTS: EventRecord[] = [
  {
    id: 'evt-culto-domingo',
    churchId: '',
    title: 'Culto de Celebração & Família',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    endTime: '21:00',
    category: 'culto',
    location: 'Templo Principal',
    description: 'Culto geral com louvor, ministração da Palavra e comunhão de toda a congregação.',
    createdBy: 'system',
    createdByName: 'Secretaria Ministerial',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'evt-oracao-semanal',
    churchId: '',
    title: 'Reunião de Oração & Intercessão',
    date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().split('T')[0];
    })(),
    time: '19:30',
    endTime: '20:45',
    category: 'vigilia',
    location: 'Sala de Oração / Templo',
    description: 'Momento de clamor pelas famílias, enfermos e ministérios da igreja.',
    createdBy: 'system',
    createdByName: 'Secretaria Ministerial',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'evt-ensaio-geral',
    churchId: '',
    title: 'Ensaio Geral: Louvor & Dança',
    date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 5);
      return d.toISOString().split('T')[0];
    })(),
    time: '19:30',
    endTime: '21:30',
    category: 'ensaio',
    location: 'Nave do Templo',
    description: 'Alinhamento dos cânticos, passagens musicais e coreografias da equipe.',
    createdBy: 'system',
    createdByName: 'Liderança',
    createdAt: new Date().toISOString(),
  },
];

let inMemoryStore: EventRecord[] = [...INITIAL_EVENTS];

function loadCache(): EventRecord[] {
  try {
    if (fs.existsSync(FALLBACK_CACHE_FILE)) {
      const raw = fs.readFileSync(FALLBACK_CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryStore = parsed;
        return inMemoryStore;
      }
    }
  } catch (err) {
    console.warn('[EventsStore] Could not read fallback cache file, using memory store:', err);
  }
  return inMemoryStore;
}

function persistCache(): void {
  try {
    fs.writeFileSync(FALLBACK_CACHE_FILE, JSON.stringify(inMemoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[EventsStore] Could not persist to cache file:', err);
  }
}

export function getEventsStore(): EventRecord[] {
  if (inMemoryStore.length === 0) {
    loadCache();
  }
  return [...inMemoryStore];
}

export function saveEventToStore(event: EventRecord): EventRecord {
  loadCache();
  const existingIdx = inMemoryStore.findIndex((e) => e.id === event.id);
  if (existingIdx >= 0) {
    inMemoryStore[existingIdx] = {
      ...inMemoryStore[existingIdx],
      ...event,
      updatedAt: new Date().toISOString(),
    };
  } else {
    inMemoryStore.unshift({
      ...event,
      createdAt: event.createdAt || new Date().toISOString(),
    });
  }
  persistCache();
  return event;
}

export function deleteEventFromStore(eventId: string): boolean {
  loadCache();
  const beforeLen = inMemoryStore.length;
  inMemoryStore = inMemoryStore.filter((e) => e.id !== eventId);
  const deleted = inMemoryStore.length < beforeLen;
  if (deleted) {
    persistCache();
  }
  return deleted;
}
