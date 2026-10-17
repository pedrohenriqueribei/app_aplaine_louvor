import fs from 'fs';
import path from 'path';

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt?: string;
  authorId?: string;
  authorName: string;
  authorRole?: string;
  authorPhotoURL?: string | null;
  churchId?: string;
  isPinned?: boolean;
  targetAudience?: string;
}

const FALLBACK_CACHE_FILE = path.join('/tmp', 'applaine_announcements_cache.json');

const INITIAL_ANNOUNCEMENTS: AnnouncementRecord[] = [
  {
    id: 'ann-default-1',
    title: 'Ensaio Geral Integrado: Louvor & Dança',
    content: 'Nesta quinta-feira às 19:30 no Templo Principal para alinhamento geral do repertório e ministrações do próximo domingo de celebração.',
    category: 'Geral',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    authorName: 'Pastoral & Liderança',
    authorRole: 'Coordenação Geral',
    isPinned: true,
    churchId: '',
    targetAudience: 'Todos os Membros',
  },
  {
    id: 'ann-default-2',
    title: 'Prazo para Envio de Disponibilidade',
    content: 'Lembre-se de preencher e confirmar suas datas livres do próximo mês na aba de Disponibilidade até o dia 25 para fechamento da grade das escalas.',
    category: 'Secretaria',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    authorName: 'Secretaria Ministerial',
    authorRole: 'Gestão de Voluntários',
    isPinned: false,
    churchId: '',
    targetAudience: 'Todos os Membros',
  },
  {
    id: 'ann-default-3',
    title: 'Consagração Pré-Culto de Domingo',
    content: 'Momento de oração, comunhão e direcionamento espiritual com todos os integrantes escalados pontualmente às 08:30 na sala de ministração.',
    category: 'Liderança',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    authorName: 'Conselho de Líderes',
    authorRole: 'Liderança Pastoral',
    isPinned: false,
    churchId: '',
    targetAudience: 'Todos os Membros',
  },
];

let memoryCache: AnnouncementRecord[] | null = null;

export function getAnnouncementsStore(): AnnouncementRecord[] {
  if (memoryCache && memoryCache.length > 0) {
    return memoryCache;
  }

  try {
    if (fs.existsSync(FALLBACK_CACHE_FILE)) {
      const data = fs.readFileSync(FALLBACK_CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache = parsed;
        return memoryCache;
      }
    }
  } catch (err) {
    console.warn('Could not read announcements fallback file:', err);
  }

  memoryCache = [...INITIAL_ANNOUNCEMENTS];
  return memoryCache;
}

export function saveAnnouncementToStore(record: AnnouncementRecord) {
  const current = getAnnouncementsStore();
  const index = current.findIndex((a) => a.id === record.id);
  if (index >= 0) {
    current[index] = { ...current[index], ...record };
  } else {
    current.unshift(record);
  }
  memoryCache = current;

  try {
    fs.writeFileSync(FALLBACK_CACHE_FILE, JSON.stringify(current, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write announcements fallback file:', err);
  }
}

export function deleteAnnouncementFromStore(id: string) {
  const current = getAnnouncementsStore();
  memoryCache = current.filter((a) => a.id !== id);

  try {
    fs.writeFileSync(FALLBACK_CACHE_FILE, JSON.stringify(memoryCache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write announcements fallback file:', err);
  }
}
