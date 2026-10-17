"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { auditCreate, auditUpdate } from "@/lib/audit";
import {
  Search,
  Plus,
  UserPlus,
  FileText,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  Mail,
  ArrowRight,
  Kanban,
  LayoutGrid,
  GripVertical,
  HeartHandshake,
  Sparkles,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  X,
  Filter,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { formatPhone } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface Visitor {
  id: string;
  name: string;
  phone: string;
  email: string;
  firstVisit: string;
  followupStatus: "pending" | "contacted" | "member";
  churchId: string;
  notes: string;
}

type FunnelStageKey = "pending" | "contacted" | "member";

interface FunnelStageConfig {
  key: FunnelStageKey;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  columnBg: string;
  headerBorder: string;
  accentColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FUNNEL_STAGES: FunnelStageConfig[] = [
  {
    key: "pending",
    label: "Pendente (Boas-vindas)",
    shortLabel: "Pendente",
    description: "SLA 48h • Aguardando primeiro contato ou mensagem de acolhimento",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    columnBg: "bg-amber-50/40 dark:bg-amber-950/15 border-amber-200/80 dark:border-amber-900/40",
    headerBorder: "border-amber-400 dark:border-amber-500",
    accentColor: "text-amber-600 dark:text-amber-400",
    icon: Clock,
  },
  {
    key: "contacted",
    label: "Contatado (Em Acompanhamento)",
    shortLabel: "Contatado",
    description: "Mensagem ou ligação realizada • Convidado para grupo/culto",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    columnBg: "bg-blue-50/40 dark:bg-blue-950/15 border-blue-200/80 dark:border-blue-900/40",
    headerBorder: "border-blue-500 dark:border-blue-400",
    accentColor: "text-blue-600 dark:text-blue-400",
    icon: MessageCircle,
  },
  {
    key: "member",
    label: "Tornou-se Membro (Integrado)",
    shortLabel: "Membro",
    description: "Integrado à comunidade local • Cadastro e batismo/membresia",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    columnBg: "bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200/80 dark:border-emerald-900/40",
    headerBorder: "border-emerald-500 dark:border-emerald-400",
    accentColor: "text-emerald-600 dark:text-emerald-400",
    icon: HeartHandshake,
  },
];

export default function VisitorsPage() {
  const { userData, user } = useAuth();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"funnel" | "grid">("funnel");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);

  // Drag and drop state
  const [draggedVisitorId, setDraggedVisitorId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<FunnelStageKey | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    firstVisit: new Date().toISOString().split("T")[0],
    followupStatus: "pending" as FunnelStageKey,
    notes: "",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchVisitors = React.useCallback(async () => {
    const isLeader =
      userData?.role === "líder" ||
      userData?.roles?.worship?.includes("leader") ||
      userData?.roles?.multimedia?.includes("leader") ||
      userData?.roles?.secretariat?.includes("leader");

    if (!userData?.churchId && !isLeader) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = userData?.churchId
        ? query(
            collection(db, "visitors"),
            where("churchId", "==", userData.churchId),
            orderBy("firstVisit", "desc"),
          )
        : query(collection(db, "visitors"), orderBy("firstVisit", "desc"));

      const snap = await getDocs(q);
      setVisitors(
        snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Visitor),
      );
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, "visitors");
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  // Handle stage transition (drag & drop or button click)
  const handleUpdateStatus = async (visitorId: string, newStatus: FunnelStageKey) => {
    const targetVisitor = visitors.find((v) => v.id === visitorId);
    if (!targetVisitor || targetVisitor.followupStatus === newStatus) return;

    const previousStatus = targetVisitor.followupStatus;

    // Optimistic update
    setVisitors((prev) =>
      prev.map((v) => (v.id === visitorId ? { ...v, followupStatus: newStatus } : v))
    );

    const statusLabel =
      newStatus === "pending"
        ? "Pendente"
        : newStatus === "contacted"
          ? "Contatado"
          : "Membro";

    showToast(`${targetVisitor.name} movido(a) para "${statusLabel}"! 🎉`);

    try {
      await updateDoc(doc(db, "visitors", visitorId), {
        followupStatus: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || "",
      });

      // Record Audit Update
      auditUpdate(
        "Visitor",
        visitorId,
        targetVisitor.name,
        { followupStatus: previousStatus },
        { followupStatus: newStatus },
        { churchId: userData?.churchId || "" }
      ).catch((err) => console.warn("Audit visitor status update error:", err));
    } catch (err) {
      // Rollback on failure
      setVisitors((prev) =>
        prev.map((v) => (v.id === visitorId ? { ...v, followupStatus: previousStatus } : v))
      );
      handleFirestoreError(err, OperationType.UPDATE, "visitors");
      showToast("Erro ao atualizar o status do visitante no servidor.");
    }
  };

  // Drag and drop event handlers
  const handleDragStart = (e: React.DragEvent, visitorId: string) => {
    e.dataTransfer.setData("text/plain", visitorId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedVisitorId(visitorId);
  };

  const handleDragOver = (e: React.DragEvent, stageKey: FunnelStageKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageKey: FunnelStageKey) => {
    // Only clear if leaving the main container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverStage === stageKey) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e: React.DragEvent, stageKey: FunnelStageKey) => {
    e.preventDefault();
    const visitorId = e.dataTransfer.getData("text/plain") || draggedVisitorId;
    setDraggedVisitorId(null);
    setDragOverStage(null);

    if (visitorId) {
      handleUpdateStatus(visitorId, stageKey);
    }
  };

  const handleDragEnd = () => {
    setDraggedVisitorId(null);
    setDragOverStage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.churchId || !user) {
      alert("Você precisa estar vinculado a uma igreja.");
      return;
    }

    try {
      if (editingVisitor) {
        await updateDoc(doc(db, "visitors", editingVisitor.id), {
          ...formData,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });

        // Record Audit Update (only modified fields are stored)
        auditUpdate(
          "Visitor",
          editingVisitor.id,
          formData.name || editingVisitor.name,
          editingVisitor,
          formData,
          { churchId: userData.churchId }
        ).catch((err) => console.warn("Audit visitor update error:", err));
      } else {
        const newId = `visitor_${Date.now()}`;
        const newRecord = {
          id: newId,
          churchId: userData.churchId,
          ...formData,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        };
        await setDoc(doc(db, "visitors", newId), newRecord);

        // Record Audit Create
        auditCreate(
          "Visitor",
          newId,
          formData.name,
          newRecord,
          { churchId: userData.churchId }
        ).catch((err) => console.warn("Audit visitor create error:", err));
      }
      setIsModalOpen(false);
      setEditingVisitor(null);
      setFormData({
        name: "",
        phone: "",
        email: "",
        firstVisit: new Date().toISOString().split("T")[0],
        followupStatus: "pending",
        notes: "",
      });
      fetchVisitors();
    } catch (err) {
      handleFirestoreError(
        err,
        editingVisitor ? OperationType.UPDATE : OperationType.CREATE,
        "visitors",
      );
    }
  };

  const filteredVisitors = visitors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.phone.includes(searchTerm) ||
      (v.notes && v.notes.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // Group visitors by funnel stage
  const visitorsByStage = useMemo(() => {
    const groups: Record<FunnelStageKey, Visitor[]> = {
      pending: [],
      contacted: [],
      member: [],
    };
    filteredVisitors.forEach((v) => {
      if (groups[v.followupStatus]) {
        groups[v.followupStatus].push(v);
      } else {
        groups.pending.push(v);
      }
    });
    return groups;
  }, [filteredVisitors]);

  // Funnel conversion statistics
  const funnelStats = useMemo(() => {
    const total = visitors.length;
    const pendingCount = visitors.filter((v) => v.followupStatus === "pending").length;
    const contactedCount = visitors.filter((v) => v.followupStatus === "contacted").length;
    const memberCount = visitors.filter((v) => v.followupStatus === "member").length;

    const conversionRate = total > 0 ? Math.round((memberCount / total) * 100) : 0;
    const contactRate = total > 0 ? Math.round(((contactedCount + memberCount) / total) * 100) : 0;

    // SLA 48h check for pending visitors
    const now = new Date();
    const urgentPendingCount = visitors.filter((v) => {
      if (v.followupStatus !== "pending" || !v.firstVisit) return false;
      const visitDate = new Date(v.firstVisit + "T12:00:00");
      const diffHours = (now.getTime() - visitDate.getTime()) / (1000 * 60 * 60);
      return diffHours > 48;
    }).length;

    return {
      total,
      pendingCount,
      contactedCount,
      memberCount,
      conversionRate,
      contactRate,
      urgentPendingCount,
    };
  }, [visitors]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Pendente
          </span>
        );
      case "contacted":
        return (
          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Contatado
          </span>
        );
      case "member":
        return (
          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Membro
          </span>
        );
      default:
        return null;
    }
  };

  const getVisitTimeAgo = (dateStr: string) => {
    if (!dateStr) return "";
    const visit = new Date(dateStr + "T12:00:00");
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - visit.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `Há ${diffDays} dias`;
    if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} sem.`;
    return `Há ${Math.floor(diffDays / 30)} mês`;
  };

  const getWhatsAppUrl = (visitor: Visitor) => {
    const cleanDigits = visitor.phone ? visitor.phone.replace(/\D/g, "") : "";
    if (!cleanDigits) return null;
    const phoneWithCountry = cleanDigits.startsWith("55") ? cleanDigits : `55${cleanDigits}`;
    const firstName = visitor.name.split(" ")[0] || "Irmão(ã)";
    const text = `Olá ${firstName}! Graça e paz! Ficamos imensamente felizes com a sua presença em nossa igreja! Como podemos orar por você nesta semana? Conte conosco para o que precisar! 🙏✨`;
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO & BARRA DE AÇÕES */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Acolhimento & Visitantes
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Secretaria
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Acompanhe cada visitante da primeira visita até a integração como membro ativo
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* SELETOR DE VISUALIZAÇÃO: FUNIL VS GRADE */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setViewMode("funnel")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === "funnel"
                  ? "bg-white dark:bg-slate-900 text-blue-800 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Funil de Acolhimento</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-900 text-blue-800 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grade</span>
            </button>
          </div>

          <button
            onClick={() => {
              setEditingVisitor(null);
              setFormData({
                name: "",
                phone: "",
                email: "",
                firstVisit: new Date().toISOString().split("T")[0],
                followupStatus: "pending",
                notes: "",
              });
              setIsModalOpen(true);
            }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-800/20 active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Visitante</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MÉTRICAS DO FUNIL DE CONVERSÃO & SLA */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total de Visitantes</span>
            <UserPlus className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {funnelStats.total}
            </span>
            <span className="text-xs font-bold text-slate-500">cadastrados</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Histórico completo da igreja
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-400 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Aguardando Contato</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-950 dark:text-amber-200">
              {funnelStats.pendingCount}
            </span>
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
              {funnelStats.pendingCount === 1 ? "pendente" : "pendentes"}
            </span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 font-semibold">
            {funnelStats.urgentPendingCount > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                ⚠️ {funnelStats.urgentPendingCount} com SLA &gt; 48h
              </span>
            ) : (
              "SLA de Acolhimento 48h em dia"
            )}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-400 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Em Acompanhamento</span>
            <MessageCircle className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-950 dark:text-blue-200">
              {funnelStats.contactedCount}
            </span>
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300">contatados</span>
          </div>
          <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-1 font-medium">
            {funnelStats.contactRate}% dos visitantes acolhidos
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-400 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Taxa de Membresia</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-950 dark:text-emerald-200">
              {funnelStats.conversionRate}%
            </span>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              ({funnelStats.memberCount} membros)
            </span>
          </div>
          <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-1 font-medium">
            Visitantes que integraram a membresia
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BARRA DE BUSCA E DICA DE ARRASTO */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-800 transition-colors" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou anotação..."
            className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-800 transition-all text-xs sm:text-sm text-slate-700 dark:text-slate-200 outline-none shadow-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {viewMode === "funnel" && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto">
            <GripVertical className="w-3.5 h-3.5 text-slate-400" />
            <span>Arraste os cards entre as colunas para atualizar o estágio de contato</span>
          </div>
        )}
      </div>

      {/* TOAST FLUTUANTE DE FEEDBACK */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border border-slate-700 dark:border-slate-300"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 4. CONTEÚDO PRINCIPAL (FUNIL DE ACOLHIMENTO OU GRADE) */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="flex justify-center p-20 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800"></div>
        </div>
      ) : filteredVisitors.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
          <UserPlus className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Nenhum visitante encontrado
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? `Não encontramos nenhum resultado para "${searchTerm}". Tente outro termo.`
              : "Cadastre novos visitantes para iniciar o funil de acolhimento e integração."}
          </p>
          <button
            onClick={() => {
              setEditingVisitor(null);
              setIsModalOpen(true);
            }}
            className="mt-5 px-5 py-2.5 rounded-xl bg-blue-800 text-white text-xs font-bold hover:bg-blue-900 shadow-md transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Primeiro Visitante</span>
          </button>
        </div>
      ) : viewMode === "funnel" ? (
        /* ========================================================================= */
        /* VISUALIZAÇÃO EM FUNIL KANBAN (3 ESTÁGIOS COM DRAG & DROP) */
        /* ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {FUNNEL_STAGES.map((stage) => {
            const stageVisitors = visitorsByStage[stage.key];
            const isDropTarget = dragOverStage === stage.key;
            const StageIcon = stage.icon;

            return (
              <div
                key={stage.key}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={(e) => handleDragLeave(e, stage.key)}
                onDrop={(e) => handleDrop(e, stage.key)}
                className={`rounded-[2.5rem] border p-5 flex flex-col min-h-[550px] transition-all ${
                  stage.columnBg
                } ${
                  isDropTarget
                    ? "ring-2 ring-blue-500 border-blue-400 dark:border-blue-500 shadow-lg scale-[1.01]"
                    : "border-slate-200/90 dark:border-slate-800"
                }`}
              >
                {/* CABEÇALHO DO ESTÁGIO */}
                <div className="pb-4 mb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900 shadow-xs ${stage.accentColor}`}>
                        <StageIcon className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {stage.shortLabel}
                      </h3>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${stage.badgeClass}`}>
                      {stageVisitors.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {stage.description}
                  </p>
                </div>

                {/* ÁREA DE CARDS ARRASTÁVEIS */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[750px] pr-1 no-scrollbar">
                  {stageVisitors.length === 0 ? (
                    <div className="h-44 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-4 text-center">
                      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                        {isDropTarget ? "Solte o visitante aqui!" : "Nenhum visitante neste estágio"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        {stage.key === "pending"
                          ? "Todos os visitantes foram acolhidos 🎉"
                          : "Arraste um card para cá"}
                      </span>
                    </div>
                  ) : (
                    stageVisitors.map((visitor) => {
                      const isBeingDragged = draggedVisitorId === visitor.id;
                      const timeAgo = getVisitTimeAgo(visitor.firstVisit);
                      const whatsappUrl = getWhatsAppUrl(visitor);

                      return (
                        <div
                          key={visitor.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, visitor.id)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative ${
                            isBeingDragged ? "opacity-30 scale-95" : "hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          {/* GRIP & NOME */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-start gap-1.5 min-w-0">
                              <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-0.5 shrink-0 group-hover:text-slate-500" />
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {visitor.name}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(visitor.firstVisit + "T12:00:00").toLocaleDateString("pt-BR")}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                                    {timeAgo}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingVisitor(visitor);
                                setFormData({
                                  name: visitor.name,
                                  phone: formatPhone(visitor.phone || ""),
                                  email: visitor.email || "",
                                  firstVisit: visitor.firstVisit,
                                  followupStatus: visitor.followupStatus,
                                  notes: visitor.notes || "",
                                });
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Editar visitante"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* CONTATOS & WHATSAPP DIRETO */}
                          <div className="space-y-1.5 my-3 text-xs text-slate-600 dark:text-slate-400">
                            {visitor.phone ? (
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {formatPhone(visitor.phone)}
                                </span>

                                {whatsappUrl && (
                                  <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900 transition-colors shrink-0"
                                    title="Enviar mensagem de boas-vindas no WhatsApp"
                                  >
                                    <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>WhatsApp</span>
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Sem telefone</span>
                            )}

                            {visitor.email && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{visitor.email}</span>
                              </div>
                            )}
                          </div>

                          {/* OBSERVAÇÕES / PEDIDOS DE ORAÇÃO */}
                          {visitor.notes && (
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 italic mb-3 border border-slate-100 dark:border-slate-800 line-clamp-2">
                              &ldquo;{visitor.notes}&rdquo;
                            </div>
                          )}

                          {/* BOTÕES RÁPIDOS DE AVANÇAR DE ESTÁGIO (ÚTIL P/ DISPOSITIVOS MÓVEIS OU SEM ARRASTO) */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[10px] font-bold">
                            {stage.key === "pending" && (
                              <button
                                onClick={() => handleUpdateStatus(visitor.id, "contacted")}
                                className="w-full py-1.5 px-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg flex items-center justify-center gap-1 transition-colors"
                              >
                                <span>Avançar para Contatado</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}

                            {stage.key === "contacted" && (
                              <div className="flex items-center gap-1 w-full">
                                <button
                                  onClick={() => handleUpdateStatus(visitor.id, "pending")}
                                  className="py-1 px-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Retornar para Pendente"
                                >
                                  ↩
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(visitor.id, "member")}
                                  className="flex-1 py-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 rounded-lg flex items-center justify-center gap-1 transition-colors font-bold"
                                >
                                  <span>Tornou-se Membro</span>
                                  <CheckCircle2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {stage.key === "member" && (
                              <div className="flex items-center justify-between w-full text-emerald-800 dark:text-emerald-300">
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Membro Integrado
                                </span>
                                <button
                                  onClick={() => handleUpdateStatus(visitor.id, "contacted")}
                                  className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                                >
                                  Reabrir
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ========================================================================= */
        /* VISUALIZAÇÃO EM GRADE TRADICIONAL */
        /* ========================================================================= */
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVisitors.map((visitor) => (
              <div
                key={visitor.id}
                className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 relative group transition-all hover:shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {visitor.name}
                      </h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">
                        {new Date(visitor.firstVisit + "T12:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {getStatusBadge(visitor.followupStatus)}
                  </div>

                  <div className="space-y-2 mt-4 text-sm text-slate-600 dark:text-slate-400">
                    <p className="flex items-center gap-2">
                      <strong>📞</strong> {visitor.phone ? formatPhone(visitor.phone) : "Sem telefone"}
                    </p>
                    {visitor.email && (
                      <p className="flex items-center gap-2">
                        <strong>📧</strong> {visitor.email}
                      </p>
                    )}
                  </div>

                  {visitor.notes && (
                    <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-xl text-xs font-medium text-slate-500 border border-slate-100 dark:border-slate-800 italic">
                      {visitor.notes}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                  {/* Seletor rápido de estágio */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Mover:</span>
                    <select
                      value={visitor.followupStatus}
                      onChange={(e) => handleUpdateStatus(visitor.id, e.target.value as FunnelStageKey)}
                      className="text-xs font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none"
                    >
                      <option value="pending">Pendente</option>
                      <option value="contacted">Contatado</option>
                      <option value="member">Membro</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setEditingVisitor(visitor);
                      setFormData({
                        name: visitor.name,
                        phone: formatPhone(visitor.phone || ""),
                        email: visitor.email || "",
                        firstVisit: visitor.firstVisit,
                        followupStatus: visitor.followupStatus,
                        notes: visitor.notes || "",
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-2 bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-400 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL DE CADASTRO / EDIÇÃO DE VISITANTE */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-8 sm:p-10 overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-800 dark:text-slate-100">
                {editingVisitor ? "Editar Visitante" : "Novo Visitante"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Nome Completo
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Nome do Visitante"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Data da 1ª Visita
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                    value={formData.firstVisit}
                    onChange={(e) =>
                      setFormData({ ...formData, firstVisit: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    maxLength={15}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: formatPhone(e.target.value) })
                    }
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Estágio no Funil de Acolhimento
                </label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                  value={formData.followupStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      followupStatus: e.target.value as any,
                    })
                  }
                >
                  <option value="pending">Pendente (Fazer Contato / Boas-vindas)</option>
                  <option value="contacted">Já Contatado (Em Acompanhamento)</option>
                  <option value="member">Tornou-se Membro (Integrado)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Observações e Pedidos de Oração
                </label>
                <textarea
                  rows={3}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800 dark:text-slate-100 resize-none"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Detalhes sobre a visita, quem os convidou, pedidos de oração, etc."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-8 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-4 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-800/20"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
