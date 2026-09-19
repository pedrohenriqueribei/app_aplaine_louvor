"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "motion/react";
import { formatPhone } from "@/lib/utils";
import {
  ArrowLeft,
  Mail,
  Phone,
  Music,
  Mic2,
  Shield,
  Calendar,
  CheckCircle2,
  XCircle,
  User,
  Edit2,
  Waves,
  Youtube,
  ChevronRight,
  X,
  Save,
  Loader2,
  Plus,
  Check,
  UserMinus,
  AlertTriangle,
} from "lucide-react";

interface Musician {
  uid: string;
  name: string;
  email: string;
  phone: string;
  instruments: string[];
  vocalRange: string;
  level?: string;
  churchId?: string;
  role?: string;
  roles?: {
    worship?: string[];
    secretariat?: string[];
    multimedia?: string[];
  };
  status: "active" | "inactive";
  createdAt: any;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  key: string;
  link: string;
}

interface Band {
  id: string;
  name: string;
  churchId: string;
}

export default function MusicianProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isSuperAdmin, userData } = useAuth();
  const [musician, setMusician] = useState<Musician | null>(null);
  const [churchName, setChurchName] = useState<string>("---");
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "songs">("info");

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customInstrument, setCustomInstrument] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Unlink Church State
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    instruments: [] as string[],
    vocalRange: "",
    level: "",
    churchId: "",
    status: "active" as "active" | "inactive",
    roles: {
      worship: [] as string[],
      multimedia: [] as string[],
      secretariat: [] as string[],
    },
  });

  const vocalRangeList = [
    "Soprano",
    "Mezzo-Soprano",
    "Contralto",
    "Tenor",
    "Barítono",
    "Baixo",
  ];

  const defaultInstrumentsList = [
    "Violão",
    "Guitarra",
    "Baixo",
    "Bateria",
    "Teclado",
    "Piano",
    "Voz",
    "Percussão",
    "Saxofone",
    "Flauta",
    "Violino",
  ];

  const levelList = [
    { id: "iniciante", label: "Iniciante" },
    { id: "intermediário", label: "Intermediário" },
    { id: "avançado", label: "Avançado" },
    { id: "profissional", label: "Profissional" },
  ];

  const worshipRolesList = [
    { id: "leader", label: "Líder de Louvor" },
    { id: "instrumentist", label: "Instrumentista / Vocal" },
  ];

  const multimediaRolesList = [
    { id: "multimedia_leader", label: "Líder de Multimídia" },
    { id: "audio_operator", label: "Operador de Áudio" },
    { id: "pc_operator", label: "Operador de PC / Projeção" },
    { id: "social_media_operator", label: "Redes Sociais" },
    { id: "camera_operator", label: "Operador de Câmera" },
    { id: "photography_operator", label: "Fotógrafo" },
  ];

  const secretariatRolesList = [{ id: "admin", label: "Secretário" }];

  useEffect(() => {
    async function fetchMusician() {
      if (!id) return;
      try {
        const docRef = doc(db, "users", id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Musician;
          setMusician(data);

          if (data.churchId) {
            const churchRef = doc(db, "churches", data.churchId);
            const churchSnap = await getDoc(churchRef);
            if (churchSnap.exists()) {
              setChurchName(churchSnap.data().name);
            }
          }

          // Fetch songs for this user
          const songsQuery = query(
            collection(db, "songs"),
            where("ownerId", "==", id),
            orderBy("createdAt", "desc"),
          );
          const songsSnap = await getDocs(songsQuery);
          setSongs(
            songsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Song),
          );

          // Fetch bands this user is part of
          const bandsQuery = query(
            collection(db, "bands"),
            where("memberIds", "array-contains", id),
          );
          const bandsSnap = await getDocs(bandsQuery);
          setBands(
            bandsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Band),
          );
        }

        // Fetch churches list for dropdown
        const churchesQuery = await getDocs(collection(db, "churches"));
        setChurches(
          churchesQuery.docs.map((d) => ({
            id: d.id,
            name: d.data().name || d.id,
          })),
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${id}`);
      } finally {
        setLoading(false);
      }
    }
    fetchMusician();
  }, [id]);

  const handleOpenEdit = () => {
    if (!musician) return;
    setFormData({
      name: musician.name || "",
      email: musician.email || "",
      phone: formatPhone(musician.phone || ""),
      instruments: musician.instruments || [],
      vocalRange: musician.vocalRange || "",
      level: musician.level || "",
      churchId: musician.churchId || "",
      status: musician.status || "active",
      roles: {
        worship: musician.roles?.worship || [],
        multimedia: musician.roles?.multimedia || [],
        secretariat: musician.roles?.secretariat || [],
      },
    });
    setFeedback(null);
    setIsEditModalOpen(true);
  };

  const toggleInstrument = (inst: string) => {
    setFormData((prev) => {
      const exists = prev.instruments.includes(inst);
      return {
        ...prev,
        instruments: exists
          ? prev.instruments.filter((i) => i !== inst)
          : [...prev.instruments, inst],
      };
    });
  };

  const handleAddCustomInstrument = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customInstrument.trim();
    if (!trimmed) return;
    if (!formData.instruments.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        instruments: [...prev.instruments, trimmed],
      }));
    }
    setCustomInstrument("");
  };

  const toggleRole = (
    dept: "worship" | "multimedia" | "secretariat",
    roleId: string,
  ) => {
    setFormData((prev) => {
      const current = prev.roles[dept] || [];
      const exists = current.includes(roleId);
      return {
        ...prev,
        roles: {
          ...prev.roles,
          [dept]: exists
            ? current.filter((r) => r !== roleId)
            : [...current, roleId],
        },
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !musician) return;
    if (!formData.name.trim()) {
      setFeedback({ type: "error", message: "O nome completo é obrigatório." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const payload: any = {
        uid: musician.uid || (id as string),
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim(),
        instruments: formData.instruments,
        vocalRange: formData.vocalRange,
        level: formData.level,
        churchId: formData.churchId,
        status: formData.status,
        roles: formData.roles,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "users", id as string), payload);

      setMusician((prev) => (prev ? { ...prev, ...payload } : null));

      if (formData.churchId) {
        const found = churches.find((c) => c.id === formData.churchId);
        if (found) {
          setChurchName(found.name);
        } else {
          try {
            const cSnap = await getDoc(doc(db, "churches", formData.churchId));
            if (cSnap.exists()) {
              setChurchName(cSnap.data().name);
            }
          } catch {}
        }
      } else {
        setChurchName("---");
      }

      setFeedback({
        type: "success",
        message: "Perfil atualizado com sucesso!",
      });

      setTimeout(() => {
        setIsEditModalOpen(false);
        setFeedback(null);
      }, 1000);
    } catch (err) {
      console.error("Error saving member profile:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${id}`);
      setFeedback({
        type: "error",
        message: "Erro ao salvar alterações no perfil.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkChurch = async () => {
    if (!id || !musician) return;
    setUnlinking(true);
    try {
      const oldChurchId = musician.churchId;

      await updateDoc(doc(db, "users", id as string), {
        churchId: "",
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || "system",
      });

      // Remove from church department subcollections if present
      if (oldChurchId) {
        const depts = ["worship", "multimedia", "secretariat"];
        for (const dept of depts) {
          try {
            await deleteDoc(
              doc(
                db,
                "churches",
                oldChurchId,
                "departments",
                dept,
                "members",
                id as string,
              ),
            );
          } catch (cleanupErr) {
            console.warn(
              "Notice: Department subcollection clean-up error (ignored):",
              cleanupErr,
            );
          }
        }
      }

      setMusician((prev) => (prev ? { ...prev, churchId: "" } : null));
      setChurchName("---");
      setFormData((prev) => ({ ...prev, churchId: "" }));
      setFeedback({
        type: "success",
        message: `${musician.name} foi desvinculado(a) da igreja com sucesso!`,
      });
      setIsUnlinkModalOpen(false);
    } catch (err) {
      console.error("Error unlinking member from church:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${id}`);
      setFeedback({
        type: "error",
        message:
          "Erro ao desvincular o integrante da igreja. Verifique suas permissões.",
      });
    } finally {
      setUnlinking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!musician) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
          Músico não encontrado
        </h2>
        <button
          onClick={() => router.back()}
          className="text-blue-800 dark:text-blue-400 font-bold hover:underline flex items-center gap-2 mx-auto"
        >
          <ArrowLeft size={18} /> Voltar
        </button>
      </div>
    );
  }

  const isLeader =
    musician.roles?.worship?.includes("leader") ||
    musician.roles?.multimedia?.includes("leader") ||
    musician.roles?.secretariat?.includes("leader");
  const isMultimedia = (musician.roles?.multimedia?.length ?? 0) > 0;
  const isSecretariat = (musician.roles?.secretariat?.length ?? 0) > 0;

  // Check if the current authenticated user has a leader profile
  const isCurrentUserLeader = Boolean(
    isSuperAdmin ||
      user?.email === "pedrohenriqueribei@gmail.com" ||
      userData?.role === "líder" ||
      userData?.roles?.worship?.includes("leader") ||
      userData?.roles?.multimedia?.includes("leader") ||
      userData?.roles?.multimedia?.includes("multimedia_leader") ||
      userData?.roles?.secretariat?.includes("leader"),
  );

  let displayRole = "Instrumentista Integrante";
  let displayRoleShort = "Instrumentista";
  let shieldColor = "text-blue-400";

  if (isLeader) {
    displayRole = "Líder de Ministério";
    displayRoleShort = "Líder";
    shieldColor = "text-amber-500";
  } else if (isMultimedia) {
    displayRole = "Multimídia";
    displayRoleShort = "Multimídia";
    shieldColor = "text-purple-500";
  } else if (isSecretariat) {
    displayRole = "Secretaria";
    displayRoleShort = "Secretaria";
    shieldColor = "text-slate-500";
  } else if (musician.vocalRange && musician.vocalRange.trim().length > 0) {
    displayRole = `Vocal (${musician.vocalRange})`;
    displayRoleShort = musician.vocalRange;
    shieldColor = "text-pink-500";
  } else if (musician.instruments?.includes("Voz")) {
    displayRole = "Vocal Integrante";
    displayRoleShort = "Vocal";
    shieldColor = "text-pink-500";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-800 font-bold transition-all group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span>Voltar para Listagem</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
      >
        {/* Header/Cover */}
        <div className="h-48 bg-gradient-to-r from-blue-800 to-indigo-900 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,#ffffff_0,transparent_70%)]" />
        </div>

        {/* Profile Content */}
        <div className="relative px-8 md:px-12 pb-12">
          {/* Avatar Area */}
          <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16 mb-10">
            <div className="w-32 h-32 bg-white dark:bg-slate-900 rounded-[2.5rem] p-2 shadow-2xl">
              <div className="w-full h-full bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-blue-800 dark:text-blue-400 text-4xl font-black border border-slate-100 dark:border-slate-700">
                {musician.name.charAt(0)}
              </div>
            </div>
            <div className="pb-4">
              <h1 className="text-4xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                {musician.name}
                {musician.status === "active" ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                )}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                <Shield className={`w-4 h-4 ${shieldColor}`} />
                {displayRole}
              </p>
            </div>
            <div className="md:ml-auto pb-4 flex flex-wrap items-center gap-3">
              <button
                id="edit-profile-btn"
                onClick={handleOpenEdit}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-800 dark:hover:text-blue-400 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm border border-slate-200 dark:border-slate-700 text-sm"
              >
                <Edit2 className="w-4 h-4 text-blue-800 dark:text-blue-400" />
                Editar Perfil
              </button>

              {isCurrentUserLeader && (
                <button
                  id="unlink-church-btn"
                  onClick={() => setIsUnlinkModalOpen(true)}
                  disabled={!musician.churchId}
                  className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 text-sm shadow-sm border ${
                    musician.churchId
                      ? "bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 cursor-pointer"
                      : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60"
                  }`}
                  title={
                    musician.churchId
                      ? "Desvincular este integrante da igreja"
                      : "Este integrante não possui igreja vinculada"
                  }
                >
                  <UserMinus className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  Desvincular da Igreja
                </button>
              )}
            </div>
          </div>

          {/* Feedback Alert for Profile Actions */}
          {feedback && !isEditModalOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-8 p-4 rounded-2xl text-sm font-bold flex items-center justify-between gap-3 ${
                feedback.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="flex gap-8 border-b border-slate-100 dark:border-slate-800 mb-12">
            <button
              onClick={() => setActiveTab("info")}
              className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${
                activeTab === "info"
                  ? "text-blue-800 dark:text-blue-400"
                  : "text-slate-300 dark:text-slate-700"
              }`}
            >
              Informações
              {activeTab === "info" && (
                <motion.div
                  layoutId="tab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-800 dark:bg-blue-400 rounded-full"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("songs")}
              className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${
                activeTab === "songs"
                  ? "text-blue-800 dark:text-blue-400"
                  : "text-slate-300 dark:text-slate-700"
              }`}
            >
              Músicas
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeTab === "songs"
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                {songs.length}
              </span>
              {activeTab === "songs" && (
                <motion.div
                  layoutId="tab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-800 dark:bg-blue-400 rounded-full"
                />
              )}
            </button>
          </div>

          {activeTab === "info" ? (
            /* Grid Information */
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <section>
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
                    Contatos
                  </h3>
                  <div className="space-y-4">
                    <InfoItem
                      icon={Mail}
                      label="E-mail"
                      value={musician.email || "Não informado"}
                    />
                    <InfoItem
                      icon={Phone}
                      label="Telefone"
                      value={musician.phone ? formatPhone(musician.phone) : "Não informado"}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
                    Ministério
                  </h3>
                  <div className="space-y-4">
                    <InfoItem
                      icon={User}
                      label="Função"
                      value={displayRoleShort}
                    />
                    <InfoItem
                      icon={Waves}
                      label="Ministério"
                      value={musician.churchId ? churchName : "Sem igreja vinculada"}
                    />
                    <InfoItem
                      icon={Calendar}
                      label="Membro desde"
                      value={
                        musician.createdAt?.toDate
                          ? musician.createdAt.toDate().toLocaleDateString("pt-BR")
                          : typeof musician.createdAt === "string"
                            ? musician.createdAt
                            : "---"
                      }
                    />
                  </div>
                </section>

                {bands.length > 0 && (
                  <section>
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
                      Bandas / Grupos
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {bands.map((band) => (
                        <div
                          key={band.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl"
                        >
                          <Music className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {band.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <div className="space-y-8">
                {musician.roles?.multimedia &&
                  musician.roles.multimedia.filter((s) => s !== "leader").length >
                    0 && (
                    <section>
                      <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
                        Habilidades de Multimídia
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {musician.roles.multimedia
                          .filter((s) => s !== "leader")
                          .map((skill) => {
                            const translated =
                              skill === "audio_operator" ||
                              skill === "audio" ||
                              skill === "sound"
                                ? "Operador de Áudio"
                                : skill === "pc_operator" ||
                                    skill === "projection"
                                  ? "Operador de PC / Projeção"
                                  : skill === "social_media_operator" ||
                                      skill === "social_media_manager"
                                    ? "Redes Sociais"
                                    : skill === "camera_operator" ||
                                        skill === "camera" ||
                                        skill === "video"
                                      ? "Operador de Câmera"
                                      : skill === "photography_operator" ||
                                          skill === "photography"
                                        ? "Fotografia"
                                        : skill === "lights" ||
                                            skill === "illumination"
                                          ? "Iluminação"
                                          : skill === "multimedia_leader"
                                            ? "Líder de Multimídia"
                                            : skill.charAt(0).toUpperCase() +
                                              skill.slice(1);
                            return (
                              <span
                                key={skill}
                                className="px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl text-xs font-bold border border-purple-100 dark:border-purple-800 uppercase"
                              >
                                {translated}
                              </span>
                            );
                          })}
                      </div>
                    </section>
                  )}

                {((musician.instruments && musician.instruments.length > 0) ||
                  musician.vocalRange ||
                  musician.level) && (
                  <section>
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
                      Habilidades Musicais
                    </h3>
                    <div className="space-y-6">
                      {musician.instruments &&
                        musician.instruments.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-500">
                              <Music className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-bold">
                                Instrumentos
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {musician.instruments.map((inst) => (
                                <span
                                  key={inst}
                                  className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-800 italic"
                                >
                                  {inst}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      {musician.vocalRange && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Mic2 className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-bold">Vocal</span>
                          </div>
                          <span className="inline-block px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold border border-indigo-100 dark:border-indigo-800">
                            {musician.vocalRange}
                          </span>
                        </div>
                      )}

                      {musician.level && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Shield className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-bold">Nível</span>
                          </div>
                          <span className="inline-block px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-800 capitalize">
                            {musician.level}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </div>
          ) : (
            /* Songs Tab */
            <div className="space-y-6">
              {songs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {songs.map((song) => (
                    <div
                      key={song.id}
                      className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 group hover:border-blue-200 transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-blue-800 shadow-sm">
                          <Music size={20} />
                        </div>
                        <a
                          href={song.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-300 dark:text-slate-600 hover:text-blue-800 transition-colors"
                        >
                          <Youtube size={18} />
                        </a>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">
                        {song.title}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-4">
                        {song.artist}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg">
                          Tom: {song.key}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-200 dark:text-slate-700 group-hover:text-blue-800 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                  <Music className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Nenhuma música cadastrada ainda.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              id="edit-profile-modal"
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400 flex items-center justify-center">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-black text-slate-900 dark:text-slate-100">
                      Editar Perfil
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Atualize os dados e competências de {musician.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-all cursor-pointer"
                  id="close-edit-modal-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`mx-6 mt-6 p-4 rounded-2xl text-sm font-bold flex items-center gap-2 ${
                    feedback.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {feedback.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Modal Body */}
              <form
                onSubmit={handleSave}
                className="overflow-y-auto p-6 md:p-8 space-y-6 flex-1"
                id="edit-profile-form"
              >
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Informações Básicas
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:border-blue-800 dark:focus:border-blue-500 outline-none transition-all"
                        placeholder="Ex: João Silva"
                        id="input-member-name"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:border-blue-800 dark:focus:border-blue-500 outline-none transition-all"
                        placeholder="email@exemplo.com"
                        id="input-member-email"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Telefone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        maxLength={15}
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: formatPhone(e.target.value) })
                        }
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:border-blue-800 dark:focus:border-blue-500 outline-none transition-all"
                        placeholder="(00) 00000-0000"
                        id="input-member-phone"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Status do Membro
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, status: "active" })
                          }
                          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            formData.status === "active"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Ativo
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, status: "inactive" })
                          }
                          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            formData.status === "inactive"
                              ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          Inativo
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Ministério / Congregação
                      </label>
                      <select
                        value={formData.churchId}
                        onChange={(e) =>
                          setFormData({ ...formData, churchId: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:border-blue-800 dark:focus:border-blue-500 outline-none transition-all cursor-pointer"
                        id="select-member-church"
                      >
                        <option value="">Selecione o ministério...</option>
                        {churches.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Habilidades Musicais */}
                <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Habilidades Musicais
                  </h3>

                  {/* Extensão Vocal */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Extensão Vocal
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {vocalRangeList.map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              vocalRange:
                                formData.vocalRange === range ? "" : range,
                            })
                          }
                          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            formData.vocalRange === range
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nível de Habilidade */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nível de Experiência
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {levelList.map((lv) => (
                        <button
                          key={lv.id}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              level: formData.level === lv.id ? "" : lv.id,
                            })
                          }
                          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            formData.level === lv.id
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
                          }`}
                        >
                          {lv.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Instrumentos */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Instrumentos que Toca
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {Array.from(
                        new Set([
                          ...defaultInstrumentsList,
                          ...formData.instruments,
                        ]),
                      ).map((inst) => {
                        const isSelected = formData.instruments.includes(inst);
                        return (
                          <button
                            key={inst}
                            type="button"
                            onClick={() => toggleInstrument(inst)}
                            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-blue-800 text-white border-blue-800 shadow-md shadow-blue-800/20"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300"
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            {inst}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customInstrument}
                        onChange={(e) => setCustomInstrument(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomInstrument();
                          }
                        }}
                        placeholder="Outro instrumento (ex: Oboé, Trompete)..."
                        className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:border-blue-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCustomInstrument()}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cargos e Funções */}
                <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Cargos e Departamentos
                  </h3>

                  {/* Louvor */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Ministério de Louvor
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {worshipRolesList.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleRole("worship", r.id)}
                          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            formData.roles.worship?.includes(r.id)
                              ? "bg-blue-800 text-white border-blue-800 shadow-md"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Multimídia */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Multimídia & Transmissão
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {multimediaRolesList.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleRole("multimedia", r.id)}
                          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            formData.roles.multimedia?.includes(r.id)
                              ? "bg-purple-600 text-white border-purple-600 shadow-md"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Secretaria */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Secretaria & Administrativo
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {secretariatRolesList.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleRole("secretariat", r.id)}
                          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            formData.roles.secretariat?.includes(r.id)
                              ? "bg-slate-800 text-white border-slate-800 shadow-md"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal Footer / Actions */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-5 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    id="cancel-edit-btn"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-800/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                    id="save-profile-btn"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Salvar Alterações</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unlink Church Confirmation Modal */}
      <AnimatePresence>
        {isUnlinkModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              id="unlink-church-modal"
            >
              <div className="p-6 md:p-8 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-7 h-7" />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-xl font-display font-black text-slate-900 dark:text-slate-100">
                    Desvincular da Igreja?
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Você tem certeza de que deseja desvincular{" "}
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {musician.name}
                    </span>{" "}
                    da congregação{" "}
                    <span className="font-bold text-blue-800 dark:text-blue-400">
                      {churchName}
                    </span>
                    ?
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-left">
                    Ao desvincular, o integrante perderá o vínculo com esta igreja, não constará mais nas escalas deste ministério e ficará disponível para ser vinculado novamente.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={unlinking}
                    onClick={() => setIsUnlinkModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer text-center"
                    id="cancel-unlink-btn"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={unlinking}
                    onClick={handleUnlinkChurch}
                    className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-rose-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    id="confirm-unlink-btn"
                  >
                    {unlinking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Desvinculando...</span>
                      </>
                    ) : (
                      <>
                        <UserMinus className="w-4 h-4" />
                        <span>Sim, Desvincular</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-slate-800 dark:text-slate-100 font-bold">{value}</p>
      </div>
    </div>
  );
}

