"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Music,
  Calendar,
  Users,
  Check,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Clock,
  MapPin,
  X,
  Filter,
  Search,
  Tag,
  AlertCircle,
  Play,
  Share2,
} from "lucide-react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { BallerinaIcon } from "@/components/BallerinaIcon";

interface DanceGroup {
  id: string;
  name: string;
  churchId: string;
  description?: string;
  leaderName?: string;
  targetAge?: string;
  memberCount?: number;
  createdAt?: any;
}

interface Choreography {
  id: string;
  title: string;
  songTitle: string;
  artist: string;
  churchId: string;
  groupId?: string;
  status: "rehearsing" | "ready" | "performed";
  targetDate?: string;
  costume?: string;
  musicLink?: string;
  notes?: string;
  createdAt?: any;
}

interface DanceRehearsal {
  id: string;
  churchId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  completed: boolean;
  notes?: string;
  createdAt?: any;
}

interface DanceWorkspaceProps {
  churchId: string;
}

const DEFAULT_GROUPS = [
  {
    name: "Grupo de Dança Principal",
    description: "Ministração nos cultos dominicais e celebrações especiais.",
    targetAge: "Adulto / Geral",
    leaderName: "Liderança de Dança",
  },
  {
    name: "Dança Teen & Jovem",
    description: "Coreografias dinâmicas e apresentações nos cultos da juventude.",
    targetAge: "Jovens e Adolescentes",
    leaderName: "Liderança Jovem",
  },
];

const DEFAULT_CHOREOGRAPHIES = [
  {
    title: "Leão da Tribo de Judá",
    songTitle: "O Leão",
    artist: "Gabriela Rocha",
    status: "ready" as const,
    targetDate: "Culto de Celebração",
    costume: "Túnica Branca com Estandartes Dourados",
    musicLink: "https://www.youtube.com/results?search_query=o+leao+gabriela+rocha",
    notes: "Entrada em leque pelas laterais; transição rápida no refrão.",
  },
  {
    title: "Vitorioso És",
    songTitle: "Vitorioso És",
    artist: "Gabriel Guedes",
    status: "rehearsing" as const,
    targetDate: "Próxima Vigília",
    costume: "Vestimenta Azul Cobalto e fitas brancas",
    musicLink: "https://www.youtube.com/results?search_query=vitorioso+es+gabriel+guedes",
    notes: "Focar na sincronia dos giros nos 2 minutos iniciais.",
  },
];

const DEFAULT_REHEARSALS = [
  {
    title: "Ensaio Geral - Culto de Celebração",
    date: "Sábado",
    time: "15:00 - 17:00",
    location: "Altar Principal",
    completed: false,
    notes: "Aquecimento corporal 15 min antes. Levar sapatilhas e tecidos.",
  },
  {
    title: "Treinamento Técnico & Expressão Corporal",
    date: "Terça-feira",
    time: "19:30 - 21:00",
    location: "Salão Anexo",
    completed: true,
    notes: "Passagem de coreografias novas e alongamento.",
  },
];

export default function DanceWorkspace({ churchId }: DanceWorkspaceProps) {
  const { userData } = useAuth();

  const [activeTab, setActiveTab] = useState<"choreographies" | "groups" | "rehearsals">("choreographies");
  const [choreographies, setChoreographies] = useState<Choreography[]>([]);
  const [groups, setGroups] = useState<DanceGroup[]>([]);
  const [rehearsals, setRehearsals] = useState<DanceRehearsal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<"all" | "rehearsing" | "ready" | "performed">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isChoreoModalOpen, setIsChoreoModalOpen] = useState(false);
  const [editingChoreo, setEditingChoreo] = useState<Choreography | null>(null);
  const [choreoFormData, setChoreoFormData] = useState({
    title: "",
    songTitle: "",
    artist: "",
    status: "rehearsing" as "rehearsing" | "ready" | "performed",
    targetDate: "",
    costume: "",
    musicLink: "",
    notes: "",
    groupId: "",
  });

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupFormData, setGroupFormData] = useState({
    name: "",
    description: "",
    targetAge: "Geral",
    leaderName: "",
  });

  const [isRehearsalModalOpen, setIsRehearsalModalOpen] = useState(false);
  const [rehearsalFormData, setRehearsalFormData] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Permission: user is dance leader, church leader, or admin
  const isLeader =
    userData?.super_admin === true ||
    userData?.role === "líder" ||
    userData?.roles?.dance?.includes("leader") ||
    userData?.roles?.dance?.includes("dance_leader");

  // Subscribe to collections
  useEffect(() => {
    if (!churchId) return;
    setLoading(true);

    const choreoQuery = query(
      collection(db, "choreographies"),
      where("churchId", "==", churchId)
    );
    const groupsQuery = query(
      collection(db, "dance_groups"),
      where("churchId", "==", churchId)
    );
    const rehearsalsQuery = query(
      collection(db, "dance_rehearsals"),
      where("churchId", "==", churchId)
    );

    const unsubChoreo = onSnapshot(choreoQuery, (snap) => {
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Choreography[];

      if (items.length === 0 && snap.empty) {
        // Seed default preview if empty
        seedDefaults(churchId);
      } else {
        setChoreographies(items);
      }
    });

    const unsubGroups = onSnapshot(groupsQuery, (snap) => {
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DanceGroup[];
      setGroups(items);
    });

    const unsubRehearsals = onSnapshot(rehearsalsQuery, (snap) => {
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DanceRehearsal[];
      setRehearsals(items);
      setLoading(false);
    });

    return () => {
      unsubChoreo();
      unsubGroups();
      unsubRehearsals();
    };
  }, [churchId]);

  const seedDefaults = async (cId: string) => {
    try {
      // Seed groups if empty
      const gSnap = await getDocs(query(collection(db, "dance_groups"), where("churchId", "==", cId)));
      if (gSnap.empty) {
        for (const g of DEFAULT_GROUPS) {
          await addDoc(collection(db, "dance_groups"), {
            ...g,
            churchId: cId,
            createdAt: serverTimestamp(),
          });
        }
      }

      // Seed choreographies if empty
      const cSnap = await getDocs(query(collection(db, "choreographies"), where("churchId", "==", cId)));
      if (cSnap.empty) {
        for (const c of DEFAULT_CHOREOGRAPHIES) {
          await addDoc(collection(db, "choreographies"), {
            ...c,
            churchId: cId,
            createdAt: serverTimestamp(),
          });
        }
      }

      // Seed rehearsals if empty
      const rSnap = await getDocs(query(collection(db, "dance_rehearsals"), where("churchId", "==", cId)));
      if (rSnap.empty) {
        for (const r of DEFAULT_REHEARSALS) {
          await addDoc(collection(db, "dance_rehearsals"), {
            ...r,
            churchId: cId,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.warn("Notice: Dance default seeding (non-blocking):", err);
    } finally {
      setLoading(false);
    }
  };

  // Choreography handlers
  const handleOpenChoreoModal = (item?: Choreography) => {
    if (item) {
      setEditingChoreo(item);
      setChoreoFormData({
        title: item.title,
        songTitle: item.songTitle,
        artist: item.artist,
        status: item.status,
        targetDate: item.targetDate || "",
        costume: item.costume || "",
        musicLink: item.musicLink || "",
        notes: item.notes || "",
        groupId: item.groupId || "",
      });
    } else {
      setEditingChoreo(null);
      setChoreoFormData({
        title: "",
        songTitle: "",
        artist: "",
        status: "rehearsing",
        targetDate: "",
        costume: "",
        musicLink: "",
        notes: "",
        groupId: groups[0]?.id || "",
      });
    }
    setIsChoreoModalOpen(true);
  };

  const handleSaveChoreo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choreoFormData.title.trim()) return;
    setSubmitting(true);
    try {
      if (editingChoreo) {
        await updateDoc(doc(db, "choreographies", editingChoreo.id), {
          ...choreoFormData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "choreographies"), {
          ...choreoFormData,
          churchId,
          createdAt: serverTimestamp(),
        });
      }
      setIsChoreoModalOpen(false);
      setEditingChoreo(null);
    } catch (err: any) {
      alert("Erro ao salvar coreografia: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteChoreo = async (id: string) => {
    if (!confirm("Deseja realmente remover esta coreografia?")) return;
    try {
      await deleteDoc(doc(db, "choreographies", id));
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const handleToggleChoreoStatus = async (item: Choreography) => {
    const nextStatus: Record<Choreography["status"], Choreography["status"]> = {
      rehearsing: "ready",
      ready: "performed",
      performed: "rehearsing",
    };
    try {
      await updateDoc(doc(db, "choreographies", item.id), {
        status: nextStatus[item.status],
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      alert("Erro ao alterar status: " + err.message);
    }
  };

  // Group handlers
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.name.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "dance_groups"), {
        ...groupFormData,
        churchId,
        createdAt: serverTimestamp(),
      });
      setIsGroupModalOpen(false);
      setGroupFormData({
        name: "",
        description: "",
        targetAge: "Geral",
        leaderName: "",
      });
    } catch (err: any) {
      alert("Erro ao criar grupo de dança: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Deseja remover este grupo de dança?")) return;
    try {
      await deleteDoc(doc(db, "dance_groups", id));
    } catch (err: any) {
      alert("Erro ao excluir grupo: " + err.message);
    }
  };

  // Rehearsal handlers
  const handleSaveRehearsal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rehearsalFormData.title.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "dance_rehearsals"), {
        ...rehearsalFormData,
        completed: false,
        churchId,
        createdAt: serverTimestamp(),
      });
      setIsRehearsalModalOpen(false);
      setRehearsalFormData({
        title: "",
        date: "",
        time: "",
        location: "",
        notes: "",
      });
    } catch (err: any) {
      alert("Erro ao salvar ensaio: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRehearsal = async (item: DanceRehearsal) => {
    try {
      await updateDoc(doc(db, "dance_rehearsals", item.id), {
        completed: !item.completed,
      });
    } catch (err: any) {
      alert("Erro ao atualizar ensaio: " + err.message);
    }
  };

  const handleDeleteRehearsal = async (id: string) => {
    if (!confirm("Deseja remover este registro de ensaio?")) return;
    try {
      await deleteDoc(doc(db, "dance_rehearsals", id));
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  // Filtered choreographies
  const filteredChoreographies = choreographies.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.songTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.costume && item.costume.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: Choreography["status"]) => {
    switch (status) {
      case "ready":
        return (
          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
            <Check className="w-3 h-3" /> Pronta p/ Culto
          </span>
        );
      case "rehearsing":
        return (
          <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Em Ensaio
          </span>
        );
      case "performed":
        return (
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Ministrada
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Workspace Header Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl w-fit">
          <button
            id="tab-coreografias"
            onClick={() => setActiveTab("choreographies")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "choreographies"
                ? "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <BallerinaIcon className="w-4 h-4" />
            Coreografias ({choreographies.length})
          </button>

          <button
            id="tab-elencos"
            onClick={() => setActiveTab("groups")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "groups"
                ? "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Users className="w-4 h-4" />
            Elencos & Grupos ({groups.length})
          </button>

          <button
            id="tab-ensaios"
            onClick={() => setActiveTab("rehearsals")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "rehearsals"
                ? "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Calendar className="w-4 h-4" />
            Ensaios & Avisos ({rehearsals.length})
          </button>
        </div>

        {/* Action Button */}
        <div>
          {activeTab === "choreographies" && (
            <button
              id="btn-nova-coreografia"
              onClick={() => handleOpenChoreoModal()}
              className="bg-rose-700 hover:bg-rose-800 text-white px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-700/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nova Coreografia
            </button>
          )}

          {activeTab === "groups" && isLeader && (
            <button
              id="btn-novo-grupo-danca"
              onClick={() => setIsGroupModalOpen(true)}
              className="bg-rose-700 hover:bg-rose-800 text-white px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-700/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Novo Elenco
            </button>
          )}

          {activeTab === "rehearsals" && (
            <button
              id="btn-novo-ensaio"
              onClick={() => setIsRehearsalModalOpen(true)}
              className="bg-rose-700 hover:bg-rose-800 text-white px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-700/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Agendar Ensaio
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: COREOGRAFIAS & REPERTÓRIO */}
      {activeTab === "choreographies" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, louvor, figurino..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
              {(["all", "ready", "rehearsing", "performed"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer",
                    statusFilter === st
                      ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-900"
                      : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  )}
                >
                  {st === "all"
                    ? "Todas"
                    : st === "ready"
                    ? "Prontas"
                    : st === "rehearsing"
                    ? "Em Ensaio"
                    : "Ministradas"}
                </button>
              ))}
            </div>
          </div>

          {/* Choreographies Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredChoreographies.length > 0 ? (
              filteredChoreographies.map((choreo) => (
                <motion.div
                  key={choreo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/60 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-display font-black text-xl text-slate-800 dark:text-slate-100 group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">
                            {choreo.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5 mt-0.5">
                            <Music className="w-3.5 h-3.5 text-rose-500" />
                            {choreo.songTitle} • {choreo.artist}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleChoreoStatus(choreo)}
                        title="Clique para alternar status (Em Ensaio -> Pronta -> Ministrada)"
                        className="cursor-pointer active:scale-95 transition-transform"
                      >
                        {getStatusBadge(choreo.status)}
                      </button>
                    </div>

                    {choreo.costume && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                        <span className="font-black text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                          Figurino & Vestimenta
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {choreo.costume}
                        </span>
                      </div>
                    )}

                    {choreo.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium line-clamp-2">
                        {choreo.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {choreo.targetDate && (
                        <span className="text-slate-400 font-bold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {choreo.targetDate}
                        </span>
                      )}
                      {choreo.musicLink && (
                        <a
                          href={choreo.musicLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-rose-600 dark:text-rose-400 hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5 fill-rose-600" /> Áudio / Vídeo
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenChoreoModal(choreo)}
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteChoreo(choreo.id)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center bg-slate-50 dark:bg-slate-900/40 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                <BallerinaIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-lg">
                  Nenhuma coreografia encontrada
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Cadastre novas coreografias para organizar o repertório musical, figurinos e apresentações.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GRUPOS & ELENCOS */}
      {activeTab === "groups" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.length > 0 ? (
            groups.map((grp) => (
              <motion.div
                key={grp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/60 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <Users className="w-6 h-6" />
                    </div>
                    {grp.targetAge && (
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                        {grp.targetAge}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-display font-black text-2xl text-slate-800 dark:text-slate-100">
                      {grp.name}
                    </h4>
                    {grp.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed">
                        {grp.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">
                    {grp.leaderName ? `Coord: ${grp.leaderName}` : "Ministério de Dança"}
                  </span>
                  {isLeader && (
                    <button
                      onClick={() => handleDeleteGroup(grp.id)}
                      className="text-slate-400 hover:text-red-600 p-2 rounded-xl transition-colors"
                      title="Excluir grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center bg-slate-50 dark:bg-slate-900/40 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h4 className="font-bold text-slate-700 dark:text-slate-300 text-lg">
                Nenhum elenco registrado
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Adicione elencos por faixa etária ou proposta coreográfica.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ENSAIOS & AVISOS */}
      {activeTab === "rehearsals" && (
        <div className="space-y-4">
          {rehearsals.length > 0 ? (
            rehearsals.map((reh) => (
              <motion.div
                key={reh.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-6 rounded-[2rem] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                  reh.completed
                    ? "bg-slate-50/70 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 opacity-70"
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:border-rose-200"
                )}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggleRehearsal(reh)}
                    className={cn(
                      "w-8 h-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer",
                      reh.completed
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "border-slate-300 dark:border-slate-700 hover:border-rose-500"
                    )}
                    title={reh.completed ? "Marcar como pendente" : "Concluir ensaio"}
                  >
                    {reh.completed && <Check className="w-4 h-4" />}
                  </button>

                  <div>
                    <h4
                      className={cn(
                        "font-bold text-base",
                        reh.completed
                          ? "line-through text-slate-400"
                          : "text-slate-800 dark:text-slate-100"
                      )}
                    >
                      {reh.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                      {reh.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-rose-500" />
                          {reh.date}
                        </span>
                      )}
                      {reh.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-rose-500" />
                          {reh.time}
                        </span>
                      )}
                      {reh.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          {reh.location}
                        </span>
                      )}
                    </div>
                    {reh.notes && (
                      <p className="text-xs text-slate-400 mt-2 italic">{reh.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleDeleteRehearsal(reh.id)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                    title="Remover ensaio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/40 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h4 className="font-bold text-slate-700 dark:text-slate-300 text-lg">
                Nenhum ensaio agendado
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Agende ensaios para a equipe de dança sincronizar os passos e figurinos.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: NOVA / EDITAR COREOGRAFIA */}
      {isChoreoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-xl p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <button
              onClick={() => setIsChoreoModalOpen(false)}
              className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-rose-600" />
              {editingChoreo ? "Editar Coreografia" : "Nova Coreografia"}
            </h3>

            <form onSubmit={handleSaveChoreo} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                    Título da Coreografia *
                  </label>
                  <input
                    type="text"
                    required
                    value={choreoFormData.title}
                    onChange={(e) =>
                      setChoreoFormData({ ...choreoFormData, title: e.target.value })
                    }
                    placeholder="Ex: Leão da Tribo de Judá"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                    Status
                  </label>
                  <select
                    value={choreoFormData.status}
                    onChange={(e) =>
                      setChoreoFormData({
                        ...choreoFormData,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                  >
                    <option value="rehearsing">Em Ensaio</option>
                    <option value="ready">Pronta para Ministração</option>
                    <option value="performed">Já Ministrada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                    Nome da Música / Louvor *
                  </label>
                  <input
                    type="text"
                    required
                    value={choreoFormData.songTitle}
                    onChange={(e) =>
                      setChoreoFormData({ ...choreoFormData, songTitle: e.target.value })
                    }
                    placeholder="Ex: O Leão"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                    Cantor / Artista *
                  </label>
                  <input
                    type="text"
                    required
                    value={choreoFormData.artist}
                    onChange={(e) =>
                      setChoreoFormData({ ...choreoFormData, artist: e.target.value })
                    }
                    placeholder="Ex: Gabriela Rocha"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                    Figurino / Vestimenta
                  </label>
                  <input
                    type="text"
                    value={choreoFormData.costume}
                    onChange={(e) =>
                      setChoreoFormData({ ...choreoFormData, costume: e.target.value })
                    }
                    placeholder="Ex: Túnica Branca c/ Faixa Dourada"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                    Culto / Data Prevista
                  </label>
                  <input
                    type="text"
                    value={choreoFormData.targetDate}
                    onChange={(e) =>
                      setChoreoFormData({ ...choreoFormData, targetDate: e.target.value })
                    }
                    placeholder="Ex: Culto de Domingo / Ceia"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                  Link da Música (YouTube / Spotify / Áudio)
                </label>
                <input
                  type="url"
                  value={choreoFormData.musicLink}
                  onChange={(e) =>
                    setChoreoFormData({ ...choreoFormData, musicLink: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                  Anotações / Instruções de Movimento
                </label>
                <textarea
                  rows={3}
                  value={choreoFormData.notes}
                  onChange={(e) =>
                    setChoreoFormData({ ...choreoFormData, notes: e.target.value })
                  }
                  placeholder="Instruções de entrada, transições ou gestos proféticos..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsChoreoModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-4 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-2xl shadow-xl shadow-rose-700/20 transition-all disabled:opacity-50"
                >
                  {submitting ? "Salvando..." : "Salvar Coreografia"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: NOVO GRUPO DE DANÇA */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-md p-10 shadow-2xl relative"
          >
            <button
              onClick={() => setIsGroupModalOpen(false)}
              className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
              <Users className="w-6 h-6 text-rose-600" />
              Novo Elenco de Dança
            </h3>

            <form onSubmit={handleSaveGroup} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                  Nome do Grupo / Elenco *
                </label>
                <input
                  type="text"
                  required
                  value={groupFormData.name}
                  onChange={(e) =>
                    setGroupFormData({ ...groupFormData, name: e.target.value })
                  }
                  placeholder="Ex: Dança Profética, Elenco Infantil..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                  Público / Faixa Etária
                </label>
                <input
                  type="text"
                  value={groupFormData.targetAge}
                  onChange={(e) =>
                    setGroupFormData({ ...groupFormData, targetAge: e.target.value })
                  }
                  placeholder="Ex: Jovens, Adultos, Crianças"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                  Descrição / Objetivo
                </label>
                <textarea
                  rows={3}
                  value={groupFormData.description}
                  onChange={(e) =>
                    setGroupFormData({ ...groupFormData, description: e.target.value })
                  }
                  placeholder="Foco ministerial deste elenco..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-4 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-2xl shadow-xl shadow-rose-700/20 transition-all disabled:opacity-50"
                >
                  {submitting ? "Criando..." : "Criar Grupo"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: NOVO ENSAIO */}
      {isRehearsalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-md p-10 shadow-2xl relative"
          >
            <button
              onClick={() => setIsRehearsalModalOpen(false)}
              className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-rose-600" />
              Agendar Ensaio
            </h3>

            <form onSubmit={handleSaveRehearsal} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                  Título do Ensaio *
                </label>
                <input
                  type="text"
                  required
                  value={rehearsalFormData.title}
                  onChange={(e) =>
                    setRehearsalFormData({ ...rehearsalFormData, title: e.target.value })
                  }
                  placeholder="Ex: Ensaio de Sábado, Passagem Geral..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                    Dia / Data
                  </label>
                  <input
                    type="text"
                    value={rehearsalFormData.date}
                    onChange={(e) =>
                      setRehearsalFormData({ ...rehearsalFormData, date: e.target.value })
                    }
                    placeholder="Ex: Sábado, 18/10"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                    Horário
                  </label>
                  <input
                    type="text"
                    value={rehearsalFormData.time}
                    onChange={(e) =>
                      setRehearsalFormData({ ...rehearsalFormData, time: e.target.value })
                    }
                    placeholder="Ex: 15:00 - 17:00"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                  Local
                </label>
                <input
                  type="text"
                  value={rehearsalFormData.location}
                  onChange={(e) =>
                    setRehearsalFormData({ ...rehearsalFormData, location: e.target.value })
                  }
                  placeholder="Ex: Templo Principal, Sala Anexa"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
                  Orientações / Materiais
                </label>
                <textarea
                  rows={3}
                  value={rehearsalFormData.notes}
                  onChange={(e) =>
                    setRehearsalFormData({ ...rehearsalFormData, notes: e.target.value })
                  }
                  placeholder="Ex: Trazer sapatilhas pretas e garrafa de água..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRehearsalModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-4 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-2xl shadow-xl shadow-rose-700/20 transition-all disabled:opacity-50"
                >
                  {submitting ? "Agendando..." : "Confirmar Ensaio"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
