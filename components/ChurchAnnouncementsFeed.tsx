'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Pin,
  Share2,
  Calendar,
  Sparkles,
  ChevronRight,
  MessageCircle,
  Plus,
  Trash2,
  Check,
  Copy,
  Search,
  Filter,
  X,
  Megaphone,
  User,
  ShieldAlert,
  Clock,
  Send,
  Eye,
  BookmarkCheck,
  AlertCircle,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { recordAuditLog } from '@/lib/audit';
import { cn } from '@/lib/utils';

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category: 'Geral' | 'Louvor' | 'Dança' | 'Secretaria' | 'Liderança' | 'Pastoral' | 'Eventos' | 'Oração' | string;
  createdAt: string;
  authorId?: string;
  authorName: string;
  authorRole?: string;
  authorPhotoURL?: string | null;
  churchId?: string;
  isPinned?: boolean;
  targetAudience?: string;
}

const DEFAULT_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-default-1',
    title: 'Ensaio Geral Integrado: Louvor & Dança',
    content: 'Nesta quinta-feira às 19:30 no Templo Principal para alinhamento geral do repertório e ministrações do próximo domingo de celebração.',
    category: 'Geral',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    authorName: 'Pastoral & Liderança',
    authorRole: 'Coordenação Geral',
    isPinned: true,
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
  },
];

const CATEGORIES = [
  'Geral',
  'Louvor',
  'Multimídia',
  'Dança',
  'Secretaria',
  'Liderança',
  'Pastoral',
  'Eventos',
  'Oração',
];

interface ChurchAnnouncementsFeedProps {
  churchId?: string;
  onShareWhatsApp?: (announcement: AnnouncementItem) => void;
}

export function ChurchAnnouncementsFeed({
  churchId,
  onShareWhatsApp,
}: ChurchAnnouncementsFeedProps) {
  const { userData, isSuperAdmin, user } = useAuth();
  const effectiveChurchId = churchId || userData?.churchId || '';

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeViewingAnnouncement, setActiveViewingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<AnnouncementItem | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('Geral');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Determine if current user has leadership privileges to post & manage announcements
  const isLeadership = useMemo(() => {
    if (isSuperAdmin) return true;
    const r = (userData?.role || '').toLowerCase();
    const isLeadershipRole = [
      'admin',
      'super_admin',
      'leader',
      'líder',
      'lider',
      'pastor',
      'pastoral',
      'main_minister',
      'ministro',
      'diretor',
      'coordenador',
      'vice_leader',
    ].includes(r);
    if (isLeadershipRole) return true;

    // Check roles map
    const rolesMap = userData?.roles || {};
    const hasLeaderSubrole = Object.values(rolesMap).some((arr) => {
      if (!Array.isArray(arr)) return false;
      return arr.some((subrole) =>
        ['leader', 'líder', 'main_minister', 'dance_leader', 'multimedia_leader'].includes(subrole)
      );
    });

    return hasLeaderSubrole;
  }, [isSuperAdmin, userData]);

  // Real-time listener for announcements
  useEffect(() => {
    if (!effectiveChurchId && !isSuperAdmin) {
      setAnnouncements(DEFAULT_ANNOUNCEMENTS);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const q = effectiveChurchId
        ? query(collection(db, 'announcements'), where('churchId', '==', effectiveChurchId))
        : query(collection(db, 'announcements'));

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (snap.empty) {
            // Se ainda não houver comunicados cadastrados para esta igreja, exibe os avisos de boas-vindas
            setAnnouncements(DEFAULT_ANNOUNCEMENTS);
          } else {
            const list: AnnouncementItem[] = snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                title: data.title || 'Comunicado',
                content: data.content || '',
                category: data.category || 'Geral',
                createdAt: data.createdAt || new Date().toISOString(),
                authorId: data.authorId,
                authorName: data.authorName || 'Liderança',
                authorRole: data.authorRole || 'Líder',
                authorPhotoURL: data.authorPhotoURL || null,
                churchId: data.churchId,
                isPinned: Boolean(data.isPinned),
                targetAudience: data.targetAudience || 'Todos os Membros',
              };
            });

            // Ordena: fixados primeiro, depois mais recentes
            list.sort((a, b) => {
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            setAnnouncements(list);
          }
          setLoading(false);
        },
        async (err) => {
          console.warn('Firestore onSnapshot listener error, attempting /api/announcements fallback:', err);
          try {
            const token = await auth.currentUser?.getIdToken();
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`/api/announcements?churchId=${encodeURIComponent(effectiveChurchId)}`, { headers });
            if (res.ok) {
              const data = await res.json();
              if (data.announcements && data.announcements.length > 0) {
                setAnnouncements(data.announcements);
              } else {
                setAnnouncements(DEFAULT_ANNOUNCEMENTS);
              }
            } else {
              setAnnouncements(DEFAULT_ANNOUNCEMENTS);
            }
          } catch {
            setAnnouncements(DEFAULT_ANNOUNCEMENTS);
          }
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up announcements listener:', err);
      setAnnouncements(DEFAULT_ANNOUNCEMENTS);
      setLoading(false);
    }
  }, [effectiveChurchId, isSuperAdmin]);

  // Format relative timestamp
  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return 'Recentemente';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return 'Agora mesmo';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `Há ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Ontem';
      if (diffDays < 7) return `Há ${diffDays} dias`;
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'Recentemente';
    }
  };

  // WhatsApp share helper
  const handleShare = (item: AnnouncementItem) => {
    if (onShareWhatsApp) {
      onShareWhatsApp(item);
      return;
    }
    const message = [
      `📢 *MURAL DE AVISOS • ${item.title.toUpperCase()}*`,
      ``,
      item.content,
      ``,
      `🏷️ Categoria: ${item.category}`,
      `👤 Comunicado por: ${item.authorName} (${item.authorRole || 'Liderança'})`,
      `📅 Publicado: ${formatTimeAgo(item.createdAt)}`,
      ``,
      `_Applane • Gestão & Escalas da Igreja_`,
    ].join('\n');

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Copy to clipboard
  const handleCopyText = (item: AnnouncementItem) => {
    const text = `📢 ${item.title}\n\n${item.content}\n\n— ${item.authorName} (${item.category})`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle Pin/Unpin
  const handleTogglePin = async (item: AnnouncementItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLeadership) return;
    try {
      const newPinState = !item.isPinned;
      // Optimistic update
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, isPinned: newPinState } : a))
      );

      await updateDoc(doc(db, 'announcements', item.id), {
        isPinned: newPinState,
      });

      // Audit log
      await recordAuditLog({
        action: 'UPDATE',
        entityType: 'Announcement',
        entityId: item.id,
        entityLabel: `Fixação de aviso: ${item.title}`,
        oldData: { isPinned: item.isPinned },
        newData: { isPinned: newPinState },
        churchId: effectiveChurchId || 'church',
      });
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  // Delete announcement
  const handleDeleteAnnouncement = async () => {
    if (!announcementToDelete || !isLeadership) return;
    try {
      const id = announcementToDelete.id;
      // Optimistic remove
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));

      try {
        await deleteDoc(doc(db, 'announcements', id));
      } catch (err) {
        // Fallback to server API
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          await fetch(`/api/announcements?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      // Audit log
      await recordAuditLog({
        action: 'DELETE',
        entityType: 'Announcement',
        entityId: id,
        entityLabel: `Aviso excluído: ${announcementToDelete.title}`,
        oldData: { title: announcementToDelete.title, category: announcementToDelete.category },
        churchId: effectiveChurchId || 'church',
      });

      setAnnouncementToDelete(null);
      if (activeViewingAnnouncement?.id === id) {
        setActiveViewingAnnouncement(null);
      }
    } catch (err) {
      console.error('Error deleting announcement:', err);
    }
  };

  // Create new announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    setSubmitting(true);
    try {
      const announcementId = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();

      const newRecord: AnnouncementItem = {
        id: announcementId,
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        createdAt: nowIso,
        authorId: user?.uid,
        authorName: userData?.name || user?.displayName || user?.email?.split('@')[0] || 'Líder',
        authorRole: userData?.role || 'Líder Ministerial',
        authorPhotoURL: (userData as any)?.photoURL || user?.photoURL || null,
        churchId: effectiveChurchId || 'church',
        isPinned: formIsPinned,
        targetAudience: 'Todos os Membros',
      };

      // 1. Save directly to Firestore collection
      try {
        await setDoc(doc(db, 'announcements', announcementId), newRecord);
      } catch (clientWriteErr) {
        // Fallback to server API
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          await fetch('/api/announcements', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(newRecord),
          });
        }
      }

      // 2. Audit log
      await recordAuditLog({
        action: 'CREATE',
        entityType: 'Announcement',
        entityId: announcementId,
        entityLabel: `Novo aviso publicado: ${newRecord.title}`,
        newData: {
          title: newRecord.title,
          category: newRecord.category,
          isPinned: newRecord.isPinned,
          authorName: newRecord.authorName,
        },
        churchId: effectiveChurchId || 'church',
      });

      // Reset form
      setFormTitle('');
      setFormContent('');
      setFormCategory('Geral');
      setFormIsPinned(false);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating announcement:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter announcements by category & search
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesContent = item.content.toLowerCase().includes(q);
        const matchesAuthor = item.authorName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesContent && !matchesAuthor) return false;
      }
      return true;
    });
  }, [announcements, selectedCategory, searchQuery]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Louvor':
        return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'Dança':
        return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      case 'Multimídia':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
      case 'Secretaria':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'Liderança':
      case 'Pastoral':
        return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      case 'Eventos':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'Oração':
        return 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between transition-all">
      <div>
        {/* CABEÇALHO DO WIDGET */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center font-bold shrink-0 border border-blue-200 dark:border-blue-800/50">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-display font-black text-slate-900 dark:text-white tracking-tight">
                  Mural de Avisos Gerais
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Ao Vivo
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Comunicados oficiais da liderança para toda a igreja
              </p>
            </div>
          </div>

          {/* BOTÃO DA LIDERANÇA: POSTAR NOVO AVISO */}
          {isLeadership && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-white bg-blue-700 hover:bg-blue-800 active:scale-95 rounded-xl transition cursor-pointer shadow-xs shadow-blue-700/20 shrink-0"
              title="Postar nova mensagem no mural de avisos"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Novo Aviso</span>
            </button>
          )}
        </div>

        {/* BARRA DE FILTROS POR CATEGORIA */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer',
              selectedCategory === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Todos ({announcements.length})
          </button>
          {CATEGORIES.slice(0, 5).map((cat) => {
            const count = announcements.filter((a) => a.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer',
                  selectedCategory === cat
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {cat} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        {/* LISTAGEM DE COMUNICADOS */}
        {loading ? (
          <div className="space-y-3 py-6 text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Carregando avisos da igreja...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 my-2">
            <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nenhum comunicado nesta categoria.
            </p>
            {isLeadership && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 text-xs font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar primeiro aviso
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {filteredAnnouncements.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveViewingAnnouncement(item)}
                className={cn(
                  'p-4 rounded-2xl border transition-all cursor-pointer relative group overflow-hidden',
                  item.isPinned
                    ? 'bg-linear-to-r from-blue-50/70 via-indigo-50/40 to-white dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900 border-blue-300/80 dark:border-blue-800/70 shadow-xs'
                    : 'bg-slate-50/90 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 border-slate-200/70 dark:border-slate-800/60'
                )}
              >
                {/* Ribbon if pinned */}
                {item.isPinned && (
                  <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                    <div className="bg-linear-to-r from-amber-500 to-amber-600 text-white text-[9px] font-black uppercase tracking-wider text-center py-0.5 absolute -right-6 top-3 w-24 rotate-45 shadow-xs">
                      Fixado
                    </div>
                  </div>
                )}

                {/* Top Meta Line: Badges, Date, Pin toggle */}
                <div className="flex items-center justify-between gap-2 mb-2 pr-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.isPinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500 text-white shadow-2xs">
                        <Pin className="w-3 h-3 fill-current" />
                        Destaque
                      </span>
                    )}
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-bold border',
                        getCategoryColor(item.category)
                      )}
                    >
                      {item.category}
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(item.createdAt)}
                  </span>
                </div>

                {/* Title & Excerpt */}
                <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug mb-1.5 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 whitespace-pre-line">
                  {item.content}
                </p>

                {/* Card Footer: Author info & Quick Actions */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-200 shrink-0 overflow-hidden">
                      {item.authorPhotoURL ? (
                        <img src={item.authorPhotoURL} alt={item.authorName} className="w-full h-full object-cover" />
                      ) : (
                        item.authorName[0] || 'L'
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {item.authorName}
                      </span>
                      {item.authorRole && (
                        <span className="text-[10px] text-slate-400 truncate block">
                          {item.authorRole}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Pin/Unpin button for leadership */}
                    {isLeadership && (
                      <button
                        onClick={(e) => handleTogglePin(item, e)}
                        className={cn(
                          'p-1.5 rounded-lg text-xs transition cursor-pointer',
                          item.isPinned
                            ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                        )}
                        title={item.isPinned ? 'Desafixar do topo' : 'Fixar no topo do mural'}
                      >
                        <Pin className={cn('w-3.5 h-3.5', item.isPinned && 'fill-current')} />
                      </button>
                    )}

                    {/* Delete button for leadership */}
                    {isLeadership && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnnouncementToDelete(item);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                        title="Excluir comunicado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Copy text */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyText(item);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                      title="Copiar texto do comunicado"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* WhatsApp share */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(item);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                      title="Enviar pelo WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Zap</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RODAPÉ DO WIDGET */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-400 font-medium">
          {announcements.length} comunicado(s) no mural
        </span>

        {isLeadership ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Postar para Todos</span>
          </button>
        ) : (
          <button
            onClick={() => {
              const text = 'Graça e paz a todos os irmãos! Seguem os últimos avisos e comunicados da liderança da nossa igreja no mural do app.';
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            }}
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Compartilhar Mural</span>
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {/* MODAL 1: POSTAR NOVO AVISO (LIDERANÇA) */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Publicar Comunicado no Mural
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Esta mensagem ficará visível para todos os membros no dashboard
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Título do Comunicado *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    placeholder="Ex: Ensaio Geral Integrado neste Sábado às 16h"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Categoria / Ministério
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormCategory(cat)}
                        className={cn(
                          'py-1.5 px-2 rounded-xl text-xs font-bold transition text-center cursor-pointer border',
                          formCategory === cat
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conteúdo */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Conteúdo da Mensagem *
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Escreva os detalhes do aviso, horários, local, quem deve comparecer e instruções para a equipe..."
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 dark:text-white resize-none"
                  />
                  <span className="text-[10px] text-slate-400 block text-right mt-1">
                    {formContent.length} caracteres
                  </span>
                </div>

                {/* Opção Fixar no Topo */}
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Pin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Fixar no topo do mural
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400">
                        Manter este aviso em evidência como prioridade máxima
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 cursor-pointer rounded"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formTitle.trim() || !formContent.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-blue-700 hover:bg-blue-800 active:scale-95 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-xs shadow-blue-700/20"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Publicando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Publicar no Mural</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: VISUALIZAR AVISO COMPLETO */}
      <AnimatePresence>
        {activeViewingAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeViewingAnnouncement.isPinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500 text-white shadow-2xs">
                        <Pin className="w-3 h-3 fill-current" />
                        Fixado
                      </span>
                    )}
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-bold border',
                        getCategoryColor(activeViewingAnnouncement.category)
                      )}
                    >
                      {activeViewingAnnouncement.category}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatTimeAgo(activeViewingAnnouncement.createdAt)}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {activeViewingAnnouncement.title}
                  </h3>
                </div>

                <button
                  onClick={() => setActiveViewingAnnouncement(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Informações do Autor */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                  {activeViewingAnnouncement.authorPhotoURL ? (
                    <img
                      src={activeViewingAnnouncement.authorPhotoURL}
                      alt={activeViewingAnnouncement.authorName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    activeViewingAnnouncement.authorName[0] || 'L'
                  )}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    {activeViewingAnnouncement.authorName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {activeViewingAnnouncement.authorRole || 'Liderança da Igreja'}
                  </div>
                </div>
              </div>

              {/* Texto Completo */}
              <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {activeViewingAnnouncement.content}
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleCopyText(activeViewingAnnouncement)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
                >
                  {copiedId === activeViewingAnnouncement.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  {isLeadership && (
                    <button
                      onClick={() => {
                        setAnnouncementToDelete(activeViewingAnnouncement);
                      }}
                      className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                      title="Excluir comunicado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleShare(activeViewingAnnouncement)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition cursor-pointer shadow-xs shadow-emerald-700/20"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar no WhatsApp</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: CONFIRMAR EXCLUSÃO */}
      <AnimatePresence>
        {announcementToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Excluir este comunicado?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  O aviso <strong>&ldquo;{announcementToDelete.title}&rdquo;</strong> será removido do mural para todos os membros.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setAnnouncementToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAnnouncement}
                  className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-xs shadow-rose-600/20"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
