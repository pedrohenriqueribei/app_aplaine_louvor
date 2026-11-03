"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
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
  serverTimestamp,
  addDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Mic2,
  Monitor,
  Briefcase,
  Shield,
  Music,
  LayoutGrid,
  Plus,
  ExternalLink,
  X,
  Clock,
  Calendar,
  Copy,
  Check,
  Sliders,
  Sparkles,
  Users,
  ArrowRight,
  BookOpen,
  HeartHandshake,
  Flame,
  Globe,
  Coins,
  Building2,
  UserPlus,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  Edit2,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";
import MultimediaWorkspace from "@/components/MultimediaWorkspace";
import DanceWorkspace from "@/components/DanceWorkspace";
import TreasuryWorkspace from "@/components/TreasuryWorkspace";
import { BallerinaIcon, BallerinaIcon2 } from "@/components/BallerinaIcon";
import {
  resolveMinistryDefinition,
  getMinistryIconComponent,
  normalizeMinistryKey,
  MinistryDefinition,
} from "@/lib/ministryUtils";

export const dynamic = "force-dynamic";

interface Musician {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  instrument?: string;
  instruments?: string[];
  vocalRange?: string;
  level?: string;
  role?: "líder" | "instrumentista" | "membro" | "pastor" | string;
  status: "active" | "inactive";
  roles?: Record<string, string[]>;
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
  pastor: string;
  phone?: string;
  email?: string;
  worshipMinistryName?: string;
  worshipMinistryAcronym?: string;
  danceMinistryName?: string;
  danceMinistryAcronym?: string;
  ministries?: MinistryDefinition[];
}

export default function MinistryDetailPage() {
  const { id, type } = useParams();
  const router = useRouter();
  const { userData, isSuperAdmin, user } = useAuth();

  const normType = normalizeMinistryKey(type as string);
  const isDance = normType === "danca" || normType === "dance";
  const isLouvor = normType === "louvor" || normType === "worship";
  const isMultimidia = normType === "multimidia" || normType === "multimedia";
  const isSecretaria = normType === "secretaria" || normType === "secretariat";
  const isBiblico = normType === "biblico" || normType === "ensino";
  const isAcolhimento = normType === "acolhimento";
  const isIntercessao = normType === "intercessao";
  const isEvangelismo = normType === "evangelismo";
  const isTesouraria = normType === "tesouraria";
  const isPatrimonio = normType === "patrimonio";

  const [church, setChurch] = useState<ChurchType | null>(null);
  const [members, setMembers] = useState<Musician[]>([]);
  const [allChurchMembers, setAllChurchMembers] = useState<Musician[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Ministry Definition
  const ministryDef = useMemo(() => {
    return resolveMinistryDefinition(normType, church);
  }, [normType, church]);

  const [copied, setCopied] = useState(false);
  const [danceIconVariant, setDanceIconVariant] = useState<"duet" | "classic" | "arabesque">("duet");

  // Add Member Modal State
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState("");
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState("membro");
  const [savingMember, setSavingMember] = useState(false);

  // Band creation for music/louvor
  const [isBandModalOpen, setIsBandModalOpen] = useState(false);
  const [bandName, setBandName] = useState("");
  const [savingBand, setSavingBand] = useState(false);

  // User Leadership check
  const isDeptLeader = Boolean(
    isSuperAdmin ||
      userData?.role === "pastor" ||
      userData?.role === "pastor_titular" ||
      userData?.role === "líder" ||
      userData?.roles?.[normType]?.includes("leader") ||
      userData?.roles?.[type as string]?.includes("leader") ||
      userData?.roles?.worship?.includes("leader") && isLouvor ||
      userData?.roles?.multimedia?.includes("leader") && isMultimidia ||
      userData?.roles?.dance?.includes("dance_leader") && isDance ||
      userData?.roles?.secretariat?.includes("leader") && isSecretaria
  );

  const getRoleLabels = (m: Musician) => {
    const rolesMap = m.roles || {};
    const specificRoles = rolesMap[normType] || rolesMap[type as string] || [];
    const labels: string[] = [];

    if (specificRoles.includes("leader") || m.role === "líder" || m.role === "pastor") {
      labels.push("Líder");
    }

    if (isLouvor) {
      const worshipRoles = rolesMap.worship || specificRoles || [];
      const isVocal = m.vocalRange || m.instruments?.includes("Voz") || m.instrument === "Voz";
      if (isVocal) {
        labels.push(m.vocalRange ? `Vocalista (${m.vocalRange})` : "Vocalista");
      }
      const otherInstruments = (m.instruments || []).filter((i) => i !== "Voz");
      if (otherInstruments.length > 0) {
        otherInstruments.forEach((i) => labels.push(i));
      } else if (m.instrument && m.instrument !== "Voz") {
        labels.push(m.instrument);
      }
    } else if (isDance) {
      const danceRoles = rolesMap.dance || specificRoles || [];
      danceRoles.forEach((role) => {
        if (role === "leader" || role === "dance_leader") return;
        if (role === "choreographer" || role === "coreografo") labels.push("Coreógrafo(a)");
        else if (role === "dancer" || role === "dancarino") labels.push("Dançarino(a)");
        else if (role === "costume_manager" || role === "figurino") labels.push("Figurino & Vestimenta");
        else if (role === "rehearsal_director") labels.push("Diretor(a) de Ensaio");
        else labels.push(role.charAt(0).toUpperCase() + role.slice(1));
      });
    } else {
      specificRoles.forEach((role) => {
        if (role === "leader" || role === "admin") return;
        const matched = ministryDef.defaultRoles?.find((r) => r.id === role);
        if (matched) {
          labels.push(matched.label);
        } else {
          labels.push(role.charAt(0).toUpperCase() + role.slice(1));
        }
      });
    }

    if (labels.length === 0) {
      labels.push("Integrante");
    }

    return labels.join(", ");
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/register?churchId=${id}&role=${normType}`;
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
          setChurch({ id: churchDoc.id, ...churchDoc.data() } as ChurchType);
        }

        // Fetch All Church Members
        const usersQ = query(collection(db, "users"), where("churchId", "==", id));
        const usersSnap = await getDocs(usersQ);
        const membersMap = new Map<string, any>();

        usersSnap.docs.forEach((docSnap) => {
          membersMap.set(docSnap.id, {
            uid: docSnap.id,
            ...docSnap.data(),
          });
        });

        // Scan department subcollection for this specific ministry
        const deptKeysToTry = [normType, type as string];
        if (isLouvor) deptKeysToTry.push("worship");
        if (isMultimidia) deptKeysToTry.push("multimedia");
        if (isDance) deptKeysToTry.push("dance");
        if (isSecretaria) deptKeysToTry.push("secretariat");

        for (const deptKey of deptKeysToTry) {
          try {
            const deptSnap = await getDocs(
              collection(db, "churches", id as string, "departments", deptKey, "members")
            );
            for (const docSnap of deptSnap.docs) {
              const memberUid = docSnap.id;
              const deptMemberData = docSnap.data();
              const subroles = deptMemberData.roles || [];

              if (!membersMap.has(memberUid)) {
                const userProfileSnap = await getDoc(doc(db, "users", memberUid));
                if (userProfileSnap.exists()) {
                  const uData = userProfileSnap.data();
                  membersMap.set(memberUid, {
                    uid: memberUid,
                    ...uData,
                    roles: {
                      ...(uData.roles || {}),
                      [normType]: subroles,
                    },
                  });
                }
              } else {
                const existingUser = membersMap.get(memberUid);
                existingUser.roles = {
                  ...(existingUser.roles || {}),
                  [normType]: Array.from(
                    new Set([...(existingUser.roles?.[normType] || []), ...subroles])
                  ),
                };
                membersMap.set(memberUid, existingUser);
              }
            }
          } catch {
            // non-fatal
          }
        }

        const allMappedUsers = Array.from(membersMap.values());
        setAllChurchMembers(allMappedUsers);

        // Filter users that belong to this ministry
        const filteredDocs = allMappedUsers.filter((userData) => {
          const roles = userData.roles || {};
          const hasDirectRole = Array.isArray(roles[normType]) && roles[normType].length > 0;
          const hasTypeRole = Array.isArray(roles[type as string]) && roles[type as string].length > 0;
          const hasWorshipRole =
            isLouvor &&
            ((Array.isArray(roles.worship) && roles.worship.length > 0) ||
              userData.instrument ||
              (userData.instruments && userData.instruments.length > 0) ||
              userData.vocalRange);
          const hasMultimediaRole = isMultimidia && Array.isArray(roles.multimedia) && roles.multimedia.length > 0;
          const hasDanceRole = isDance && Array.isArray(roles.dance) && roles.dance.length > 0;
          const hasSecretariatRole = isSecretaria && Array.isArray(roles.secretariat) && roles.secretariat.length > 0;

          return hasDirectRole || hasTypeRole || hasWorshipRole || hasMultimediaRole || hasDanceRole || hasSecretariatRole;
        });

        const membersData: Musician[] = filteredDocs.map((userData) => {
          const roles = userData.roles || {};
          const deptRoles = roles[normType] || roles[type as string] || [];
          const isLeaderInDept =
            deptRoles.includes("leader") ||
            (isDance && deptRoles.includes("dance_leader")) ||
            (isMultimidia && deptRoles.includes("multimedia_leader")) ||
            (userData.role === "líder" && !userData.roles) ||
            userData.role === "pastor";

          return {
            uid: userData.uid,
            ...userData,
            role: isLeaderInDept ? "líder" : "instrumentista",
          } as Musician;
        });

        membersData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setMembers(membersData);

        // Fetch Bands if louvor
        if (isLouvor) {
          const bandsQ = query(collection(db, "bands"), where("churchId", "==", id));
          const bandsSnap = await getDocs(bandsQ);
          setBands(bandsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Band));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `ministries/${type}`);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchData();
  }, [id, type, normType, isLouvor, isDance, isMultimidia, isSecretaria]);

  // Handle Add Member to this ministry
  const handleAddMemberToMinistry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberToAdd || !user) return;
    setSavingMember(true);

    try {
      const targetUser = allChurchMembers.find((m) => m.uid === selectedMemberToAdd);
      if (!targetUser) return;

      const rolesArray = selectedRoleToAdd === "leader" ? ["leader"] : [selectedRoleToAdd];

      // Update user document
      const userRef = doc(db, "users", targetUser.uid);
      const currentRoles = targetUser.roles || {};
      const updatedRoles = {
        ...currentRoles,
        [normType]: Array.from(new Set([...(currentRoles[normType] || []), ...rolesArray])),
      };

      await updateDoc(userRef, {
        roles: updatedRoles,
        updatedAt: serverTimestamp(),
      });

      // Update church department subcollection
      const memberDeptRef = doc(db, "churches", id as string, "departments", normType, "members", targetUser.uid);
      await setDoc(
        memberDeptRef,
        {
          userId: targetUser.uid,
          roles: rolesArray,
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Update local state
      const updatedMusician: Musician = {
        ...targetUser,
        role: selectedRoleToAdd === "leader" ? "líder" : "membro",
        roles: updatedRoles,
      };

      setMembers((prev) => [...prev.filter((m) => m.uid !== targetUser.uid), updatedMusician]);
      setIsAddMemberModalOpen(false);
      setSelectedMemberToAdd("");
    } catch (err: any) {
      console.error("Erro ao adicionar membro ao ministério:", err);
      alert("Erro ao adicionar integrante: " + (err.message || err));
    } finally {
      setSavingMember(false);
    }
  };

  // Toggle leader role for a member
  const handleToggleLeaderRole = async (member: Musician) => {
    if (!isDeptLeader || !user) return;
    const isCurrentlyLeader = member.role === "líder";
    const newRole = isCurrentlyLeader ? "membro" : "líder";

    try {
      const userRef = doc(db, "users", member.uid);
      const currentRoles = member.roles || {};
      const deptRoles = currentRoles[normType] || [];
      const updatedDeptRoles = isCurrentlyLeader
        ? deptRoles.filter((r) => r !== "leader" && r !== "dance_leader" && r !== "multimedia_leader")
        : Array.from(new Set([...deptRoles, "leader"]));

      const updatedRoles = {
        ...currentRoles,
        [normType]: updatedDeptRoles,
      };

      await updateDoc(userRef, {
        roles: updatedRoles,
        updatedAt: serverTimestamp(),
      });

      // Update subcollection
      const memberDeptRef = doc(db, "churches", id as string, "departments", normType, "members", member.uid);
      await setDoc(
        memberDeptRef,
        {
          roles: updatedDeptRoles,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMembers((prev) =>
        prev.map((m) =>
          m.uid === member.uid
            ? { ...m, role: newRole, roles: updatedRoles }
            : m
        )
      );
    } catch (err: any) {
      alert("Erro ao alterar liderança: " + err.message);
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
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!church) {
    return <div>Igreja não encontrada</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 text-slate-800 dark:text-slate-100">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 shadow-xs transition-all text-sm font-semibold group cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-all" />
          <span>Voltar para a Igreja</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyLink}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95",
              copied
                ? "bg-emerald-500 text-white border-emerald-500"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400"
            )}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Link Copiado!" : "Convidar para este Ministério"}</span>
          </button>
        </div>
      </div>

      {/* Ministry Hero Header */}
      <section className="bg-white dark:bg-slate-900 rounded-[4rem] p-10 md:p-14 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className={cn("absolute top-0 right-0 w-96 h-96 blur-[120px] -mr-48 -mt-48 opacity-50", ministryDef.headerGradientClass)}></div>

        <div className="relative z-10 flex flex-col md:flex-row gap-8 md:gap-12 items-start md:items-center">
          <div className={cn("w-28 h-28 rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-transform shrink-0", ministryDef.iconBgClass)}>
            {getMinistryIconComponent(ministryDef.iconKey, 48, "text-white")}
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", ministryDef.badgeColorClass)}>
                {ministryDef.shortName}
              </span>
              {ministryDef.acronym && (
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-600">
                  {ministryDef.acronym}
                </span>
              )}
              <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200 dark:border-blue-800/60 flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                {members.length} {members.length === 1 ? "Integrante" : "Integrantes"}
              </span>

              {isDance && (
                <div className="inline-flex items-center gap-1 p-0.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/50 rounded-xl text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDanceIconVariant("duet")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                      danceIconVariant === "duet" ? "bg-rose-600 text-white shadow-xs" : "text-rose-700 dark:text-rose-300"
                    )}
                  >
                    <BallerinaIcon size={12} /> Dueto
                  </button>
                  <button
                    type="button"
                    onClick={() => setDanceIconVariant("arabesque")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                      danceIconVariant === "arabesque" ? "bg-rose-600 text-white shadow-xs" : "text-rose-700 dark:text-rose-300"
                    )}
                  >
                    <BallerinaIcon2 size={12} /> Arabesque
                  </button>
                </div>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              {ministryDef.name}
            </h1>

            <p className="text-slate-500 dark:text-slate-400 font-medium text-base md:text-lg max-w-2xl leading-relaxed">
              {ministryDef.description}
            </p>

            {/* Actions Bar */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              {isDeptLeader && (
                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-blue-800/20 active:scale-95 transition-all text-xs cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Adicionar Integrante</span>
                </button>
              )}

              {isDeptLeader && (isLouvor || isMultimidia || isDance) && (
                <Link
                  href={`/dashboard/churches/${id}/ministries/${normType}/scale-config`}
                  className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all text-xs cursor-pointer"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Configurar Escala</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-10">
          {/* Workspaces for Specific Ministries */}
          {isMultimidia && <MultimediaWorkspace churchId={id as string} />}
          {isDance && <DanceWorkspace churchId={id as string} />}

          {/* Specialized Overview for other Standard Ministries */}
          {isBiblico && (
            <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-slate-800 dark:text-slate-100">
                    Escola Bíblica & Discipulado
                  </h3>
                  <p className="text-xs text-slate-500">Formação teológica e acompanhamento dos alunos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                  <span className="text-[10px] font-black uppercase text-indigo-600 block mb-1">
                    Superintendência EBD
                  </span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {members.filter((m) => m.role === "líder").map((l) => l.name).join(", ") || "Líder a definir"}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Coordenação dos professores e materiais didáticos das classes de estudo.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Corpo Docente Ativo
                  </span>
                  <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400">
                    {members.length} {members.length === 1 ? "Professor(a)" : "Professores / Alunos"}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Discipuladores e instrutores com escala de aulas semanal.
                  </p>
                </div>
              </div>
            </section>
          )}

          {isAcolhimento && (
            <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-slate-800 dark:text-slate-100">
                    Recepção & Integração de Visitantes
                  </h3>
                  <p className="text-xs text-slate-500">Boas-vindas calorosas e acompanhamento dos visitantes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50">
                  <span className="text-[10px] font-black uppercase text-teal-700 block mb-1">
                    Equipe de Portaria & Templo
                  </span>
                  <div className="text-2xl font-black text-teal-800 dark:text-teal-300">
                    {members.length} Voluntários
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Escalados para recepcionar e guiar os membros e visitantes durante os cultos.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Ficha de Visitantes
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Integração direta com o módulo de visitantes da igreja.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/visitors"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline mt-4"
                  >
                    Ver Visitantes Cadastrados <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </section>
          )}

          {isTesouraria && (
            <TreasuryWorkspace churchId={id as string} churchName={church?.name} />
          )}

          {isIntercessao && (
            <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-slate-800 dark:text-slate-100">
                    Torre de Oração & Intercessão
                  </h3>
                  <p className="text-xs text-slate-500">Sentinelas de clamor contínuo pela igreja e nações</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-800/70">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Equipe de {members.length} intercessores dedicados ao clamor nos cultos, vigílias e cadeia de oração 24 horas pelas famílias e liderança da igreja.
                </p>
              </div>
            </section>
          )}

          {isEvangelismo && (
            <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-slate-800 dark:text-slate-100">
                    Missões Urbanas & Evangelismo
                  </h3>
                  <p className="text-xs text-slate-500">Expansão do Evangelho, folhetos e impacto social</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/70">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Equipe mobilizada com {members.length} voluntários para visitas, ações sociais e campanhas missionárias nos bairros da cidade.
                </p>
              </div>
            </section>
          )}

          {isPatrimonio && (
            <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-slate-800 dark:text-slate-100">
                    Patrimônio & Zeladoria do Templo
                  </h3>
                  <p className="text-xs text-slate-500">Preservação predial, inventário e conservação</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/70">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Manutenção contínua dos equipamentos de som, ar-condicionado, iluminação e zelo pela Casa do Senhor.
                </p>
              </div>
            </section>
          )}

          {/* Bands Section for Louvor */}
          {isLouvor && (
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                  <Music className="w-6 h-6 text-blue-800 dark:text-blue-400" />
                  Bandas do Ministério
                </h3>
                {isDeptLeader && (
                  <button
                    onClick={() => setIsBandModalOpen(true)}
                    className="bg-blue-800 hover:bg-blue-900 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nova Banda
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bands.map((band) => (
                  <div
                    key={band.id}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">{band.name}</h4>
                      <p className="text-xs text-slate-400 mt-1">{band.memberIds?.length || 0} Integrantes vinculados</p>
                    </div>
                    <Music className="w-6 h-6 text-blue-500/50" />
                  </div>
                ))}
                {bands.length === 0 && (
                  <div className="col-span-full p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                    Nenhuma banda cadastrada ainda.
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar: Liderança e Lista de Integrantes */}
        <div className="space-y-8">
          {/* Caixa de Liderança */}
          <section className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px]"></div>

            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4" /> Liderança
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                {members.filter((m) => m.role === "líder").length} Líder(es)
              </span>
            </div>

            <div className="space-y-4">
              {members.filter((m) => m.role === "líder").map((leader) => (
                <div key={`leader-${leader.uid}`} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                      {leader.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">{leader.name}</div>
                      <div className="text-[10px] text-blue-300 font-semibold uppercase">Líder Ministerial</div>
                    </div>
                  </div>

                  {isDeptLeader && leader.uid !== user?.uid && (
                    <button
                      onClick={() => handleToggleLeaderRole(leader)}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                      title="Remover status de líder deste ministério"
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}

              {members.filter((m) => m.role === "líder").length === 0 && (
                <p className="text-xs text-slate-400 italic">Nenhum líder atribuído a este ministério.</p>
              )}
            </div>
          </section>

          {/* Lista de Integrantes */}
          <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Integrantes ({members.length})
              </h3>
              {isDeptLeader && (
                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + Adicionar
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {members.map((member) => (
                <div
                  key={`member-${member.uid}`}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs shrink-0">
                      {member.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {member.name}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 truncate">
                        {getRoleLabels(member)}
                      </div>
                    </div>
                  </div>

                  {isDeptLeader && member.role !== "líder" && (
                    <button
                      onClick={() => handleToggleLeaderRole(member)}
                      className="text-[10px] font-bold text-blue-700 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity hover:underline cursor-pointer shrink-0"
                    >
                      Tornar Líder
                    </button>
                  )}
                </div>
              ))}

              {members.length === 0 && (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  Nenhum integrante cadastrado neste ministério.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* MODAL: ADICIONAR INTEGRANTE AO MINISTÉRIO */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative border border-slate-100 dark:border-slate-800"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100">
                Adicionar Integrante ao Ministério
              </h3>
              <button
                onClick={() => setIsAddMemberModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemberToMinistry} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Selecione o Membro da Igreja *
                </label>
                <select
                  required
                  value={selectedMemberToAdd}
                  onChange={(e) => setSelectedMemberToAdd(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                >
                  <option value="">Selecione um membro...</option>
                  {allChurchMembers
                    .filter((m) => !members.some((ex) => ex.uid === m.uid))
                    .map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Papel Inicial no Ministério
                </label>
                <select
                  value={selectedRoleToAdd}
                  onChange={(e) => setSelectedRoleToAdd(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                >
                  <option value="membro">Integrante / Voluntário</option>
                  <option value="leader">Líder do Ministério</option>
                  {ministryDef.defaultRoles?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMember}
                  className="flex-1 py-3 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {savingMember ? "Adicionando..." : "Adicionar"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: NOVA BANDA */}
      {isBandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-sm p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800"
          >
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
              Nova Banda de Louvor
            </h3>
            <form onSubmit={handleSaveBand} className="space-y-4">
              <input
                required
                type="text"
                placeholder="Nome da banda (ex: Banda Shekinah)"
                value={bandName}
                onChange={(e) => setBandName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsBandModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBand}
                  className="flex-1 py-2.5 rounded-xl bg-blue-800 text-white font-bold text-xs disabled:opacity-50"
                >
                  {savingBand ? "Salvando..." : "Salvar Banda"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
