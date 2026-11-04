"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Building2,
  Trash2,
  ExternalLink,
  ChevronRight,
  User,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Tag,
  FileText,
  Calendar,
  X,
  Send,
  Sparkles,
} from "lucide-react";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  churchName?: string;
  category: "duvida" | "suporte" | "sugestao" | "elogio" | "parceria" | "outro";
  subject: string;
  message: string;
  status: "new" | "read" | "in_progress" | "resolved" | "archived";
  adminNotes?: string;
  userId?: string;
  createdAt: any;
  updatedAt?: any;
  resolvedAt?: any;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  duvida: { label: "Dúvida", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", icon: "❓" },
  suporte: { label: "Suporte", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", icon: "🛠️" },
  sugestao: { label: "Sugestão", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: "💡" },
  elogio: { label: "Elogio", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: "👏" },
  parceria: { label: "Parceria", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", icon: "🤝" },
  outro: { label: "Outro", color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300", icon: "📋" },
};

const STATUS_LABELS: Record<string, { label: string; badge: string; dot: string }> = {
  new: { label: "Nova", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800", dot: "bg-blue-500 animate-pulse" },
  read: { label: "Lida", badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700", dot: "bg-slate-400" },
  in_progress: { label: "Em Atendimento", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  resolved: { label: "Resolvida", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
  archived: { label: "Arquivada", badge: "bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 border-slate-200 dark:border-slate-700", dot: "bg-slate-300" },
};

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // 1. Initial and Realtime listener on Firestore + API Fallback
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    async function loadData() {
      // Fetch via API route first (guarantees data even if firestore rules are restrictive)
      try {
        const res = await fetch("/api/contact");
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.messages)) {
            setMessages(json.messages);
            setLoading(false);
          }
        }
      } catch (e) {
        console.warn("[Admin Messages] API fetch error:", e);
      }

      // Try Firestore realtime listener
      try {
        const q = query(collection(db, "contact_messages"), orderBy("createdAt", "desc"));
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const items: ContactMessage[] = snapshot.docs.map((d) => ({
                id: d.id,
                ...(d.data() as any),
              }));
              setMessages(items);
            }
            setLoading(false);
          },
          (err) => {
            console.warn("[Admin Messages] Firestore listener warning (using API data):", err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.warn("[Admin Messages] Realtime listener setup error:", err);
        setLoading(false);
      }
    }

    loadData();
    return () => unsubscribe();
  }, []);

  const handleSelectMessage = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setAdminNotes(msg.adminNotes || "");
    setCopiedEmail(false);

    // Auto mark as read if it was new
    if (msg.status === "new") {
      handleUpdateStatus(msg.id, "read");
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: ContactMessage["status"]) => {
    // 1. Optimistic update
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
    );
    if (selectedMessage && selectedMessage.id === id) {
      setSelectedMessage((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    // 2. Update via API
    try {
      await fetch("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
    } catch (e) {
      console.warn("API update status warning:", e);
    }

    // 3. Update Firestore doc
    try {
      await updateDoc(doc(db, "contact_messages", id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(newStatus === "resolved" ? { resolvedAt: serverTimestamp() } : {}),
      });
    } catch (e) {
      console.warn("Firestore update status warning:", e);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedMessage) return;
    setIsSavingNotes(true);

    const id = selectedMessage.id;
    try {
      await fetch("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, adminNotes }),
      });

      try {
        await updateDoc(doc(db, "contact_messages", id), {
          adminNotes,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        // Fallback
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, adminNotes } : m))
      );
      setSelectedMessage((prev) => (prev ? { ...prev, adminNotes } : null));
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta mensagem do Fale Conosco?")) {
      return;
    }

    // Optimistic
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selectedMessage?.id === id) {
      setSelectedMessage(null);
    }

    try {
      await fetch(`/api/contact?id=${id}`, { method: "DELETE" });
    } catch (e) {
      console.warn("API delete message warning:", e);
    }

    try {
      await deleteDoc(doc(db, "contact_messages", id));
    } catch (e) {
      console.warn("Firestore delete message warning:", e);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Filter messages
  const filteredMessages = messages.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchEmail = m.email?.toLowerCase().includes(q);
      const matchSubject = m.subject?.toLowerCase().includes(q);
      const matchBody = m.message?.toLowerCase().includes(q);
      const matchChurch = m.churchName?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchSubject && !matchBody && !matchChurch) {
        return false;
      }
    }
    return true;
  });

  const countNew = messages.filter((m) => m.status === "new").length;
  const countInProgress = messages.filter((m) => m.status === "in_progress").length;
  const countResolved = messages.filter((m) => m.status === "resolved").length;

  const formatDate = (val: any) => {
    if (!val) return "Data não informada";
    try {
      if (typeof val === "string") return new Date(val).toLocaleString("pt-BR");
      if (val?.toDate) return val.toDate().toLocaleString("pt-BR");
      if (val?.seconds) return new Date(val.seconds * 1000).toLocaleString("pt-BR");
      return new Date(val).toLocaleString("pt-BR");
    } catch {
      return "Data indisponível";
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Total de Mensagens</span>
            <MessageSquare className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {messages.length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs font-semibold mb-1">
            <span>Não Lidas (Novas)</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-400">
            {countNew}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold mb-1">
            <span>Em Atendimento</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
            {countInProgress}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">
            <span>Resolvidas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {countResolved}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por remetente, e-mail, igreja ou assunto..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="new">Novas (Não Lidas)</option>
            <option value="read">Lidas</option>
            <option value="in_progress">Em Atendimento</option>
            <option value="resolved">Resolvidas</option>
            <option value="archived">Arquivadas</option>
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">Todas as Categorias</option>
            <option value="duvida">❓ Dúvidas</option>
            <option value="suporte">🛠️ Suporte</option>
            <option value="sugestao">💡 Sugestões</option>
            <option value="elogio">👏 Elogios</option>
            <option value="parceria">🤝 Parcerias</option>
            <option value="outro">📋 Outros</option>
          </select>
        </div>
      </div>

      {/* Main Inbox View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Messages List */}
        <div className={`${selectedMessage ? "lg:col-span-5 hidden lg:block" : "lg:col-span-12"} space-y-3`}>
          {loading ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Carregando mensagens...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                Nenhuma mensagem encontrada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {search || statusFilter !== "all" || categoryFilter !== "all"
                  ? "Tente ajustar os filtros ou a busca acima para encontrar mensagens."
                  : "Nenhuma mensagem de Fale Conosco recebida até o momento."}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isSelected = selectedMessage?.id === msg.id;
              const catInfo = CATEGORY_LABELS[msg.category] || CATEGORY_LABELS.outro;
              const statusInfo = STATUS_LABELS[msg.status] || STATUS_LABELS.new;

              return (
                <div
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20 shadow-md"
                      : msg.status === "new"
                      ? "border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-800 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[180px]">
                        {msg.name}
                      </span>
                      {msg.churchName && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          • {msg.churchName}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatDate(msg.createdAt).split(" ")[0]}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 mb-1">
                    {msg.subject}
                  </h4>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                    {msg.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${catInfo.color}`}>
                      <span>{catInfo.icon}</span>
                      <span>{catInfo.label}</span>
                    </span>

                    <span className={`px-2 py-0.5 rounded-md font-bold border ${statusInfo.badge}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Message Detail Panel */}
        {selectedMessage && (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-150">
            {/* Header with Close on Mobile */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${CATEGORY_LABELS[selectedMessage.category]?.color || ""}`}>
                    {CATEGORY_LABELS[selectedMessage.category]?.icon} {CATEGORY_LABELS[selectedMessage.category]?.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${STATUS_LABELS[selectedMessage.status]?.badge || ""}`}>
                    {STATUS_LABELS[selectedMessage.status]?.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {selectedMessage.id}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedMessage.subject}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enviado em {formatDate(selectedMessage.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteMessage(selectedMessage.id)}
                  title="Excluir mensagem"
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Fechar visualização"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sender Info Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {selectedMessage.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyEmail(selectedMessage.email)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEmail ? "E-mail copiado!" : "Copiar e-mail"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                    className="hover:underline text-blue-600 dark:text-blue-400 truncate"
                  >
                    {selectedMessage.email}
                  </a>
                </div>

                {selectedMessage.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`https://wa.me/55${selectedMessage.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-emerald-600 dark:text-emerald-400"
                    >
                      {selectedMessage.phone} (WhatsApp)
                    </a>
                  </div>
                )}

                {selectedMessage.churchName && (
                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Igreja: {selectedMessage.churchName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Message Body */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Conteúdo da Mensagem
              </h4>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                {selectedMessage.message}
              </div>
            </div>

            {/* Actions: Direct reply buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <a
                href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Responder por E-mail</span>
              </a>

              {selectedMessage.phone && (
                <a
                  href={`https://wa.me/55${selectedMessage.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${selectedMessage.name}, recebemos sua mensagem via Applane a respeito de "${selectedMessage.subject}".`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Conversar no WhatsApp</span>
                </a>
              )}
            </div>

            {/* Status change actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Atualizar Status do Atendimento
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedMessage.id, "new")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    selectedMessage.status === "new"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  Não Lida
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedMessage.id, "read")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    selectedMessage.status === "read"
                      ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  Lida
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedMessage.id, "in_progress")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    selectedMessage.status === "in_progress"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  Em Atendimento
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedMessage.id, "resolved")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    selectedMessage.status === "resolved"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  Concluir / Resolvida
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedMessage.id, "archived")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    selectedMessage.status === "archived"
                      ? "bg-slate-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  Arquivar
                </button>
              </div>
            </div>

            {/* Admin Internal Notes */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Anotações Internas da Administração</span>
                </h4>
                {selectedMessage.adminNotes !== adminNotes && (
                  <span className="text-[10px] text-amber-500 font-semibold">
                    Alterações não salvas
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Insira notas internas sobre este chamado (visíveis apenas para administradores)..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes || selectedMessage.adminNotes === adminNotes}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSavingNotes ? "Salvando..." : "Salvar Anotação"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
