"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Church,
  MapPin,
  User as PastorIcon,
  Users,
  Music,
  Mic2,
  Shield,
  Calendar,
  Mail,
  Phone,
  ExternalLink,
  Waves,
  Copy,
  Check,
  Clock,
  Plus,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  LayoutGrid,
  Monitor,
  Briefcase,
  Sparkles,
  Power,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { BallerinaIcon } from "@/components/BallerinaIcon";

interface Musician {
  uid: string;
  name: string;
  email: string;
  instrument?: string;
  instruments?: string[];
  vocalRange?: string;
  level?: string;
  roles?: {
    worship?: string[];
    multimedia?: string[];
    secretariat?: string[];
    dance?: string[];
  };
  status: "active" | "inactive";
}

interface Band {
  id: string;
  name: string;
  churchId: string;
  memberIds: string[];
  leaderId: string;
}

interface ChurchType {
  id: string;
  name: string;
  address: string;
  pastor: string;
  worshipMinistryName?: string;
  worshipMinistryAcronym?: string;
}

interface ServiceType {
  id: string;
  churchId: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  status?: "active" | "inactive";
}

export default function ChurchDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { userData, isSuperAdmin, user } = useAuth();
  const [church, setChurch] = useState<ChurchType | null>(null);
  const [members, setMembers] = useState<Musician[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isMinistryModalOpen, setIsMinistryModalOpen] = useState(false);
  const [selectedMinistry, setSelectedMinistry] = useState<
    "louvor" | "multimidia" | "secretaria" | null
  >(null);
  const [isEditingWorship, setIsEditingWorship] = useState(false);
  const [worshipEditData, setWorshipEditData] = useState({
    name: "",
    acronym: "",
  });
  const [savingWorship, setSavingWorship] = useState(false);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceType | null>(null);
  const [isDeleteServiceModalOpen, setIsDeleteServiceModalOpen] =
    useState(false);
  const [deletingService, setDeletingService] = useState(false);
  const [isBandModalOpen, setIsBandModalOpen] = useState(false);
  const [isBandDetailOpen, setIsBandDetailOpen] = useState(false);
  const [selectedBand, setSelectedBand] = useState<Band | null>(null);
  const [savingService, setSavingService] = useState(false);
  const [togglingServiceId, setTogglingServiceId] = useState<string | null>(null);
  const [serviceStatusFilter, setServiceStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [ministryFilter, setMinistryFilter] = useState<
    "all" | "louvor" | "multimidia" | "danca" | "secretaria"
  >("all");
  const [savingBand, setSavingBand] = useState(false);
  const [bandName, setBandName] = useState("");
  const [serviceFormData, setServiceFormData] = useState<{
    name: string;
    description: string;
    startTime: string;
    endTime: string;
    dayOfWeek: string;
    status: "active" | "inactive";
  }>({
    name: "",
    description: "",
    startTime: "",
    endTime: "",
    dayOfWeek: "Domingo",
    status: "active",
  });

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/register?churchId=${id}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Church
        const churchDoc = await getDoc(doc(db, "churches", id as string));
        if (churchDoc.exists()) {
          setChurch({ ...churchDoc.data() } as ChurchType);
        }

        // 1. Fetch users directly registered under this churchId
        const usersQ = query(
          collection(db, "users"),
          where("churchId", "==", id),
        );
        const usersSnap = await getDocs(usersQ);
        
        const membersMap = new Map<string, any>();
        usersSnap.docs.forEach((docSnap) => {
          membersMap.set(docSnap.id, {
            uid: docSnap.id,
            ...docSnap.data()
          });
        });

        // 2. Fetch users and nested roles from department members subcollections
        const depts = ["worship", "multimedia", "secretariat", "dance"];
        for (const dept of depts) {
          try {
            const deptSnap = await getDocs(
              collection(db, "churches", id as string, "departments", dept, "members")
            );
            for (const docSnap of deptSnap.docs) {
              const memberUid = docSnap.id;
              const deptMemberData = docSnap.data();
              const subroles = deptMemberData.roles || [];
              
              if (!membersMap.has(memberUid)) {
                // Fetch user profile for this department member
                const userProfileSnap = await getDoc(doc(db, "users", memberUid));
                if (userProfileSnap.exists()) {
                  const uData = userProfileSnap.data();
                  membersMap.set(memberUid, {
                    uid: memberUid,
                    ...uData,
                    roles: {
                      ...(uData.roles || {}),
                      [dept]: subroles
                    }
                  });
                }
              } else {
                // Update roles with subcollection values if found
                const existingUser = membersMap.get(memberUid);
                existingUser.roles = {
                  ...(existingUser.roles || {}),
                  [dept]: Array.from(new Set([...(existingUser.roles?.[dept] || []), ...subroles]))
                };
                membersMap.set(memberUid, existingUser);
              }
            }
          } catch (err) {
            console.error(`Error loading department ${dept} members in church page:`, err);
          }
        }

        const membersData = Array.from(membersMap.values()) as Musician[];

        // Ensure members are sorted by name for UI mapping simplicity
        membersData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setMembers(membersData);

        // Fetch Services
        const servicesQ = query(
          collection(db, "services"),
          where("churchId", "==", id),
        );
        const servicesSnap = await getDocs(servicesQ);
        setServices(
          servicesSnap.docs.map(
            (doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                status: data.status === "inactive" ? "inactive" : "active",
              } as ServiceType;
            },
          ),
        );

        // Fetch Bands
        const bandsQ = query(
          collection(db, "bands"),
          where("churchId", "==", id),
        );
        const bandsSnap = await getDocs(bandsQ);
        setBands(
          bandsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Band),
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `churches/${id}`);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchData();
  }, [id]);

  const handleSaveBand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bandName.trim()) return;
    setSavingBand(true);
    try {
      const docRef = await addDoc(collection(db, "bands"), {
        name: bandName,
        churchId: id,
        memberIds: [],
        leaderId: userData?.uid || "",
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
      });
      const newBand: Band = {
        id: docRef.id,
        name: bandName,
        churchId: id as string,
        memberIds: [],
        leaderId: userData?.uid || "",
      };
      setBands([...bands, newBand]);
      setBandName("");
      setIsBandModalOpen(false);
    } catch (err: any) {
      alert("Erro ao salvar banda: " + err.message);
    } finally {
      setSavingBand(false);
    }
  };

  const handleUpdateBandMembers = async (
    bandId: string,
    newMemberIds: string[],
  ) => {
    try {
      const bandRef = doc(db, "bands", bandId);
      await updateDoc(bandRef, { memberIds: newMemberIds });
      setBands(
        bands.map((b) =>
          b.id === bandId ? { ...b, memberIds: newMemberIds } : b,
        ),
      );
      if (selectedBand?.id === bandId) {
        setSelectedBand({ ...selectedBand, memberIds: newMemberIds });
      }
    } catch (err: any) {
      alert("Erro ao atualizar integrantes da banda: " + err.message);
    }
  };

  const canManageServices = Boolean(
    isSuperAdmin ||
      user?.email === "pedrohenriqueribei@gmail.com" ||
      ((userData?.roles?.worship?.includes("leader") ||
        userData?.roles?.multimedia?.includes("leader") ||
        userData?.roles?.multimedia?.includes("multimedia_leader") ||
        userData?.roles?.secretariat?.includes("leader") ||
        userData?.role === "líder") &&
        (userData?.churchId === id || isSuperAdmin)),
  );

  const handleOpenCreateService = () => {
    setEditingService(null);
    setServiceFormData({
      name: "",
      description: "",
      startTime: "",
      endTime: "",
      dayOfWeek: "Domingo",
      status: "active",
    });
    setIsServiceModalOpen(true);
  };

  const handleOpenEditService = (service: ServiceType) => {
    setEditingService(service);
    setServiceFormData({
      name: service.name,
      description: service.description || "",
      startTime: service.startTime,
      endTime: service.endTime,
      dayOfWeek: service.dayOfWeek,
      status: service.status === "inactive" ? "inactive" : "active",
    });
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingService(true);
    try {
      if (editingService) {
        const serviceRef = doc(db, "services", editingService.id);
        await updateDoc(serviceRef, {
          ...serviceFormData,
          churchId: id,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
        setServices((prev) =>
          prev.map((s) =>
            s.id === editingService.id ? { ...s, ...serviceFormData } : s,
          ),
        );
      } else {
        const docRef = await addDoc(collection(db, "services"), {
          ...serviceFormData,
          churchId: id,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
        setServices((prev) => [
          ...prev,
          { id: docRef.id, churchId: id as string, ...serviceFormData },
        ]);
      }
      setIsServiceModalOpen(false);
      setEditingService(null);
    } catch (err: any) {
      console.error("Error saving service:", err);
      handleFirestoreError(
        err,
        editingService ? OperationType.UPDATE : OperationType.CREATE,
        editingService ? `services/${editingService.id}` : "services",
      );
      alert("Erro ao salvar culto: " + err.message);
    } finally {
      setSavingService(false);
    }
  };

  const handleToggleServiceStatus = async (service: ServiceType, targetStatus?: "active" | "inactive") => {
    if (!user || !canManageServices || togglingServiceId) return;
    const currentStatus = service.status === "inactive" ? "inactive" : "active";
    const nextStatus = targetStatus ?? (currentStatus === "active" ? "inactive" : "active");
    if (nextStatus === currentStatus) return;

    setTogglingServiceId(service.id);
    // Optimistic UI update
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, status: nextStatus } : s)),
    );

    try {
      const serviceRef = doc(db, "services", service.id);
      await updateDoc(serviceRef, {
        status: nextStatus,
        churchId: service.churchId || id,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    } catch (err: any) {
      console.error("Error toggling service status:", err);
      // Revert optimistic update
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, status: currentStatus } : s)),
      );
      handleFirestoreError(err, OperationType.UPDATE, `services/${service.id}`);
      alert("Erro ao alterar status do culto: " + err.message);
    } finally {
      setTogglingServiceId(null);
    }
  };

  const handleOpenDeleteService = (service: ServiceType) => {
    setServiceToDelete(service);
    setIsDeleteServiceModalOpen(true);
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;
    setDeletingService(true);
    try {
      await deleteDoc(doc(db, "services", serviceToDelete.id));
      setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      setIsDeleteServiceModalOpen(false);
      setServiceToDelete(null);
    } catch (err: any) {
      console.error("Error deleting service:", err);
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `services/${serviceToDelete.id}`,
      );
      alert("Erro ao excluir culto: " + err.message);
    } finally {
      setDeletingService(false);
    }
  };

  const handleUpdateWorshipInfo = async () => {
    if (!church || !user) return;
    setSavingWorship(true);
    try {
      const churchRef = doc(db, "churches", id as string);
      await updateDoc(churchRef, {
        worshipMinistryName: worshipEditData.name,
        worshipMinistryAcronym: worshipEditData.acronym,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      setChurch({
        ...church,
        worshipMinistryName: worshipEditData.name,
        worshipMinistryAcronym: worshipEditData.acronym,
      });
      setIsEditingWorship(false);
    } catch (err: any) {
      alert("Erro ao atualizar informações: " + err.message);
    } finally {
      setSavingWorship(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-800 rounded-full animate-spin"></div>
          <div className="absolute inset-x-0 top-20 text-center text-xs font-black text-slate-400 uppercase tracking-widest">
            Carregando...
          </div>
        </div>
      </div>
    );
  }

  if (!church) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
        <Church className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
          Igreja não encontrada
        </h2>
        <button
          onClick={() => router.back()}
          className="text-blue-800 dark:text-blue-400 font-bold flex items-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
      </div>
    );
  }

  const getMemberWorshipRoles = (member: any) => {
    const badges: string[] = [];
    const deptRoles = member.roles?.worship || [];

    if (deptRoles.includes("leader")) {
      badges.push("Líder");
    }

    const isVocal = member.vocalRange || (member.instruments && member.instruments.includes("Voz")) || member.instrument === "Voz";
    const hasInstruments = (member.instruments && member.instruments.filter((i: string) => i !== "Voz").length > 0) || (member.instrument && member.instrument !== "Voz");

    if (isVocal) {
      if (member.vocalRange) {
        badges.push(`Vocalista (${member.vocalRange})`);
      } else {
        badges.push("Vocalista");
      }
    }

    if (hasInstruments) {
      if (member.instruments && member.instruments.length > 0) {
        member.instruments.filter((i: string) => i !== "Voz").forEach((inst: string) => {
          badges.push(inst);
        });
      } else if (member.instrument) {
        badges.push(member.instrument);
      }
    }

    if (badges.length === 0) {
      if (deptRoles.includes("instrumentist")) {
        badges.push("Instrumentista");
      } else {
        badges.push("Integrante");
      }
    }

    return badges;
  };

  const getMemberMultimediaRoles = (member: any) => {
    const badges: string[] = [];
    const deptRoles = member.roles?.multimedia || [];

    if (deptRoles.includes("leader") || deptRoles.includes("multimedia_leader")) {
      badges.push("Líder");
    }

    deptRoles.forEach((role: string) => {
      if (role === "leader" || role === "multimedia_leader") return;
      
      if (role === "audio_operator" || role === "audio" || role === "sound") {
        badges.push("Áudio");
      } else if (role === "pc_operator" || role === "projection") {
        badges.push("Projeção");
      } else if (role === "social_media_operator" || role === "social_media_manager") {
        badges.push("Redes Sociais");
      } else if (role === "camera_operator" || role === "camera" || role === "video") {
        badges.push("Câmera / Vídeo");
      } else if (role === "photography_operator" || role === "photography") {
        badges.push("Fotografia");
      } else if (role === "lights" || role === "illumination") {
        badges.push("Iluminação");
      } else {
        badges.push(role.charAt(0).toUpperCase() + role.slice(1));
      }
    });

    if (badges.length === 0) {
      badges.push("Integrante");
    }

    return badges;
  };

  const getMemberSecretariatRoles = (member: any) => {
    const badges: string[] = [];
    const deptRoles = member.roles?.secretariat || [];

    if (deptRoles.includes("leader") || deptRoles.includes("admin") || deptRoles.includes("secretariat_leader")) {
      badges.push("Secretário");
    }

    deptRoles.forEach((role: string) => {
      if (role === "leader" || role === "admin" || role === "secretariat_leader") return;
      badges.push(role.charAt(0).toUpperCase() + role.slice(1));
    });

    if (badges.length === 0) {
      badges.push("Integrante");
    }

    return badges;
  };

  const getMemberDanceRoles = (member: any) => {
    const badges: string[] = [];
    const deptRoles = member.roles?.dance || [];

    if (deptRoles.includes("leader") || deptRoles.includes("dance_leader")) {
      badges.push("Líder");
    }

    deptRoles.forEach((role: string) => {
      if (role === "leader" || role === "dance_leader") return;

      if (role === "choreographer" || role === "coreografo") {
        badges.push("Coreografia");
      } else if (role === "dancer" || role === "bailarino" || role === "dancarino") {
        badges.push("Bailarino(a)");
      } else if (role === "costume" || role === "figurino") {
        badges.push("Figurino");
      } else if (role === "support" || role === "apoio") {
        badges.push("Apoio");
      } else {
        badges.push(role.charAt(0).toUpperCase() + role.slice(1));
      }
    });

    if (badges.length === 0) {
      badges.push("Integrante");
    }

    return badges;
  };

  // Define instruments and vocal ranges for grouping
  const groupMembers = () => {
    const groups: { [key: string]: Musician[] } = {};

    members.forEach((m) => {
      // If has instruments list
      if (m.instruments && m.instruments.length > 0) {
        m.instruments.forEach((inst) => {
          if (!groups[inst]) groups[inst] = [];
          groups[inst].push(m);
        });
      } else if (m.instrument) {
        // Legacy single instrument
        if (!groups[m.instrument]) groups[m.instrument] = [];
        groups[m.instrument].push(m);
      }

      // Vocal range
      if (m.vocalRange) {
        if (!groups[m.vocalRange]) groups[m.vocalRange] = [];
        // Prevent duplicate if already added by instrument?
        // No, user requested "vocal type" to be visible too.
        groups[m.vocalRange].push(m);
      }

      // If nothing defined
      if (!m.instruments?.length && !m.instrument && !m.vocalRange) {
        if (!groups["Outros"]) groups["Outros"] = [];
        groups["Outros"].push(m);
      }
    });

    return groups;
  };

  const groupedData = groupMembers();

  const worshipMembers = members.filter(
    (m) => m.roles?.worship && m.roles.worship.length > 0
  );
  const multimediaMembers = members.filter(
    (m) => m.roles?.multimedia && m.roles.multimedia.length > 0
  );
  const danceMembers = members.filter(
    (m) => m.roles?.dance && m.roles.dance.length > 0
  );
  const secretariatMembers = members.filter(
    (m) => m.roles?.secretariat && m.roles.secretariat.length > 0
  );

  return (
    <div className="max-w-6xl space-y-12 pb-20 text-slate-800 dark:text-slate-100">
      <header className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-blue-800 dark:hover:text-blue-400 font-bold transition-colors group"
        >
          <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800 group-hover:border-blue-100 dark:group-hover:border-blue-900 group-hover:shadow-lg transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span>Voltar para Igrejas</span>
        </button>
      </header>

      <section className="bg-white dark:bg-slate-900 rounded-[4rem] p-12 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 dark:bg-blue-900/10 blur-[120px] -mr-48 -mt-48 opacity-50"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-12 items-start md:items-center">
          <div className="w-24 h-24 bg-blue-800 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-800/30">
            <Church size={40} />
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-3">
              <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900/50">
                Ministério de Louvor
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-tight">
              {church.name}
            </h1>
            <div className="flex flex-wrap gap-8 pt-4">
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium">
                <PastorIcon className="w-5 h-5 text-blue-400 dark:text-blue-500" />
                <span>{church.pastor || "Pastor não informado"}</span>
              </div>
              <div className="flex items-start gap-3 text-slate-500 dark:text-slate-400 font-medium max-w-md">
                <MapPin className="w-5 h-5 text-blue-400 dark:text-blue-500 mt-0.5 shrink-0" />
                <span>{church.address || "Endereço não informado"}</span>
              </div>
            </div>
          </div>
          <div className="w-full md:w-auto flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800 rounded-[3rem] border border-white dark:border-slate-700">
            <div className="text-4xl font-display font-black text-blue-800 dark:text-blue-400 mb-1">
              {members.length}
            </div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Integrantes
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
          <h2 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 flex items-center gap-4">
            <Users className="w-6 h-6 text-blue-800 dark:text-blue-400" />
            Integrantes por Categoria
          </h2>

          <div className="space-y-6">
            {Object.keys(groupedData).length > 0 ? (
              Object.entries(groupedData).map(([group, list]) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  key={group}
                  className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                      {group.includes("Soprano") ||
                      group.includes("Contralto") ||
                      group.includes("Mezzo") ||
                      group.includes("Baixo") ||
                      group.includes("Tenor") ||
                      group.includes("Barítono") ? (
                        <Mic2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Music className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                      )}
                    </div>
                    <h3 className="font-display font-black text-slate-800 dark:text-slate-100 text-lg capitalize">
                      {group}
                    </h3>
                    <span className="ml-auto text-[10px] font-bold text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">
                      {list.length}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {list.map((m) => (
                      <Link
                        key={m.uid}
                        href={`/dashboard/members/${m.uid}`}
                        className="group flex items-center gap-4 p-4 rounded-[2rem] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                      >
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-400 dark:text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-900 group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">
                          {m.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">
                            {m.name}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                            {(m.roles?.worship?.includes("leader") || m.roles?.multimedia?.includes("leader") || m.roles?.secretariat?.includes("leader")) ? "Líder" : "Integrante"}
                            {m.level && ` • ${m.level}`}
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-blue-800 dark:text-blue-400 shadow-sm">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-[3rem] p-12 text-center border border-dashed border-slate-200 dark:border-slate-800">
                <Users className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  Nenhum integrante vinculado a esta igreja ainda.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-12">
          <section className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/20 blur-[80px] -mb-32 -mr-32"></div>
            <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-10">
              Informações Rápidas
            </h3>

            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <PastorIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Pastor Responsável
                  </div>
                  <div className="font-display font-bold text-lg">
                    {church.pastor || "---"}
                  </div>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Localização
                  </div>
                  <div className="font-display font-bold text-lg leading-snug">
                    {church.address || "---"}
                  </div>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Líderes de Louvor
                  </div>
                  <div className="font-display font-bold text-lg">
                    {members.filter((m) => m.roles?.worship?.includes("leader") || m.roles?.multimedia?.includes("leader") || m.roles?.secretariat?.includes("leader")).length}{" "}
                    Integrantes
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-blue-600 rounded-[3.5rem] p-12 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
            <Waves
              className="absolute right-0 bottom-0 text-white/5 transform translate-x-1/4 translate-y-1/4 scale-150"
              size={300}
            />
            <div className="relative z-10">
              <h3 className="text-2xl font-display font-black leading-tight mb-6">
                Convite para
                <br />
                Integrantes
              </h3>
              <p className="text-blue-100 text-sm mb-10 leading-relaxed font-medium">
                Deseja adicionar mais músicos ou vocalistas a esta igreja?
                Compartilhe o link de convite ou realize o cadastro manual.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/dashboard/members"
                  className="inline-flex items-center gap-3 bg-white text-blue-800 px-8 py-4 rounded-[2rem] font-bold shadow-xl shadow-black/10 hover:scale-105 active:scale-95 transition-all"
                >
                  Cadastrar Manualmente
                </Link>
                <button
                  onClick={handleCopyLink}
                  className={`inline-flex items-center gap-3 px-8 py-4 rounded-[2rem] font-bold transition-all hover:scale-105 active:scale-95 border ${
                    copied
                      ? "bg-emerald-500 text-white border-emerald-400 shadow-xl shadow-emerald-500/20"
                      : "bg-blue-700/50 text-white border-white/20 hover:bg-blue-700 shadow-xl shadow-black/10"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" /> Link Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" /> Copiar Link Convite
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="bg-white dark:bg-slate-900 rounded-[4rem] p-12 border border-slate-100 dark:border-slate-800 shadow-sm relative mt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-black text-slate-800 dark:text-slate-100 flex items-center gap-4">
              <Church className="w-8 h-8 text-blue-800 dark:text-blue-400" />
              Cultos da Igreja
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Veja todos os cultos e horários associados a esta igreja.
            </p>
          </div>
          {canManageServices && (
            <button
              id="create-service-btn"
              onClick={handleOpenCreateService}
              className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-blue-800/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Cadastrar Culto
            </button>
          )}
        </div>

        {/* Filter and Status Controls */}
        {services.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
                Filtrar:
              </span>
              <button
                type="button"
                id="filter-services-all"
                onClick={() => setServiceStatusFilter("all")}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  serviceStatusFilter === "all"
                    ? "bg-blue-800 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                Todos ({services.length})
              </button>
              <button
                type="button"
                id="filter-services-active"
                onClick={() => setServiceStatusFilter("active")}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  serviceStatusFilter === "active"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Ativos ({services.filter((s) => s.status !== "inactive").length})
              </button>
              <button
                type="button"
                id="filter-services-inactive"
                onClick={() => setServiceStatusFilter("inactive")}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  serviceStatusFilter === "inactive"
                    ? "bg-slate-700 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Inativos ({services.filter((s) => s.status === "inactive").length})
              </button>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Cultos inativos continuam salvos e podem ser reativados a qualquer momento.
            </span>
          </div>
        )}

        {services.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] p-16 text-center border border-dashed border-slate-200 dark:border-slate-700">
            <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-6" />
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
              Nenhum culto cadastrado para esta igreja.
            </p>
          </div>
        ) : services.filter((s) => {
            if (serviceStatusFilter === "active") return s.status !== "inactive";
            if (serviceStatusFilter === "inactive") return s.status === "inactive";
            return true;
          }).length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] p-12 text-center border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium mb-4">
              Nenhum culto encontrado com o filtro &ldquo;{serviceStatusFilter === "active" ? "Ativos" : "Inativos"}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => setServiceStatusFilter("all")}
              className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Exibir todos os cultos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services
              .filter((s) => {
                if (serviceStatusFilter === "active") return s.status !== "inactive";
                if (serviceStatusFilter === "inactive") return s.status === "inactive";
                return true;
              })
              .map((service) => {
                const isInactive = service.status === "inactive";
                return (
                  <div
                    key={service.id}
                    className={cn(
                      "rounded-[2rem] p-8 border transition-all group flex flex-col justify-between relative",
                      isInactive
                        ? "bg-slate-100/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 opacity-90"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:shadow-lg"
                    )}
                  >
                    <div>
                      {/* Top Bar: Icon, Day, and Action Icons */}
                      <div className="flex justify-between items-start mb-5">
                        <div
                          className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs transition-colors",
                            isInactive
                              ? "bg-slate-200/80 dark:bg-slate-900 text-slate-400 dark:text-slate-500"
                              : "bg-white dark:bg-slate-900 text-blue-800 dark:text-blue-400"
                          )}
                        >
                          <Clock className="w-7 h-7" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest",
                              isInactive
                                ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                : "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300"
                            )}
                          >
                            {service.dayOfWeek}
                          </span>
                          {canManageServices && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                id={`edit-service-icon-btn-${service.id}`}
                                onClick={() => handleOpenEditService(service)}
                                className="p-2 rounded-xl text-slate-400 hover:text-blue-800 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 cursor-pointer"
                                title="Editar Culto"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                id={`delete-service-icon-btn-${service.id}`}
                                onClick={() => handleOpenDeleteService(service)}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-700 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 cursor-pointer"
                                title="Excluir Culto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Selector Bar */}
                      <div className="mb-5 p-2 rounded-2xl bg-white/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2 pl-1.5">
                          <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Status:
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide",
                              isInactive
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70"
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isInactive ? "bg-slate-400" : "bg-emerald-500"
                              )}
                            />
                            {isInactive ? "Inativo" : "Ativo"}
                          </span>
                        </div>

                        {canManageServices ? (
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                              type="button"
                              id={`service-status-btn-active-${service.id}`}
                              onClick={() => isInactive && handleToggleServiceStatus(service, "active")}
                              disabled={togglingServiceId === service.id}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                                !isInactive
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                              )}
                              title="Habilitar culto"
                            >
                              <Check className="w-3 h-3" />
                              Ativo
                            </button>
                            <button
                              type="button"
                              id={`service-status-btn-inactive-${service.id}`}
                              onClick={() => !isInactive && handleToggleServiceStatus(service, "inactive")}
                              disabled={togglingServiceId === service.id}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                                isInactive
                                  ? "bg-slate-600 text-white shadow-xs"
                                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                              )}
                              title="Desabilitar culto sem excluí-lo"
                            >
                              <Power className="w-3 h-3" />
                              Inativo
                            </button>
                            {togglingServiceId === service.id && (
                              <Loader2 className="w-3 h-3 animate-spin text-slate-400 ml-0.5" />
                            )}
                          </div>
                        ) : null}
                      </div>

                      {/* Inactive notice if disabled */}
                      {isInactive && (
                        <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>Culto desabilitado (não aparecerá em novas escalas).</span>
                        </div>
                      )}

                      <h3
                        className={cn(
                          "text-xl font-display font-black mb-2",
                          isInactive
                            ? "text-slate-600 dark:text-slate-300"
                            : "text-slate-800 dark:text-slate-100"
                        )}
                      >
                        {service.name}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 min-h-[40px] line-clamp-2">
                        {service.description || "Sem descrição"}
                      </p>
                      <div className="flex items-center gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Início
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {service.startTime}
                          </span>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                        <div className="flex-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Término
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {service.endTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {canManageServices && (
                      <div className="pt-6 mt-6 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                        <button
                          type="button"
                          id={`edit-service-btn-${service.id}`}
                          onClick={() => handleOpenEditService(service)}
                          className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-200 hover:text-blue-800 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400" />
                          Editar Culto
                        </button>
                        <button
                          type="button"
                          id={`delete-service-btn-${service.id}`}
                          onClick={() => handleOpenDeleteService(service)}
                          className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900/50 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          Excluir Culto
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Seção de Ministérios */}
      <section className="bg-white dark:bg-slate-900 rounded-[4rem] p-12 border border-slate-100 dark:border-slate-800 shadow-sm relative mt-12 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 dark:bg-emerald-900/10 blur-[100px] -mr-32 -mt-32 opacity-50"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-black text-slate-800 dark:text-slate-100 flex items-center gap-4">
              <LayoutGrid className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              Ministérios
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Explore as frentes de atuação e serviço desta comunidade.
            </p>
          </div>
        </div>

        {/* Conjunto de Botões de Filtro dos Ministérios */}
        <div className="mb-8 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2.5 bg-slate-50/90 dark:bg-slate-800/80 rounded-[2rem] border border-slate-100 dark:border-slate-800 backdrop-blur-xs">
          <div className="flex items-center gap-2 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Filtrar Ministérios:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Todos */}
            <button
              type="button"
              id="filter-ministerio-todos"
              onClick={() => setMinistryFilter("all")}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer active:scale-95",
                ministryFilter === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md shadow-slate-900/10 dark:shadow-white/10 scale-102"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Todos</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                  ministryFilter === "all"
                    ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                )}
              >
                4
              </span>
            </button>

            {/* Louvor */}
            <button
              type="button"
              id="filter-ministerio-louvor"
              onClick={() =>
                setMinistryFilter((prev) => (prev === "louvor" ? "all" : "louvor"))
              }
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer active:scale-95",
                ministryFilter === "louvor"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 scale-102"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 border border-slate-200/60 dark:border-slate-700/60"
              )}
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span>Louvor</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                  ministryFilter === "louvor"
                    ? "bg-white/20 text-white"
                    : "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                )}
              >
                {worshipMembers.length}
              </span>
            </button>

            {/* Multimídia */}
            <button
              type="button"
              id="filter-ministerio-multimidia"
              onClick={() =>
                setMinistryFilter((prev) =>
                  prev === "multimidia" ? "all" : "multimidia"
                )
              }
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer active:scale-95",
                ministryFilter === "multimidia"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/25 scale-102"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/60 dark:hover:bg-purple-950/30 border border-slate-200/60 dark:border-slate-700/60"
              )}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Multimídia</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                  ministryFilter === "multimidia"
                    ? "bg-white/20 text-white"
                    : "bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400"
                )}
              >
                {multimediaMembers.length}
              </span>
            </button>

            {/* Dança */}
            <button
              type="button"
              id="filter-ministerio-danca"
              onClick={() =>
                setMinistryFilter((prev) => (prev === "danca" ? "all" : "danca"))
              }
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer active:scale-95",
                ministryFilter === "danca"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/25 scale-102"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 border border-slate-200/60 dark:border-slate-700/60"
              )}
            >
              <BallerinaIcon className="w-3.5 h-3.5" />
              <span>Dança</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                  ministryFilter === "danca"
                    ? "bg-white/20 text-white"
                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                )}
              >
                {danceMembers.length}
              </span>
            </button>

            {/* Secretaria */}
            <button
              type="button"
              id="filter-ministerio-secretaria"
              onClick={() =>
                setMinistryFilter((prev) =>
                  prev === "secretaria" ? "all" : "secretaria"
                )
              }
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer active:scale-95",
                ministryFilter === "secretaria"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-102"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 border border-slate-200/60 dark:border-slate-700/60"
              )}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Secretaria</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                  ministryFilter === "secretaria"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                )}
              >
                {secretariatMembers.length}
              </span>
            </button>
          </div>
        </div>

        {/* Indicador de filtro ativo */}
        {ministryFilter !== "all" && (
          <div className="mb-6 flex items-center justify-between px-5 py-2.5 bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse bg-emerald-500"></span>
              Exibindo apenas:{" "}
              <strong className="text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                {ministryFilter === "louvor" && "Ministério de Louvor"}
                {ministryFilter === "multimidia" && "Ministério de Multimídia"}
                {ministryFilter === "danca" && "Ministério de Dança"}
                {ministryFilter === "secretaria" && "Secretaria"}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setMinistryFilter("all")}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
            >
              Ver todos os ministérios
            </button>
          </div>
        )}

        <div
          id="grid-ministerios"
          data-filtered={ministryFilter !== "all"}
          className="grid-ministerios-scale-hover grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 items-stretch relative z-10 [&>*]:hover:scale-105 [&>*]:hover:shadow-2xl [&>*]:hover:z-20 [&>*]:transition-all [&>*]:duration-300 [&>*]:ease-out"
        >
          <AnimatePresence mode="popLayout">
            {/* Ministério de Louvor */}
            {(ministryFilter === "all" || ministryFilter === "louvor") && (
              <motion.div
                key="card-ministerio-louvor"
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onClick={() =>
                  router.push(`/dashboard/churches/${id}/ministries/louvor`)
                }
                className="h-full bg-slate-50 dark:bg-slate-800 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-700 hover:shadow-2xl transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm group-hover:scale-110 transition-transform">
                      <Mic2 className="w-8 h-8 group-hover:rotate-[5deg] transition-transform duration-300" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100/70 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/80 dark:border-blue-800/60 shadow-xs">
                      <Users className="w-3.5 h-3.5" />
                      <span>{worshipMembers.length} {worshipMembers.length === 1 ? "membro" : "membros"}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 mb-3 group-hover:text-blue-600 transition-colors">
                    Ministério de Louvor
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Equipe dedicada à adoração através da música, instrumentos e vozes
                    em nossos cultos.
                  </p>
                  <div className="flex items-center text-[10px] font-black text-blue-600 uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 mb-6">
                    Ver Detalhes <ExternalLink className="w-3 h-3" />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Integrantes e Papéis */}
                  <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2">
                      Integrantes da Equipe
                    </span>
                    {worshipMembers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Sem integrantes cadastrados</p>
                    ) : (
                      <div className="space-y-2">
                        {worshipMembers.slice(0, 4).map((member) => (
                          <div key={member.uid} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                              {member.name}
                            </span>
                            <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                              {getMemberWorshipRoles(member).map((role, idx) => (
                                <span
                                  key={`${role}-${idx}`}
                                  className="text-[9px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                        {worshipMembers.length > 4 && (
                          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 text-right mt-1">
                            + {worshipMembers.length - 4} integrante(s)
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {bands.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                      {bands.slice(0, 3).map((band) => (
                        <span
                          key={band.id}
                          className="text-[9px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-md"
                        >
                          {band.name}
                        </span>
                      ))}
                      {bands.length > 3 && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-1">
                          +{bands.length - 3} mais
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Ministério de Multimídia */}
            {(ministryFilter === "all" || ministryFilter === "multimidia") && (
              <motion.div
                key="card-ministerio-multimidia"
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onClick={() =>
                  router.push(`/dashboard/churches/${id}/ministries/multimidia`)
                }
                className="h-full bg-slate-50 dark:bg-slate-800 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-700 hover:shadow-2xl transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm group-hover:scale-110 transition-transform">
                      <Monitor className="w-8 h-8 group-hover:rotate-[5deg] transition-transform duration-300" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100/70 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200/80 dark:border-purple-800/60 shadow-xs">
                      <Users className="w-3.5 h-3.5" />
                      <span>{multimediaMembers.length} {multimediaMembers.length === 1 ? "membro" : "membros"}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 mb-3 group-hover:text-purple-600 transition-colors">
                    Ministério de Multimídia
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Gestão de som, projeção, transmissões ao vivo e toda a
                    infraestrutura tecnológica da igreja.
                  </p>
                  <div className="flex items-center text-[10px] font-black text-purple-600 uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 mb-6">
                    Ver Detalhes <ExternalLink className="w-3 h-3" />
                  </div>
                </div>

                {/* Integrantes e Papéis */}
                <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2">
                    Integrantes da Equipe
                  </span>
                  {multimediaMembers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Sem integrantes cadastrados</p>
                  ) : (
                    <div className="space-y-2">
                      {multimediaMembers.slice(0, 4).map((member) => (
                        <div key={member.uid} className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {member.name}
                          </span>
                          <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                            {getMemberMultimediaRoles(member).map((role, idx) => (
                              <span
                                key={`${role}-${idx}`}
                                className="text-[9px] font-black uppercase tracking-widest bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {multimediaMembers.length > 4 && (
                        <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 text-right mt-1">
                          + {multimediaMembers.length - 4} integrante(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Ministério de Dança */}
            {(ministryFilter === "all" || ministryFilter === "danca") && (
              <motion.div
                key="card-ministerio-danca"
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onClick={() =>
                  router.push(`/dashboard/churches/${id}/ministries/danca`)
                }
                className="h-full bg-slate-50 dark:bg-slate-800 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-700 hover:shadow-2xl transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm group-hover:scale-110 transition-transform">
                      <BallerinaIcon className="w-8 h-8 group-hover:rotate-[5deg] transition-transform duration-300" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100/70 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200/80 dark:border-rose-800/60 shadow-xs">
                      <Users className="w-3.5 h-3.5" />
                      <span>{danceMembers.length} {danceMembers.length === 1 ? "membro" : "membros"}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 mb-3 group-hover:text-rose-600 transition-colors">
                    Ministério de Dança
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Expressão de louvor e adoração através da dança, coreografias, teatro e artes corporais.
                  </p>
                  <div className="flex items-center text-[10px] font-black text-rose-600 uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 mb-6">
                    Ver Detalhes <ExternalLink className="w-3 h-3" />
                  </div>
                </div>

                {/* Integrantes e Papéis */}
                <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2">
                    Integrantes da Equipe
                  </span>
                  {danceMembers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Sem integrantes cadastrados</p>
                  ) : (
                    <div className="space-y-2">
                      {danceMembers.slice(0, 4).map((member) => (
                        <div key={member.uid} className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {member.name}
                          </span>
                          <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                            {getMemberDanceRoles(member).map((role, idx) => (
                              <span
                                key={`${role}-${idx}`}
                                className="text-[9px] font-black uppercase tracking-widest bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 px-1.5 py-0.5 rounded"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {danceMembers.length > 4 && (
                        <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 text-right mt-1">
                          + {danceMembers.length - 4} integrante(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Secretaria */}
            {(ministryFilter === "all" || ministryFilter === "secretaria") && (
              <motion.div
                key="card-ministerio-secretaria"
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onClick={() =>
                  router.push(`/dashboard/churches/${id}/ministries/secretaria`)
                }
                className="h-full bg-slate-50 dark:bg-slate-800 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-700 hover:shadow-2xl transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm group-hover:scale-110 transition-transform">
                      <Briefcase className="w-8 h-8 group-hover:rotate-[5deg] transition-transform duration-300" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
                      <Users className="w-3.5 h-3.5" />
                      <span>{secretariatMembers.length} {secretariatMembers.length === 1 ? "membro" : "membros"}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 mb-3 group-hover:text-emerald-600 transition-colors">
                    Secretaria
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Organização administrativa, cadastro de membros, atas e suporte
                    pastoral estratégico.
                  </p>
                  <div className="flex items-center text-[10px] font-black text-emerald-600 uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 mb-6">
                    Ver Detalhes <ExternalLink className="w-3 h-3" />
                  </div>
                </div>

                {/* Integrantes e Papéis */}
                <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2">
                    Integrantes da Equipe
                  </span>
                  {secretariatMembers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Sem integrantes cadastrados</p>
                  ) : (
                    <div className="space-y-2">
                      {secretariatMembers.slice(0, 4).map((member) => (
                        <div key={member.uid} className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {member.name}
                          </span>
                          <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                            {getMemberSecretariatRoles(member).map((role, idx) => (
                              <span
                                key={`${role}-${idx}`}
                                className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {secretariatMembers.length > 4 && (
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 text-right mt-1">
                          + {secretariatMembers.length - 4} integrante(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {isServiceModalOpen && (
        <div
          onClick={() => {
            setIsServiceModalOpen(false);
            setEditingService(null);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl relative"
          >
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100">
                  {editingService ? "Editar Culto" : "Cadastrar Culto"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsServiceModalOpen(false);
                    setEditingService(null);
                  }}
                  className="w-10 h-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveService} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Nome do Culto *
                  </label>
                  <input
                    required
                    type="text"
                    value={serviceFormData.name}
                    onChange={(e) =>
                      setServiceFormData({
                        ...serviceFormData,
                        name: e.target.value,
                      })
                    }
                    placeholder="Ex: Culto de Celebração"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={serviceFormData.description}
                    onChange={(e) =>
                      setServiceFormData({
                        ...serviceFormData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Opcional"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                      Hora de Início *
                    </label>
                    <input
                      required
                      type="time"
                      value={serviceFormData.startTime}
                      onChange={(e) =>
                        setServiceFormData({
                          ...serviceFormData,
                          startTime: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                      Hora de Término *
                    </label>
                    <input
                      required
                      type="time"
                      value={serviceFormData.endTime}
                      onChange={(e) =>
                        setServiceFormData({
                          ...serviceFormData,
                          endTime: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Dia da Semana *
                  </label>
                  <select
                    required
                    value={serviceFormData.dayOfWeek}
                    onChange={(e) =>
                      setServiceFormData({
                        ...serviceFormData,
                        dayOfWeek: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all font-medium appearance-none"
                  >
                    {[
                      "Domingo",
                      "Segunda-feira",
                      "Terça-feira",
                      "Quarta-feira",
                      "Quinta-feira",
                      "Sexta-feira",
                      "Sábado",
                    ].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Selector in Modal */}
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Status do Culto *
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      id="service-form-status-active-btn"
                      onClick={() =>
                        setServiceFormData({
                          ...serviceFormData,
                          status: "active",
                        })
                      }
                      className={cn(
                        "py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer",
                        serviceFormData.status === "active"
                          ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-200/60 dark:border-emerald-800/60"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      )}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Ativo
                    </button>
                    <button
                      type="button"
                      id="service-form-status-inactive-btn"
                      onClick={() =>
                        setServiceFormData({
                          ...serviceFormData,
                          status: "inactive",
                        })
                      }
                      className={cn(
                        "py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer",
                        serviceFormData.status === "inactive"
                          ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-300 dark:border-slate-700"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      )}
                    >
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Inativo
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                    Cultos inativos continuam salvos, permitindo desabilitá-los temporariamente sem excluí-los.
                  </p>
                </div>

                <div className="pt-6">
                  <button
                    disabled={savingService}
                    type="submit"
                    className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-blue-800/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {savingService
                      ? "Salvando..."
                      : editingService
                        ? "Salvar Alterações"
                        : "Salvar Culto"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
      {/* Modal de Confirmação para Excluir Culto */}
      {isDeleteServiceModalOpen && serviceToDelete && (
        <div
          onClick={() => {
            if (!deletingService) {
              setIsDeleteServiceModalOpen(false);
              setServiceToDelete(null);
            }
          }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative border border-slate-100 dark:border-slate-700 p-8"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 text-center mb-2">
              Excluir Culto?
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
              Tem certeza que deseja excluir o culto{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                &ldquo;{serviceToDelete.name}&rdquo;
              </span>
              ? Esta ação removerá o culto desta congregação.
            </p>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 mb-6 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="font-medium text-slate-400">Dia:</span>
                <span className="font-bold">{serviceToDelete.dayOfWeek}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-400">Horário:</span>
                <span className="font-bold">
                  {serviceToDelete.startTime} - {serviceToDelete.endTime}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={deletingService}
                onClick={() => {
                  setIsDeleteServiceModalOpen(false);
                  setServiceToDelete(null);
                }}
                className="flex-1 py-3.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="confirm-delete-service-btn"
                disabled={deletingService}
                onClick={handleConfirmDeleteService}
                className="flex-1 py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-rose-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deletingService ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sim, Excluir</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isBandModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl relative"
          >
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100">
                  Nova Banda
                </h3>
                <button
                  onClick={() => setIsBandModalOpen(false)}
                  className="w-10 h-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBand} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Nome da Banda *
                  </label>
                  <input
                    required
                    type="text"
                    value={bandName}
                    onChange={(e) => setBandName(e.target.value)}
                    placeholder="Ex: Banda Alpha"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all font-medium"
                  />
                </div>

                <button
                  disabled={savingBand}
                  type="submit"
                  className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-blue-800/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
                >
                  {savingBand ? "Salvando..." : "Criar Banda"}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
