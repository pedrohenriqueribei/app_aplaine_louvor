"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  UserPlus,
  Search,
  Edit2,
  Shield,
  User,
  CheckCircle2,
  XCircle,
  Bell,
  Link2,
  Mic,
  Music,
  Check,
  Users,
  Send,
  Eye,
  Cake,
  Calendar,
} from "lucide-react";
import { BallerinaIcon } from "@/components/BallerinaIcon";
import { SentBroadcastsManager } from "@/components/SentBroadcastsManager";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { motion } from "motion/react";
import {
  formatPhone,
  formatBirthDate,
  parseBirthDateToTimestamp,
  formatBirthDateInput,
  formatScheduleDate,
  parseScheduleDateToTime,
} from "@/lib/utils";

interface Member {
  uid: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  dataNascimento?: Date | Timestamp | string | null;
  instruments?: string[];
  phone?: string;
  vocalRange?: string;
  level?: "aprendiz" | "intermediário" | "experiente";
  churchId?: string;
  fcmTokens?: string[];
  roles?: {
    worship?: string[];
    multimedia?: string[];
    secretariat?: string[];
    dance?: string[];
  };
  danceStyles?: string[];
}

export default function MembersPage() {
  const { user, userData, isSuperAdmin } = useAuth();
  const [userProfile, setUserProfile] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberLastSchedules, setMemberLastSchedules] = useState<Record<string, { date: string; formatted: string }>>({});
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
  const [selectedChurchForLink, setSelectedChurchForLink] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "worship" | "multimedia" | "dance" | "secretariat">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isSentBroadcastsModalOpen, setIsSentBroadcastsModalOpen] = useState(false);
  const [broadcastData, setBroadcastData] = useState({
    title: "",
    body: "",
    churchOnly: true,
  });
  const [broadcastRecipients, setBroadcastRecipients] = useState<string[]>([]);
  const [selectAllRecipients, setSelectAllRecipients] = useState(true);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [showRecipientsList, setShowRecipientsList] = useState(false);
  const [excludedUserIds, setExcludedUserIds] = useState<string[]>([]);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [searchUnlinkedTerm, setSearchUnlinkedTerm] = useState("");
  const [unlinkedUsers, setUnlinkedUsers] = useState<Member[]>([]);
  const [isSearchingUnlinked, setIsSearchingUnlinked] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dataNascimento: "",
    instruments: [] as string[],
    vocalRange: "",
    level: "" as "aprendiz" | "intermediário" | "experiente" | "",
    churchId: "",
    status: "active" as "active" | "inactive",
    roles: { worship: [], multimedia: [], secretariat: [], dance: [] } as {
      worship: string[];
      multimedia: string[];
      secretariat: string[];
      dance: string[];
    },
    danceStyles: [] as string[],
  });

  const worshipRolesList = [
    { id: "leader", label: "Líder de Louvor" },
    { id: "instrumentist", label: "Instrumentista/Vocal" },
  ];
  const multimediaRolesList = [
    { id: "multimedia_leader", label: "Líder de Multimídia" },
    { id: "audio_operator", label: "Operador de Áudio" },
    { id: "pc_operator", label: "Operador de PC" },
    { id: "social_media_operator", label: "Operador de Redes Sociais" },
    { id: "camera_operator", label: "Camera Man (Woman)" },
    { id: "photography_operator", label: "Fotografia" },
    // Keep legacy roles mapped for backward compatibility
    { id: "audio_tech", label: "Técnico de Áudio (Legado)" },
    { id: "projection_operator", label: "Projeção (Legado)" },
    { id: "media_creator", label: "Mídia / Foto (Legado)" },
    { id: "social_media_manager", label: "Social Media (Legado)" },
  ];
  const secretariatRolesList = [{ id: "admin", label: "Secretário" }];
  const danceRolesList = [
    { id: "dance_leader", label: "Líder de Dança" },
    { id: "dancer", label: "Dançarino(a)" },
    { id: "choreographer", label: "Coreógrafo(a)" },
    { id: "costume_manager", label: "Figurino" },
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

  const handleRoleToggle = (
    department: "worship" | "multimedia" | "secretariat" | "dance",
    roleId: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      roles: {
        ...prev.roles,
        [department]: prev.roles?.[department]?.includes(roleId)
          ? prev.roles[department].filter((id) => id !== roleId)
          : [...(prev.roles?.[department] || []), roleId],
      },
    }));
  };

  const [dynamicInstruments, setDynamicInstruments] = useState<any[]>([
    { id: "acousticGuitarist", label: "Violão", value: "Violão" },
    { id: "electricGuitarist", label: "Guitarra", value: "Guitarra" },
    { id: "bassist", label: "Baixo", value: "Baixo" },
    { id: "drummer", label: "Bateria", value: "Bateria" },
    { id: "keyboardist", label: "Teclado", value: "Teclado" },
    { id: "mainMinister", label: "Voz", value: "Voz" },
    { id: "percussao", label: "Percussão", value: "Percussão" },
  ]);

  const [dynamicMultimediaRoles, setDynamicMultimediaRoles] = useState<any[]>([
    { id: "multimedia_leader", label: "Líder de Multimídia" },
    { id: "pc_operator", label: "Operador de PC" },
    { id: "social_media_operator", label: "Operador de Redes Sociais" },
    { id: "photography_operator", label: "Fotógrafo" },
    { id: "camera_operator", label: "Operador de Câmera" },
    { id: "audio_operator", label: "Operador de Áudio" },
    { id: "audio_tech", label: "Técnico de Áudio (Legado)" },
    { id: "projection_operator", label: "Projeção (Legado)" },
    { id: "media_creator", label: "Mídia / Foto (Legado)" },
    { id: "social_media_manager", label: "Social Media (Legado)" },
  ]);

  const loadChurchWorshipInstruments = async (cId: string) => {
    if (!cId) {
      setDynamicInstruments([
        { id: "acousticGuitarist", label: "Violão", value: "Violão" },
        { id: "electricGuitarist", label: "Guitarra", value: "Guitarra" },
        { id: "bassist", label: "Baixo", value: "Baixo" },
        { id: "drummer", label: "Bateria", value: "Bateria" },
        { id: "keyboardist", label: "Teclado", value: "Teclado" },
        { id: "mainMinister", label: "Voz", value: "Voz" },
        { id: "percussao", label: "Percussão", value: "Percussão" },
      ]);
      return;
    }
    try {
      const worshipDoc = await getDoc(doc(db, "services", `worship_scale_config_${cId}`));
      const defaultInstruments = [
        { id: "acousticGuitarist", label: "Violão", value: "Violão" },
        { id: "electricGuitarist", label: "Guitarra", value: "Guitarra" },
        { id: "bassist", label: "Baixo", value: "Baixo" },
        { id: "drummer", label: "Bateria", value: "Bateria" },
        { id: "keyboardist", label: "Teclado", value: "Teclado" },
        { id: "mainMinister", label: "Voz", value: "Voz" },
      ];
      if (worshipDoc.exists()) {
        const data = worshipDoc.data();
        const availableKeys = data.availableInstruments || [];
        const customRoleMetadata = data.customRoleMetadata || {};
        
        const mapping: Record<string, { label: string; value: string }> = {
          mainMinister: { label: "Ministro de Louvor", value: "Voz" },
          keyboardist: { label: "Teclado", value: "Teclado" },
          acousticGuitarist: { label: "Violão", value: "Violão" },
          electricGuitarist: { label: "Guitarra", value: "Guitarra" },
          bassist: { label: "Baixo", value: "Baixo" },
          drummer: { label: "Bateria", value: "Bateria" },
        };

        const finalInstruments: { id: string; label: string; value: string }[] = [];
        
        availableKeys.forEach((key: string) => {
          if (mapping[key]) {
            finalInstruments.push({ id: key, label: mapping[key].label, value: mapping[key].value });
          } else if (key.startsWith("custom_instrument_")) {
            const customLabel = customRoleMetadata[key]?.label || key;
            finalInstruments.push({ id: key, label: customLabel, value: customLabel });
          } else {
            const labels: Record<string, string> = {
              soprano: "Sopranoist (Vocal)",
              contralto: "Contraltoist (Vocal)",
              baritone: "Baritonoist (Vocal)",
              mezzoSoprano: "Mezzo-Sopranoist (Vocal)"
            };
            const lbl = labels[key] || key;
            finalInstruments.push({ id: key, label: lbl, value: key });
          }
        });

        if (finalInstruments.length > 0) {
          setDynamicInstruments(finalInstruments);
        } else {
          setDynamicInstruments(defaultInstruments);
        }
      } else {
        setDynamicInstruments(defaultInstruments);
      }
    } catch (error) {
      console.error("Error loading church instruments:", error);
    }
  };

  const loadChurchMultimediaRoles = async (cId: string) => {
    if (!cId) {
      setDynamicMultimediaRoles([
        { id: "multimedia_leader", label: "Líder de Multimídia" },
        { id: "pc_operator", label: "Operador de PC" },
        { id: "social_media_operator", label: "Operador de Redes Sociais" },
        { id: "photography_operator", label: "Fotógrafo" },
        { id: "camera_operator", label: "Operador de Câmera" },
        { id: "audio_operator", label: "Operador de Áudio" },
        { id: "audio_tech", label: "Técnico de Áudio (Legado)" },
        { id: "projection_operator", label: "Projeção (Legado)" },
        { id: "media_creator", label: "Mídia / Foto (Legado)" },
        { id: "social_media_manager", label: "Social Media (Legado)" },
      ]);
      return;
    }
    try {
      const multimediaDoc = await getDoc(doc(db, "services", `multimedia_scale_config_${cId}`));
      const defaultRoles = [
        { id: "multimedia_leader", label: "Líder de Multimídia" },
        { id: "pc_operator", label: "Operador de PC" },
        { id: "social_media_operator", label: "Operador de Redes Sociais" },
        { id: "photography_operator", label: "Fotógrafo" },
        { id: "camera_operator", label: "Operador de Câmera" },
        { id: "audio_operator", label: "Operador de Áudio" },
      ];
      if (multimediaDoc.exists()) {
        const data = multimediaDoc.data();
        const customRoleMetadata = data.customRoleMetadata || {};
        const rolesConfig = data.roles || {
          pcOperator: { enabled: true, count: 2 },
          socialMediaOperator: { enabled: true, count: 1 },
          photographyOperator: { enabled: true, count: 2 },
          cameraOperator: { enabled: true, count: 1 },
        };

        const mappedKeys: Record<string, { id: string; label: string }> = {
          pcOperator: { id: "pc_operator", label: "Operador de PC" },
          socialMediaOperator: { id: "social_media_operator", label: "Operador de Redes Sociais" },
          photographyOperator: { id: "photography_operator", label: "Fotógrafo" },
          cameraOperator: { id: "camera_operator", label: "Operador de Câmera" },
        };

        const finalRoles: { id: string; label: string }[] = [];
        
        finalRoles.push({ id: "multimedia_leader", label: "Líder de Multimídia" });
        finalRoles.push({ id: "audio_operator", label: "Operador de Áudio" });

        Object.entries(rolesConfig).forEach(([key, configVal]: [string, any]) => {
          if (configVal && configVal.enabled) {
            if (mappedKeys[key]) {
              if (!finalRoles.some(r => r.id === mappedKeys[key].id)) {
                finalRoles.push(mappedKeys[key]);
              }
            } else {
              const customLabel = customRoleMetadata[key]?.label || key;
              finalRoles.push({ id: key, label: customLabel });
            }
          }
        });
        
        setDynamicMultimediaRoles(finalRoles);
      } else {
        setDynamicMultimediaRoles(defaultRoles);
      }
    } catch (error) {
      console.error("Error loading church multimedia roles:", error);
    }
  };

  useEffect(() => {
    loadChurchWorshipInstruments(formData.churchId);
    loadChurchMultimediaRoles(formData.churchId);
  }, [formData.churchId]);

  const vocalRanges = [
    "Soprano",
    "Contralto",
    "Mezzo",
    "Baixo",
    "Tenor",
    "Barítono",
  ];

  const levelList = ["aprendiz", "intermediário", "experiente"];

  const toggleInstrument = (inst: string) => {
    setFormData((prev) => ({
      ...prev,
      instruments: prev.instruments.includes(inst)
        ? prev.instruments.filter((i) => i !== inst)
        : [...prev.instruments, inst],
    }));
  };

  useEffect(() => {
    async function init() {
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, "users", user.uid));
          if (profileDoc.exists()) {
            const profile = {
              uid: profileDoc.id,
              ...profileDoc.data(),
            } as Member;
            setUserProfile(profile);
            // Only fetch members if we have a churchId or if we are a leader or superAdmin
            const isLeader = profile.roles?.worship?.includes("leader") || profile.roles?.multimedia?.includes("leader") || profile.roles?.secretariat?.includes("leader");
            if (profile.churchId || isLeader || isSuperAdmin) {
              await fetchMembers(profile.churchId);
            } else {
              setMembers([]);
              setLoading(false);
            }
          } else {
            await fetchMembers();
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          await fetchMembers();
        }
        await fetchChurches();
      }
    }
    init();
  }, [user, isSuperAdmin]);

  async function fetchChurches() {
    if (!user) return;
    try {
      if (isSuperAdmin) {
        const snap = await getDocs(collection(db, "churches"));
        setChurches(
          snap.docs.map((doc) => ({ id: doc.id, name: doc.data().name }))
        );
      } else {
        const profileDoc = await getDoc(doc(db, "users", user.uid));
        if (profileDoc.exists()) {
          const churchId = profileDoc.data().churchId;
          if (churchId) {
            const churchDoc = await getDoc(doc(db, "churches", churchId));
            if (churchDoc.exists()) {
              setChurches([{ id: churchDoc.id, name: churchDoc.data().name }]);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error fetching churches:", e);
    }
  }

  async function fetchSchedules(churchId?: string) {
    setSchedulesLoading(true);
    try {
      const targetChurchId = churchId || (!isSuperAdmin ? userProfile?.churchId : undefined);
      let schedQ;
      if (targetChurchId) {
        schedQ = query(
          collection(db, "schedules"),
          where("churchId", "==", targetChurchId)
        );
      } else {
        schedQ = collection(db, "schedules");
      }

      const schedSnap = await getDocs(schedQ);
      const lastScheduleMap: Record<string, { date: string; formatted: string }> = {};

      schedSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const dateStr = data.date;
        if (!dateStr) return;

        const schedTime = parseScheduleDateToTime(dateStr);
        const formatted = formatScheduleDate(dateStr);
        if (!schedTime) return;

        // Coleta todos os IDs de membros escalados
        const uidsInSchedule = new Set<string>();
        if (Array.isArray(data.members)) {
          data.members.forEach((m: any) => {
            if (typeof m === "string" && m) uidsInSchedule.add(m);
          });
        }
        if (data.roles && typeof data.roles === "object") {
          Object.values(data.roles).forEach((val: any) => {
            if (typeof val === "string" && val) uidsInSchedule.add(val);
            if (Array.isArray(val)) {
              val.forEach((m: any) => {
                if (typeof m === "string" && m) uidsInSchedule.add(m);
              });
            }
          });
        }

        uidsInSchedule.forEach((uid) => {
          const existing = lastScheduleMap[uid];
          if (!existing || schedTime > parseScheduleDateToTime(existing.date)) {
            lastScheduleMap[uid] = {
              date: dateStr,
              formatted,
            };
          }
        });
      });

      setMemberLastSchedules(lastScheduleMap);
    } catch (err) {
      console.warn("Could not load schedules for members:", err);
    } finally {
      setSchedulesLoading(false);
    }
  }

  async function fetchMembers(churchId?: string) {
    setLoading(true);
    try {
      const targetChurchId = churchId || (!isSuperAdmin ? userProfile?.churchId : undefined);
      let q;

      const isLeader = userProfile?.roles?.worship?.includes("leader") || userProfile?.roles?.multimedia?.includes("leader") || userProfile?.roles?.secretariat?.includes("leader");
      if (isSuperAdmin) {
        q = query(collection(db, "users"), orderBy("name", "asc"));
      } else if (isLeader) {
        if (targetChurchId) {
          q = query(
            collection(db, "users"),
            where("churchId", "==", targetChurchId),
            orderBy("name", "asc"),
          );
        } else {
          q = query(collection(db, "users"), orderBy("name", "asc"));
        }
      } else {
        q = query(
          collection(db, "users"),
          where("churchId", "==", targetChurchId || ""),
          orderBy("name", "asc"),
        );
      }

      const snap = await getDocs(q);
      const uniqueDocs = Array.from(
        new Map(snap.docs.map((doc) => [doc.id, { ...doc.data(), uid: doc.id } as Member])).values()
      );
      setMembers(uniqueDocs);
      fetchSchedules(targetChurchId);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, "users");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const worshipRoles = formData.roles?.worship || [];
      let multimediaRoles = formData.roles?.multimedia || [];
      const secretariatRoles = formData.roles?.secretariat || [];
      let danceRoles = formData.roles?.dance || [];

      // Sync "leader" with the presence of "multimedia_leader"
      if (multimediaRoles.includes("multimedia_leader")) {
        if (!multimediaRoles.includes("leader")) {
          multimediaRoles = [...multimediaRoles, "leader"];
        }
      } else {
        multimediaRoles = multimediaRoles.filter((r) => r !== "leader");
      }

      // Sync "leader" with the presence of "dance_leader"
      if (danceRoles.includes("dance_leader")) {
        if (!danceRoles.includes("leader")) {
          danceRoles = [...danceRoles, "leader"];
        }
      } else if (!worshipRoles.includes("leader") && !multimediaRoles.includes("leader") && !secretariatRoles.includes("leader")) {
        danceRoles = danceRoles.filter((r) => r !== "leader");
      }

      const finalRoles = {
        worship: worshipRoles,
        multimedia: multimediaRoles,
        secretariat: secretariatRoles,
        dance: danceRoles,
      };

      const birthDateTimestamp = parseBirthDateToTimestamp(formData.dataNascimento);

      const finalPayload = {
        ...formData,
        dataNascimento: birthDateTimestamp,
        roles: finalRoles,
      };

      if (editingMember) {
        await updateDoc(doc(db, "users", editingMember.uid), {
          ...finalPayload,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid,
        });
      } else {
        const newUid = `user_${Date.now()}`;
        await setDoc(doc(db, "users", newUid), {
          uid: newUid,
          ...finalPayload,
          createdAt: serverTimestamp(),
          createdBy: user?.uid,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid,
        });
      }
      setIsModalOpen(false);
      setEditingMember(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        dataNascimento: "",
        instruments: [],
        vocalRange: "",
        level: "",
        churchId: "",
        status: "active",
        roles: { worship: [], multimedia: [], secretariat: [], dance: [] },
        danceStyles: [],
      });
      fetchMembers(userProfile?.churchId);
    } catch (err) {
      handleFirestoreError(
        err,
        editingMember ? OperationType.UPDATE : OperationType.CREATE,
        `users/${editingMember?.uid || "new"}`,
      );
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.instruments &&
        m.instruments.some((inst) =>
          inst.toLowerCase().includes(searchTerm.toLowerCase()),
        )) ||
      (m.roles?.worship &&
        m.roles.worship.some((inst) =>
          inst.toLowerCase().includes(searchTerm.toLowerCase()),
        )) ||
      (m.roles?.multimedia &&
        m.roles.multimedia.some((skill) =>
          skill.toLowerCase().includes(searchTerm.toLowerCase()),
        )) ||
      (m.roles?.dance &&
        m.roles.dance.some((skill) =>
          skill.toLowerCase().includes(searchTerm.toLowerCase()),
        )) ||
      (m.danceStyles &&
        m.danceStyles.some((st) =>
          st.toLowerCase().includes(searchTerm.toLowerCase()),
        )),
  );

  const displayedMembers = filteredMembers.filter((m) => {
    if (activeTab === "all") return true;
    if (activeTab === "worship") return (m.roles?.worship?.length ?? 0) > 0;
    if (activeTab === "multimedia") return (m.roles?.multimedia?.length ?? 0) > 0;
    if (activeTab === "dance") return (m.roles?.dance?.length ?? 0) > 0 || (m.danceStyles?.length ?? 0) > 0;
    if (activeTab === "secretariat") return (m.roles?.secretariat?.length ?? 0) > 0;
    return true;
  });

  const allCount = filteredMembers.length;
  const worshipCount = filteredMembers.filter(m => (m.roles?.worship?.length ?? 0) > 0).length;
  const multimediaCount = filteredMembers.filter(m => (m.roles?.multimedia?.length ?? 0) > 0).length;
  const danceCount = filteredMembers.filter(m => (m.roles?.dance?.length ?? 0) > 0 || (m.danceStyles?.length ?? 0) > 0).length;
  const secretariatCount = filteredMembers.filter(m => (m.roles?.secretariat?.length ?? 0) > 0).length;

  // Definições de Categorias de Destinatários para Comunicados
  const BASE_RECIPIENT_CATEGORIES = [
    // Louvor - Instrumentistas
    { id: "drummer", label: "Bateristas", group: "instruments" },
    { id: "guitarist", label: "Guitarristas", group: "instruments" },
    { id: "bassist", label: "Baixistas", group: "instruments" },
    { id: "keyboardist", label: "Tecladistas", group: "instruments" },
    { id: "acousticGuitarist", label: "Violonistas", group: "instruments" },
    { id: "percussionist", label: "Percussionistas", group: "instruments" },

    // Louvor - Vozes & Vocais (Soprano, Contralto, Mezzo, etc.)
    { id: "soprano", label: "Soprano", group: "vocals" },
    { id: "contralto", label: "Contralto", group: "vocals" },
    { id: "mezzo", label: "Mezzo", group: "vocals" },
    { id: "tenor", label: "Tenor", group: "vocals" },
    { id: "baritone", label: "Barítono", group: "vocals" },
    { id: "leadVocal", label: "Voz / Ministros", group: "vocals" },

    // Outros Ministérios
    { id: "dance", label: "Ministério de Dança", group: "ministries" },
    { id: "multimedia", label: "Multimídia / Mídia", group: "ministries" },
    { id: "leaders", label: "Líderes de Ministérios", group: "ministries" },
  ];

  const isMemberInRecipientCategory = (member: Member, categoryId: string): boolean => {
    const instruments = (member.instruments || []).map((i) => i.toLowerCase().trim());
    const vocalRange = (member.vocalRange || "").toLowerCase().trim();
    const worshipRoles = (member.roles?.worship || []).map((r) => r.toLowerCase().trim());
    const danceRoles = (member.roles?.dance || []).map((r) => r.toLowerCase().trim());
    const multimediaRoles = (member.roles?.multimedia || []).map((r) => r.toLowerCase().trim());
    const secretariatRoles = (member.roles?.secretariat || []).map((r) => r.toLowerCase().trim());
    const danceStyles = member.danceStyles || [];

    switch (categoryId) {
      case "drummer":
        return instruments.some((i) => i.includes("bater") || i.includes("drum"));
      case "guitarist":
        return instruments.some((i) => i.includes("guitar"));
      case "bassist":
        return instruments.some((i) => i.includes("baix") || i.includes("bass"));
      case "keyboardist":
        return instruments.some((i) => i.includes("tecla") || i.includes("keyb") || i.includes("piano"));
      case "acousticGuitarist":
        return instruments.some((i) => i.includes("viol") || i.includes("acoust"));
      case "percussionist":
        return instruments.some((i) => i.includes("percuss"));
      case "soprano":
        return (
          (vocalRange.includes("soprano") && !vocalRange.includes("mezzo")) ||
          instruments.some((i) => i.includes("soprano") && !i.includes("mezzo"))
        );
      case "contralto":
        return (
          vocalRange.includes("contralto") ||
          instruments.some((i) => i.includes("contralto"))
        );
      case "mezzo":
        return (
          vocalRange.includes("mezzo") ||
          instruments.some((i) => i.includes("mezzo"))
        );
      case "tenor":
        return (
          vocalRange.includes("tenor") ||
          instruments.some((i) => i.includes("tenor"))
        );
      case "baritone":
        return (
          vocalRange.includes("barit") ||
          vocalRange.includes("barít") ||
          instruments.some((i) => i.includes("barit") || i.includes("barít"))
        );
      case "leadVocal":
        return (
          instruments.some((i) => i.includes("voz") || i.includes("vocal") || i.includes("minist") || i.includes("cantor")) ||
          worshipRoles.includes("leader") ||
          Boolean(vocalRange)
        );
      case "dance":
        return danceRoles.length > 0 || danceStyles.length > 0;
      case "multimedia":
        return multimediaRoles.length > 0;
      case "leaders":
        return (
          worshipRoles.includes("leader") ||
          multimediaRoles.includes("leader") ||
          multimediaRoles.includes("multimedia_leader") ||
          danceRoles.includes("leader") ||
          danceRoles.includes("dance_leader") ||
          secretariatRoles.includes("leader")
        );
      default:
        if (categoryId.startsWith("custom_")) {
          const rawName = categoryId.replace("custom_", "").toLowerCase();
          return instruments.some((i) => i.includes(rawName));
        }
        return false;
    }
  };

  // Instrumentos dinâmicos extras cadastrados pela igreja
  const customRecipientCategories = dynamicInstruments
    .filter((inst) => {
      const val = (inst.value || inst.id || "").toLowerCase();
      return !["drummer", "bateria", "guitarra", "electricguitarist", "baixo", "bassist", "teclado", "keyboardist", "violão", "acousticguitarist", "voz", "mainminister", "percussão", "percussao"].includes(val);
    })
    .map((inst) => ({
      id: `custom_${inst.value || inst.id}`,
      label: inst.label || inst.value,
      group: "custom" as const,
    }));

  const eligibleBroadcastMembers = members.filter(
    (m) => (!broadcastData.churchOnly || m.churchId === userProfile?.churchId) && m.status === "active"
  );

  const targetBroadcastMembers = (
    selectAllRecipients
      ? eligibleBroadcastMembers
      : eligibleBroadcastMembers.filter((m) =>
          broadcastRecipients.some((catId) => isMemberInRecipientCategory(m, catId))
        )
  ).filter((m) => !excludedUserIds.includes(m.uid));

  const toggleRecipientCategory = (catId: string) => {
    if (selectAllRecipients) {
      setSelectAllRecipients(false);
      setBroadcastRecipients([catId]);
      setExcludedUserIds([]);
    } else {
      setBroadcastRecipients((prev) =>
        prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
      );
      setExcludedUserIds([]);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectAllRecipients) {
      setSelectAllRecipients(false);
      setBroadcastRecipients([]);
    } else {
      setSelectAllRecipients(true);
      setBroadcastRecipients([]);
      setExcludedUserIds([]);
    }
  };

  const handleSelectGroup = (group: "instruments" | "vocals" | "ministries") => {
    setSelectAllRecipients(false);
    const groupCatIds = BASE_RECIPIENT_CATEGORIES.filter((c) => c.group === group).map((c) => c.id);
    setBroadcastRecipients((prev) => {
      const allIn = groupCatIds.every((id) => prev.includes(id));
      if (allIn) {
        return prev.filter((id) => !groupCatIds.includes(id));
      } else {
        return Array.from(new Set([...prev, ...groupCatIds]));
      }
    });
    setExcludedUserIds([]);
  };

  const toggleExcludeUser = (uid: string) => {
    setExcludedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (targetBroadcastMembers.length === 0) {
        alert("Por favor, selecione para quem o comunicado deverá ser enviado (ao menos um destinatário).");
        return;
      }

      setIsSendingBroadcast(true);

      const broadcastId = `bcast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const targetUserIds = targetBroadcastMembers.map((m) => m.uid);

      // Prepara lista detalhada de destinatários para acompanhamento em tempo real
      const recipientsStatus = targetBroadcastMembers.map((m) => {
        const notifId = `broadcast_${broadcastId}_${m.uid}`;
        return {
          uid: m.uid,
          name: m.name,
          email: m.email || "",
          phone: m.phone || "",
          vocalRange: m.vocalRange || "",
          instruments: m.instruments || [],
          roles: m.roles || {},
          notifId,
          read: false,
        };
      });

      // Rótulos legíveis das categorias alvo
      const targetCategoryLabels = selectAllRecipients
        ? ["Todos os Integrantes"]
        : broadcastRecipients.map((catId) => {
            const found = [...BASE_RECIPIENT_CATEGORIES, ...customRecipientCategories].find((c) => c.id === catId);
            return found ? found.label : catId;
          });

      // 1. Salva registro mestre do comunicado na coleção 'broadcasts'
      await setDoc(doc(db, "broadcasts", broadcastId), {
        id: broadcastId,
        churchId: userProfile?.churchId || userData?.churchId || "",
        senderId: user?.uid || "",
        senderName: userProfile?.name || userData?.name || user?.displayName || "Líder",
        title: broadcastData.title.trim(),
        body: broadcastData.body.trim(),
        targetCategories: targetCategoryLabels,
        recipientUids: targetUserIds,
        recipients: recipientsStatus,
        status: "sent",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Salva notificações individuais no Firestore com broadcastId e senderId
      const savePromises = targetBroadcastMembers.map(async (m) => {
        const notifId = `broadcast_${broadcastId}_${m.uid}`;
        return setDoc(doc(db, "notifications", notifId), {
          id: notifId,
          broadcastId,
          senderId: user?.uid || "",
          churchId: userProfile?.churchId || userData?.churchId || "",
          userId: m.uid,
          title: broadcastData.title.trim(),
          body: broadcastData.body.trim(),
          type: "broadcast",
          read: false,
          createdAt: serverTimestamp(),
        });
      });
      await Promise.all(savePromises);

      const targetTokens: string[] = [];
      targetBroadcastMembers.forEach((m) => {
        if (Array.isArray(m.fcmTokens)) {
          targetTokens.push(
            ...m.fcmTokens.filter((t) => typeof t === "string" && t.length > 0)
          );
        }
      });

      if (targetUserIds.length > 0 && user) {
        try {
          await fetch("/api/notifications/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
            body: JSON.stringify({
              title: broadcastData.title.trim(),
              body: broadcastData.body.trim(),
              userIds: targetUserIds,
              tokens: targetTokens,
            }),
          });
        } catch (pushErr) {
          console.warn("FCM push notification optional warning:", pushErr);
        }
      }

      setIsBroadcastModalOpen(false);
      setBroadcastData({ title: "", body: "", churchOnly: true });
      setBroadcastRecipients([]);
      setSelectAllRecipients(true);
      setExcludedUserIds([]);
      setShowRecipientsList(false);

      // Abre automaticamente o gerenciador de comunicados para visualização do status
      setIsSentBroadcastsModalOpen(true);
    } catch (err) {
      console.error("Error sending broadcast:", err);
      alert("Erro ao enviar comunicado. Verifique a conexão e tente novamente.");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const searchUnlinked = async () => {
    if (!searchUnlinkedTerm.trim()) return;
    setIsSearchingUnlinked(true);
    try {
      const q = query(collection(db, "users"), where("churchId", "==", ""));
      const snap = await getDocs(q);
      const results = snap.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }) as Member)
        .filter((m) =>
          m.name.toLowerCase().includes(searchUnlinkedTerm.toLowerCase()),
        );

      setUnlinkedUsers(results);
    } catch (err) {
      console.error("Error searching unlinked users:", err);
    } finally {
      setIsSearchingUnlinked(false);
    }
  };

  const handleLinkUser = async (targetUser: Member) => {
    const finalChurchId = isSuperAdmin ? selectedChurchForLink : userProfile?.churchId;
    if (!finalChurchId) {
      alert(
        isSuperAdmin 
          ? "Por favor, selecione uma igreja para vincular o membro."
          : "Você precisa estar vinculado a uma igreja para vincular outros membros."
      );
      return;
    }

    try {
      await updateDoc(doc(db, "users", targetUser.uid), {
        churchId: finalChurchId,
        role: "instrumentista",
        status: "active",
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
      });
      setIsLinkModalOpen(false);
      setSearchUnlinkedTerm("");
      setUnlinkedUsers([]);
      fetchMembers(finalChurchId);
      alert(`${targetUser.name} foi vinculado com sucesso!`);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `users/${targetUser.uid}`,
      );
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 sm:gap-6">
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-800 transition-colors" />
          <input
            type="text"
            placeholder="Buscar integrante..."
            className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-800 transition-all text-slate-700 dark:text-slate-200 outline-none shadow-sm text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          {(userProfile?.roles?.worship?.includes("leader") || userProfile?.roles?.multimedia?.includes("leader") || userProfile?.roles?.secretariat?.includes("leader") || userProfile?.roles?.dance?.includes("leader") || userProfile?.roles?.dance?.includes("dance_leader") || isSuperAdmin) && (
            <>
              {/* Botões de Comunicado agrupados e responsivos */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5 flex-1 sm:flex-initial">
                <button
                  type="button"
                  onClick={() => {
                    setBroadcastData({ title: "", body: "", churchOnly: true });
                    setBroadcastRecipients([]);
                    setSelectAllRecipients(true);
                    setExcludedUserIds([]);
                    setShowRecipientsList(false);
                    setIsBroadcastModalOpen(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3 sm:px-5 py-3 sm:py-3.5 rounded-2xl font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-md sm:shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer text-xs sm:text-sm whitespace-nowrap min-w-0"
                  title="Novo Comunicado"
                >
                  <Bell className="w-4 h-4 shrink-0" />
                  <span className="truncate">Comunicado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSentBroadcastsModalOpen(true)}
                  className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 px-3 sm:px-4 py-3 sm:py-3.5 rounded-2xl font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-xs active:scale-95 cursor-pointer text-xs sm:text-sm whitespace-nowrap min-w-0"
                  title="Visualizar comunicados enviados, ver quem leu e cancelar envios"
                >
                  <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">Ver Enviados</span>
                </button>
              </div>

              {/* Botão Novo Integrante com dropdown */}
              <div className="relative w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                  className="bg-blue-800 hover:bg-blue-900 text-white px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md sm:shadow-xl shadow-blue-800/20 active:scale-95 w-full sm:w-auto text-xs sm:text-sm cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>Novo Integrante</span>
                </button>

                {isAddMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsAddMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 sm:mt-3 w-full sm:w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-2 z-20 overflow-hidden">
                      <button
                        onClick={() => {
                          setEditingMember(null);
                          setFormData({
                            name: "",
                            email: "",
                            phone: "",
                            dataNascimento: "",
                            instruments: [],
                            vocalRange: "",
                            level: "",
                            churchId: userProfile?.churchId || "",
                            status: "active",
                            roles: {
                              worship: [],
                              multimedia: [],
                              secretariat: [],
                              dance: [],
                            },
                            danceStyles: [],
                          });
                          setIsModalOpen(true);
                          setIsAddMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-6 py-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-200 rounded-2xl transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-800">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Registrar Novo</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Criar Cadastro Geral
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setEditingMember(null);
                          setFormData({
                            name: "",
                            email: "",
                            phone: "",
                            dataNascimento: "",
                            instruments: [],
                            vocalRange: "",
                            level: "",
                            churchId: userProfile?.churchId || "",
                            status: "active",
                            roles: {
                              worship: [],
                              multimedia: [],
                              secretariat: [],
                              dance: ["dancer"],
                            },
                            danceStyles: [],
                          });
                          setIsModalOpen(true);
                          setIsAddMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-6 py-4 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-700 dark:text-slate-200 rounded-2xl transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 rounded-xl flex items-center justify-center text-rose-600">
                          <BallerinaIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Ministério de Dança</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Novo Integrante de Dança
                          </p>
                        </div>
                      </button>

                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-4" />

                      <button
                        onClick={() => {
                          setIsLinkModalOpen(true);
                          setIsAddMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-6 py-4 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-700 dark:text-slate-200 rounded-2xl transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center text-amber-600">
                          <Link2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">
                            Vincular Existente
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Buscar por Nome
                          </p>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs para cada ministério */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-900/40 rounded-3xl w-fit border border-slate-200/50 dark:border-slate-800/50">
        {(["all", "worship", "multimedia", "dance", "secretariat"] as const).map((tab) => {
          const isActive = activeTab === tab;
          let label = "Todos";
          let count = allCount;
          let activeTextColorClass = "text-blue-800 dark:text-blue-400";
          let activeBadgeColorClass = "bg-blue-50 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300";

          if (tab === "worship") {
            label = "Ministério de Louvor";
            count = worshipCount;
            activeTextColorClass = "text-blue-800 dark:text-blue-400";
            activeBadgeColorClass = "bg-blue-50 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300";
          } else if (tab === "multimedia") {
            label = "Ministério de Multimídia";
            count = multimediaCount;
            activeTextColorClass = "text-amber-700 dark:text-amber-400";
            activeBadgeColorClass = "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300";
          } else if (tab === "dance") {
            label = "Ministério de Dança";
            count = danceCount;
            activeTextColorClass = "text-rose-700 dark:text-rose-400";
            activeBadgeColorClass = "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300";
          } else if (tab === "secretariat") {
            label = "Secretaria";
            count = secretariatCount;
            activeTextColorClass = "text-emerald-700 dark:text-emerald-400";
            activeBadgeColorClass = "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300";
          }

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative px-5 py-2.5 rounded-2xl text-xs font-bold transition-colors outline-none select-none ${
                isActive
                  ? activeTextColorClass
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/20"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              <div className="flex items-center gap-2 relative z-10">
                <span>{label}</span>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors ${
                  isActive 
                    ? activeBadgeColorClass 
                    : "bg-slate-200/50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400"
                }`}>
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50">
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                Integrante
              </th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                {activeTab === "multimedia" ? "Papéis na Multimídia" : activeTab === "secretariat" ? "Funções na Secretaria" : activeTab === "dance" ? "Funções & Estilos na Dança" : "Vocal / Instrumento"}
              </th>
              <th id="papel-col-header" className="px-10 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                Papel
              </th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedMembers.map((member, mIdx) => (
              <tr
                key={`${member.uid}-${mIdx}`}
                className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-10 py-6 border-b border-dashed border-slate-100 dark:border-slate-800">
                  <Link
                    href={`/dashboard/members/${member.uid}`}
                    className="flex items-center gap-4 hover:opacity-80 transition-opacity group/link"
                  >
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-800 dark:text-blue-400 font-black group-hover/link:bg-blue-100 dark:group-hover/link:bg-blue-900/50 transition-colors">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 group-hover/link:text-blue-800 dark:group-hover/link:text-blue-400 transition-colors">
                        {member.name}
                        {member.status === "active" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
                        )}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        {member.email}
                      </p>
                      <p
                        className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium"
                        title="Data da última escala"
                      >
                        <Calendar className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                        <span>
                          Última escala:{" "}
                          {schedulesLoading ? (
                            <span className="text-slate-400 dark:text-slate-500 animate-pulse">...</span>
                          ) : memberLastSchedules[member.uid]?.formatted ? (
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {memberLastSchedules[member.uid].formatted}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">
                              Nenhuma
                            </span>
                          )}
                        </span>
                      </p>
                      {member.dataNascimento && (
                        <p className="text-[11px] font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1.5 mt-0.5" title="Data de Nascimento (Dia e Mês)">
                          <Cake className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                          <span>{formatBirthDate(member.dataNascimento)}</span>
                        </p>
                      )}
                    </div>
                  </Link>
                </td>
                <td className="px-10 py-6 border-b border-dashed border-slate-100 dark:border-slate-800 text-sm">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(() => {
                        if (activeTab === "dance") {
                          const danceRoles = member.roles?.dance || [];
                          const styles = member.danceStyles || [];
                          if (danceRoles.length > 0 || styles.length > 0) {
                            return (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {danceRoles.map((roleId) => {
                                  const found = danceRolesList.find((r) => r.id === roleId);
                                  const label = found ? found.label : (roleId === "leader" ? "Líder" : roleId);
                                  return (
                                    <span key={roleId} className="font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/50 dark:border-rose-800/50 px-3 py-1 rounded-lg text-[11px]">
                                      {label}
                                    </span>
                                  );
                                })}
                                {styles.map((style) => (
                                  <span key={style} className="font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-[10px]">
                                    {style}
                                  </span>
                                ))}
                              </div>
                            );
                          }
                          return (
                            <span className="text-slate-300 dark:text-slate-700 font-bold">
                              ---
                            </span>
                          );
                        }

                        if (activeTab === "multimedia") {
                          const multimediaRoles = member.roles?.multimedia || [];
                          if (multimediaRoles.length > 0) {
                            return multimediaRoles.map((roleId) => {
                              const foundDynamic = dynamicMultimediaRoles.find((r) => r.id === roleId);
                              const foundStatic = multimediaRolesList.find((r) => r.id === roleId);
                              const label = foundDynamic ? foundDynamic.label : (foundStatic ? foundStatic.label : (roleId === "leader" ? "Líder de Multimídia" : roleId));
                              return (
                                <span key={roleId} className="font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 px-3 py-1 rounded-lg text-[11px]">
                                  {label}
                                </span>
                              );
                            });
                          }
                          return (
                            <span className="text-slate-300 dark:text-slate-700 font-bold">
                              ---
                            </span>
                          );
                        }

                        if (activeTab === "secretariat") {
                          const secretariatRoles = member.roles?.secretariat || [];
                          if (secretariatRoles.length > 0) {
                            return secretariatRoles.map((roleId) => {
                              const found = secretariatRolesList.find((r) => r.id === roleId);
                              const label = found ? found.label : (roleId === "leader" ? "Líder" : roleId);
                              return (
                                <span key={roleId} className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 px-3 py-1 rounded-lg text-[11px]">
                                  {label}
                                </span>
                              );
                            });
                          }
                          return (
                            <span className="text-slate-300 dark:text-slate-700 font-bold">
                              ---
                            </span>
                          );
                        }

                        const vocal = member.vocalRange || "";
                        const insts = member.instruments || [];

                        const hasVocal = vocal.trim().length > 0;
                        const numInst = insts.length;
                        let txt = "";

                        if (hasVocal && numInst > 0) {
                          txt = `${vocal} e ${insts[0]}${numInst > 1 ? ` (+${numInst - 1})` : ""}`;
                        } else if (hasVocal) {
                          txt = vocal;
                        } else if (numInst > 0) {
                          txt = `${insts[0]}${numInst > 1 ? ` (+${numInst - 1})` : ""}`;
                        } else {
                          txt = "---";
                        }

                        return txt !== "---" ? (
                          <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-lg text-[11px]">
                            {txt}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 font-bold">
                            ---
                          </span>
                        );
                      })()}
                    </div>
                    {member.level && (
                      <span className="inline-block w-fit px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded text-[9px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-800">
                        {member.level}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-10 py-6 border-b border-dashed border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 font-sans">
                      {(() => {
                        const isLeader = member.roles?.worship?.includes("leader") || member.roles?.multimedia?.includes("leader") || member.roles?.secretariat?.includes("leader") || member.roles?.dance?.includes("leader") || member.roles?.dance?.includes("dance_leader");
                        if (isLeader) {
                          return (
                            <>
                              <Shield className="w-4 h-4 text-amber-500" />
                              <span>Líder</span>
                            </>
                          );
                        }

                        const isDance = (member.roles?.dance?.length ?? 0) > 0 || (member.danceStyles?.length ?? 0) > 0;
                        if (activeTab === "dance" || (isDance && !member.roles?.worship?.length && !member.roles?.multimedia?.length && !member.roles?.secretariat?.length && !member.instruments?.length && !member.vocalRange)) {
                          return (
                            <>
                              <BallerinaIcon className="w-4 h-4 text-rose-500" />
                              <span>Dança</span>
                            </>
                          );
                        }

                        const isMultimedia = (member.roles?.multimedia?.length ?? 0) > 0;
                        if (isMultimedia) {
                          return (
                            <>
                              <User className="w-4 h-4 text-purple-500" />
                              <span>Multimídia</span>
                            </>
                          );
                        }

                        if ((member.roles?.secretariat?.length ?? 0) > 0) {
                          return (
                            <>
                              <User className="w-4 h-4 text-slate-400" />
                              <span>Secretaria</span>
                            </>
                          );
                        }

                        // Vocal check
                        if (member.vocalRange && member.vocalRange.trim().length > 0) {
                          return (
                            <>
                              <Mic className="w-4 h-4 text-pink-500" />
                              <span>{member.vocalRange}</span>
                            </>
                          );
                        }

                        if (member.instruments?.includes("Voz")) {
                          return (
                            <>
                              <Mic className="w-4 h-4 text-pink-500" />
                              <span>Vocal</span>
                            </>
                          );
                        }

                        return (
                          <>
                            <Music className="w-4 h-4 text-blue-400" />
                            <span>Instrumentista</span>
                          </>
                        );
                      })()}
                    </div>
                    {member.churchId && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider pl-6">
                        {churches.find((c) => c.id === member.churchId)?.name ||
                          "..."}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-10 py-6 border-b border-dashed border-slate-100 dark:border-slate-800 text-right">
                  {(userProfile?.roles?.worship?.includes("leader") || userProfile?.roles?.multimedia?.includes("leader") || userProfile?.roles?.secretariat?.includes("leader") || userProfile?.roles?.dance?.includes("leader") || userProfile?.roles?.dance?.includes("dance_leader") || isSuperAdmin) && (
                    <button
                      onClick={() => {
                        setEditingMember(member);
                        setFormData({
                          name: member.name,
                          email: member.email,
                          phone: formatPhone(member.phone || ""),
                          dataNascimento: formatBirthDate(member.dataNascimento),
                          instruments: member.instruments || [],
                          vocalRange: member.vocalRange || "",
                          level: member.level || "",
                          churchId: member.churchId || "",
                          status: member.status,
                          roles: {
                            worship: member.roles?.worship || [],
                            multimedia: member.roles?.multimedia || [],
                            secretariat: member.roles?.secretariat || [],
                            dance: member.roles?.dance || [],
                          },
                          danceStyles: member.danceStyles || [],
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-3 text-slate-300 dark:text-slate-700 hover:text-blue-800 dark:hover:text-blue-400 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {displayedMembers.length === 0 && !loading && (
          <div className="p-20 text-center">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              Nenhum integrante encontrado neste ministério
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Tente buscar por outro nome ou selecione outra aba.
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-12 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-800/10 blur-[100px] -mr-32 -mt-32"></div>

            <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 mb-10">
              {editingMember ? "Editar Integrante" : "Novo Integrante"}
            </h2>

            <form
              onSubmit={handleSave}
              className="space-y-6 relative z-10 text-sm max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                    Nome Completo
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium text-slate-800 dark:text-slate-100"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                    E-mail
                  </label>
                  <input
                    required
                    type="email"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium text-slate-800 dark:text-slate-100"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    maxLength={15}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium text-slate-800 dark:text-slate-100"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: formatPhone(e.target.value) })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                      <Cake className="w-3.5 h-3.5 text-pink-500" />
                      <span>Data de Nascimento (DD/MM)</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
                  </div>
                  <input
                    type="text"
                    maxLength={5}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium text-slate-800 dark:text-slate-100"
                    value={formData.dataNascimento}
                    onChange={(e) =>
                      setFormData({ ...formData, dataNascimento: formatBirthDateInput(e.target.value) })
                    }
                    placeholder="DD/MM (apenas dia e mês)"
                  />
                  <p className="text-[10px] text-slate-400 pl-1">Ex: 15/04 (não é necessário informar o ano)</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                  Vocal
                </label>
                <div className="flex flex-wrap gap-1">
                  {vocalRanges.map((range) => (
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
                      className={`py-2 px-3 rounded-xl text-[10px] font-bold transition-all border ${
                        formData.vocalRange === range
                          ? "bg-indigo-700 text-white border-indigo-700"
                          : "bg-slate-50 text-slate-600 border-transparent hover:border-indigo-300"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Instrumentos
                </label>
                <div className="flex flex-wrap gap-2">
                  {dynamicInstruments.map((inst) => (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => toggleInstrument(inst.value)}
                      className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border ${
                        formData.instruments.includes(inst.value)
                          ? "bg-blue-800 text-white border-blue-800 shadow-lg shadow-blue-800/20"
                          : "bg-slate-50 text-slate-600 border-transparent hover:border-blue-300"
                      }`}
                    >
                      {inst.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Nível de Habilidade
                </label>
                <div className="flex flex-wrap gap-2">
                  {levelList.map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          level: formData.level === lv ? "" : (lv as any),
                        })
                      }
                      className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border capitalize ${
                        formData.level === lv
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20"
                          : "bg-slate-50 text-slate-600 border-transparent hover:border-emerald-300"
                      }`}
                    >
                      {lv}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Ministério de Louvor
                </label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white outline-none transition-all font-medium appearance-none text-slate-800"
                  value={formData.churchId}
                  onChange={(e) =>
                    setFormData({ ...formData, churchId: e.target.value })
                  }
                >
                  <option value="">Selecione o ministério...</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Permissões e Cargos
                </h3>

                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3 block">
                      Ministério de Louvor
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {worshipRolesList.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => handleRoleToggle("worship", role.id)}
                          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border ${
                            formData.roles.worship?.includes(role.id)
                              ? "bg-blue-800 text-white border-blue-800 shadow-md"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3 block">
                      Multimídia
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {dynamicMultimediaRoles.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() =>
                            handleRoleToggle("multimedia", role.id)
                          }
                          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border ${
                            formData.roles.multimedia?.includes(role.id)
                              ? "bg-amber-600 text-white border-amber-600 shadow-md"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3 block">
                      Secretaria
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {secretariatRolesList.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() =>
                            handleRoleToggle("secretariat", role.id)
                          }
                          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border ${
                            formData.roles.secretariat?.includes(role.id)
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3 block flex items-center gap-1.5">
                      <BallerinaIcon className="w-3.5 h-3.5 text-rose-600" />
                      <span>Ministério de Dança</span>
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {danceRolesList.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() =>
                            handleRoleToggle("dance", role.id)
                          }
                          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border ${
                            formData.roles.dance?.includes(role.id)
                              ? "bg-rose-600 text-white border-rose-600 shadow-md"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>

                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2 block">
                      Estilos & Habilidades Praticadas
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {danceStylesList.map((style) => {
                        const isSelected = formData.danceStyles?.includes(style);
                        return (
                          <button
                            key={style}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                danceStyles: isSelected
                                  ? prev.danceStyles.filter((s) => s !== style)
                                  : [...(prev.danceStyles || []), style],
                              }));
                            }}
                            className={`py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all border ${
                              isSelected
                                ? "bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-950/40 dark:text-rose-300 font-bold"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"
                            }`}
                          >
                            {style}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Status
                </label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white outline-none transition-all font-medium appearance-none text-slate-800"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-8 py-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-[2rem] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-[2rem] transition-all shadow-xl shadow-blue-800/20"
                >
                  {editingMember ? "Salvar Mudanças" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            onClick={() => setIsLinkModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-12 overflow-hidden flex flex-col max-h-[85vh]">
            <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 mb-6">
              Vincular Integrante
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
              Busque por pessoas cadastradas que ainda não fazem parte de nenhum
              ministério.
            </p>

            {isSuperAdmin && (
              <div className="mb-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2 block">
                  Selecione a Igreja de Destino
                </label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800"
                  value={selectedChurchForLink}
                  onChange={(e) => setSelectedChurchForLink(e.target.value)}
                >
                  <option value="">Selecione uma igreja</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative mb-8">
              <input
                type="text"
                placeholder="Nome do integrante..."
                className="w-full pl-6 pr-20 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800"
                value={searchUnlinkedTerm}
                onChange={(e) => setSearchUnlinkedTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchUnlinked()}
              />
              <button
                onClick={searchUnlinked}
                disabled={isSearchingUnlinked}
                className="absolute right-2 top-2 bottom-2 px-6 bg-blue-800 text-white rounded-xl font-bold text-xs hover:bg-blue-900 transition-all disabled:opacity-50"
              >
                {isSearchingUnlinked ? "..." : "Buscar"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {unlinkedUsers.length > 0
                ? unlinkedUsers.map((u, uIdx) => (
                    <div
                      key={`${u.uid}-${uIdx}`}
                      className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group"
                    >
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">
                          {u.name}
                        </p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                      <button
                        onClick={() => handleLinkUser(u)}
                        className="px-4 py-2 bg-blue-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-lg shadow-blue-800/10"
                      >
                        Vincular
                      </button>
                    </div>
                  ))
                : searchUnlinkedTerm &&
                  !isSearchingUnlinked && (
                    <div className="text-center py-10 opacity-50">
                      <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p className="text-sm font-medium">
                        Ninguém encontrado sem ministério.
                      </p>
                    </div>
                  )}
            </div>

            <div className="mt-8">
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div
            onClick={() => !isSendingBroadcast && setIsBroadcastModalOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl p-6 sm:p-9 md:p-10 overflow-hidden my-auto border border-slate-100 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-800 dark:text-slate-100">
                    Enviar Comunicado
                  </h2>
                  <p className="text-xs text-slate-400">
                    Aviso instantâneo via app e push notification (FCM)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBroadcastModalOpen(false);
                    setIsSentBroadcastsModalOpen(true);
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-bold transition-all border border-amber-200 dark:border-amber-800 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Enviados</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors text-sm font-bold cursor-pointer"
                  title="Fechar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto flex-1 pr-1.5 -mr-1.5 my-4 space-y-6">
              <form id="broadcast-form" onSubmit={handleBroadcast} className="space-y-6">
                {/* Título */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Título da Notificação
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                    value={broadcastData.title}
                    onChange={(e) =>
                      setBroadcastData({
                        ...broadcastData,
                        title: e.target.value,
                      })
                    }
                    placeholder="Ex: Ensaio Extra Cancelado"
                  />
                </div>

                {/* Mensagem */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Mensagem
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none transition-all font-medium resize-none text-slate-800 dark:text-slate-100"
                    value={broadcastData.body}
                    onChange={(e) =>
                      setBroadcastData({ ...broadcastData, body: e.target.value })
                    }
                    placeholder="Escreva sua mensagem aqui..."
                  />
                </div>

                {/* DESTINATÁRIOS - OPÇÕES SOLICITADAS: BATERISTAS, GUITARRISTAS, BAIXISTAS, SOPRANO, CONTRALTO, MEZZO, ETC., E SELECIONAR TODOS */}
                <div className="space-y-3.5 bg-slate-50/80 dark:bg-slate-850/60 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-500" />
                      <span>Para quem deverá ser enviado?</span>
                    </label>

                    {/* Botão de Atalho Selecionar Todos */}
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className={`text-xs font-black px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectAllRecipients
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400"
                      }`}
                    >
                      {selectAllRecipients && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      <span>{selectAllRecipients ? "Todos Selecionados" : "Selecionar Todos"}</span>
                    </button>
                  </div>

                  {/* Card Principal: Selecionar Todos */}
                  <div
                    onClick={handleToggleSelectAll}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      selectAllRecipients
                        ? "bg-amber-500/10 border-amber-500 text-amber-950 dark:text-amber-100 shadow-sm"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0 ${
                          selectAllRecipients
                            ? "bg-amber-500 border-amber-500 text-white"
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                        }`}
                      >
                        {selectAllRecipients && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-xs font-black">
                          Selecionar Todos ({eligibleBroadcastMembers.length} pessoas)
                        </p>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          Dispara para todos os voluntários ativos sem filtro
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                        selectAllRecipients
                          ? "bg-amber-500 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                      }`}
                    >
                      {eligibleBroadcastMembers.length} voluntários
                    </span>
                  </div>

                  {/* Divisor & Filtros Rápidos por Grupo */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1 pt-1 flex-wrap gap-1">
                    <span>Ou filtre por função / instrumento:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSelectGroup("instruments")}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-amber-600 text-[10px] cursor-pointer"
                        title="Alternar todos os instrumentistas"
                      >
                        + Instrumentos
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectGroup("vocals")}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-amber-600 text-[10px] cursor-pointer"
                        title="Alternar todas as vozes (soprano, contralto, mezzo, etc.)"
                      >
                        + Vozes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectGroup("ministries")}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-amber-600 text-[10px] cursor-pointer"
                        title="Alternar dança, multimídia e líderes"
                      >
                        + Mídia/Dança
                      </button>
                    </div>
                  </div>

                  {/* 1. Louvor - Instrumentistas (Bateristas, Guitarristas, Baixistas, etc.) */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                      Instrumentistas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {BASE_RECIPIENT_CATEGORIES.filter((c) => c.group === "instruments").map((cat) => {
                        const isSelected = !selectAllRecipients && broadcastRecipients.includes(cat.id);
                        const count = eligibleBroadcastMembers.filter((m) =>
                          isMemberInRecipientCategory(m, cat.id)
                        ).length;

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleRecipientCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? "bg-amber-500 text-white shadow-xs font-black scale-102"
                                : selectAllRecipients
                                  ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 opacity-90 hover:border-amber-400"
                                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-amber-400"
                            }`}
                          >
                            <span>{cat.label}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                                isSelected
                                  ? "bg-white/20 text-white font-extrabold"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Louvor - Vozes & Vocais (Soprano, Contralto, Mezzo, Tenor, Barítono, etc.) */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                      Vozes & Vocais
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {BASE_RECIPIENT_CATEGORIES.filter((c) => c.group === "vocals").map((cat) => {
                        const isSelected = !selectAllRecipients && broadcastRecipients.includes(cat.id);
                        const count = eligibleBroadcastMembers.filter((m) =>
                          isMemberInRecipientCategory(m, cat.id)
                        ).length;

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleRecipientCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? "bg-amber-500 text-white shadow-xs font-black scale-102"
                                : selectAllRecipients
                                  ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 opacity-90 hover:border-amber-400"
                                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-amber-400"
                            }`}
                          >
                            <span>{cat.label}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                                isSelected
                                  ? "bg-white/20 text-white font-extrabold"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Dança, Multimídia, Líderes & Outros */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                      Outros Ministérios & Líderes
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {BASE_RECIPIENT_CATEGORIES.filter((c) => c.group === "ministries").map((cat) => {
                        const isSelected = !selectAllRecipients && broadcastRecipients.includes(cat.id);
                        const count = eligibleBroadcastMembers.filter((m) =>
                          isMemberInRecipientCategory(m, cat.id)
                        ).length;

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleRecipientCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? "bg-amber-500 text-white shadow-xs font-black scale-102"
                                : selectAllRecipients
                                  ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 opacity-90 hover:border-amber-400"
                                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-amber-400"
                            }`}
                          >
                            <span>{cat.label}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                                isSelected
                                  ? "bg-white/20 text-white font-extrabold"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}

                      {/* Instrumentos dinâmicos extras da congregação */}
                      {customRecipientCategories.map((cat) => {
                        const isSelected = !selectAllRecipients && broadcastRecipients.includes(cat.id);
                        const count = eligibleBroadcastMembers.filter((m) =>
                          isMemberInRecipientCategory(m, cat.id)
                        ).length;

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleRecipientCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? "bg-amber-500 text-white shadow-xs font-black"
                                : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <span>{cat.label}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-700">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Barra de Resumo com Contador em Tempo Real */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${targetBroadcastMembers.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {targetBroadcastMembers.length === 0 ? (
                          <span className="text-rose-500 font-extrabold">
                            Nenhum destinatário selecionado
                          </span>
                        ) : (
                          <span>
                            Destinatários selecionados:{" "}
                            <strong className="text-amber-600 dark:text-amber-400 font-black">
                              {targetBroadcastMembers.length}{" "}
                              {targetBroadcastMembers.length === 1 ? "voluntário" : "voluntários"}
                            </strong>
                          </span>
                        )}
                      </span>
                    </div>

                    {targetBroadcastMembers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowRecipientsList(!showRecipientsList)}
                        className="text-amber-600 dark:text-amber-400 font-extrabold hover:underline text-[11px] cursor-pointer"
                      >
                        {showRecipientsList ? "Ocultar nomes" : "Ver quem receberá"}
                      </button>
                    )}
                  </div>

                  {/* Lista de Nomes Expansível */}
                  {showRecipientsList && targetBroadcastMembers.length > 0 && (
                    <div className="max-h-32 overflow-y-auto p-2.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-1.5 text-xs animate-in fade-in">
                      {targetBroadcastMembers.map((m) => (
                        <span
                          key={m.uid}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-[11px] border border-slate-200 dark:border-slate-600"
                        >
                          <span>{m.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleExcludeUser(m.uid)}
                            title="Desmarcar este voluntário"
                            className="text-slate-400 hover:text-rose-500 font-bold ml-0.5 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Checkbox: Enviar apenas para minha congregação */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-2 border-slate-200 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      checked={broadcastData.churchOnly}
                      onChange={(e) =>
                        setBroadcastData({
                          ...broadcastData,
                          churchOnly: e.target.checked,
                        })
                      }
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                    Enviar apenas para{" "}
                    {userProfile?.churchId ? "minha congregação" : "todos"}
                  </span>
                </label>
              </form>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                disabled={isSendingBroadcast}
                className="flex-1 px-6 sm:px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl sm:rounded-[2rem] transition-all hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="broadcast-form"
                disabled={targetBroadcastMembers.length === 0 || isSendingBroadcast}
                className="flex-1 px-6 sm:px-8 py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl sm:rounded-[2rem] transition-all shadow-xl shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                {isSendingBroadcast ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      Enviar Agora ({targetBroadcastMembers.length})
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GERENCIADOR DE COMUNICADOS ENVIADOS (VISUALIZAR QUEM LEU E CANCELAR) */}
      <SentBroadcastsManager
        mode="modal"
        isOpen={isSentBroadcastsModalOpen}
        onClose={() => setIsSentBroadcastsModalOpen(false)}
        onComposeNew={() => {
          setIsSentBroadcastsModalOpen(false);
          setBroadcastData({ title: "", body: "", churchOnly: true });
          setBroadcastRecipients([]);
          setSelectAllRecipients(true);
          setExcludedUserIds([]);
          setShowRecipientsList(false);
          setIsBroadcastModalOpen(true);
        }}
      />
    </div>
  );
}
