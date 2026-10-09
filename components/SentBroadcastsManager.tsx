'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import {
  Eye,
  CheckCircle2,
  Clock,
  Ban,
  Trash2,
  Send,
  Users,
  Bell,
  AlertTriangle,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Filter,
  Check,
} from 'lucide-react';

export interface BroadcastRecipientStatus {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  vocalRange?: string;
  instruments?: string[];
  roles?: any;
  notifId: string;
  read: boolean;
  readAt?: any;
}

export interface BroadcastRecord {
  id: string;
  churchId: string;
  senderId: string;
  senderName: string;
  title: string;
  body: string;
  targetCategories: string[];
  recipientUids: string[];
  recipients: BroadcastRecipientStatus[];
  status: 'sent' | 'cancelled';
  cancelledAt?: any;
  cancelledBy?: string;
  createdAt: any;
  updatedAt?: any;
}

interface SentBroadcastsManagerProps {
  className?: string;
  mode?: 'embedded' | 'modal';
  isOpen?: boolean;
  onClose?: () => void;
  onComposeNew?: () => void;
}

export function SentBroadcastsManager({
  className = '',
  mode = 'embedded',
  isOpen = true,
  onClose,
  onComposeNew,
}: SentBroadcastsManagerProps) {
  const { user, userData, isSuperAdmin } = useAuth();
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'cancelled'>('all');

  // Modal / Detail state for viewing who read a broadcast
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastRecord | null>(null);
  const [detailFilter, setDetailFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [detailSearch, setDetailSearch] = useState('');
  const [liveRecipients, setLiveRecipients] = useState<BroadcastRecipientStatus[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Cancellation confirm modal state
  const [broadcastToCancel, setBroadcastToCancel] = useState<BroadcastRecord | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const churchId = userData?.churchId;

  // 1. Subscribe to broadcasts list
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let q;

      if (isSuperAdmin) {
        q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'));
      } else if (churchId) {
        q = query(
          collection(db, 'broadcasts'),
          where('churchId', '==', churchId),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'broadcasts'),
          where('senderId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const docs: BroadcastRecord[] = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as BroadcastRecord[];
          setBroadcasts(docs);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching broadcasts:', err);
          // Fallback if index or churchId query is missing
          if (user?.uid) {
            const fallbackQ = query(collection(db, 'broadcasts'), where('senderId', '==', user.uid));
            onSnapshot(fallbackQ, (fallbackSnap) => {
              const fallbackDocs = fallbackSnap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
              })) as BroadcastRecord[];
              fallbackDocs.sort((a, b) => {
                const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return tB - tA;
              });
              setBroadcasts(fallbackDocs);
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.error('Broadcasts setup error:', e);
      setLoading(false);
    }
  }, [user, churchId, isSuperAdmin]);

  // 2. Real-time recipient reading synchronization for selected broadcast
  useEffect(() => {
    if (!selectedBroadcast) {
      setLiveRecipients([]);
      return;
    }

    setLoadingDetail(true);
    const initialRecipients: BroadcastRecipientStatus[] = selectedBroadcast.recipients || [];
    setLiveRecipients(initialRecipients);

    const notifMap = new Map<string, { read: boolean; readAt?: any }>();

    const updateCombinedStatus = () => {
      const updated = initialRecipients.map((r) => {
        const notif = notifMap.get(r.uid);
        if (notif) {
          return {
            ...r,
            read: notif.read,
            readAt: notif.readAt || r.readAt,
          };
        }
        return r;
      });
      setLiveRecipients(updated);
      setLoadingDetail(false);
    };

    // 1. Listen to readReceipts subcollection on the broadcast
    let unsubReceipts: (() => void) | null = null;
    try {
      const receiptsCol = collection(db, 'broadcasts', selectedBroadcast.id, 'readReceipts');
      unsubReceipts = onSnapshot(receiptsCol, (snap) => {
        snap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const uid = d.userId || docSnap.id;
          notifMap.set(uid, {
            read: true,
            readAt: d.readAt || d.createdAt || null,
          });
        });
        updateCombinedStatus();
      }, (err) => {
        console.warn('Read receipts subcollection sync note:', err);
      });
    } catch (e) {
      console.warn('Could not attach read receipts listener:', e);
    }

    // 2. Listen to real-time status of corresponding notifications
    let unsubNotifs: (() => void) | null = null;
    try {
      const q = isSuperAdmin || !user
        ? query(collection(db, 'notifications'), where('broadcastId', '==', selectedBroadcast.id))
        : query(collection(db, 'notifications'), where('broadcastId', '==', selectedBroadcast.id), where('senderId', '==', user.uid));

      unsubNotifs = onSnapshot(
        q,
        (snap) => {
          snap.docs.forEach((docSnap) => {
            const d = docSnap.data();
            if (d.read) {
              notifMap.set(d.userId, {
                read: true,
                readAt: d.readAt || (d.read ? d.updatedAt || d.createdAt : null),
              });
            }
          });
          updateCombinedStatus();
        },
        (err) => {
          console.warn('Real-time notifications sync fallback to snapshot data:', err);
          setLoadingDetail(false);
        }
      );
    } catch (e) {
      console.warn('Could not attach real-time notifications listener:', e);
      setLoadingDetail(false);
    }

    return () => {
      if (unsubReceipts) unsubReceipts();
      if (unsubNotifs) unsubNotifs();
    };
  }, [selectedBroadcast, isSuperAdmin, user]);

  // 3. Cancel Broadcast Action (Deletes recipient notifications & updates broadcast status)
  const handleConfirmCancel = async () => {
    if (!broadcastToCancel || !user) return;
    setIsCancelling(true);
    setActionFeedback(null);

    try {
      const bId = broadcastToCancel.id;

      // 1. Delete all recipient notifications linked to this broadcast
      try {
        if (broadcastToCancel.recipients && broadcastToCancel.recipients.length > 0) {
          const batch = writeBatch(db);
          broadcastToCancel.recipients.forEach((r) => {
            if (r.notifId) {
              batch.delete(doc(db, 'notifications', r.notifId));
            }
          });
          await batch.commit();
        } else {
          const notifsQ = query(collection(db, 'notifications'), where('broadcastId', '==', bId));
          const notifsSnap = await getDocs(notifsQ);
          if (!notifsSnap.empty) {
            const batch = writeBatch(db);
            notifsSnap.docs.forEach((d) => {
              batch.delete(d.ref);
            });
            await batch.commit();
          }
        }
      } catch (delNotifErr) {
        console.warn('Could not batch delete notifications directly (relying on status update):', delNotifErr);
      }

      // 2. Update broadcast document status to 'cancelled'
      const broadcastRef = doc(db, 'broadcasts', bId);
      await updateDoc(broadcastRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: user.uid,
        updatedAt: serverTimestamp(),
      });

      // 3. If currently open in detail modal, update local state
      if (selectedBroadcast?.id === bId) {
        setSelectedBroadcast((prev) =>
          prev ? { ...prev, status: 'cancelled', cancelledAt: new Date() } : null
        );
      }

      setActionFeedback('Envio cancelado com sucesso! As notificações foram recolhidas dos aparelhos dos integrantes.');
      setBroadcastToCancel(null);
      setTimeout(() => setActionFeedback(null), 6000);
    } catch (err: any) {
      console.error('Error cancelling broadcast:', err);
      setActionFeedback('Erro ao cancelar comunicado. Tente novamente.');
    } finally {
      setIsCancelling(false);
    }
  };

  // 4. Delete Broadcast History Record permanently
  const handleDeleteBroadcast = async (broadcastId: string) => {
    if (!confirm('Deseja excluir permanentemente este registro de comunicado do histórico?')) return;
    try {
      await deleteDoc(doc(db, 'broadcasts', broadcastId));
      if (selectedBroadcast?.id === broadcastId) {
        setSelectedBroadcast(null);
      }
      setActionFeedback('Registro de comunicado excluído do histórico.');
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Error deleting broadcast record:', err);
      alert('Não foi possível excluir o registro.');
    }
  };

  // Filtered broadcasts list
  const filteredBroadcasts = broadcasts.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.title.toLowerCase().includes(term) ||
      b.body.toLowerCase().includes(term) ||
      (b.senderName && b.senderName.toLowerCase().includes(term)) ||
      (b.targetCategories && b.targetCategories.some((c) => c.toLowerCase().includes(term)))
    );
  });

  // Calculate live view stats for selected broadcast
  const totalRecipientsCount = liveRecipients.length;
  const readRecipientsCount = liveRecipients.filter((r) => r.read).length;
  const unreadRecipientsCount = totalRecipientsCount - readRecipientsCount;
  const readPercentage = totalRecipientsCount > 0 ? Math.round((readRecipientsCount / totalRecipientsCount) * 100) : 0;

  // Filter detail view recipients
  const filteredDetailRecipients = liveRecipients.filter((r) => {
    if (detailFilter === 'read' && !r.read) return false;
    if (detailFilter === 'unread' && r.read) return false;
    if (!detailSearch.trim()) return true;
    const term = detailSearch.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      (r.vocalRange && r.vocalRange.toLowerCase().includes(term)) ||
      (r.instruments && r.instruments.some((i) => i.toLowerCase().includes(term))) ||
      (r.email && r.email.toLowerCase().includes(term)) ||
      (r.phone && r.phone.includes(term))
    );
  });

  const formatDate = (ts: any) => {
    if (!ts) return 'Agora';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Data indisponível';
    }
  };

  if (mode === 'modal' && !isOpen) return null;

  const content = (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Eye className="w-6 h-6 text-amber-500" />
              <span>Comunicados Enviados</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {broadcasts.length} {broadcasts.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe em tempo real quem visualizou cada comunicado e cancele envios quando necessário.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onComposeNew && (
            <button
              type="button"
              onClick={onComposeNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Novo Comunicado</span>
            </button>
          )}

          {mode === 'modal' && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center transition-colors font-bold cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-bold leading-relaxed">{actionFeedback}</span>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
          <input
            type="text"
            placeholder="Buscar por título, mensagem ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100 shadow-2xs"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Todos ({broadcasts.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('sent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'sent'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Enviados ({broadcasts.filter((b) => b.status === 'sent').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'cancelled'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Cancelados ({broadcasts.filter((b) => b.status === 'cancelled').length})
          </button>
        </div>
      </div>

      {/* Broadcasts List */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold">Carregando histórico de comunicados...</span>
        </div>
      ) : filteredBroadcasts.length === 0 ? (
        <div className="p-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
            <Bell className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {searchTerm ? 'Nenhum comunicado encontrado para a busca' : 'Nenhum comunicado enviado até o momento'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            {searchTerm
              ? 'Tente buscar com outros termos de título ou categoria.'
              : 'Quando você disparar comunicados para os músicos, cantores ou equipes, eles aparecerão aqui com relatórios detalhados de visualização.'}
          </p>
          {onComposeNew && (
            <button
              type="button"
              onClick={onComposeNew}
              className="mt-2 px-5 py-2.5 rounded-2xl bg-amber-500 text-white text-xs font-bold shadow-md hover:bg-amber-600 cursor-pointer"
            >
              Enviar Primeiro Comunicado
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBroadcasts.map((b) => {
            const isCancelled = b.status === 'cancelled';
            const totalRec = b.recipients?.length || b.recipientUids?.length || 0;
            const readRec = b.recipients ? b.recipients.filter((r) => r.read).length : 0;
            const percent = totalRec > 0 ? Math.round((readRec / totalRec) * 100) : 0;

            return (
              <div
                key={b.id}
                className={`p-5 sm:p-6 rounded-3xl border transition-all relative overflow-hidden bg-white dark:bg-slate-900 shadow-sm ${
                  isCancelled
                    ? 'border-slate-200 dark:border-slate-800 opacity-80 bg-slate-50/50 dark:bg-slate-900/50'
                    : 'border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600/60'
                }`}
              >
                {/* Header of Card */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                        {b.title}
                      </h4>

                      {/* Status Badge */}
                      {isCancelled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                          <Ban className="w-3 h-3" />
                          Envio Cancelado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                          <CheckCircle2 className="w-3 h-3" />
                          Enviado
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>Por: <strong>{b.senderName || 'Líder'}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(b.createdAt)}
                      </span>
                      {isCancelled && b.cancelledAt && (
                        <>
                          <span>•</span>
                          <span className="text-rose-500 font-bold">
                            Cancelado em {formatDate(b.cancelledAt)}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Quick stats badge */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {readRec} de {totalRec} lidos ({percent}%)
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {totalRec - readRec} pendentes
                      </p>
                    </div>
                  </div>
                </div>

                {/* Message preview */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                  {b.body}
                </div>

                {/* Target Audience Pills */}
                {b.targetCategories && b.targetCategories.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Destinatários:
                    </span>
                    {b.targetCategories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Visual Reading Progress Bar */}
                <div className="space-y-1 mb-4">
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isCancelled
                          ? 'bg-slate-400'
                          : percent === 100
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    {/* Visualizar Integrantes (Quem leu) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBroadcast(b);
                        setDetailFilter('all');
                        setDetailSearch('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-black transition-all cursor-pointer shadow-2xs active:scale-95 border border-amber-200 dark:border-amber-800"
                    >
                      <Eye className="w-4 h-4 text-amber-600" />
                      <span>Ver Quem Visualizou ({readRec}/{totalRec})</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Cancelar Envio */}
                    {!isCancelled ? (
                      <button
                        type="button"
                        onClick={() => setBroadcastToCancel(b)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold transition-all cursor-pointer border border-rose-200 dark:border-rose-900/50 active:scale-95"
                        title="Remove o comunicado das notificações dos integrantes"
                      >
                        <Ban className="w-4 h-4 text-rose-600" />
                        <span>Cancelar Envio</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteBroadcast(b.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-rose-600 transition-colors font-bold cursor-pointer"
                        title="Excluir do histórico"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: QUEM VISUALIZOU O COMUNICADO (DETALHAMENTO DE INTEGRANTES) */}
      {selectedBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div
            onClick={() => setSelectedBroadcast(null)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 overflow-hidden my-auto border border-slate-100 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-slate-100">
                    Quem Visualizou o Comunicado?
                  </h3>
                  {selectedBroadcast.status === 'cancelled' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700">
                      Cancelado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Comunicado: <strong className="text-slate-800 dark:text-slate-200">&ldquo;{selectedBroadcast.title}&rdquo;</strong>
                </p>
                <p className="text-[11px] text-slate-400">
                  Enviado em {formatDate(selectedBroadcast.createdAt)} por {selectedBroadcast.senderName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBroadcast(null)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Overall Reading Gauge */}
            <div className="my-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {readPercentage}%
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    dos integrantes já abriram e visualizaram
                  </span>
                </div>
                <div className="w-full sm:w-64 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${readPercentage}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-center min-w-[80px]">
                  <p className="text-base">{readRecipientsCount}</p>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold">Lidos</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black text-center min-w-[80px]">
                  <p className="text-base">{unreadRecipientsCount}</p>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold">Pendentes</p>
                </div>
              </div>
            </div>

            {/* Search & Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
              {/* Search in detail list */}
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar integrante por nome ou função..."
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setDetailFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    detailFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Todos ({totalRecipientsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setDetailFilter('read')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    detailFilter === 'read'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  Visualizados ({readRecipientsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setDetailFilter('unread')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    detailFilter === 'unread'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  Pendentes ({unreadRecipientsCount})
                </button>
              </div>
            </div>

            {/* Recipient Cards List */}
            <div className="overflow-y-auto flex-1 pr-1 -mr-1 space-y-2 max-h-80">
              {loadingDetail ? (
                <div className="p-10 flex items-center justify-center text-slate-400 gap-2">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Sincronizando status de leitura...</span>
                </div>
              ) : filteredDetailRecipients.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  Nenhum integrante encontrado para este filtro.
                </div>
              ) : (
                filteredDetailRecipients.map((r) => {
                  const roleOrInstrument =
                    r.vocalRange ||
                    (r.instruments && r.instruments.join(', ')) ||
                    (r.roles?.dance?.length ? 'Dança' : '') ||
                    (r.roles?.multimedia?.length ? 'Multimídia' : '') ||
                    'Voluntário';

                  return (
                    <div
                      key={r.uid}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                        r.read
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                          : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Initial avatar */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            r.read
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {r.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                            {r.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                            <span className="font-bold text-slate-600 dark:text-slate-300">
                              {roleOrInstrument}
                            </span>
                            {r.phone && <span>• {r.phone}</span>}
                          </p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="shrink-0 text-right">
                        {r.read ? (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <Check className="w-3 h-3 stroke-[3]" />
                              Visualizado
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              {formatDate(r.readAt)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3" />
                              Pendente
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              Ainda não abriu
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer of Detail Modal */}
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              {selectedBroadcast.status !== 'cancelled' ? (
                <button
                  type="button"
                  onClick={() => setBroadcastToCancel(selectedBroadcast)}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-4 h-4 text-rose-600" />
                  <span>Cancelar Este Envio</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                  <Ban className="w-4 h-4" />
                  Envio Cancelado
                </span>
              )}

              <button
                type="button"
                onClick={() => setSelectedBroadcast(null)}
                className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAÇÃO DE CANCELAMENTO DE ENVIO */}
      {broadcastToCancel && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-rose-200 dark:border-rose-900/60 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Cancelar Envio do Comunicado?
              </h4>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              Você está prestes a cancelar o comunicado:
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 mb-4 text-xs font-bold text-slate-800 dark:text-slate-200">
              &ldquo;{broadcastToCancel.title}&rdquo;
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs mb-5 space-y-1">
              <p className="font-black">O que acontece ao cancelar?</p>
              <p className="text-[11px] leading-relaxed">
                • O comunicado será recolhido e <strong>removido imediatamente</strong> da lista de notificações dos voluntários.
                <br />
                • O status no histórico será marcado como <strong>Cancelado</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setBroadcastToCancel(null)}
                disabled={isCancelling}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Voltar / Não Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl text-xs transition-all shadow-lg shadow-rose-600/25 cursor-pointer flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Cancelando...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>Confirmar Cancelamento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" />
        <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-6 sm:p-9 overflow-y-auto my-auto border border-slate-100 dark:border-slate-800">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
