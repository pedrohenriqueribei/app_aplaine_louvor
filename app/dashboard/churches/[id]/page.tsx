"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  setDoc,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType, auth } from "@/lib/firebase";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";
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
  BookOpen,
  HeartHandshake,
  Flame,
  Globe,
  Coins,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { BallerinaIcon } from "@/components/BallerinaIcon";
import { ChurchScalesCalendarWidget } from "@/components/ChurchScalesCalendarWidget";
import {
  getAllChurchMinistries,
  normalizeMinistryKey,
  getMinistryCustomName,
  getMinistryShortName,
  getMinistryIconComponent,
  MinistryDefinition,
  STANDARD_MINISTRIES_PRESETS,
} from "@/lib/ministryUtils";

interface Musician {
  uid: string;
  name: string;
  email: string;
  instrument?: string;
  instruments?: string[];
  vocalRange?: string;
  level?: string;
  role?: string;
  pastoralTitle?: string;
  roles?: Record<string, string[]>;
  status: "active" | "inactive";
}

interface Band {
  id: string;
  name: string;
  churchId: string;
  memberIds: string[];
  leaderId: string;
}

interface PastorRecord {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  createdAt?: string;
}

interface ChurchType {
  id: string;
  name: string;
  address: string;
  pastor: string;
  phone?: string;
  email?: string;
  cnpj?: string;
  pastors?: PastorRecord[];
  ministries?: MinistryDefinition[];
  worshipMinistryName?: string;
  worshipMinistryAcronym?: string;
  danceMinistryName?: string;
  danceMinistryAcronym?: string;
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

  // Filter state for ministries
  const [ministryFilter, setMinistryFilter] = useState<string>("all");

  // Church Edition State
  const [isEditChurchModalOpen, setIsEditChurchModalOpen] = useState(false);
  const [churchFormData, setChurchFormData] = useState({
    name: "",
    address: "",
    pastor: "",
    phone: "",
    email: "",
    cnpj: "",
  });
  const [savingChurch, setSavingChurch] = useState(false);

  // Pastoral Account Creation State
  const [isPastorModalOpen, setIsPastorModalOpen] = useState(false);
  const [pastorFormData, setPastorFormData] = useState({
    name: "",
    title: "Pastor Titular",
    email: "",
    password: "",
    phone: "",
  });
  const [showPastorPassword, setShowPastorPassword] = useState(false);
  const [savingPastor, setSavingPastor] = useState(false);
  const [pastorError, setPastorError] = useState("");
  const [pastorSuccessInfo, setPastorSuccessInfo] = useState<{
    name: string;
    email: string;
    password: string;
    title: string;
  } | null>(null);
  const [copiedPastorCredentials, setCopiedPastorCredentials] = useState(false);

  // New Ministry Creation State
  const [isNewMinistryModalOpen, setIsNewMinistryModalOpen] = useState(false);
  const [newMinistryData, setNewMinistryData] = useState({
    name: "",
    shortName: "",
    acronym: "",
    description: "",
    color: "blue",
    iconKey: "sparkles",
  });
  const [savingNewMinistry, setSavingNewMinistry] = useState(false);
  const [newMinistryError, setNewMinistryError] = useState("");

  // Services CRUD State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceType | null>(null);
  const [isDeleteServiceModalOpen, setIsDeleteServiceModalOpen] = useState(false);
  const [deletingService, setDeletingService] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [togglingServiceId, setTogglingServiceId] = useState<string | null>(null);
  const [serviceStatusFilter, setServiceStatusFilter] = useState<"all" | "active" | "inactive">("all");
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
    startTime: "19:30",
    endTime: "21:30",
    dayOfWeek: "Domingo",
    status: "active",
  });

  // Bands State
  const [isBandModalOpen, setIsBandModalOpen] = useState(false);
  const [bandName, setBandName] = useState("");
  const [savingBand, setSavingBand] = useState(false);

  const canManageChurch = Boolean(
    isSuperAdmin ||
      userData?.role === "pastor" ||
      userData?.role === "pastor_titular" ||
      userData?.role === "líder" ||
      userData?.churchId === id
  );

  const canManageServices = canManageChurch;

  // Compute all available ministries for this church (merged presets + custom)
  const allMinistries: MinistryDefinition[] = useMemo(() => {
    return getAllChurchMinistries(church);
  }, [church]);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch Church Data
        const churchDoc = await getDoc(doc(db, "churches", id as string));
        if (churchDoc.exists()) {
          const cData = { id: churchDoc.id, ...churchDoc.data() } as ChurchType;
          setChurch(cData);
          setChurchFormData({
            name: cData.name || "",
            address: cData.address || "",
            pastor: cData.pastor || "",
            phone: cData.phone || "",
            email: cData.email || "",
            cnpj: cData.cnpj || "",
          });
        }

        // 2. Fetch Church Members
        const usersQ = query(
          collection(db, "users"),
          where("churchId", "==", id)
        );
        const usersSnap = await getDocs(usersQ);
        const membersMap = new Map<string, any>();

        usersSnap.docs.forEach((docSnap) => {
          membersMap.set(docSnap.id, {
            uid: docSnap.id,
            ...docSnap.data(),
          });
        });

        // 3. Scan department subcollections for extra members
        const deptKeys = [
          "worship",
          "louvor",
          "multimedia",
          "multimidia",
          "secretariat",
          "secretaria",
          "dance",
          "danca",
          "biblico",
          "acolhimento",
          "intercessao",
          "evangelismo",
          "tesouraria",
          "patrimonio",
        ];

        for (const dept of deptKeys) {
          try {
            const deptSnap = await getDocs(
              collection(db, "churches", id as string, "departments", dept, "members")
            );
            for (const docSnap of deptSnap.docs) {
              const memberUid = docSnap.id;
              const deptMemberData = docSnap.data();
              const subroles = deptMemberData.roles || [];

              const normKey = normalizeMinistryKey(dept);

              if (!membersMap.has(memberUid)) {
                const userProfileSnap = await getDoc(doc(db, "users", memberUid));
                if (userProfileSnap.exists()) {
                  const uData = userProfileSnap.data();
                  membersMap.set(memberUid, {
                    uid: memberUid,
                    ...uData,
                    roles: {
                      ...(uData.roles || {}),
                      [normKey]: subroles,
                    },
                  });
                }
              } else {
                const existingUser = membersMap.get(memberUid);
                existingUser.roles = {
                  ...(existingUser.roles || {}),
                  [normKey]: Array.from(
                    new Set([...(existingUser.roles?.[normKey] || []), ...subroles])
                  ),
                };
                membersMap.set(memberUid, existingUser);
              }
            }
          } catch {
            // non-fatal
          }
        }

        const membersData = Array.from(membersMap.values()) as Musician[];
        membersData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setMembers(membersData);

        // 4. Fetch Services
        const servicesQ = query(
          collection(db, "services"),
          where("churchId", "==", id)
        );
        const servicesSnap = await getDocs(servicesQ);
        setServices(
          servicesSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              status: data.status === "inactive" ? "inactive" : "active",
            } as ServiceType;
          })
        );

        // 5. Fetch Bands
        const bandsQ = query(collection(db, "bands"), where("churchId", "==", id));
        const bandsSnap = await getDocs(bandsQ);
        setBands(bandsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Band));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `churches/${id}`);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchData();
  }, [id]);

  // Compute members belonging to a specific ministry
  const getMembersByMinistry = (ministryKey: string): Musician[] => {
    const norm = normalizeMinistryKey(ministryKey);
    return members.filter((m) => {
      const rolesMap = m.roles || {};
      const direct = rolesMap[norm] || [];
      const legacyWorship = (norm === "louvor" && rolesMap.worship) || [];
      const legacyMultimedia = (norm === "multimidia" && rolesMap.multimedia) || [];
      const legacySecretariat = (norm === "secretaria" && rolesMap.secretariat) || [];
      const legacyDance = (norm === "danca" && rolesMap.dance) || [];

      // Check if user has instruments/vocal for louvor
      const hasWorshipRole =
        norm === "louvor" &&
        (m.instrument || (m.instruments && m.instruments.length > 0) || m.vocalRange);

      return (
        direct.length > 0 ||
        legacyWorship.length > 0 ||
        legacyMultimedia.length > 0 ||
        legacySecretariat.length > 0 ||
        legacyDance.length > 0 ||
        hasWorshipRole
      );
    });
  };

  // Get human-readable role tags for a member in a specific ministry
  const getMemberRolesForMinistry = (member: Musician, ministryKey: string): string[] => {
    const norm = normalizeMinistryKey(ministryKey);
    const badges: string[] = [];
    const rolesMap = member.roles || {};
    const deptRoles = rolesMap[norm] || rolesMap[ministryKey] || [];

    if (deptRoles.includes("leader") || deptRoles.includes("super_admin") || member.role === "pastor") {
      badges.push("Líder");
    }

    if (norm === "louvor") {
      if (member.vocalRange) badges.push(`Voz (${member.vocalRange})`);
      else if (member.instruments?.includes("Voz") || member.instrument === "Voz") badges.push("Voz");

      const otherInstruments = (member.instruments || []).filter((i) => i !== "Voz");
      if (otherInstruments.length > 0) {
        otherInstruments.forEach((i) => badges.push(i));
      } else if (member.instrument && member.instrument !== "Voz") {
        badges.push(member.instrument);
      }
    } else {
      deptRoles.forEach((roleKey) => {
        if (roleKey === "leader" || roleKey === "admin") return;
        badges.push(
          roleKey
            .split(/[-_]/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        );
      });
    }

    if (badges.length === 0) {
      badges.push("Integrante");
    }

    return badges;
  };

  // Copy registration invite link
  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/register?churchId=${id}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Generate secure password helper
  const handleGenerateSecurePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pass = "Pr@";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPastorFormData((prev) => ({ ...prev, password: pass }));
  };

  // Save Church Changes
  const handleSaveChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!church || !user) return;
    setSavingChurch(true);
    try {
      const churchRef = doc(db, "churches", id as string);
      const updates = {
        name: churchFormData.name,
        pastor: churchFormData.pastor,
        address: churchFormData.address,
        phone: churchFormData.phone,
        email: churchFormData.email,
        cnpj: churchFormData.cnpj,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };

      await updateDoc(churchRef, updates);

      // Audit log
      auditUpdate("Church", id as string, churchFormData.name, church, updates, {
        churchId: id as string,
      }).catch(console.warn);

      setChurch((prev) => (prev ? { ...prev, ...updates } : prev));
      setIsEditChurchModalOpen(false);
    } catch (err: any) {
      console.error("Erro ao salvar igreja:", err);
      alert("Erro ao salvar alterações da igreja: " + (err.message || err));
    } finally {
      setSavingChurch(false);
    }
  };

  // Create Pastoral Account via server API
  const handleCreatePastorAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setPastorError("");
    setSavingPastor(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/create-pastor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: pastorFormData.name,
          title: pastorFormData.title,
          email: pastorFormData.email,
          password: pastorFormData.password,
          phone: pastorFormData.phone,
          churchId: id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || "Falha ao criar conta pastoral.");
      }

      // Add to local state
      const newPastorRecord: PastorRecord = {
        uid: data.pastor.uid,
        name: pastorFormData.name,
        email: pastorFormData.email,
        phone: pastorFormData.phone,
        title: pastorFormData.title,
        createdAt: new Date().toISOString(),
      };

      setChurch((prev) => {
        if (!prev) return prev;
        const currentPastors = prev.pastors || [];
        const updated = [...currentPastors.filter((p) => p.email !== newPastorRecord.email), newPastorRecord];
        return {
          ...prev,
          pastors: updated,
          pastor:
            newPastorRecord.title?.toLowerCase().includes("titular") || !prev.pastor
              ? newPastorRecord.name
              : prev.pastor,
        };
      });

      setPastorSuccessInfo({
        name: pastorFormData.name,
        email: pastorFormData.email,
        password: pastorFormData.password,
        title: pastorFormData.title,
      });

      setPastorFormData({
        name: "",
        title: "Pastor Auxiliar",
        email: "",
        password: "",
        phone: "",
      });
      setIsPastorModalOpen(false);
    } catch (err: any) {
      console.error("Erro ao criar conta pastoral:", err);
      setPastorError(err.message || "Erro inesperado ao criar conta.");
    } finally {
      setSavingPastor(false);
    }
  };

  // Create New Ministry
  const handleCreateMinistry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMinistryData.name.trim()) return;
    setNewMinistryError("");
    setSavingNewMinistry(true);

    try {
      const slug =
        newMinistryData.shortName.trim().toLowerCase().replace(/[^a-z0-9]/g, "") ||
        newMinistryData.name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

      const newDef: MinistryDefinition = {
        id: slug,
        name: newMinistryData.name.trim(),
        shortName: newMinistryData.shortName.trim() || newMinistryData.name.trim(),
        acronym: (
          newMinistryData.acronym.trim() ||
          newMinistryData.name.substring(0, 3).toUpperCase()
        ).toUpperCase(),
        description:
          newMinistryData.description.trim() ||
          `Frente de serviço do ministério ${newMinistryData.name}.`,
        color: newMinistryData.color,
        badgeColorClass: `bg-${newMinistryData.color}-100 dark:bg-${newMinistryData.color}-900/40 text-${newMinistryData.color}-800 dark:text-${newMinistryData.color}-300 border-${newMinistryData.color}-200 dark:border-${newMinistryData.color}-800`,
        headerGradientClass: `bg-${newMinistryData.color}-50 dark:bg-${newMinistryData.color}-900/10`,
        iconBgClass: `bg-${newMinistryData.color}-700 text-white shadow-${newMinistryData.color}-700/30`,
        iconKey: newMinistryData.iconKey,
        defaultRoles: [
          { id: "leader", label: "Líder", isLeader: true },
          { id: "vice_leader", label: "Vice-Líder", isLeader: true },
          { id: "volunteer", label: "Voluntário(a)" },
          { id: "support", label: "Apoio" },
        ],
        isCustom: true,
      };

      const churchRef = doc(db, "churches", id as string);
      const currentCustom = church?.ministries || [];
      const updatedCustom = [...currentCustom.filter((m) => m.id !== slug), newDef];

      await updateDoc(churchRef, {
        ministries: updatedCustom,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
      });

      // Also create department record
      await setDoc(
        doc(db, "churches", id as string, "departments", slug),
        {
          id: slug,
          churchId: id,
          name: newDef.name,
          acronym: newDef.acronym,
          description: newDef.description,
          createdAt: serverTimestamp(),
          createdBy: user?.uid,
        },
        { merge: true }
      );

      // Audit Log
      auditCreate("Ministry", slug, newDef.name, newDef, { churchId: id as string }).catch(
        console.warn
      );

      setChurch((prev) => (prev ? { ...prev, ministries: updatedCustom } : prev));
      setIsNewMinistryModalOpen(false);
      setNewMinistryData({
        name: "",
        shortName: "",
        acronym: "",
        description: "",
        color: "blue",
        iconKey: "sparkles",
      });
    } catch (err: any) {
      console.error("Erro ao criar ministério:", err);
      setNewMinistryError(err.message || "Erro ao salvar novo ministério.");
    } finally {
      setSavingNewMinistry(false);
    }
  };

  // Services CRUD Handlers
  const handleOpenCreateService = () => {
    setEditingService(null);
    setServiceFormData({
      name: "",
      description: "",
      startTime: "19:30",
      endTime: "21:30",
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
    if (!serviceFormData.name.trim() || !user) return;
    setSavingService(true);
    try {
      if (editingService) {
        const serviceRef = doc(db, "services", editingService.id);
        const updates = {
          ...serviceFormData,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        };
        await updateDoc(serviceRef, updates);

        auditUpdate("WorshipService", editingService.id, serviceFormData.name, editingService, updates, {
          churchId: (editingService.churchId || id) as string,
        }).catch(console.warn);

        setServices((prev) =>
          prev.map((s) => (s.id === editingService.id ? { ...s, ...serviceFormData } : s))
        );
      } else {
        const newRecord = {
          ...serviceFormData,
          churchId: id as string,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        };
        const docRef = await addDoc(collection(db, "services"), newRecord);

        auditCreate("WorshipService", docRef.id, serviceFormData.name, newRecord, {
          churchId: id as string,
        }).catch(console.warn);

        setServices((prev) => [...prev, { id: docRef.id, ...serviceFormData, churchId: id as string }]);
      }
      setIsServiceModalOpen(false);
      setEditingService(null);
    } catch (err: any) {
      console.error("Error saving service:", err);
      alert("Erro ao salvar culto: " + err.message);
    } finally {
      setSavingService(false);
    }
  };

  const handleToggleServiceStatus = async (service: ServiceType, newStatus: "active" | "inactive") => {
    if (!user) return;
    setTogglingServiceId(service.id);
    const currentStatus = service.status || "active";
    setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, status: newStatus } : s)));
    try {
      await updateDoc(doc(db, "services", service.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      auditUpdate(
        "WorshipService",
        service.id,
        service.name,
        { status: currentStatus },
        { status: newStatus },
        { churchId: (service.churchId || id) as string }
      ).catch(console.warn);
    } catch (err: any) {
      setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, status: currentStatus } : s)));
      alert("Erro ao alterar status do culto: " + err.message);
    } finally {
      setTogglingServiceId(null);
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;
    setDeletingService(true);
    try {
      await deleteDoc(doc(db, "services", serviceToDelete.id));
      auditDelete("WorshipService", serviceToDelete.id, serviceToDelete.name, serviceToDelete, {
        churchId: (serviceToDelete.churchId || id) as string,
      }).catch(console.warn);
      setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      setIsDeleteServiceModalOpen(false);
      setServiceToDelete(null);
    } catch (err: any) {
      alert("Erro ao excluir culto: " + err.message);
    } finally {
      setDeletingService(false);
    }
  };

  const handleSaveBand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bandName.trim() || !user) return;
    setSavingBand(true);
    try {
      const docRef = await addDoc(collection(db, "bands"), {
        name: bandName,
        churchId: id,
        memberIds: [],
        leaderId: userData?.uid || "",
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      setBands([...bands, { id: docRef.id, name: bandName, churchId: id as string, memberIds: [], leaderId: userData?.uid || "" }]);
      setBandName("");
      setIsBandModalOpen(false);
    } catch (err: any) {
      alert("Erro ao salvar banda: " + err.message);
    } finally {
      setSavingBand(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-800 rounded-full animate-spin"></div>
          <div className="absolute inset-x-0 top-20 text-center text-xs font-black text-slate-400 uppercase tracking-widest">
            Carregando Igreja...
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
          className="text-blue-800 dark:text-blue-400 font-bold flex items-center gap-2 mx-auto cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
      </div>
    );
  }

  // Filtered ministries for display
  const displayedMinistries =
    ministryFilter === "all"
      ? allMinistries
      : allMinistries.filter((m) => normalizeMinistryKey(m.id) === normalizeMinistryKey(ministryFilter));

  const allPastors = church.pastors && church.pastors.length > 0
    ? church.pastors
    : church.pastor
      ? [{ uid: "primary_pastor", name: church.pastor, email: church.email || "Não informado", title: "Pastor Titular" }]
      : [];

  return (
    <div className="admin-church-details-container max-w-6xl mx-auto space-y-12 pb-24 text-slate-800 dark:text-slate-100">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-800 shadow-xs transition-all text-sm font-semibold group cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-all" />
          <span>Voltar para Igrejas</span>
        </button>

        {canManageChurch && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditChurchModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-600" />
              Editar Dados da Igreja
            </button>
          </div>
        )}
      </div>

      {/* Hero Header Section */}
      <section className="bg-white dark:bg-slate-900 rounded-[4rem] p-10 md:p-14 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 dark:bg-blue-900/10 blur-[120px] -mr-48 -mt-48 opacity-60"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-8 md:gap-12 items-start md:items-center">
          <div className="w-24 h-24 bg-blue-800 text-white rounded-[2.2rem] flex items-center justify-center shadow-2xl shadow-blue-800/30 shrink-0">
            <Church size={44} />
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900/50">
                Congregação Cristã
              </span>
              <span className="px-3.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200/60 dark:border-emerald-800/60">
                {allMinistries.length} Ministérios Ativos
              </span>
              {church.cnpj && (
                <span className="px-3.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full text-[10px] font-mono font-bold border border-slate-200 dark:border-slate-700">
                  CNPJ: {church.cnpj}
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              {church.name}
            </h1>

            <div className="flex flex-wrap gap-6 pt-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
              <div className="flex items-center gap-2.5">
                <PastorIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{church.pastor || "Pastor Titular não informado"}</span>
              </div>
              <div className="flex items-center gap-2.5 max-w-md">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="line-clamp-1">{church.address || "Endereço não informado"}</span>
              </div>
              {church.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{church.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="w-full md:w-auto flex md:flex-col gap-4 items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/80 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
            <div className="text-center">
              <div className="text-3xl font-display font-black text-blue-800 dark:text-blue-400">
                {members.length}
              </div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Membros
              </div>
            </div>
            <div className="h-8 md:h-px w-px md:w-full bg-slate-200 dark:bg-slate-700" />
            <div className="text-center">
              <div className="text-3xl font-display font-black text-emerald-600 dark:text-emerald-400">
                {services.filter((s) => s.status !== "inactive").length}
              </div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Cultos
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO ESPECIAL: LIDERANÇA PASTORAL (LOGIN E SENHA) */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[100px] pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-3 border border-blue-400/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Governança & Pastoreio</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-black text-white">
              Pastores da Igreja
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Gerencie os pastores titulares e auxiliares com contas ativas (login e senha) para administração integral do ministério.
            </p>
          </div>

          {canManageChurch && (
            <button
              onClick={() => {
                setPastorError("");
                setIsPastorModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all text-sm cursor-pointer active:scale-95 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Criar Conta para Pastor</span>
            </button>
          )}
        </div>

        {/* Lista de Pastores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {allPastors.map((p, idx) => (
            <div
              key={p.uid || `pastor-${idx}`}
              className="bg-white/5 border border-white/10 hover:border-blue-400/40 rounded-3xl p-6 transition-all backdrop-blur-xs flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-blue-500/20 text-blue-300 rounded-2xl flex items-center justify-center font-bold text-lg border border-blue-400/30">
                    {p.name.charAt(0)}
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Conta Ativa
                  </span>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                    {p.name}
                  </h4>
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mt-0.5">
                    {p.title || "Pastor Titular"}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{p.email}</span>
                  </div>
                  {p.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <KeyRound className="w-3.5 h-3.5" /> Acesso Liberado
                </span>
                <span className="text-slate-500">ID: {p.uid.substring(0, 8)}...</span>
              </div>
            </div>
          ))}

          {allPastors.length === 0 && (
            <div className="col-span-full bg-white/5 border border-dashed border-white/15 rounded-3xl p-8 text-center text-slate-400">
              <PastorIcon className="w-10 h-10 mx-auto mb-3 opacity-40 text-blue-400" />
              <p className="text-sm font-medium">Nenhuma conta de pastor cadastrada nesta igreja ainda.</p>
              <button
                onClick={() => setIsPastorModalOpen(true)}
                className="mt-3 text-xs font-bold text-blue-400 hover:underline"
              >
                Cadastre o primeiro pastor com e-mail e senha
              </button>
            </div>
          )}
        </div>
      </section>

      {/* WIDGET DEDICADO: CALENDÁRIO DE ESCALAS DA IGREJA */}
      <section>
        <ChurchScalesCalendarWidget
          churchId={id as string}
          churchName={church.name}
          allUsersList={members.map((m) => ({ id: m.uid, name: m.name, email: m.email }))}
        />
      </section>

      {/* SEÇÃO DE CULTOS DA IGREJA */}
      <section className="bg-white dark:bg-slate-900 rounded-[4rem] p-10 md:p-14 border border-slate-100 dark:border-slate-800 shadow-sm relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-display font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-800 dark:text-blue-400" />
              Cultos da Congregação
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              Horários e celebrações semanais associados à igreja.
            </p>
          </div>

          {canManageServices && (
            <button
              onClick={handleOpenCreateService}
              className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-blue-800/20 active:scale-95 cursor-pointer text-sm"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Culto
            </button>
          )}
        </div>

        {/* Cultos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const isInactive = service.status === "inactive";
            return (
              <div
                key={service.id}
                className={cn(
                  "rounded-3xl p-7 border transition-all flex flex-col justify-between relative",
                  isInactive
                    ? "bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80"
                    : "bg-slate-50 dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700/70 hover:shadow-lg"
                )}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                        isInactive
                          ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          : "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300"
                      )}
                    >
                      {service.dayOfWeek}
                    </span>

                    {canManageServices && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditService(service)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                          title="Editar Culto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setServiceToDelete(service);
                            setIsDeleteServiceModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                          title="Excluir Culto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    {service.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">
                    {service.description || "Sem descrição"}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>{service.startTime} às {service.endTime}</span>
                  </div>

                  {canManageServices && (
                    <button
                      onClick={() => handleToggleServiceStatus(service, isInactive ? "active" : "inactive")}
                      disabled={togglingServiceId === service.id}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                        isInactive
                          ? "bg-slate-200 dark:bg-slate-700 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700"
                          : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-slate-200"
                      )}
                    >
                      {isInactive ? "Ativar" : "Ativo"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {services.length === 0 && (
            <div className="col-span-full bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-10 text-center border border-dashed border-slate-200 dark:border-slate-800">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">Nenhum culto cadastrado ainda.</p>
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO PRINCIPAL DE MINISTÉRIOS (DINÂMICOS E ESCALÁVEIS) */}
      <section id="grid-ministerios" className="bg-white dark:bg-slate-900 rounded-[4rem] p-10 md:p-14 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-50 dark:bg-emerald-900/10 blur-[100px] pointer-events-none opacity-50"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-200/60 dark:border-emerald-800/60">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Plataforma Escalável & Modular</span>
            </div>
            <h2 className="text-3xl font-display font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <LayoutGrid className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              Ministérios da Igreja
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm max-w-2xl">
              Frentes de atuação ministerial da igreja. Crie novos ministérios no mesmo padrão para qualquer área de serviço da comunidade.
            </p>
          </div>

          {canManageChurch && (
            <button
              onClick={() => {
                setNewMinistryError("");
                setIsNewMinistryModalOpen(true);
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all text-sm cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Ministério</span>
            </button>
          )}
        </div>

        {/* Conjunto de Botões de Filtro */}
        <div className="mb-10 relative z-10 flex flex-wrap items-center gap-2 p-3 bg-slate-50/90 dark:bg-slate-800/80 rounded-[2rem] border border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setMinistryFilter("all")}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95",
              ministryFilter === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Todos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {allMinistries.length}
            </span>
          </button>

          {allMinistries.map((m) => {
            const mMembers = getMembersByMinistry(m.id);
            const isSelected = normalizeMinistryKey(ministryFilter) === normalizeMinistryKey(m.id);
            return (
              <button
                key={`filter-${m.id}`}
                type="button"
                onClick={() => setMinistryFilter((prev) => (prev === m.id ? "all" : m.id))}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95",
                  isSelected
                    ? "bg-blue-800 text-white shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 border border-slate-200/60 dark:border-slate-700/60"
                )}
              >
                <span>{m.shortName}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  )}
                >
                  {mMembers.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grid de Cards dos Ministérios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 items-stretch">
          <AnimatePresence mode="popLayout">
            {displayedMinistries.map((ministry) => {
              const ministryMembers = getMembersByMinistry(ministry.id);
              const linkUrl = `/dashboard/churches/${id}/ministries/${ministry.id}`;

              return (
                <motion.div
                  key={`card-ministry-${ministry.id}`}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => router.push(linkUrl)}
                  className="bg-slate-50/80 dark:bg-slate-800/80 rounded-[2.8rem] p-7 border border-slate-200/70 dark:border-slate-700/70 hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-600 transition-all group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Icon & Member Count */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-blue-700 dark:text-blue-400 shadow-sm group-hover:scale-105 transition-transform">
                        {getMinistryIconComponent(ministry.iconKey, 28, "text-blue-700 dark:text-blue-400")}
                      </div>

                      <div className="flex items-center gap-2">
                        {ministry.acronym && (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 text-slate-500 border border-slate-200/60 dark:border-slate-700/60">
                            {ministry.acronym}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-bold border border-blue-200/80 dark:border-blue-800/60">
                          <Users className="w-3.5 h-3.5" />
                          <span>{ministryMembers.length}</span>
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                      {ministry.name}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 min-h-[48px] line-clamp-3">
                      {ministry.description}
                    </p>
                  </div>

                  {/* Integrantes List Preview */}
                  <div className="mt-4 pt-4 border-t border-slate-200/70 dark:border-slate-700/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Equipe ({ministryMembers.length})
                      </span>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver Detalhes <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>

                    {ministryMembers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Sem integrantes vinculados ainda</p>
                    ) : (
                      <div className="space-y-1.5">
                        {ministryMembers.slice(0, 3).map((member, mIdx) => (
                          <div key={`${member.uid}-${mIdx}`} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
                              {member.name}
                            </span>
                            <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                              {getMemberRolesForMinistry(member, ministry.id).slice(0, 2).map((role, rIdx) => (
                                <span
                                  key={`${role}-${rIdx}`}
                                  className="text-[9px] font-bold uppercase tracking-wider bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                        {ministryMembers.length > 3 && (
                          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 text-right">
                            + {ministryMembers.length - 3} integrante(s)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </section>

      {/* Convite & Compartilhamento */}
      <section className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-[3.5rem] p-10 md:p-14 text-white shadow-xl relative overflow-hidden">
        <Waves className="absolute right-0 bottom-0 text-white/5 transform translate-x-1/4 translate-y-1/4 scale-150 pointer-events-none" size={280} />
        <div className="relative z-10 max-w-2xl space-y-4">
          <h3 className="text-2xl md:text-3xl font-display font-black leading-tight">
            Convide Novos Membros e Voluntários
          </h3>
          <p className="text-blue-100 text-sm leading-relaxed font-medium">
            Compartilhe o link de cadastro da igreja para que novos voluntários e membros façam o auto-cadastro selecionando seus respectivos ministérios.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={handleCopyLink}
              className={cn(
                "inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer shadow-lg active:scale-95",
                copied
                  ? "bg-emerald-500 text-white shadow-emerald-500/20"
                  : "bg-white text-blue-900 hover:bg-blue-50 shadow-black/10"
              )}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> Link Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar Link de Cadastro da Igreja
                </>
              )}
            </button>
            <Link
              href="/dashboard/members"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-blue-900/60 hover:bg-blue-900 border border-white/20 text-white transition-all active:scale-95"
            >
              <Users className="w-4 h-4" /> Cadastrar Membro Manualmente
            </Link>
          </div>
        </div>
      </section>

      {/* MODAL: CRIAR CONTA PARA PASTOR (LOGIN E SENHA) */}
      {isPastorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.8rem] w-full max-w-lg p-8 md:p-10 shadow-2xl relative border border-slate-100 dark:border-slate-800"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Acesso Pastoral
                </span>
                <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100">
                  Criar Conta para Pastor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPastorModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pastorError && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold">
                {pastorError}
              </div>
            )}

            <form onSubmit={handleCreatePastorAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo do Pastor *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Pr. Marcos Oliveira"
                  value={pastorFormData.name}
                  onChange={(e) => setPastorFormData({ ...pastorFormData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cargo / Título Pastoral *
                </label>
                <select
                  value={pastorFormData.title}
                  onChange={(e) => setPastorFormData({ ...pastorFormData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                >
                  <option value="Pastor Titular">Pastor Titular (Presidente)</option>
                  <option value="Pastor Auxiliar">Pastor Auxiliar</option>
                  <option value="Pastor de Jovens">Pastor de Jovens</option>
                  <option value="Pastor de Ensino">Pastor de Ensino & Teologia</option>
                  <option value="Pastor de Famílias">Pastor de Famílias / Casais</option>
                  <option value="Pastora">Pastora</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail de Login *
                </label>
                <input
                  required
                  type="email"
                  placeholder="pastor@igreja.com"
                  value={pastorFormData.email}
                  onChange={(e) => setPastorFormData({ ...pastorFormData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Senha de Acesso *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSecurePassword}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Gerar Senha Segura
                  </button>
                </div>
                <div className="relative">
                  <input
                    required
                    type={showPastorPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={pastorFormData.password}
                    onChange={(e) => setPastorFormData({ ...pastorFormData, password: e.target.value })}
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPastorPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPastorPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Telefone / WhatsApp (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={pastorFormData.phone}
                  onChange={(e) => setPastorFormData({ ...pastorFormData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPastorModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPastor}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {savingPastor ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Conta Pastoral"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: SUCESSO CREDENCIAIS DO PASTOR */}
      {pastorSuccessInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.8rem] w-full max-w-md p-8 md:p-10 shadow-2xl relative text-center border border-slate-100 dark:border-slate-800"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 mb-1">
              Conta Pastoral Criada!
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Envie as credenciais abaixo para o pastor realizar o primeiro login em <strong>/login</strong>.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl text-left space-y-3 mb-6 border border-slate-200/80 dark:border-slate-700/80">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome</span>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{pastorSuccessInfo.name} ({pastorSuccessInfo.title})</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">E-mail</span>
                <span className="font-mono text-sm text-blue-700 dark:text-blue-400 font-bold">{pastorSuccessInfo.email}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Senha</span>
                <span className="font-mono text-sm text-slate-800 dark:text-slate-200 font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 inline-block">
                  {pastorSuccessInfo.password}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const text = `Olá ${pastorSuccessInfo.name},\nSeu acesso pastoral foi liberado na plataforma Applaine!\n\nIgreja: ${church.name}\nE-mail: ${pastorSuccessInfo.email}\nSenha: ${pastorSuccessInfo.password}\n\nAcesse: ${window.location.origin}/login`;
                  navigator.clipboard.writeText(text);
                  setCopiedPastorCredentials(true);
                  setTimeout(() => setCopiedPastorCredentials(false), 2500);
                }}
                className={cn(
                  "flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all",
                  copiedPastorCredentials ? "bg-emerald-600 text-white" : "bg-blue-800 text-white hover:bg-blue-900"
                )}
              >
                {copiedPastorCredentials ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedPastorCredentials ? "Copiado!" : "Copiar Credenciais"}
              </button>
              <button
                onClick={() => setPastorSuccessInfo(null)}
                className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: CRIAR NOVO MINISTÉRIO */}
      {isNewMinistryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.8rem] w-full max-w-lg p-8 md:p-10 shadow-2xl relative border border-slate-100 dark:border-slate-800"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                  Estrutura Ministerial Escalável
                </span>
                <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100">
                  Novo Ministério
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewMinistryModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newMinistryError && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold">
                {newMinistryError}
              </div>
            )}

            <form onSubmit={handleCreateMinistry} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Ministério *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Ministério de Jovens / Diaconia"
                  value={newMinistryData.name}
                  onChange={(e) => setNewMinistryData({ ...newMinistryData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Curto
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Jovens"
                    value={newMinistryData.shortName}
                    onChange={(e) => setNewMinistryData({ ...newMinistryData, shortName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sigla (Acrônimo)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: MJ"
                    value={newMinistryData.acronym}
                    onChange={(e) => setNewMinistryData({ ...newMinistryData, acronym: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-emerald-600 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição do Ministério
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva as frentes de atuação e o propósito deste ministério..."
                  value={newMinistryData.description}
                  onChange={(e) => setNewMinistryData({ ...newMinistryData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ícone Representativo
                  </label>
                  <select
                    value={newMinistryData.iconKey}
                    onChange={(e) => setNewMinistryData({ ...newMinistryData, iconKey: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="book">Bíblia / Ensino</option>
                    <option value="heart">Acolhimento / Amor</option>
                    <option value="flame">Fogo / Oração & Intercessão</option>
                    <option value="globe">Globo / Missões & Evangelismo</option>
                    <option value="coins">Moeda / Tesouraria & Finanças</option>
                    <option value="building">Prédio / Patrimônio & Zeladoria</option>
                    <option value="mic">Microfone / Música</option>
                    <option value="monitor">Computador / Multimídia</option>
                    <option value="briefcase">Maleta / Secretaria</option>
                    <option value="sparkles">Estrela / Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cor Temática
                  </label>
                  <select
                    value={newMinistryData.color}
                    onChange={(e) => setNewMinistryData({ ...newMinistryData, color: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-emerald-600 capitalize"
                  >
                    <option value="blue">Azul</option>
                    <option value="purple">Roxo</option>
                    <option value="rose">Rosa</option>
                    <option value="emerald">Verde Esmeralda</option>
                    <option value="amber">Âmbar / Dourado</option>
                    <option value="indigo">Índigo</option>
                    <option value="teal">Verde Petróleo</option>
                    <option value="orange">Laranja</option>
                    <option value="cyan">Ciano</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewMinistryModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNewMinistry}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {savingNewMinistry ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Ministério"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: EDITAR DADOS DA IGREJA */}
      {isEditChurchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.8rem] w-full max-w-lg p-8 md:p-10 shadow-2xl relative border border-slate-100 dark:border-slate-800"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100">
                Editar Dados da Igreja
              </h3>
              <button
                type="button"
                onClick={() => setIsEditChurchModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveChurch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Igreja *
                </label>
                <input
                  required
                  type="text"
                  value={churchFormData.name}
                  onChange={(e) => setChurchFormData({ ...churchFormData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pastor Titular
                </label>
                <input
                  type="text"
                  value={churchFormData.pastor}
                  onChange={(e) => setChurchFormData({ ...churchFormData, pastor: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={churchFormData.address}
                  onChange={(e) => setChurchFormData({ ...churchFormData, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={churchFormData.phone}
                    onChange={(e) => setChurchFormData({ ...churchFormData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={churchFormData.cnpj}
                    onChange={(e) => setChurchFormData({ ...churchFormData, cnpj: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditChurchModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingChurch}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {savingChurch ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR CULTO */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.8rem] w-full max-w-lg p-8 md:p-10 shadow-2xl relative border border-slate-100 dark:border-slate-800"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100">
                {editingService ? "Editar Culto" : "Cadastrar Culto"}
              </h3>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Culto *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Culto da Família"
                  value={serviceFormData.name}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dia da Semana *
                </label>
                <select
                  value={serviceFormData.dayOfWeek}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, dayOfWeek: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                >
                  <option value="Domingo">Domingo</option>
                  <option value="Segunda-feira">Segunda-feira</option>
                  <option value="Terça-feira">Terça-feira</option>
                  <option value="Quarta-feira">Quarta-feira</option>
                  <option value="Quinta-feira">Quinta-feira</option>
                  <option value="Sexta-feira">Sexta-feira</option>
                  <option value="Sábado">Sábado</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Horário Início *
                  </label>
                  <input
                    required
                    type="time"
                    value={serviceFormData.startTime}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, startTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Horário Término *
                  </label>
                  <input
                    required
                    type="time"
                    value={serviceFormData.endTime}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, endTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais sobre o culto..."
                  value={serviceFormData.description}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingService}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {savingService ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Culto"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE CULTO */}
      {isDeleteServiceModalOpen && serviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-sm p-6 text-center border border-slate-100 dark:border-slate-800"
          >
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
              Excluir este Culto?
            </h4>
            <p className="text-xs text-slate-500 mb-5">
              Tem certeza que deseja excluir <strong>{serviceToDelete.name}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteServiceModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteService}
                disabled={deletingService}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {deletingService ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
