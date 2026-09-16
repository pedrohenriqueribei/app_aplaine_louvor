"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp, query, where, collection, getDocs, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import {
  ArrowLeft,
  Sliders,
  Check,
  Monitor,
  Video,
  Camera,
  Share2,
  Plus,
  Minus,
  Calendar,
  Clock,
  ShieldAlert,
  Music,
  Mic2,
  Layers,
  Trash2,
} from "lucide-react";

const KeyboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M6 5v14" />
    <path d="M10 5v14" />
    <path d="M14 5v14" />
    <path d="M18 5v14" />
    <path d="M5.5 5v7h1V5z" fill="currentColor" stroke="none" />
    <path d="M9.5 5v7h1V5z" fill="currentColor" stroke="none" />
    <path d="M13.5 5v7h1V5z" fill="currentColor" stroke="none" />
    <path d="M17.5 5v7h1V5z" fill="currentColor" stroke="none" />
  </svg>
);

const AcousticGuitarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
  >
    {/* Body of acoustic guitar */}
    <path d="M12.5 11.5c1.2-1.2 3.1-1.2 4.3 0c1.2 1.2 1.2 3.1 0 4.3c-1.5 1.5-3.5 2.5-5.3 2.5c-2.5 0-4.5-2-4.5-4.5c0-1.8 1-3.8 2.5-5.3c1.2-1.2 3.1-1.2 4.3 0z" />
    {/* Soundhole */}
    <circle cx="11.5" cy="12.5" r="1.5" fill="currentColor" />
    {/* Neck and tuners */}
    <path d="M9 15L19 5" />
    <path d="M18 4l2 2" />
    <path d="M17.5 3l1.5 1.5" />
    <path d="M19 4.5l1.5 1.5" />
    <path d="M8.5 15.5l2.5-2.5" />
  </svg>
);

const ElectricGuitarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
  >
    <path d="M14.5 10c0.8-0.8 2.2-0.8 3 0c1.2 1.2.1 4.3-1.5 5.5c-1.5 1.2-4.5 2-5.5.5c-1.2-1.8.8-3.5 2-4.5z" />
    <path d="M11.5 11.5c-1 1.2-2.5 3.5-3.2 4" />
    <path d="M16 8.5l3.5-3.5M19 4.5l1 1" />
    <circle cx="19.5" cy="4.5" r="0.5" fill="currentColor" />
    <circle cx="18.5" cy="3.5" r="0.5" fill="currentColor" />
    <circle cx="17.5" cy="2.5" r="0.5" fill="currentColor" />
    <rect x="13.5" y="11.5" width="3" height="1.5" fill="currentColor" stroke="none" transform="rotate(-45 13.5 11.5)" />
    <rect x="14.8" y="10.2" width="3" height="1.5" fill="currentColor" stroke="none" transform="rotate(-45 14.8 10.2)" />
  </svg>
);

const BassIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
  >
    {/* Contrabass / Double Bass strings & neck */}
    <path d="M12 8.5C11 5.5 8 5.5 8 8c0 2 3 3 3 5c0 2-3 3-3 5c0 2.5 3 2.5 4-.5s1-3 1-5s-1-3-1-4z" />
    <path d="M12 8.5C13 5.5 16 5.5 16 8c0 2-3 3-3 5c0 2-3 3-3 5c0 2.5-3 2.5-4-.5M12 2v3" />
    <circle cx="12" cy="5" r="1" />
    <path d="M12 19.5v2.5" />
    {/* Traditional F-holes */}
    <path d="M9.5 10c0 1 .5 1.5.5 2s-.5 1-.5 2" />
    <path d="M14.5 10c0 1-.5 1.5-.5 2s.5 1 .5 2" />
  </svg>
);

const DrumsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
  >
    <circle cx="12" cy="14" r="5.5" />
    <circle cx="12" cy="14" r="5" strokeDasharray="3 3" />
    <path d="M7 18.5l-2.5 2M17 18.5l2.5 2" />
    <rect x="2" y="7" width="5.5" height="3" rx="0.5" />
    <path d="M2.5 8.5l4.5 0" strokeDasharray="2 2" />
    <path d="M3 10v4.5M6.5 10v4.5" />
    <rect x="16.5" y="7" width="5.5" height="3" rx="0.5" transform="rotate(10 16.5 7)" />
    <path d="M17.5 11l1.5 3" />
    <path d="M2 3c3 0 5 1.5 5 1.5M1.5 4.5c4-1 6-3 6-3" strokeWidth="1.2" />
    <path d="M4.5 4V7" />
    <path d="M22 3c-3 0-5 1.5-5 1.5" />
    <path d="M19.5 4V7" />
  </svg>
);

interface RoleConfig {
  enabled: boolean;
  count: number;
}

const DEFAULT_ROLES_CONFIG: Record<string, Record<string, RoleConfig>> = {
  multimidia: {
    audioOperator: { enabled: true, count: 1 },
    pcOperator: { enabled: true, count: 2 },
    socialMediaOperator: { enabled: true, count: 1 },
    photographyOperator: { enabled: true, count: 2 },
    cameraOperator: { enabled: true, count: 1 },
  },
  louvor: {
    mainMinister: { enabled: true, count: 1 },
    keyboardist: { enabled: true, count: 1 },
    acousticGuitarist: { enabled: true, count: 1 },
    electricGuitarist: { enabled: true, count: 1 },
    bassist: { enabled: true, count: 1 },
    drummer: { enabled: true, count: 1 },
    soprano: { enabled: false, count: 0 },
    contralto: { enabled: false, count: 0 },
    baritone: { enabled: false, count: 0 },
    mezzoSoprano: { enabled: false, count: 0 },
  }
};

const ROLE_METADATA: Record<
  string,
  Record<string, { label: string; desc: string; icon: any }>
> = {
  multimidia: {
    audioOperator: {
      label: "Operador de Áudio",
      desc: "Responsável pelo som, mixagem de microfones e áudio geral do templo.",
      icon: Mic2,
    },
    pcOperator: {
      label: "Operador de PC / Projeção",
      desc: "Responsável por projetar avisos, letras e backgrounds no culto.",
      icon: Monitor,
    },
    socialMediaOperator: {
      label: "Operador de Redes Sociais",
      desc: "Responsável por postagens, respostas e stories ao vivo.",
      icon: Share2,
    },
    photographyOperator: {
      label: "Operador de Fotografia",
      desc: "Capta fotos de momentos do culto e das pessoas da comunidade.",
      icon: Camera,
    },
    cameraOperator: {
      label: "Operador de Câmera / Transmissão",
      desc: "Capta vídeo e comanda enquadramentos para transmissão online.",
      icon: Video,
    },
  },
  louvor: {
    mainMinister: {
      label: "Ministro de Louvor",
      desc: "Lidera os vocais e conduz o momento de adoração coletiva.",
      icon: Mic2,
    },
    keyboardist: {
      label: "Teclado",
      desc: "Executa melodias, sintetizadores e bases harmônicas.",
      icon: KeyboardIcon,
    },
    acousticGuitarist: {
      label: "Violão",
      desc: "Responsável pela base acústica do ritmo da escala.",
      icon: AcousticGuitarIcon,
    },
    electricGuitarist: {
      label: "Guitarra",
      desc: "Solos, arranjos de fraseados e efeitos harmônicos.",
      icon: ElectricGuitarIcon,
    },
    bassist: {
      label: "Baixo",
      desc: "Preenchimento de notas graves e condução do groove.",
      icon: BassIcon,
    },
    drummer: {
      label: "Bateria",
      desc: "Guia rítmico, andamento, dinâmica e viradas.",
      icon: DrumsIcon,
    },
    soprano: {
      label: "Soprano",
      desc: "Voz de apoio feminina agudíssima.",
      icon: Mic2,
    },
    contralto: {
      label: "Contralto",
      desc: "Voz de apoio feminina grave e densa.",
      icon: Mic2,
    },
    baritone: {
      label: "Barítono",
      desc: "Voz de apoio masculina encorpada.",
      icon: Mic2,
    },
    mezzoSoprano: {
      label: "Mezzo-Soprano",
      desc: "Voz de apoio feminina de registro médio.",
      icon: Mic2,
    },
  },
};

export default function ScaleConfigPage() {
  const { id: churchId, type } = useParams();
  const router = useRouter();
  const { userData, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const activeType = type === "louvor" ? "louvor" : "multimidia";
  const isWorship = activeType === "louvor";

  interface ScaleProfile {
    id: string;
    name: string;
    roles: Record<string, RoleConfig>;
  }

  const [roles, setRoles] = useState<Record<string, RoleConfig>>({});
  const [profiles, setProfiles] = useState<ScaleProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("padrao");
  const [newProfileName, setNewProfileName] = useState("");
  const [isAddingProfile, setIsAddingProfile] = useState(false);

  const [memberSubroles, setMemberSubroles] = useState<string[]>([]);
  const [createdAtData, setCreatedAtData] = useState<any>(null);
  const [createdByData, setCreatedByData] = useState<string>("");

  // Dynamic custom roles and available state variables for church instruments selection
  const [customMetadata, setCustomMetadata] = useState<Record<string, { label: string; desc: string; isCustom?: boolean }>>({});
  const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);
  const [newInstrumentName, setNewInstrumentName] = useState("");
  const [isAddingInstrument, setIsAddingInstrument] = useState(false);

  // Interfaces and states for Services Playlist config selection
  interface ServiceMoment {
    id: string;
    name: string;
    songCount: number;
  }

  interface Service {
    id: string;
    name: string;
    churchId: string;
    dayOfWeek?: string;
    time?: string;
    playlistConfig?: ServiceMoment[];
    createdAt?: any;
    createdBy?: string;
    updatedAt?: any;
    updatedBy?: string;
  }

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceForPlaylist, setSelectedServiceForPlaylist] = useState<Service | null>(null);
  const [editingMoments, setEditingMoments] = useState<ServiceMoment[]>([]);

  useEffect(() => {
    if (type !== "multimidia" && type !== "louvor") {
      setLoading(false);
      return;
    }

    async function loadConfig() {
      try {
        const configDocId = isWorship
          ? `worship_scale_config_${churchId}`
          : `multimedia_scale_config_${churchId}`;

        const docRef = doc(db, "services", configDocId);
        const snap = await getDoc(docRef);

        const defaultRoles = DEFAULT_ROLES_CONFIG[activeType] || {};

        if (snap.exists()) {
          const data = snap.data();

          const loadedCustomMetadata = data.customRoleMetadata || {};
          setCustomMetadata(loadedCustomMetadata);

          const combinedDefaultRoles = { ...defaultRoles };
          Object.keys(loadedCustomMetadata).forEach((key) => {
            combinedDefaultRoles[key] = { enabled: false, count: 0 };
          });

          const loadedAvailable = data.availableInstruments || Object.keys(combinedDefaultRoles);
          setAvailableInstruments(loadedAvailable);

          let loadedProfiles: ScaleProfile[] = [];

          if (data.profiles && Array.isArray(data.profiles)) {
            loadedProfiles = data.profiles;
          } else if (data.profiles && typeof data.profiles === "object") {
            loadedProfiles = Object.entries(data.profiles).map(([pId, pData]: [string, any]) => ({
              id: pId,
              name: pData.name || pId,
              roles: pData.roles || combinedDefaultRoles,
            }));
          }

          if (loadedProfiles.length === 0) {
            loadedProfiles = [
              {
                id: "padrao",
                name: "Padrão",
                roles: data.roles || combinedDefaultRoles,
              },
            ];
          }

          setProfiles(loadedProfiles);

          const currentProfileId = data.activeProfileId || "padrao";
          setActiveProfileId(currentProfileId);

          const activeProfile = loadedProfiles.find((p) => p.id === currentProfileId) || loadedProfiles[0];
          const mergedRoles = { ...combinedDefaultRoles };
          Object.keys(combinedDefaultRoles).forEach((key) => {
            if (activeProfile.roles?.[key] !== undefined) {
              mergedRoles[key] = activeProfile.roles[key];
            }
          });
          setRoles(mergedRoles);

          if (data.createdAt) setCreatedAtData(data.createdAt);
          if (data.createdBy) setCreatedByData(data.createdBy);
        } else {
          setAvailableInstruments(Object.keys(defaultRoles));
          setCustomMetadata({});

          const initialProfiles: ScaleProfile[] = [
            {
              id: "padrao",
              name: "Padrão",
              roles: defaultRoles,
            }
          ];
          setProfiles(initialProfiles);
          setActiveProfileId("padrao");
          setRoles(defaultRoles);
        }

        // Fetch direct department member subroles for the authenticated user
        const userUid = user?.uid || userData?.uid;
        if (userUid && churchId) {
          const deptKey = type === "louvor" ? "worship" : "multimedia";
          const dMemberRef = doc(
            db,
            "churches",
            churchId as string,
            "departments",
            deptKey,
            "members",
            userUid,
          );
          const dMemberSnap = await getDoc(dMemberRef);
          if (dMemberSnap.exists()) {
            const mData = dMemberSnap.data();
            setMemberSubroles(mData.roles || []);
          }
        }
      } catch (err) {
        console.error("Error loading scale configuration:", err);
      } finally {
        setLoading(false);
      }
    }

    if (churchId) {
      loadConfig();
    }
  }, [churchId, type, activeType, isWorship, user, userData]);

  useEffect(() => {
    if (!churchId) return;

    async function loadServices() {
      try {
        const q = query(
          collection(db, "services"),
          where("churchId", "==", churchId)
        );
        const snap = await getDocs(q);
        const loadedServices = snap.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "Sem Nome",
              churchId: data.churchId,
              dayOfWeek: data.dayOfWeek || "Domingo",
              time: data.time || "19:00",
              playlistConfig: data.playlistConfig || null,
              createdAt: data.createdAt,
              createdBy: data.createdBy,
              updatedAt: data.updatedAt,
              updatedBy: data.updatedBy,
            } as Service;
          })
          .filter(s => !s.id.startsWith("worship_scale_config_") && !s.id.startsWith("multimedia_scale_config_"));

        setServices(loadedServices);
      } catch (err) {
        console.error("Error loading services list:", err);
      }
    }

    loadServices();
  }, [churchId]);

  const handleOpenPlaylistConfig = (service: Service) => {
    setSelectedServiceForPlaylist(service);
    if (service.playlistConfig && service.playlistConfig.length > 0) {
      setEditingMoments([...service.playlistConfig]);
    } else {
      setEditingMoments([
        {
          id: `moment_praise_${Date.now()}`,
          name: "Moment of Praise and Adoration",
          songCount: 3,
        }
      ]);
    }
  };

  const handleSaveServicePlaylist = async (serviceId: string, moments: ServiceMoment[]) => {
    try {
      const userUid = user?.uid || userData?.uid || "system";
      const serviceRef = doc(db, "services", serviceId);
      
      const serviceSnap = await getDoc(serviceRef);
      const existingData: DocumentData = serviceSnap.exists() ? serviceSnap.data() : {};
      
      const updatedData: DocumentData = {
        ...existingData,
        playlistConfig: moments,
        updatedAt: serverTimestamp(),
        updatedBy: userUid,
      };
      
      if (!existingData.createdAt) {
        updatedData.createdAt = serverTimestamp();
      }
      if (!existingData.createdBy) {
        updatedData.createdBy = userUid;
      }

      await setDoc(serviceRef, updatedData, { merge: true });
      
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, ...updatedData, playlistConfig: moments } : s))
      );
      
      setSelectedServiceForPlaylist(null);
    } catch (err) {
      console.error("Error saving service playlist:", err);
      alert("Erro ao salvar a playlist do culto.");
    }
  };

  const isLeader =
    memberSubroles.includes("leader") ||
    userData?.roles?.[type === "louvor" ? "worship" : "multimedia"]?.includes("leader") ||
    userData?.role === "líder" ||
    userData?.super_admin === true;

  if (!isLeader && !loading) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] shadow-xl">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 mb-4">
          Acesso Restrito
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
          Apenas líderes certificados do Ministério de {isWorship ? "Louvor" : "Multimídia"} possuem autorização para configurar o modelo de escala.
        </p>
        <button
          onClick={() => router.back()}
          className="bg-slate-900 text-white font-bold px-8 py-3.5 rounded-2xl active:scale-95 transition-all text-sm cursor-pointer"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (type !== "multimidia" && type !== "louvor" && !loading) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] shadow-xl">
        <ShieldAlert className="w-16 h-16 text-purple-500 mx-auto mb-6" />
        <h2 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 mb-4">
          Departamento Incorreto
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
          Esta página de configurações do sistema é inválida.
        </p>
        <button
          onClick={() => router.back()}
          className="bg-slate-900 text-white font-bold px-8 py-3.5 rounded-2xl active:scale-95 transition-all text-sm cursor-pointer"
        >
          Voltar para a Igreja
        </button>
      </div>
    );
  }

  const getRoleMetadata = (key: string) => {
    const standard = ROLE_METADATA[activeType]?.[key];
    if (standard) return standard;

    const custom = customMetadata[key];
    if (custom) {
      return {
        label: custom.label,
        desc: custom.desc || "Instrumento personalizado adicionado pelo líder.",
        icon: Music,
      };
    }

    return {
      label: key,
      desc: "Função personalizada do ministério.",
      icon: Music,
    };
  };

  const handleAddCustomInstrument = (name: string) => {
    if (!name.trim()) return;
    const slug = `custom_instrument_${Date.now()}`;

    // 1. Update customMetadata
    setCustomMetadata((prev) => ({
      ...prev,
      [slug]: {
        label: name.trim(),
        desc: "Instrumento personalizado adicionado pelo líder.",
        isCustom: true,
      }
    }));

    // 2. Add to available list
    setAvailableInstruments((prev) => [...prev, slug]);

    // 3. Initialize in roles: starts at 0, as explicitly requested!
    setRoles((prev) => ({
      ...prev,
      [slug]: { enabled: false, count: 0 }
    }));

    // 4. Update all profiles in profiles array
    setProfiles((prev) =>
      prev.map((p) => ({
        ...p,
        roles: {
          ...p.roles,
          [slug]: { enabled: false, count: 0 }
        }
      }))
    );

    setNewInstrumentName("");
    setIsAddingInstrument(false);
  };

  const handleDeleteCustomInstrument = (slug: string) => {
    if (!confirm("Deseja realmente remover este instrumento do ministério? Esta ação removerá o instrumento de todos os perfis.")) {
      return;
    }

    setCustomMetadata((prev) => {
      const updated = { ...prev };
      delete updated[slug];
      return updated;
    });

    setAvailableInstruments((prev) => prev.filter((k) => k !== slug));

    setRoles((prev) => {
      const updated = { ...prev };
      delete updated[slug];
      return updated;
    });

    setProfiles((prev) =>
      prev.map((p) => {
        const updatedRoles = { ...p.roles };
        delete updatedRoles[slug];
        return { ...p, roles: updatedRoles };
      })
    );
  };

  const handleToggleAvailable = (key: string) => {
    setAvailableInstruments((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const handleSwitchProfile = (newProfileId: string) => {
    // 1. Save current roles to current active profile in the array FIRST
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id === activeProfileId) {
          return { ...p, roles: { ...roles } };
        }
        return p;
      })
    );

    // 2. Set new active profile id
    setActiveProfileId(newProfileId);

    // 3. Load roles from the new profile
    const targetProfile = profiles.find((p) => p.id === newProfileId);
    if (targetProfile) {
      const defaultRoles = DEFAULT_ROLES_CONFIG[activeType] || {};
      const combinedDefaultRoles = { ...defaultRoles };
      Object.keys(customMetadata).forEach((key) => {
        combinedDefaultRoles[key] = { enabled: false, count: 0 };
      });

      const mergedRoles = { ...combinedDefaultRoles };
      Object.keys(combinedDefaultRoles).forEach((key) => {
        if (targetProfile.roles?.[key] !== undefined) {
          mergedRoles[key] = targetProfile.roles[key];
        }
      });
      setRoles(mergedRoles);
    }
  };

  const handleAddProfile = () => {
    if (!newProfileName.trim()) return;

    const newId = `profile_${Date.now()}`;
    const newProfile: ScaleProfile = {
      id: newId,
      name: newProfileName.trim(),
      roles: JSON.parse(JSON.stringify(roles)), // deep clone current edited roles to bootstrap new profile
    };

    setProfiles((prev) => {
      const updated = prev.map((p) => {
        if (p.id === activeProfileId) {
          return { ...p, roles: { ...roles } };
        }
        return p;
      });
      return [...updated, newProfile];
    });

    setActiveProfileId(newId);
    setNewProfileName("");
    setIsAddingProfile(false);
  };

  const handleDeleteProfile = (profileId: string) => {
    if (profileId === "padrao") return;

    if (confirm("Deseja realmente remover este perfil de escala?")) {
      const filtered = profiles.filter((p) => p.id !== profileId);
      setProfiles(filtered);

      if (activeProfileId === profileId) {
        setActiveProfileId("padrao");
        const defaultProf = filtered.find((p) => p.id === "padrao") || filtered[0];
        if (defaultProf) {
          setRoles({ ...defaultProf.roles });
        }
      }
    }
  };

  const handleToggle = (key: string) => {
    setRoles((prev) => {
      const isCurrentlyEnabled = prev[key]?.enabled ?? false;
      return {
        ...prev,
        [key]: {
          enabled: !isCurrentlyEnabled,
          count: !isCurrentlyEnabled ? (prev[key]?.count || 1) : 0,
        },
      };
    });
  };

  const handleAdjustCount = (key: string, amount: number) => {
    setRoles((prev) => {
      const currentCount = prev[key]?.count || 0;
      const isEnabled = prev[key]?.enabled ?? false;
      const minCount = (isWorship && key === "mainMinister") ? 1 : 0;
      const newCount = Math.max(minCount, currentCount + amount);
      return {
        ...prev,
        [key]: {
          enabled: isEnabled,
          count: isEnabled ? newCount : 0,
        },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const userUid = userData?.uid || user?.uid || "system";
      const configDocId = isWorship
        ? `worship_scale_config_${churchId}`
        : `multimedia_scale_config_${churchId}`;

      const docRef = doc(db, "services", configDocId);

      // Save locally accumulated roles to current profile
      const updatedProfiles = profiles.map((p) => {
        if (p.id === activeProfileId) {
          return { ...p, roles: { ...roles } };
        }
        return p;
      });

      const activeProfile = updatedProfiles.find((p) => p.id === activeProfileId) || { roles };

      const savedData = {
        churchId: churchId as string,
        activeProfileId: activeProfileId,
        profiles: updatedProfiles,
        // Make sure top-level roles fields are kept completely in sync for backwards compat inside current schedules scheduler!
        roles: activeProfile.roles,
        availableInstruments: availableInstruments,
        customRoleMetadata: customMetadata,
        createdAt: createdAtData || serverTimestamp(),
        createdBy: createdByData || userUid,
        updatedAt: serverTimestamp(),
        updatedBy: userUid,
      };

      await setDoc(docRef, savedData, { merge: true });
      setProfiles(updatedProfiles);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error("Error saving scale config:", err);
      alert("Ocorreu um erro ao salvar as configurações.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className={`w-16 h-16 border-4 border-slate-100 rounded-full animate-spin ${isWorship ? "border-t-blue-800" : "border-t-purple-800"}`}></div>
      </div>
    );
  }

  // Generate Slots representation for Interactive Preview
  const previewSlots: { roleName: string; icon: any }[] = [];
  Object.entries(roles).forEach(([key, val]) => {
    const isAvailable = !isWorship || availableInstruments.includes(key);
    if (val.enabled && isAvailable) {
      const meta = getRoleMetadata(key);
      if (meta) {
        for (let i = 0; i < val.count; i++) {
          previewSlots.push({
            roleName: val.count > 1 ? `${meta.label} (Vaga ${i + 1})` : meta.label,
            icon: meta.icon,
          });
        }
      }
    }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 text-slate-800 dark:text-slate-100 font-sans">
      <header className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className={`flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold transition-colors group cursor-pointer ${isWorship ? "hover:text-blue-800 dark:hover:text-blue-400" : "hover:text-purple-800 dark:hover:text-purple-400"}`}
        >
          <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800 group-hover:shadow-lg transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span>Voltar para {isWorship ? "Ministério de Louvor" : "Multimídia"}</span>
        </button>
      </header>

      {/* Banner introduction */}
      <section className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-12 border border-slate-150 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-96 h-96 blur-[120px] -mr-48 -mt-48 opacity-40 ${isWorship ? "bg-blue-100 dark:bg-blue-900/15" : "bg-purple-100 dark:bg-purple-900/15"}`}></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
          <div className={`w-24 h-24 rounded-[2.5rem] shadow-2xl flex items-center justify-center text-white shrink-0 ${isWorship ? "bg-blue-800 shadow-blue-800/35" : "bg-purple-800 shadow-purple-800/35"}`}>
            <Sliders size={42} />
          </div>
          <div className="space-y-3">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${isWorship ? "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-100 dark:border-blue-900/40" : "bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-100 dark:border-purple-900/40"}`}>
              Escala de Voluntários
            </span>
            <h1 className="text-3xl md:text-4xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Configurar Escala de {isWorship ? "Louvor" : "Multimídia"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-base max-w-2xl">
              Defina os papéis que fazem parte da sua escala semanal de {isWorship ? "louvor" : "multimídia"} e o número necessário de integrantes por função.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step-by-step role config form */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-8 md:p-10 border border-slate-150 dark:border-slate-800 shadow-sm space-y-8 animate-fade-in">
            {/* Perfis de Escala */}
            <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-950/20 rounded-[2.5rem] border border-slate-150 dark:border-slate-800/85 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-display font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Layers className={`w-5 h-5 ${isWorship ? "text-blue-600" : "text-purple-600"}`} />
                    Perfis de Escala
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Defina múltiplos padrões/formações de escala para eventos correntes ou cenários especiais.
                  </p>
                </div>

                {/* Add dynamic profile button or inline form */}
                {!isAddingProfile ? (
                  <button
                    onClick={() => setIsAddingProfile(true)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm ${
                      isWorship
                        ? "bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/45 dark:hover:bg-blue-900/35 dark:text-blue-300"
                        : "bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/45 dark:hover:bg-purple-900/35 dark:text-purple-300"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Novo Perfil
                  </button>
                ) : (
                  <div className="flex items-center gap-2 max-w-xs w-full bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    <input
                      type="text"
                      placeholder="Nome do perfil..."
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      className="bg-transparent border-0 outline-none text-xs px-2.5 py-1.5 w-full text-slate-800 dark:text-slate-100"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddProfile();
                        if (e.key === "Escape") {
                          setIsAddingProfile(false);
                          setNewProfileName("");
                        }
                      }}
                    />
                    <button
                      onClick={handleAddProfile}
                      disabled={!newProfileName.trim()}
                      className={`p-2 rounded-lg text-white font-bold disabled:opacity-45 cursor-pointer ${
                        isWorship ? "bg-blue-800 hover:bg-blue-900" : "bg-purple-800 hover:bg-purple-900"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingProfile(false);
                        setNewProfileName("");
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Profiles card selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {profiles.map((p) => {
                  const isActive = p.id === activeProfileId;
                  const activeCount = Object.values(p.roles || {}).filter((r: any) => r?.enabled).length;
                  const totalMembers = Object.values(p.roles || {}).reduce((acc: number, r: any) => acc + (r?.enabled ? (r?.count || 0) : 0), 0);

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isActive && handleSwitchProfile(p.id)}
                      className={`group relative flex flex-col justify-between p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer overflow-hidden ${
                        isActive
                          ? isWorship
                            ? "bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 border-blue-600 shadow-xl shadow-blue-500/20 text-white"
                            : "bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-950 border-purple-600 shadow-xl shadow-purple-500/20 text-white"
                          : "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg hover:shadow-slate-100/50 dark:hover:shadow-none hover:-translate-y-0.5"
                      }`}
                    >
                      {/* Decorative backdrop glow for active profile */}
                      {isActive && (
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 dark:bg-white/5 rounded-full blur-xl pointer-events-none" />
                      )}

                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Indicator Badge */}
                          <div className={`p-2 rounded-xl shrink-0 transition-all ${
                            isActive
                              ? "bg-white/20 text-white"
                              : isWorship
                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300"
                                : "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300"
                          }`}>
                            <Sliders className="w-4 h-4" />
                          </div>

                          <div className="truncate">
                            <h4 className="font-display font-black text-sm tracking-tight truncate leading-tight">
                              {p.name}
                            </h4>
                            <span className={`text-[9px] font-bold tracking-wider uppercase ${
                              isActive ? "text-white/60" : "text-slate-400 dark:text-slate-500"
                            }`}>
                              {p.id === "padrao" ? "Principal" : "Alternativo"}
                            </span>
                          </div>
                        </div>

                        {/* Actions wrapper */}
                        {p.id !== "padrao" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProfile(p.id);
                            }}
                            className={`opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-xl ${
                              isActive
                                ? "hover:bg-white/10 text-white/80 hover:text-rose-300"
                                : "hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            }`}
                            title="Remover Perfil"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        )}
                      </div>

                      {/* Footer detail counts */}
                      <div className="mt-5 pt-3 border-t border-slate-100/30 dark:border-slate-800/50 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <span className={`text-[11px] font-black ${
                            isActive ? "text-white" : "text-slate-700 dark:text-slate-200"
                          }`}>
                            {activeCount}
                          </span>
                          <span className={`text-[10px] ${
                            isActive ? "text-white/70" : "text-slate-400 dark:text-slate-505"
                          }`}>
                            {activeCount === 1 ? "vaga ativa" : "vagas ativas"}
                          </span>
                        </div>

                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-lg font-bold shrink-0 ${
                          isActive
                            ? "bg-white/10 text-white border border-white/10"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450"
                        }`}>
                          {totalMembers} {totalMembers === 1 ? "pessoa" : "pessoas"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Instrumentos Utilizados no Louvor */}
            {isWorship && (
              <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-950/25 rounded-[3.5rem] border border-slate-150 dark:border-slate-800/80 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-display font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Music className="w-5 h-5 text-blue-600 shrink-0" />
                      Instrumentos da Igreja (Louvor)
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                      Defina os instrumentos disponíveis na sua igreja. Apenas os marcados estarão expostos para configurar vagas e escalar voluntários.
                    </p>
                  </div>

                  {/* Add dynamic instrument input/button */}
                  {!isAddingInstrument ? (
                    <button
                      onClick={() => setIsAddingInstrument(true)}
                      className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:hover:bg-blue-900/30 dark:text-blue-300 shrink-0 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Instrumento
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 max-w-sm w-full bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
                      <input
                        type="text"
                        placeholder="Nome do instrumento..."
                        value={newInstrumentName}
                        onChange={(e) => setNewInstrumentName(e.target.value)}
                        className="bg-transparent border-0 outline-none text-xs px-2.5 py-1.5 w-full text-slate-800 dark:text-slate-100 font-bold"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddCustomInstrument(newInstrumentName);
                          if (e.key === "Escape") {
                            setIsAddingInstrument(false);
                            setNewInstrumentName("");
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddCustomInstrument(newInstrumentName)}
                        disabled={!newInstrumentName.trim()}
                        className="p-2 rounded-lg text-white font-bold disabled:opacity-45 cursor-pointer bg-blue-800 hover:bg-blue-900 shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingInstrument(false);
                          setNewInstrumentName("");
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Category: Standard Instruments */}
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mb-2.5 block">
                      Instrumentos Padrão e Funções
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(DEFAULT_ROLES_CONFIG.louvor).map((key) => {
                        const meta = getRoleMetadata(key);
                        const isSelected = availableInstruments.includes(key);
                        const isCore = key === "mainMinister"; // Main minister is core, cannot disable

                        return (
                          <div
                            key={key}
                            onClick={() => !isCore && handleToggleAvailable(key)}
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
                              isSelected
                                ? "bg-blue-50/70 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-900/40 dark:text-blue-300"
                                : "bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850"
                            } ${isCore ? "opacity-75 cursor-default" : "cursor-pointer"}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              disabled={isCore}
                              className="accent-blue-600 w-3.5 h-3.5 rounded"
                            />
                            <span>{meta.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category: Custom Administered Instruments */}
                  {Object.keys(customMetadata).length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mb-2.5 block">
                        Instrumentos Personalizados Adicionados
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(customMetadata).map((key) => {
                          const meta = getRoleMetadata(key);
                          const isSelected = availableInstruments.includes(key);

                          return (
                            <div
                              key={key}
                              onClick={() => handleToggleAvailable(key)}
                              className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-300"
                                  : "bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-850"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="accent-emerald-600 w-3.5 h-3.5 rounded"
                              />
                              <span>{meta.label}</span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomInstrument(key);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ml-1 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="Remover instrumento permanentemente"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isWorship && (
              <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-950/25 rounded-[3.5rem] border border-slate-150 dark:border-slate-800/80 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-display font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-purple-600 shrink-0" />
                      Cargos Disponíveis na Multimídia
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                      Ative ou desative os cargos disponíveis no ministério de multimídia da sua igreja. Apenas os marcados estarão expostos para configurar vagas e escalar voluntários.
                    </p>
                  </div>

                  {/* Add dynamic custom role input/button */}
                  {!isAddingInstrument ? (
                    <button
                      onClick={() => setIsAddingInstrument(true)}
                      className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm bg-purple-50 hover:bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:hover:bg-purple-900/30 dark:text-purple-300 shrink-0 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Cargo Customizado
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 max-w-sm w-full bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
                      <input
                        type="text"
                        placeholder="Nome do cargo..."
                        value={newInstrumentName}
                        onChange={(e) => setNewInstrumentName(e.target.value)}
                        className="bg-transparent border-0 outline-none text-xs px-2.5 py-1.5 w-full text-slate-800 dark:text-slate-100 font-bold"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddCustomInstrument(newInstrumentName);
                          if (e.key === "Escape") {
                            setIsAddingInstrument(false);
                            setNewInstrumentName("");
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddCustomInstrument(newInstrumentName)}
                        disabled={!newInstrumentName.trim()}
                        className="p-2 rounded-lg text-white font-bold disabled:opacity-45 cursor-pointer bg-purple-800 hover:bg-purple-900 shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingInstrument(false);
                          setNewInstrumentName("");
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Category: Standard Roles */}
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mb-2.5 block">
                      Cargos Padrão do Ministério
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(DEFAULT_ROLES_CONFIG.multimidia).map((key) => {
                        const meta = getRoleMetadata(key);
                        const isSelected = availableInstruments.includes(key);

                        return (
                          <div
                            key={key}
                            onClick={() => handleToggleAvailable(key)}
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-purple-50/70 border-purple-200 text-purple-800 dark:bg-purple-950/30 dark:border-purple-900/40 dark:text-purple-300"
                                : "bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-850"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="accent-purple-600 w-3.5 h-3.5 rounded"
                            />
                            <span>{meta.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category: Custom Administered Roles */}
                  {Object.keys(customMetadata).length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mb-2.5 block">
                        Cargos Customizados do Ministério
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(customMetadata).map((key) => {
                          const meta = getRoleMetadata(key);
                          const isSelected = availableInstruments.includes(key);

                          return (
                            <div
                              key={key}
                              onClick={() => handleToggleAvailable(key)}
                              className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-300"
                                  : "bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-850"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="accent-emerald-600 w-3.5 h-3.5 rounded"
                              />
                              <span>{meta.label}</span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomInstrument(key);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ml-1 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="Remover cargo permanentemente"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100">
                Seleção de Cargos e Vagas
              </h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Ative as funções que sua igreja utiliza no perfil selecionado e especifique a quantidade de voluntários.
              </p>
            </div>

            <div className="space-y-6">
              {Object.keys(roles).filter((key) => {
                return availableInstruments.includes(key);
              }).map((key) => {
                const config = roles[key];
                const meta = getRoleMetadata(key);
                const IconComponent = meta.icon;

                return (
                  <div
                    key={key}
                    className={`p-6 rounded-[2rem] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                      config.enabled
                        ? isWorship
                          ? "bg-blue-50/20 dark:bg-blue-950/5 border-blue-350 dark:border-blue-850 shadow-md ring-1 ring-blue-550/10"
                          : "bg-purple-50/20 dark:bg-purple-950/5 border-purple-350 dark:border-purple-850 shadow-md ring-1 ring-purple-500/10"
                        : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        onClick={() => handleToggle(key)}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold cursor-pointer transition-all ${
                          config.enabled
                            ? isWorship
                              ? "bg-blue-800 text-white shadow-lg shadow-blue-800/15"
                              : "bg-purple-800 text-white shadow-lg shadow-purple-800/15"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div
                        onClick={() => handleToggle(key)}
                        className="cursor-pointer select-none"
                      >
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
                          {meta.label}
                          {config.enabled && (
                            <span className={`w-2.5 h-2.5 rounded-full shadow-md transition-all duration-300 ${
                              config.count === 0
                                ? "bg-rose-500 shadow-rose-500/50 ring-2 ring-rose-500/20"
                                : "bg-emerald-500 shadow-emerald-500/50 ring-2 ring-emerald-500/20"
                            }`}></span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {meta.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-auto">
                      <div className="text-xs font-bold text-slate-400 dark:text-slate-500">
                        Número de Vagas:
                      </div>
                      <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 shadow-sm">
                        <button
                          disabled={!config.enabled || config.count <= ((isWorship && key === "mainMinister") ? 1 : 0)}
                          onClick={() => handleAdjustCount(key, -1)}
                          className="p-1 px-2.5 rounded-lg font-black hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 transition-all cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-bold text-base px-2 text-slate-800 dark:text-slate-150 min-w-[20px] text-center">
                          {config.count}
                        </span>
                        <button
                          onClick={() => {
                            if (!config.enabled) {
                              setRoles((prev) => ({
                                ...prev,
                                [key]: {
                                  enabled: true,
                                  count: 1,
                                },
                              }));
                            } else {
                              handleAdjustCount(key, 1);
                            }
                          }}
                          className="p-1 px-2.5 rounded-lg font-black hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons with success feedbacks */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-8 flex items-center justify-end gap-6 flex-wrap">
              {saveSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs px-4 py-3 rounded-2xl font-bold border border-emerald-100 dark:border-emerald-950/50 flex items-center gap-2 shrink-0 animate-pulse">
                  <Check className="w-4 h-4 shrink-0" /> Configuração salva com sucesso!
                </div>
              )}
              <button
                onClick={() => router.back()}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 px-8 py-4.5 rounded-2xl font-bold text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`text-white px-12 py-5 rounded-3xl font-black text-sm transition-all duration-300 shadow-2xl hover:scale-[1.03] active:scale-[0.98] flex items-center gap-3.5 disabled:opacity-50 cursor-pointer ${
                  isWorship
                    ? "bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 border border-blue-600/20 shadow-blue-500/20"
                    : "bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-900 border border-purple-600/20 shadow-purple-500/20"
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>{saving ? "Salvando..." : "Salvar Modelo"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Visual Card Preview (Honesty Design Principle) */}
        <div className="space-y-8 h-full">
          <div className="bg-slate-900 text-white rounded-[3.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[420px]">
            {/* Ambient scanning lines */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(59,130,246,0.02),rgba(59,130,246,0.04))] bg-[length:100%_4px,3px_100%] opacity-40"></div>
            <div className={`absolute bottom-0 right-0 w-64 h-64 blur-[80px] -mb-32 -mr-32 ${isWorship ? "bg-blue-600/10" : "bg-purple-600/10"}`}></div>

            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Calendar className={`w-5 h-5 ${isWorship ? "text-blue-400" : "text-purple-400"}`} />
                  <span className={`font-mono text-xs font-black uppercase tracking-wider ${isWorship ? "text-blue-400" : "text-purple-400"}`}>
                    Preview da Escala
                  </span>
                </div>
                <div className="text-[10px] bg-slate-800/80 text-slate-400 px-3 py-1 rounded-full font-mono border border-slate-700/50">
                  DOMINGO DE MANHÃ
                </div>
              </div>

              <div>
                <h4 className="text-xl font-display font-black leading-snug">
                  Layout de Vagas do Culto
                </h4>
                <p className="text-[11px] text-slate-500 font-medium tracking-tight mt-1">
                  Este é o modelo padrão de voluntários gerados a partir de suas configurações.
                </p>
              </div>

              {previewSlots.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 select-none">
                  {previewSlots.map((slot, index) => {
                    const SlotIcon = slot.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3.5 bg-slate-850/80 border border-slate-800/40 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${isWorship ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"}`}>
                            <SlotIcon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-300">
                            {slot.roleName}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono font-black uppercase text-slate-500 px-2 py-0.5 rounded-md border border-slate-800 bg-slate-850">
                          PENDENTE
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-850/30 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  Nenhum cargo ativado na sua escala. Ative para visualizar as vagas geradas.
                </div>
              )}
            </div>

            <div className="border-t border-slate-800/80 pt-4 flex justify-between items-center text-[10px] text-slate-500 font-mono mt-6 relative z-10">
              <span>{isWorship ? "WORSHIP_SCHEMA v1.0" : "MULTIMEDIA_SCHEMA v1.0"}</span>
              <span className={`font-semibold ${isWorship ? "text-blue-400" : "text-purple-400"}`}>
                {previewSlots.length} Vagas Totais
              </span>
            </div>
          </div>

          {/* Playlists and Cults Configuration Card only shown for Worship config */}
          {isWorship && (
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-150 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Music className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-black text-slate-800 dark:text-slate-100 leading-tight">
                    Playlists dos Cultos
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">
                    Selecione um culto abaixo para configurar os momentos e número recomendado de músicas.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {services.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] text-slate-400 text-xs font-semibold">
                    Nenhum culto cadastrado para esta igreja.
                  </div>
                ) : (
                  services.map((service) => {
                    const momentsCount = service.playlistConfig ? service.playlistConfig.length : 0;
                    const totalSongsCount = service.playlistConfig 
                      ? service.playlistConfig.reduce((sum, m) => sum + (m.songCount || 0), 0)
                      : 0;

                    return (
                      <div
                        key={service.id}
                        onClick={() => handleOpenPlaylistConfig(service)}
                        className="group flex items-center justify-between p-4 bg-slate-55/40 hover:bg-slate-100/70 dark:bg-slate-950/20 dark:hover:bg-slate-900/40 border border-slate-150/45 dark:border-slate-800/80 rounded-2xl cursor-pointer transition-all duration-350 hover:shadow-sm"
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
                            {service.name}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-bold uppercase mt-0.5 tracking-wider">
                            {service.dayOfWeek} às {service.time}
                          </span>
                        </div>
                        
                        <div className="shrink-0">
                          {momentsCount > 0 ? (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/20">
                              {momentsCount} {momentsCount === 1 ? "Momento" : "Momentos"} ({totalSongsCount} {totalSongsCount === 1 ? "música" : "músicas"})
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full">
                              Configurar
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playlist Config Modal */}
      {selectedServiceForPlaylist && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-950 rounded-[3rem] max-w-xl w-full overflow-hidden shadow-2xl border border-slate-150 dark:border-slate-800 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 font-mono">
                  Playlist do Culto
                </span>
                <h4 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 truncate max-w-sm sm:max-w-md">
                  {selectedServiceForPlaylist.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedServiceForPlaylist(null)}
                className="w-10 h-10 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl flex items-center justify-center transition-all cursor-pointer text-slate-450 hover:text-slate-750 dark:hover:text-slate-200"
              >
                <Minus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Defina os momentos estruturados deste culto.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Para cada momento determinado do período do culto (ex: Louvor, Ofertório), defina o número recomendado de canções.
                </p>
              </div>

              {/* Moments List */}
              <div className="space-y-4">
                {editingMoments.map((moment, idx) => (
                  <div
                    key={moment.id}
                    className="flex flex-col sm:flex-row gap-3 items-center bg-slate-50/50 dark:bg-slate-900/65 border border-slate-150/45 dark:border-slate-800/80 p-4 rounded-[2rem] w-full relative group"
                  >
                    {/* Inline edit Name */}
                    <div className="flex-1 w-full space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-mono">
                        Nome do Momento
                      </label>
                      <input
                        type="text"
                        value={moment.name}
                        onChange={(e) => {
                          const updated = [...editingMoments];
                          updated[idx].name = e.target.value;
                          setEditingMoments(updated);
                        }}
                        placeholder="Ex: Momento de Louvor"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    {/* Selector of recommended songs count */}
                    <div className="flex flex-col items-center sm:items-start shrink-0 space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-mono">
                        Limite de Músicas
                      </label>
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...editingMoments];
                            updated[idx].songCount = Math.max(1, (moment.songCount || 1) - 1);
                            setEditingMoments(updated);
                          }}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center font-bold text-slate-500 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[20px] text-center">
                          {moment.songCount || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...editingMoments];
                            updated[idx].songCount = (moment.songCount || 1) + 1;
                            setEditingMoments(updated);
                          }}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800 flex items-center justify-center font-bold text-slate-500 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Delete moment button */}
                    {editingMoments.length > 1 && (
                      <div className="self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMoments(editingMoments.filter((_, i) => i !== idx));
                          }}
                          className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer mt-3 sm:mt-0"
                          title="Remover momento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Momento trigger inline */}
              <button
                type="button"
                onClick={() => {
                  setEditingMoments([
                    ...editingMoments,
                    {
                      id: `moment_custom_${Date.now()}`,
                      name: "Offering",
                      songCount: 1,
                    },
                  ]);
                }}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-blue-400 dark:border-slate-800/80 dark:hover:border-blue-800 py-3.5 rounded-2xl text-[10px] font-black text-slate-500 hover:text-blue-600 transition-all cursor-pointer bg-slate-50/20"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Novo Momento</span>
              </button>
            </div>

            {/* Modal Footer */}
            <div className="p-6 md:p-8 bg-slate-55 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedServiceForPlaylist(null)}
                className="bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 px-6 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const cleanedMoments = editingMoments.map(m => ({
                    ...m,
                    name: m.name.trim() || `Moment`
                  }));
                  handleSaveServicePlaylist(selectedServiceForPlaylist.id, cleanedMoments);
                }}
                className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-500/10"
              >
                Salvar Configuração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
