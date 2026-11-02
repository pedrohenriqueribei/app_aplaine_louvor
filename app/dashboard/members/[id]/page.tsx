"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  Timestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "motion/react";
import {
  formatPhone,
  formatBirthDate,
  parseBirthDateToTimestamp,
  formatBirthDateInput,
  formatScheduleDate,
  parseScheduleDateToTime,
} from "@/lib/utils";
import { BallerinaIcon } from "@/components/BallerinaIcon";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { ProfilePhotoCropModal } from "@/components/ProfilePhotoCropModal";
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
  Sparkles,
  Cake,
  Camera,
  Copy,
  ExternalLink,
  Church,
  Award,
  MessageSquare,
  Clock,
  Layers,
  Heart,
} from "lucide-react";

interface Musician {
  uid: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string | null;
  dataNascimento?: Date | Timestamp | string | null;
  instruments: string[];
  vocalRange: string;
  level?: string;
  churchId?: string;
  role?: string;
  roles?: {
    worship?: string[];
    secretariat?: string[];
    multimedia?: string[];
    dance?: string[];
  };
  danceStyles?: string[];
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
  const { user, isSuperAdmin, userData, updateUserProfilePhoto } = useAuth();
  const [musician, setMusician] = useState<Musician | null>(null);
  const [churchName, setChurchName] = useState<string>("---");
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [lastScheduleDate, setLastScheduleDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "songs">("info");
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customInstrument, setCustomInstrument] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  // Unlink Church State
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dataNascimento: "",
    instruments: [] as string[],
    vocalRange: "",
    level: "",
    churchId: "",
    status: "active" as "active" | "inactive",
    roles: {
      worship: [] as string[],
      multimedia: [] as string[],
      secretariat: [] as string[],
      dance: [] as string[],
    },
    danceStyles: [] as string[],
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
    { id: "main_minister", label: "Ministro Principal" },
    { id: "vocalist", label: "Vocalista" },
    { id: "musician", label: "Músico / Instrumentista" },
    { id: "leader", label: "Líder de Louvor (Legado)" },
    { id: "instrumentist", label: "Instrumentista / Vocal (Legado)" },
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

  const danceRolesList = [
    { id: "dance_leader", label: "Líder de Dança" },
    { id: "dancer", label: "Dançarino(a)" },
    { id: "choreographer", label: "Coreógrafo(a)" },
    { id: "costume_manager", label: "Figurino & Acessórios" },
    { id: "rehearsal_director", label: "Diretor(a) de Ensaio" },
  ];

  const danceStylesList = [
    "Ballet Clássico / Adoração",
    "Dança Contemporânea",
    "Dança Profética / Espontâneo",
    "Dança com Fitas / Estandartes",
    "Hip-Hop / Street Gospel",
    "Expressão Corporal",
  ];

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
            try {
              const churchRef = doc(db, "churches", data.churchId);
              const churchSnap = await getDoc(churchRef);
              if (churchSnap.exists()) {
                setChurchName(churchSnap.data().name);
              }
            } catch (err) {
              console.warn("Could not load church details:", err);
            }
          }

          // Fetch songs for this user
          try {
            const songsQuery = query(
              collection(db, "songs"),
              where("ownerId", "==", id),
              orderBy("createdAt", "desc"),
            );
            const songsSnap = await getDocs(songsQuery);
            setSongs(
              songsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Song),
            );
          } catch (err) {
            console.warn("Could not load user songs:", err);
          }

          // Fetch bands this user is part of
          try {
            const bandsQuery = query(
              collection(db, "bands"),
              where("memberIds", "array-contains", id),
            );
            const bandsSnap = await getDocs(bandsQuery);
            setBands(
              bandsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Band),
            );
          } catch (err) {
            console.warn("Could not load user bands:", err);
          }

          // Fetch last schedule for this user
          try {
            const schedQuery = data.churchId
              ? query(collection(db, "schedules"), where("churchId", "==", data.churchId))
              : collection(db, "schedules");
            const schedSnap = await getDocs(schedQuery);
            let latestDateStr = "";
            let latestTime = 0;
            schedSnap.docs.forEach((docSnap) => {
              const sData = docSnap.data();
              const dateStr = sData.date;
              if (!dateStr) return;
              const hasUser =
                (Array.isArray(sData.members) && sData.members.includes(id)) ||
                (sData.roles &&
                  typeof sData.roles === "object" &&
                  Object.values(sData.roles).some(
                    (v) => v === id || (Array.isArray(v) && v.includes(id))
                  ));
              if (hasUser) {
                const sTime = parseScheduleDateToTime(dateStr);
                if (sTime > latestTime) {
                  latestTime = sTime;
                  latestDateStr = dateStr;
                }
              }
            });
            if (latestDateStr) {
              setLastScheduleDate(formatScheduleDate(latestDateStr));
            }
          } catch (err) {
            console.warn("Could not load user schedules:", err);
          }
        }

        // Fetch churches list for dropdown
        try {
          const churchesQuery = await getDocs(collection(db, "churches"));
          setChurches(
            churchesQuery.docs.map((d) => ({
              id: d.id,
              name: d.data().name || d.id,
            })),
          );
        } catch (err) {
          console.warn("Could not load churches dropdown:", err);
        }
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
      dataNascimento: formatBirthDate(musician.dataNascimento),
      instruments: musician.instruments || [],
      vocalRange: musician.vocalRange || "",
      level: musician.level || "",
      churchId: musician.churchId || "",
      status: musician.status || "active",
      roles: {
        worship: musician.roles?.worship || [],
        multimedia: musician.roles?.multimedia || [],
        secretariat: musician.roles?.secretariat || [],
        dance: musician.roles?.dance || [],
      },
      danceStyles: musician.danceStyles || [],
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
    dept: "worship" | "multimedia" | "secretariat" | "dance",
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

  const toggleDanceStyle = (style: string) => {
    setFormData((prev) => {
      const current = prev.danceStyles || [];
      const exists = current.includes(style);
      return {
        ...prev,
        danceStyles: exists
          ? current.filter((s) => s !== style)
          : [...current, style],
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
      let danceRoles = formData.roles.dance || [];
      if (danceRoles.includes("dance_leader") && !danceRoles.includes("leader")) {
        danceRoles = [...danceRoles, "leader"];
      }

      const finalRoles = {
        worship: formData.roles.worship || [],
        multimedia: formData.roles.multimedia || [],
        secretariat: formData.roles.secretariat || [],
        dance: danceRoles,
      };

      const birthDateTimestamp = parseBirthDateToTimestamp(formData.dataNascimento);

      const payload: any = {
        uid: musician.uid || (id as string),
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim(),
        dataNascimento: birthDateTimestamp,
        instruments: formData.instruments,
        vocalRange: formData.vocalRange,
        level: formData.level,
        churchId: formData.churchId,
        status: formData.status,
        roles: finalRoles,
        danceStyles: formData.danceStyles || [],
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
        const depts = ["worship", "multimedia", "secretariat", "dance"];
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
    musician.roles?.worship?.includes("main_minister") ||
    musician.roles?.worship?.includes("mainMinister") ||
    musician.roles?.worship?.includes("leader") ||
    musician.roles?.multimedia?.includes("leader") ||
    musician.roles?.secretariat?.includes("leader") ||
    musician.roles?.dance?.includes("leader") ||
    musician.roles?.dance?.includes("dance_leader");
  const isMultimedia = (musician.roles?.multimedia?.length ?? 0) > 0;
  const isSecretariat = (musician.roles?.secretariat?.length ?? 0) > 0;
  const isDance = (musician.roles?.dance?.length ?? 0) > 0 || (musician.danceStyles?.length ?? 0) > 0;

  // Check if the current authenticated user has a leader profile
  const isCurrentUserLeader = Boolean(
    isSuperAdmin ||
      user?.email === "pedrohenriqueribei@gmail.com" ||
      userData?.role === "líder" ||
      userData?.roles?.worship?.includes("leader") ||
      userData?.roles?.multimedia?.includes("leader") ||
      userData?.roles?.multimedia?.includes("multimedia_leader") ||
      userData?.roles?.secretariat?.includes("leader") ||
      userData?.roles?.dance?.includes("leader") ||
      userData?.roles?.dance?.includes("dance_leader"),
  );

  let displayRole = "Instrumentista Integrante";
  let displayRoleShort = "Instrumentista";
  let shieldColor = "text-blue-400";

  if (isLeader) {
    displayRole = "Líder de Ministério";
    displayRoleShort = "Líder";
    shieldColor = "text-amber-500";
  } else if (isDance && !isMultimedia && !isSecretariat && !musician.instruments?.length && !musician.vocalRange) {
    displayRole = "Ministério de Dança";
    displayRoleShort = "Dança";
    shieldColor = "text-rose-500";
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

  const hasWorship = Boolean(
    (musician.roles?.worship && musician.roles.worship.length > 0) ||
    (musician.instruments && musician.instruments.length > 0) ||
    (musician.vocalRange && musician.vocalRange.trim().length > 0)
  );
  const hasDance = Boolean(
    (musician.roles?.dance && musician.roles.dance.length > 0) ||
    (musician.danceStyles && musician.danceStyles.length > 0)
  );
  const hasMultimedia = Boolean(
    musician.roles?.multimedia && musician.roles.multimedia.length > 0
  );
  const hasSecretariat = Boolean(
    musician.roles?.secretariat && musician.roles.secretariat.length > 0
  );

  const cleanPhone = musician.phone ? musician.phone.replace(/\D/g, "") : "";
  const whatsappUrl =
    cleanPhone.length >= 10
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
          `Olá, ${musician.name}! Tudo bem?`
        )}`
      : null;

  const memberSinceFormatted = musician.createdAt?.toDate
    ? musician.createdAt.toDate().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : typeof musician.createdAt === "string"
    ? musician.createdAt
    : "---";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 px-4 sm:px-6 font-sans">
      {/* Top Header Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-800/80 shadow-xs transition-all text-xs font-bold group cursor-pointer active:scale-95 w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar para Integrantes</span>
        </button>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs w-fit text-xs font-bold text-slate-600 dark:text-slate-300">
          <span
            className={`w-2 h-2 rounded-full ${
              musician.status === "active"
                ? "bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse"
                : "bg-slate-300 dark:bg-slate-600"
            }`}
          />
          <span>{musician.status === "active" ? "Membro Ativo" : "Membro Inativo"}</span>
        </div>
      </div>

      {/* Main Profile Cover & Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden"
      >
        {/* Architectural Cover Header */}
        <div className="relative h-44 sm:h-52 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 overflow-hidden">
          {/* Subtle Ambient Lights */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-0 left-0 w-64 h-64 bg-slate-800/20 rounded-full blur-2xl pointer-events-none" />

          {/* Micro Grid Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:18px_18px] opacity-60" />

          {/* Top Right Church Watermark */}
          <div className="absolute top-5 right-6 flex items-center gap-2 bg-white/10 dark:bg-black/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-white/90 text-[11px] font-bold">
            <Church className="w-3.5 h-3.5 text-blue-300" />
            <span className="truncate max-w-[200px]">{musician.churchId ? churchName : "Sem Congregação"}</span>
          </div>
        </div>

        {/* Identity & Main Controls Strip */}
        <div className="relative px-6 sm:px-10 pb-8 sm:pb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 sm:-mt-20 mb-6">
            {/* Avatar & Title Block */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* Elevated Avatar */}
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] p-1.5 bg-white dark:bg-slate-900 shadow-2xl ring-4 ring-white dark:ring-slate-900 shrink-0 flex items-center justify-center group">
                <UserAvatar
                  photoURL={
                    musician.photoURL ||
                    (id === user?.uid ? userData?.photoURL || user?.photoURL : null)
                  }
                  name={musician.name}
                  size="2xl"
                  className="w-full h-full rounded-[1.6rem]"
                  editable={Boolean(id === user?.uid || isSuperAdmin || isCurrentUserLeader)}
                  onEditClick={() => setIsPhotoModalOpen(true)}
                  onClick={() =>
                    (id === user?.uid || isSuperAdmin || isCurrentUserLeader) &&
                    setIsPhotoModalOpen(true)
                  }
                  title={
                    id === user?.uid || isSuperAdmin || isCurrentUserLeader
                      ? "Clique para alterar a foto de perfil"
                      : musician.name
                  }
                />

                {Boolean(id === user?.uid || isSuperAdmin || isCurrentUserLeader) && (
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="absolute inset-1.5 rounded-[1.6rem] bg-slate-950/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1 cursor-pointer"
                  >
                    <Camera className="w-5 h-5 text-white" />
                    <span>Trocar Foto</span>
                  </button>
                )}
              </div>

              {/* Name & Role Tagline */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                    <span>{musician.name}</span>
                    <VerifiedBadge
                      verified={Boolean(
                        (musician as any).emailVerified ||
                          (musician as any).email_verified ||
                          (user?.uid === id &&
                            (userData?.emailVerified ||
                              userData?.email_verified ||
                              user?.emailVerified))
                      )}
                      size="md"
                    />
                  </h1>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap text-sm">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Shield className={`w-4 h-4 ${shieldColor}`} />
                    <span>{displayRole}</span>
                  </span>

                  <span className="text-slate-300 dark:text-slate-700">·</span>

                  <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                    {musician.churchId ? churchName : "Sem igreja vinculada"}
                  </span>
                </div>

                {/* Active Department Tags */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {hasWorship && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                      <Music className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      Louvor
                    </span>
                  )}
                  {hasDance && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40">
                      <BallerinaIcon className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      Dança
                    </span>
                  )}
                  {hasMultimedia && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/40">
                      <Waves className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      Multimídia
                    </span>
                  )}
                  {hasSecretariat && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                      <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      Secretaria
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {Boolean(id === user?.uid || isSuperAdmin || isCurrentUserLeader) && (
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs text-xs"
                  title="Alterar ou recortar foto de perfil"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>Foto</span>
                </button>
              )}

              <button
                id="edit-profile-btn"
                onClick={handleOpenEdit}
                className="bg-blue-800 hover:bg-blue-900 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md shadow-blue-800/20 text-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar Perfil</span>
              </button>

              {isCurrentUserLeader && (
                <button
                  id="unlink-church-btn"
                  onClick={() => setIsUnlinkModalOpen(true)}
                  disabled={!musician.churchId}
                  className={`px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 text-xs border ${
                    musician.churchId
                      ? "bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 cursor-pointer"
                      : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60"
                  }`}
                  title={
                    musician.churchId
                      ? "Desvincular este integrante da igreja"
                      : "Este integrante não possui igreja vinculada"
                  }
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desvincular</span>
                </button>
              )}
            </div>
          </div>

          {/* Email Verification Banner */}
          {user?.uid === id &&
            !Boolean(
              (musician as any).emailVerified ||
                (musician as any).email_verified ||
                userData?.emailVerified ||
                userData?.email_verified ||
                user?.emailVerified
            )}
          {user?.uid === id &&
            !Boolean(
              (musician as any).emailVerified ||
                (musician as any).email_verified ||
                userData?.emailVerified ||
                userData?.email_verified ||
                user?.emailVerified
            ) && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Seu endereço de e-mail ainda não foi validado. Mantenha sua conta protegida confirmando o código.
                  </span>
                </div>
                <Link
                  href={`/verify-email?email=${encodeURIComponent(
                    musician.email || user?.email || ""
                  )}&userId=${user?.uid || id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all text-center shrink-0 w-fit"
                >
                  Confirmar E-mail
                </Link>
              </div>
            )}

          {/* Feedback Alert for Profile Actions */}
          {feedback && !isEditModalOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 ${
                feedback.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0" />
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

          {/* Metrics & Vitals Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1 flex items-center gap-1.5">
                <Church className="w-3 h-3 text-blue-600" />
                Congregação
              </span>
              <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                {musician.churchId ? churchName : "Sem igreja"}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1 flex items-center gap-1.5">
                <Award className="w-3 h-3 text-amber-500" />
                Nível Técnico
              </span>
              <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 capitalize">
                {musician.level || "Integrado"}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-rose-500" />
                Última Escala
              </span>
              <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                {lastScheduleDate || "Sem registros"}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1 flex items-center gap-1.5">
                <Music className="w-3 h-3 text-indigo-500" />
                Repertório Pessoal
              </span>
              <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
                {songs.length} {songs.length === 1 ? "música" : "músicas"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200/60 dark:border-slate-700/60">
        <button
          onClick={() => setActiveTab("info")}
          className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "info"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Informações & Competências</span>
        </button>
        <button
          onClick={() => setActiveTab("songs")}
          className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "songs"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Music className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Repertório de Músicas</span>
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
              activeTab === "songs"
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300"
                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
            }`}
          >
            {songs.length}
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "info" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Personal Data & Contacts (1 col) */}
          <div className="space-y-6 lg:col-span-1">
            {/* Contact Card */}
            <div className="p-6 sm:p-7 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  Contato & Dados
                </h3>
              </div>

              <div className="space-y-4">
                {/* Email Item */}
                <InfoItem
                  icon={Mail}
                  label="E-mail"
                  value={musician.email || "Não informado"}
                  copyValue={musician.email || undefined}
                  onCopy={() => handleCopy(musician.email || "", "email")}
                  copied={copiedKey === "email"}
                />

                {/* Phone Item */}
                <InfoItem
                  icon={Phone}
                  label="Telefone / WhatsApp"
                  value={musician.phone ? formatPhone(musician.phone) : "Não informado"}
                  copyValue={musician.phone || undefined}
                  onCopy={() => handleCopy(musician.phone || "", "phone")}
                  copied={copiedKey === "phone"}
                  action={
                    whatsappUrl
                      ? () => window.open(whatsappUrl, "_blank", "noopener,noreferrer")
                      : undefined
                  }
                  actionIcon={MessageSquare}
                  actionTooltip="Conversar no WhatsApp"
                />

                {/* Birthdate Item */}
                <InfoItem
                  icon={Cake}
                  label="Data de Nascimento"
                  value={
                    musician.dataNascimento
                      ? `${formatBirthDate(musician.dataNascimento)} (Aniversário)`
                      : "Não informada"
                  }
                />

                {/* Member Since Item */}
                <InfoItem
                  icon={Clock}
                  label="Membro Desde"
                  value={memberSinceFormatted}
                />
              </div>
            </div>

            {/* Bands & Ensembles Card */}
            {bands.length > 0 && (
              <div className="p-6 sm:p-7 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Bandas & Equipes
                </h3>
                <div className="space-y-2">
                  {bands.map((band) => (
                    <div
                      key={band.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Music className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {band.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                        Integrante
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Ministry Capabilities & Skills (2 cols) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Worship & Music Capabilities */}
            {hasWorship && (
              <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Music className="w-4 h-4 text-blue-600" />
                    Ministério de Louvor & Música
                  </h3>
                  {musician.level && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                      Nível {musician.level}
                    </span>
                  )}
                </div>

                {/* Instruments */}
                {musician.instruments && musician.instruments.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Instrumentos que Toca
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {musician.instruments.map((inst) => (
                        <div
                          key={inst}
                          className="flex items-center gap-2 px-3.5 py-2 bg-blue-50/60 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-900/40 shadow-2xs"
                        >
                          <Music className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>{inst}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vocal Range */}
                {musician.vocalRange && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Extensão Vocal
                    </span>
                    <div className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 rounded-2xl text-xs font-bold border border-indigo-100 dark:border-indigo-900/40">
                      <Mic2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{musician.vocalRange}</span>
                    </div>
                  </div>
                )}

                {/* Worship Roles */}
                {musician.roles?.worship && musician.roles.worship.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Funções Cadastradas no Louvor
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {musician.roles.worship.map((roleId) => {
                        const found = worshipRolesList.find((r) => r.id === roleId);
                        const label = found ? found.label : roleId;
                        return (
                          <span
                            key={roleId}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200/80 dark:border-slate-700"
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dance Ministry Capabilities */}
            {hasDance && (
              <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <BallerinaIcon className="w-4 h-4 text-rose-600" />
                    Ministério de Dança
                  </h3>
                </div>

                {/* Dance Roles */}
                {musician.roles?.dance && musician.roles.dance.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Cargos e Atuações
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {musician.roles.dance.map((roleId) => {
                        const found = danceRolesList.find((r) => r.id === roleId);
                        const label = found
                          ? found.label
                          : roleId === "leader"
                          ? "Líder de Dança"
                          : roleId;
                        return (
                          <div
                            key={roleId}
                            className="flex items-center gap-2 px-3.5 py-2 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-900/40"
                          >
                            <BallerinaIcon className="w-3.5 h-3.5 text-rose-500" />
                            <span>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dance Styles */}
                {musician.danceStyles && musician.danceStyles.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                      <span>Estilos Praticados</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {musician.danceStyles.map((style) => (
                        <span
                          key={style}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700"
                        >
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Multimedia Ministry Capabilities */}
            {hasMultimedia && (
              <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Waves className="w-4 h-4 text-purple-600" />
                    Multimídia & Transmissão
                  </h3>
                </div>

                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Competências Operacionais
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {musician.roles?.multimedia?.map((skill) => {
                      const translated =
                        skill === "audio_operator" || skill === "audio"
                          ? "Operador de Áudio"
                          : skill === "pc_operator" || skill === "projection"
                          ? "Operador de PC / Projeção"
                          : skill === "social_media_operator" || skill === "social_media_manager"
                          ? "Redes Sociais"
                          : skill === "camera_operator" || skill === "camera" || skill === "video"
                          ? "Operador de Câmera"
                          : skill === "photography_operator" || skill === "photography"
                          ? "Fotografia"
                          : skill === "multimedia_leader"
                          ? "Líder de Multimídia"
                          : skill.charAt(0).toUpperCase() + skill.slice(1);

                      return (
                        <div
                          key={skill}
                          className="flex items-center gap-2 px-3.5 py-2 bg-purple-50/70 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 rounded-xl text-xs font-bold border border-purple-100 dark:border-purple-900/40"
                        >
                          <Waves className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>{translated}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Secretariat Capabilities */}
            {hasSecretariat && (
              <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  Secretaria & Administração
                </h3>
                <div className="flex flex-wrap gap-2">
                  {musician.roles?.secretariat?.map((roleId) => (
                    <span
                      key={roleId}
                      className="px-3.5 py-2 bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold border border-amber-200/80 dark:border-amber-900/40"
                    >
                      {roleId === "admin" ? "Secretário / Administrador" : roleId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state if no ministries registered */}
            {!hasWorship && !hasDance && !hasMultimedia && !hasSecretariat && (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                <User className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  Nenhuma atribuição ministerial cadastrada
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                  Clique em &ldquo;Editar Perfil&rdquo; acima para definir os departamentos, instrumentos e competências deste integrante.
                </p>
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="mt-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Adicionar Competências
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab 2: Songs / Repertoire */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-black text-slate-900 dark:text-slate-100">
                Repertório Individual
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Músicas cadastradas ou sugeridas por {musician.name}
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
              Total: {songs.length}
            </span>
          </div>

          {songs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-lg transition-all group flex flex-col justify-between gap-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
                        <Music className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                          {song.title}
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 font-medium">
                          {song.artist}
                        </p>
                      </div>
                    </div>

                    {song.link && (
                      <a
                        href={song.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all shrink-0 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200/60 dark:border-slate-700"
                        title="Ouvir no YouTube"
                      >
                        <Youtube className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[11px] font-mono font-bold text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg border border-blue-100 dark:border-blue-900/30">
                      Tom: {song.key}
                    </span>

                    {song.link && (
                      <a
                        href={song.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                      >
                        <span>Acessar</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                <Music className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                Nenhuma música associada a este integrante
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                As músicas adicionadas pelo integrante através do módulo de Repertório aparecerão listadas aqui.
              </p>
            </div>
          )}
        </div>
      )}

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
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Cake className="w-3.5 h-3.5 text-pink-500" />
                          <span>Data de Nascimento (DD/MM)</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
                      </div>
                      <input
                        type="text"
                        maxLength={5}
                        value={formData.dataNascimento}
                        onChange={(e) =>
                          setFormData({ ...formData, dataNascimento: formatBirthDateInput(e.target.value) })
                        }
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:border-blue-800 dark:focus:border-blue-500 outline-none transition-all"
                        placeholder="DD/MM (apenas dia e mês)"
                        id="input-member-birthdate"
                      />
                      <p className="text-[10px] text-slate-400">Ex: 15/04 (não é necessário informar o ano)</p>
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

                  {/* Dança */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <BallerinaIcon className="w-4 h-4 text-rose-600" />
                      <span>Ministério de Dança</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {danceRolesList.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleRole("dance", r.id)}
                          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            formData.roles.dance?.includes(r.id)
                              ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-300"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                        <span>Estilos & Habilidades Praticadas</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {danceStylesList.map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => toggleDanceStyle(st)}
                            className={`py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                              formData.danceStyles?.includes(st)
                                ? "bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-950/40 dark:text-rose-300 font-black shadow-xs"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-rose-300"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
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

      {/* Modal de Envio e Recorte de Foto de Perfil */}
      {Boolean(id === user?.uid || isSuperAdmin || isCurrentUserLeader) && (
        <ProfilePhotoCropModal
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          currentPhotoURL={musician.photoURL || (id === user?.uid ? (userData?.photoURL || user?.photoURL) : null)}
          userName={musician.name}
          onSavePhoto={async (newPhotoURL) => {
            await updateUserProfilePhoto(newPhotoURL, id as string);
            setMusician((prev) => (prev ? { ...prev, photoURL: newPhotoURL } : prev));
          }}
        />
      )}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  copyValue,
  onCopy,
  copied,
  action,
  actionIcon: ActionIcon,
  actionTooltip,
}: {
  icon: any;
  label: string;
  value: string;
  copyValue?: string;
  onCopy?: () => void;
  copied?: boolean;
  action?: () => void;
  actionIcon?: any;
  actionTooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all group">
      <div className="flex items-center gap-3.5 min-w-0 pr-2">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">
            {label}
          </p>
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
            {value}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {action && ActionIcon && (
          <button
            type="button"
            onClick={action}
            title={actionTooltip || "Acessar"}
            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all active:scale-95 cursor-pointer"
          >
            <ActionIcon className="w-3.5 h-3.5" />
          </button>
        )}

        {copyValue && onCopy && (
          <button
            type="button"
            onClick={onCopy}
            title={copied ? "Copiado!" : "Copiar"}
            className={`p-1.5 rounded-lg transition-all active:scale-95 cursor-pointer ${
              copied
                ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                : "bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200/60 dark:border-slate-700 shadow-2xs"
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

