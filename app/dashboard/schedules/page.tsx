"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  Clock,
  Music,
  Users,
  X,
  Bell,
  MapPin,
  Sliders,
  Monitor,
  Share2,
  Camera,
  Video,
  ShieldAlert,
  Mic2,
  Trash2,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

interface Schedule {
  id: string;
  date: string;
  churchId: string;
  bandId?: string; // Added bandId
  serviceId?: string;
  songs: string[];
  members: string[];
  locationType?: "internal" | "external";
  locationName?: string;
  ministry?: "worship" | "multimedia";
  profileId?: string; // Saved profileId for scale
  roles?: {
    mainMinister?: string;
    drummer?: string;
    bassist?: string;
    keyboardist?: string;
    acousticGuitarist?: string;
    electricGuitarist?: string;
    baritone?: string;
    contralto?: string;
    soprano?: string;
    mezzoSoprano?: string;
    audioTech?: string;
    projectionOperator?: string;
    mediaCreator?: string;
    socialMediaManager?: string;
    // Multimedia roles
    audioOperators?: string[];
    pcOperators?: string[];
    socialMediaOperators?: string[];
    photographyOperators?: string[];
    cameraOperators?: string[];
    [key: string]: any;
  };
  notes?: string;
  multimediaNotes?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
  rehearsalDate?: string;
  rehearsalTime?: string;
  playlist?: string[];
}

interface Church {
  id: string;
  name: string;
}

interface ServiceType {
  id: string;
  churchId: string;
  name: string;
  dayOfWeek: string;
  status?: "active" | "inactive";
}

interface Song {
  id: string;
  title: string;
  artist: string;
  bpm?: string;
}

interface Band {
  id: string;
  name: string;
  churchId: string;
  leaderId?: string;
  memberIds?: string[];
}

interface Member {
  uid: string;
  name: string;
  role?: string;
  churchId?: string;
  instruments?: string[];
  vocalRange?: string;
  fcmTokens?: string[];
  roles?: {
    worship?: string[];
    multimedia?: string[];
    secretariat?: string[];
  };
}

const isWorshipRole = (roleKey: string): boolean => {
  const baseKey = roleKey.replace(/_\d+$/, "");
  const worshipBaseKeys = [
    "mainMinister",
    "soprano",
    "contralto",
    "mezzoSoprano",
    "baritone",
    "keyboardist",
    "acousticGuitarist",
    "electricGuitarist",
    "bassist",
    "drummer"
  ];
  return worshipBaseKeys.includes(baseKey) || baseKey.startsWith("custom_instrument_");
};

export default function SchedulesPage() {
  const { user, userData } = useAuth();
  const { token } = useNotifications(); // Initialize notifications for the current user

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [churches, setChurches] = useState<Church[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [teamAvailability, setTeamAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // States for Playlist & Rehearsal
  const [personalSongs, setPersonalSongs] = useState<Song[]>([]);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlistSchedule, setPlaylistSchedule] = useState<Schedule | null>(null);
  const [rehearsalDate, setRehearsalDate] = useState("");
  const [rehearsalTime, setRehearsalTime] = useState("");
  const [selectedPlaylistSongs, setSelectedPlaylistSongs] = useState<string[]>([]);
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [playlistSearchTerm, setPlaylistSearchTerm] = useState("");

  const [activeTab, setActiveTab] = useState<"worship" | "multimedia">("worship");
  const [selectedScheduleForView, setSelectedScheduleForView] = useState<Schedule | null>(null);
  const [isMultimediaModalOpen, setIsMultimediaModalOpen] = useState(false);
  const [multimediaDate, setMultimediaDate] = useState("");
  const [multimediaLocationType, setMultimediaLocationType] = useState<"internal" | "external">("internal");
  const [multimediaLocationName, setMultimediaLocationName] = useState("");
  const [multimediaServiceId, setMultimediaServiceId] = useState("");
  const [multimediaNotes, setMultimediaNotes] = useState("");
  const [multimediaDateError, setMultimediaDateError] = useState("");
  const [multimediaDeptMemberUids, setMultimediaDeptMemberUids] = useState<string[]>([]);
  const [multimediaConfig, setMultimediaConfig] = useState<Record<string, { enabled: boolean; count: number }>>({
    audioOperator: { enabled: true, count: 1 },
    pcOperator: { enabled: true, count: 2 },
    socialMediaOperator: { enabled: true, count: 1 },
    photographyOperator: { enabled: true, count: 2 },
    cameraOperator: { enabled: true, count: 1 },
  });

  const [multimediaProfiles, setMultimediaProfiles] = useState<any[]>([]);
  const [selectedMultimediaProfileId, setSelectedMultimediaProfileId] = useState<string>("padrao");
  const [multimediaCustomRoleMetadata, setMultimediaCustomRoleMetadata] = useState<any>({});

  const [multimediaRolesForm, setMultimediaRolesForm] = useState<Record<string, string[]>>({
    audioOperators: [],
    pcOperators: [],
    socialMediaOperators: [],
    photographyOperators: [],
    cameraOperators: [],
  });

  const handleSelectMultimediaProfile = (profileId: string) => {
    setSelectedMultimediaProfileId(profileId);
    const targetProfile = multimediaProfiles.find((p) => p.id === profileId);
    if (targetProfile && targetProfile.roles) {
      setMultimediaConfig(targetProfile.roles);
      
      // Keep multimediaRolesForm aligned with the newly selected profile roles count
      setMultimediaRolesForm((prev) => {
        const resetForm: Record<string, string[]> = { ...prev };
        Object.keys(targetProfile.roles).forEach((key) => {
          const dbKey = key.endsWith("s") ? key : `${key}s`;
          const targetCount = targetProfile.roles[key]?.count || 0;
          const currentArr = prev[dbKey] || [];
          if (currentArr.length > targetCount) {
            resetForm[dbKey] = currentArr.slice(0, targetCount);
          } else {
            const filled = [...currentArr];
            while (filled.length < targetCount) {
              filled.push("");
            }
            resetForm[dbKey] = filled;
          }
        });
        return resetForm;
      });
    }
  };

  const getMultimediaRolesToDisplay = () => {
    const standardMap: Record<string, { title: string; key: string; icon: any }> = {
      audioOperator: { title: "Operador de Áudio", key: "audioOperators", icon: Mic2 },
      pcOperator: { title: "Operador de Projeção (PC)", key: "pcOperators", icon: Monitor },
      socialMediaOperator: { title: "Operador de Redes Sociais", key: "socialMediaOperators", icon: Share2 },
      photographyOperator: { title: "Fotógrafos", key: "photographyOperators", icon: Camera },
      cameraOperator: { title: "Operador de Câmera", key: "cameraOperators", icon: Video },
    };

    const rolesList: { title: string; key: string; configKey: string; icon: any }[] = [];

    // Add standard ones in order
    Object.keys(standardMap).forEach((configKey) => {
      const cfg = multimediaConfig[configKey];
      if (cfg && cfg.enabled) {
        rolesList.push({
          title: standardMap[configKey].title,
          key: standardMap[configKey].key,
          configKey: configKey,
          icon: standardMap[configKey].icon,
        });
      }
    });

    // Add custom ones from metadata/config
    Object.keys(multimediaConfig).forEach((configKey) => {
      if (standardMap[configKey]) return; // already added

      const cfg = multimediaConfig[configKey];
      if (cfg && cfg.enabled) {
        const meta = multimediaCustomRoleMetadata[configKey] || { label: configKey };
        rolesList.push({
          title: meta.label || configKey,
          key: configKey.endsWith("s") ? configKey : `${configKey}s`,
          configKey: configKey,
          icon: Sliders,
        });
      }
    });

    return rolesList;
  };

  const fetchMultimediaDeptMembers = async () => {
    if (!userData?.churchId) return;
    try {
      const snap = await getDocs(
        collection(db, "churches", userData.churchId, "departments", "multimedia", "members")
      );
      const uids = snap.docs.map((d) => d.id);
      setMultimediaDeptMemberUids(uids);
    } catch (err) {
      console.error("Error fetching multimedia dept members:", err);
    }
  };

  const loadMultimediaConfig = async () => {
    if (!userData?.churchId) return;
    try {
      const docRef = doc(db, "services", `multimedia_scale_config_${userData.churchId}`);
      const snap = await getDoc(docRef);
      const defaultRoles = {
        audioOperator: { enabled: true, count: 1 },
        pcOperator: { enabled: true, count: 2 },
        socialMediaOperator: { enabled: true, count: 1 },
        photographyOperator: { enabled: true, count: 2 },
        cameraOperator: { enabled: true, count: 1 },
      };

      if (snap.exists()) {
        const data = snap.data();
        setMultimediaCustomRoleMetadata(data.customRoleMetadata || {});

        const loadedCustomMetadata = data.customRoleMetadata || {};
        const combinedDefaultRoles: Record<string, { enabled: boolean; count: number }> = { ...defaultRoles };
        Object.keys(loadedCustomMetadata).forEach((key) => {
          combinedDefaultRoles[key] = { enabled: false, count: 0 };
        });

        let loadedProfiles: any[] = [];
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

        setMultimediaProfiles(loadedProfiles);
        
        const pId = selectedMultimediaProfileId || data.activeProfileId || "padrao";
        const currentProfile = loadedProfiles.find((p) => p.id === pId) || loadedProfiles[0];
        setMultimediaConfig(currentProfile.roles || data.roles || combinedDefaultRoles);
      } else {
        const fallbackProfiles = [
          {
            id: "padrao",
            name: "Padrão",
            roles: defaultRoles,
          },
        ];
        setMultimediaProfiles(fallbackProfiles);
        setMultimediaConfig(defaultRoles);
        setMultimediaCustomRoleMetadata({});
      }
    } catch (err) {
      console.error("Error loading multimedia config in schedules page:", err);
    }
  };

  const [worshipScaleConfig, setWorshipScaleConfig] = useState<any>(null);
  const [worshipProfiles, setWorshipProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("padrao");
  const [customRoleMetadata, setCustomRoleMetadata] = useState<Record<string, { label: string; desc: string; isCustom?: boolean }>>({});
  const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [dateError, setDateError] = useState("");

  const [formData, setFormData] = useState({
    date: "",
    churchId: "",
    bandId: "", // Default placeholder
    serviceId: "",
    songs: [] as string[],
    roles: {
      mainMinister: "",
      drummer: "",
      bassist: "",
      keyboardist: "",
      acousticGuitarist: "",
      electricGuitarist: "",
      baritone: "",
      contralto: "",
      soprano: "",
      mezzoSoprano: "",
      audioTech: "",
      projectionOperator: "",
      mediaCreator: "",
      socialMediaManager: "",
    } as Record<string, any>,
    notes: "",
    locationType: "internal" as "internal" | "external",
    locationName: "",
  });

  const loadWorshipScaleConfig = async () => {
    if (!userData?.churchId) return;
    try {
      const docRef = doc(db, "services", `worship_scale_config_${userData.churchId}`);
      const snap = await getDoc(docRef);
      const defaultRoles = {
        mainMinister: { enabled: true, count: 1 },
        drummer: { enabled: true, count: 1 },
        bassist: { enabled: true, count: 1 },
        keyboardist: { enabled: true, count: 1 },
        acousticGuitarist: { enabled: true, count: 1 },
        electricGuitarist: { enabled: true, count: 1 },
        baritone: { enabled: false, count: 0 },
        contralto: { enabled: false, count: 0 },
        soprano: { enabled: false, count: 0 },
        mezzoSoprano: { enabled: false, count: 0 },
        audioTech: { enabled: true, count: 1 },
        projectionOperator: { enabled: true, count: 1 },
        mediaCreator: { enabled: true, count: 1 },
        socialMediaManager: { enabled: true, count: 1 },
      } as Record<string, { enabled: boolean; count: number }>;

      if (snap.exists()) {
        const data = snap.data();
        setWorshipScaleConfig(data);
        
        const loadedCustomMetadata = data.customRoleMetadata || {};
        setCustomRoleMetadata(loadedCustomMetadata);

        const combinedDefaultRoles = { ...defaultRoles };
        Object.keys(loadedCustomMetadata).forEach((key) => {
          combinedDefaultRoles[key] = { enabled: false, count: 0 };
        });

        const loadedAvailable = data.availableInstruments || Object.keys(combinedDefaultRoles);
        setAvailableInstruments(loadedAvailable);

        let loadedProfiles: any[] = [];
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
        setWorshipProfiles(loadedProfiles);
      } else {
        const fallbackProfiles = [
          {
            id: "padrao",
            name: "Padrão",
            roles: defaultRoles,
          },
        ];
        setWorshipProfiles(fallbackProfiles);
        setAvailableInstruments(Object.keys(defaultRoles));
        setCustomRoleMetadata({});
      }
    } catch (err) {
      console.error("Error loading worship config in schedules page:", err);
    }
  };

  useEffect(() => {
    async function init() {
      if (!userData?.churchId) return;

      setLoading(true);
      try {
        await Promise.all([
          fetchSchedules(),
          fetchChurches(),
          fetchBands(),
          fetchServices(),
          fetchSongs(),
          fetchMembers(),
          fetchMultimediaDeptMembers(),
          loadMultimediaConfig(),
          loadWorshipScaleConfig(),
          fetchPersonalSongs(),
        ]);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [userData?.churchId, user?.uid]);

  // Real-time schedules observer
  useEffect(() => {
    if (!userData?.churchId) return;

    const q = query(
      collection(db, "schedules"),
      where("churchId", "==", userData.churchId),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => ({ ...doc.data() }) as Schedule);
        // Sort in memory to keep newest schedules on top
        data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setSchedules(data);
      },
      (err) => {
        console.error("Error with real-time schedules snapshot listener:", err);
      }
    );

    return () => unsubscribe();
  }, [userData?.churchId]);

  // Sync selectedScheduleForView in real-time when schedules update
  useEffect(() => {
    if (selectedScheduleForView && schedules.length > 0) {
      const updated = schedules.find((s) => s.id === selectedScheduleForView.id);
      if (updated) {
        if (JSON.stringify(updated) !== JSON.stringify(selectedScheduleForView)) {
          setSelectedScheduleForView(updated);
        }
      }
    }
  }, [schedules, selectedScheduleForView]);

  useEffect(() => {
    if (multimediaDate) {
      fetchTeamAvailability(multimediaDate);

      // Auto-select service for multimedia based on day of week
      const selectedDate = new Date(`${multimediaDate}T12:00:00`);
      const dayNames = [
        "Domingo",
        "Segunda-feira",
        "Terça-feira",
        "Quarta-feira",
        "Quinta-feira",
        "Sexta-feira",
        "Sábado",
      ];
      const dayOfWeek = dayNames[selectedDate.getDay()];

      const matchingService = services.find(
        (s) => s.dayOfWeek === dayOfWeek && s.churchId === userData?.churchId,
      );
      const currentService = services.find((s) => s.id === multimediaServiceId);

      // Change service if none is selected OR if the selected one doesn't match the new day
      if (
        matchingService &&
        (!currentService || currentService.dayOfWeek !== dayOfWeek)
      ) {
        setMultimediaServiceId(matchingService.id);
      }
    }
  }, [multimediaDate, userData?.churchId, isMultimediaModalOpen, services, multimediaServiceId]);

  useEffect(() => {
    setDateError("");
    if (formData.date) {
      fetchTeamAvailability(formData.date);

      // Auto-select service based on day of week
      const selectedDate = new Date(`${formData.date}T12:00:00`);
      const dayNames = [
        "Domingo",
        "Segunda-feira",
        "Terça-feira",
        "Quarta-feira",
        "Quinta-feira",
        "Sexta-feira",
        "Sábado",
      ];
      const dayOfWeek = dayNames[selectedDate.getDay()];

      const matchingService = services.find(
        (s) => s.dayOfWeek === dayOfWeek && s.churchId === formData.churchId,
      );
      const currentService = services.find((s) => s.id === formData.serviceId);

      // Change service if none is selected OR if the selected one doesn't match the new day
      if (
        matchingService &&
        (!currentService || currentService.dayOfWeek !== dayOfWeek)
      ) {
        setFormData((prev) => ({ ...prev, serviceId: matchingService.id }));
      }
    } else {
      setTeamAvailability([]);
    }
  }, [formData.date, formData.churchId, isModalOpen, services]);

  async function fetchTeamAvailability(dateString: string) {
    if (!userData?.churchId || !dateString) return;

    setAvailabilityLoading(true);
    try {
      const selectedDate = new Date(`${dateString}T12:00:00`);
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();

      // 1. Fetch users directly associated via profile churchId
      const membersQ = query(
        collection(db, "users"),
        where("churchId", "==", userData.churchId),
      );
      const membersSnap = await getDocs(membersQ);
      const membersMap = new Map<string, any>();
      membersSnap.docs.forEach((d) => {
        membersMap.set(d.id, { uid: d.id, ...d.data() });
      });

      // 2. Fetch users associated via departmental members subcollections
      const departments = ["worship", "multimedia", "secretariat"];
      for (const dept of departments) {
        try {
          const deptSnap = await getDocs(
            collection(db, "churches", userData.churchId, "departments", dept, "members")
          );
          for (const docSnap of deptSnap.docs) {
            const memberUid = docSnap.id;
            if (!membersMap.has(memberUid)) {
              // Fetch user profile for this department member
              const userProfileSnap = await getDoc(doc(db, "users", memberUid));
              if (userProfileSnap.exists()) {
                membersMap.set(memberUid, { uid: memberUid, ...userProfileSnap.data() });
              }
            }
          }
        } catch (err) {
          console.error(`Error loading schedule department members for ${dept}:`, err);
        }
      }

      const members = Array.from(membersMap.values());

      const availabilityPromises = members.map(async (member) => {
        const docId = `${member.uid}_${year}_${month}`;
        try {
          const snap = await getDoc(doc(db, "availability", docId));
          if (snap.exists()) {
            return {
              userId: member.uid,
              days: snap.data().days || [],
            };
          }
        } catch (err) {
          console.error(`Error loading schedule availability for user ${member.uid}:`, err);
        }
        return null;
      });

      const availabilityResults = await Promise.all(availabilityPromises);
      const records = availabilityResults.filter(Boolean) as { userId: string; days: number[] }[];

      // Filter records to only those who are available on the specific day
      const availableUserIds = records
        .filter((rec) => rec.days.includes(day))
        .map((rec) => rec.userId);

      setTeamAvailability(availableUserIds);
    } catch (err) {
      console.error("Error fetching team availability:", err);
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function fetchSchedules() {
    if (!userData?.churchId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "schedules"),
        where("churchId", "==", userData.churchId),
        // Removed orderBy temporarily to test if it's an index issue or rule issue
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({ ...doc.data() }) as Schedule);
      // Sort in memory to avoid index requirements for now if that's the issue
      data.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setSchedules(data);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, "schedules");
    } finally {
      setLoading(false);
    }
  }

  async function fetchChurches() {
    if (!userData?.churchId) return;
    const snap = await getDoc(doc(db, "churches", userData.churchId));
    if (snap.exists()) {
      setChurches([{ id: snap.id, name: snap.data().name }]);
    }
  }

  async function fetchBands() {
    if (!userData?.churchId) return;
    const q = query(
      collection(db, "bands"),
      where("churchId", "==", userData.churchId),
    );
    const snap = await getDocs(q);
    setBands(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Band));
  }

  async function fetchServices() {
    if (!userData?.churchId) return;
    const q = query(
      collection(db, "services"),
      where("churchId", "==", userData.churchId),
    );
    const snap = await getDocs(q);
    setServices(
      snap.docs.map((doc) => ({
        id: doc.id,
        churchId: doc.data().churchId,
        name: doc.data().name,
        dayOfWeek: doc.data().dayOfWeek,
        status: doc.data().status === "inactive" ? "inactive" : "active",
      })),
    );
  }

  async function fetchSongs() {
    if (!userData?.churchId) return;
    const q = query(
      collection(db, "songs"),
      where("churchId", "==", userData.churchId),
    );
    const snap = await getDocs(q);
    setSongs(
      snap.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        artist: doc.data().artist,
      })),
    );
  }

  async function fetchPersonalSongs() {
    if (!user) return;
    try {
      const q = query(
        collection(db, "songs"),
        where("ownerId", "==", user.uid),
      );
      const snap = await getDocs(q);
      setPersonalSongs(
        snap.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title || "",
          artist: doc.data().artist || "",
        })) as Song[]
      );
    } catch (err) {
      console.error("Error fetching personal songs:", err);
    }
  }

  async function handleSavePlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!playlistSchedule || !user) return;

    setSavingPlaylist(true);
    try {
      const scheduleId = playlistSchedule.id;
      const churchId = playlistSchedule.churchId || userData?.churchId || "";

      // 1. Save to custom 'playlists' collection/table
      const playlistRef = doc(db, "playlists", scheduleId);
      const playlistSnap = await getDoc(playlistRef);
      const existingPlaylist = playlistSnap.exists() ? playlistSnap.data() : null;

      const playlistData = {
        id: scheduleId,
        scheduleId: scheduleId,
        churchId: churchId,
        songs: selectedPlaylistSongs,
        rehearsalDate,
        rehearsalTime,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        ...(existingPlaylist
          ? {
              createdAt: existingPlaylist.createdAt || serverTimestamp(),
              createdBy: existingPlaylist.createdBy || user.uid,
            }
          : {
              createdAt: serverTimestamp(),
              createdBy: user.uid,
            }
        ),
      };

      await setDoc(playlistRef, playlistData);

      // 2. Update 'schedules' collection to link to playlist (keeping cache for instant render/retrieval)
      const docRef = doc(db, "schedules", playlistSchedule.id);
      const updateData = {
        rehearsalDate,
        rehearsalTime,
        playlist: selectedPlaylistSongs,
        playlistId: scheduleId,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };

      await updateDoc(docRef, updateData);

      const updatedSchedule = {
        ...playlistSchedule,
        ...updateData,
      };

      setSelectedScheduleForView(updatedSchedule);
      setIsPlaylistModalOpen(false);
      setPlaylistSchedule(null);
      await fetchSchedules();
    } catch (err) {
      console.error("Error saving playlist and rehearsal details:", err);
      alert("Erro ao salvar os dados do ensaio e playlist.");
    } finally {
      setSavingPlaylist(false);
    }
  }

  async function fetchMembers() {
    if (!userData?.churchId) return;
    const q = query(
      collection(db, "users"),
      where("churchId", "==", userData.churchId),
    );
    const snap = await getDocs(q);
    setMembers(
      snap.docs.map((doc) => ({
        uid: doc.id,
        name: doc.data().name,
        role: doc.data().role,
        churchId: doc.data().churchId,
        instruments: doc.data().instruments,
        vocalRange: doc.data().vocalRange,
        roles: doc.data().roles,
        fcmTokens: doc.data().fcmTokens || [],
      })),
    );
  }

  const getDeterministicScheduleId = (
    churchId: string,
    date: string,
    locationType: "internal" | "external",
    serviceId?: string,
    locationName?: string
  ) => {
    const cleanDate = date.split("T")[0];
    if (locationType === "internal" && serviceId) {
      return `scale_${churchId}_${cleanDate}_${serviceId}`;
    } else {
      const cleanLocation = (locationName || "external")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      return `scale_${churchId}_${cleanDate}_external_${cleanLocation}`;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setDateError("");

    if (!canManageWorship) {
      setDateError("Você não tem permissão de líder para gerenciar escalas de louvor.");
      return;
    }

    const isInternal = formData.locationType === "internal";

    if (isInternal && !formData.serviceId) {
      setDateError("Por favor, selecione um culto para a escala interna.");
      return;
    }

    if (formData.locationType === "external" && !formData.locationName.trim()) {
      setDateError("Por favor, digite o local da escala externa.");
      return;
    }

    if (isInternal && formData.serviceId) {
      const selectedService = services.find((s) => s.id === formData.serviceId);
      if (selectedService && selectedService.dayOfWeek) {
        const selectedDate = new Date(`${formData.date}T12:00:00`);
        const dayMap: { [key: string]: number } = {
          Domingo: 0,
          "Segunda-feira": 1,
          "Terça-feira": 2,
          "Quarta-feira": 3,
          "Quinta-feira": 4,
          "Sexta-feira": 5,
          Sábado: 6,
        };
        const expectedDay = dayMap[selectedService.dayOfWeek];
        if (
          expectedDay !== undefined &&
          selectedDate.getDay() !== expectedDay
        ) {
          setDateError(
            `A data escolhida não corresponde ao dia do culto (${selectedService.dayOfWeek}).`,
          );
          return;
        }
      }
    }

    try {
      const scheduleId = getDeterministicScheduleId(
        formData.churchId,
        formData.date,
        formData.locationType,
        formData.serviceId,
        formData.locationName
      );

      // Verify if document exists to merge
      const docRef = doc(db, "schedules", scheduleId);
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() as any : null;

      // Preserve existing multimedia values
      const existingRoles = existingData?.roles || {};
      const pcOperators = existingRoles.pcOperators || [];
      const socialMediaOperators = existingRoles.socialMediaOperators || [];
      const photographyOperators = existingRoles.photographyOperators || [];
      const cameraOperators = existingRoles.cameraOperators || [];
      const multimediaNotes = existingData?.multimediaNotes || "";

      // Overwrite worship roles but merge multimedia roles
      const mergedRoles = {
        ...formData.roles,
        pcOperators,
        socialMediaOperators,
        photographyOperators,
        cameraOperators,
      };

      const worshipMembers = Object.values(formData.roles).filter(Boolean);
      const membersList = worshipMembers;
      const multimediaMembers = [
        ...pcOperators,
        ...socialMediaOperators,
        ...photographyOperators,
        ...cameraOperators
      ].filter(Boolean);

      // Union of both roles
      const mergedMembers = Array.from(new Set([...worshipMembers, ...multimediaMembers]));

      const scheduleData = {
        id: scheduleId,
        date: formData.date,
        churchId: formData.churchId,
        bandId: formData.bandId || "master",
        serviceId: formData.serviceId || "",
        songs: formData.songs,
        roles: mergedRoles,
        members: mergedMembers,
        notes: formData.notes,
        multimediaNotes,
        locationType: formData.locationType,
        locationName:
          formData.locationType === "external" ? formData.locationName : "",
        rehearsalDate: existingData?.rehearsalDate || "",
        rehearsalTime: existingData?.rehearsalTime || "",
        playlist: existingData?.playlist || [],
        playlistId: existingData?.playlistId || "",
        profileId: selectedProfileId || "padrao",
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
        ...(existingData 
          ? {
              createdAt: existingData.createdAt || serverTimestamp(),
              createdBy: existingData.createdBy || user?.uid,
            }
          : {
              createdAt: serverTimestamp(),
              createdBy: user?.uid,
            }
        ),
      };

      await setDoc(docRef, scheduleData);

      // Save internal notifications for each member via client SDK (runs under user's permissions)
      try {
        const churchName =
          churches.find((c) => c.id === formData.churchId)?.name ||
          "sua igreja";
        const formattedDate = new Date(formData.date).toLocaleDateString(
          "pt-BR",
        );
        const notifTitle = editingSchedule
          ? "Escala Atualizada!"
          : "Nova Escala!";
        const notifBody =
          formData.locationType === "external"
            ? `Você foi escalado para o evento externo em ${formData.locationName} no dia ${formattedDate}.`
            : `Você foi escalado para o dia ${formattedDate} na ${churchName}.`;

        const savePromises = membersList.map(async (mid) => {
          const notifId = `notif_${Date.now()}_${mid}`;
          return setDoc(doc(db, "notifications", notifId), {
            id: notifId,
            userId: mid,
            title: notifTitle,
            body: notifBody,
            type: "schedule",
            read: false,
            createdAt: serverTimestamp(),
          });
        });
        await Promise.all(savePromises);

        if (membersList.length > 0 && user) {
          await fetch("/api/notifications/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
            body: JSON.stringify({
              title: notifTitle,
              body: notifBody,
              userIds: membersList,
            }),
          });
        }
      } catch (notifErr) {
        console.error("Failed to handle notifications:", notifErr);
      }

      setIsModalOpen(false);
      setEditingSchedule(null);
      setFormData({
        date: "",
        churchId: "",
        bandId: "master",
        serviceId: "",
        songs: [],
        roles: {
          mainMinister: "",
          drummer: "",
          bassist: "",
          keyboardist: "",
          acousticGuitarist: "",
          electricGuitarist: "",
          baritone: "",
          contralto: "",
          soprano: "",
          mezzoSoprano: "",
          audioTech: "",
          projectionOperator: "",
          mediaCreator: "",
          socialMediaManager: "",
        },
        notes: "",
        locationType: "internal",
        locationName: "",
      });
      fetchSchedules();
    } catch (err) {
      handleFirestoreError(
        err,
        editingSchedule ? OperationType.UPDATE : OperationType.CREATE,
        `schedules/${editingSchedule?.id || "new"}`,
      );
    }
  };

  const toggleSelection = (id: string, field: "songs") => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter((x) => x !== id)
        : [...prev[field], id],
    }));
  };

  const handleRoleChange = (
    role: string,
    memberId: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      roles: {
        ...prev.roles,
        [role]: memberId,
      },
    }));
  };

  const handleProfileChangeAndLoadRoles = (pId: string) => {
    setSelectedProfileId(pId);
    const profile = worshipProfiles.find((p) => p.id === pId);
    if (profile && profile.roles) {
      setFormData((prev) => {
        const newRoles = { ...prev.roles };
        Object.keys(profile.roles).forEach((key) => {
          if (newRoles[key] === undefined) {
            newRoles[key] = "";
          }
        });
        return {
          ...prev,
          roles: newRoles,
        };
      });
    }
  };

  const filterMembersForRole = (
    membersToFilter: Member[],
    roleKey: string,
    churchId: string,
  ) => {
    let filtered = membersToFilter;

    // Standard list of multimedia role keys to skip music/band limitations
    const isMultimediaRole = [
      "audioTech", "audio_tech", "audioOperator", "audio_operator", "audio", "sound",
      "projectionOperator", "projection_operator", "pcOperator", "pc_operator", "projection", "pc",
      "mediaCreator", "media_creator", "cameraOperator", "camera_operator", "photographyOperator", "photography_operator", "camera", "photography", "video",
      "socialMediaManager", "social_media_manager", "socialMediaOperator", "social_media_operator", "social_media", "socialMedia"
    ].includes(roleKey);

    // 1. Filter by band membership if a specific band is selected (skip for multimedia roles)
    if (!isMultimediaRole && formData.bandId && formData.bandId !== "master") {
      const selectedBand = bands.find((b) => b.id === formData.bandId);
      const bandMemberIds = selectedBand?.memberIds || [];
      filtered = filtered.filter((m) => bandMemberIds.includes(m.uid));
    }

    // 2. Filter by availability if a date is selected and there is team availability
    if (formData.date && teamAvailability.length > 0) {
      // Check if we have at least one member with this requested role who is available
      const availableWithRole = filtered.filter((m) => {
        if (!teamAvailability.includes(m.uid)) return false;
        if (churchId && m.churchId !== churchId) return false;
        const insts = m.instruments || [];
        const vocal = m.vocalRange || "";
        switch (roleKey) {
          case "mainMinister":
            return (
              insts.includes("Voz") ||
              [
                "Baixo",
                "Tenor",
                "Barítono",
                "Soprano",
                "Contralto",
                "Mezzo",
              ].includes(vocal)
            );
          case "drummer":
            return insts.includes("Bateria");
          case "bassist":
            return insts.includes("Baixo");
          case "keyboardist":
            return insts.includes("Teclado");
          case "acousticGuitarist":
            return insts.includes("Violão") || insts.includes("Violino");
          case "electricGuitarist":
            return insts.includes("Guitarra");
          case "baritone":
            return ["Tenor", "Baixo", "Barítono"].includes(vocal);
          case "contralto":
            return vocal === "Contralto";
          case "soprano":
            return vocal === "Soprano";
          case "mezzoSoprano":
            return vocal === "Mezzo";
          case "audioTech":
          case "audio_tech":
          case "audioOperator":
          case "audio_operator":
            return (
              m.roles?.multimedia?.includes("audio_tech") ||
              m.roles?.multimedia?.includes("audio_operator") ||
              m.roles?.multimedia?.includes("audio") ||
              m.roles?.multimedia?.includes("sound") ||
              m.roles?.multimedia?.includes("audioTech") ||
              m.roles?.multimedia?.includes("audioOperator") ||
              false
            );
          case "projectionOperator":
          case "projection_operator":
          case "pcOperator":
          case "pc_operator":
          case "projection":
            return (
              m.roles?.multimedia?.includes("projection_operator") ||
              m.roles?.multimedia?.includes("pc_operator") ||
              m.roles?.multimedia?.includes("projection") ||
              m.roles?.multimedia?.includes("projectionOperator") ||
              m.roles?.multimedia?.includes("pcOperator") ||
              m.roles?.multimedia?.includes("pc") ||
              false
            );
          case "mediaCreator":
          case "media_creator":
          case "video":
          case "camera":
          case "camera_operator":
          case "cameraOperator":
          case "photography_operator":
          case "photographyOperator":
          case "photography":
            return (
              m.roles?.multimedia?.includes("media_creator") ||
              m.roles?.multimedia?.includes("camera_operator") ||
              m.roles?.multimedia?.includes("photography_operator") ||
              m.roles?.multimedia?.includes("mediaCreator") ||
              m.roles?.multimedia?.includes("cameraOperator") ||
              m.roles?.multimedia?.includes("photographyOperator") ||
              m.roles?.multimedia?.includes("camera") ||
              m.roles?.multimedia?.includes("photography") ||
              m.roles?.multimedia?.includes("video") ||
              false
            );
          case "socialMediaManager":
          case "social_media_manager":
          case "socialMediaOperator":
          case "social_media_operator":
          case "socialMedia":
          case "social_media":
            return (
              m.roles?.multimedia?.includes("social_media_manager") ||
              m.roles?.multimedia?.includes("social_media_operator") ||
              m.roles?.multimedia?.includes("socialMediaManager") ||
              m.roles?.multimedia?.includes("socialMediaOperator") ||
              m.roles?.multimedia?.includes("social_media") ||
              m.roles?.multimedia?.includes("socialMedia") ||
              false
            );
          case "photographyOperator":
            return (
              m.roles?.multimedia?.includes("photography_operator") ||
              m.roles?.multimedia?.includes("media_creator") ||
              m.roles?.multimedia?.includes("photography") ||
              m.roles?.multimedia?.includes("photographyOperator") ||
              false
            );
          default:
            return false;
        }
      });

      if (availableWithRole.length > 0) {
        filtered = filtered.filter((m) => teamAvailability.includes(m.uid));
      }
    }

    return filtered.filter((m) => {
      if (churchId && m.churchId !== churchId) return false;
      const insts = m.instruments || [];
      const vocal = m.vocalRange || "";
      switch (roleKey) {
        case "mainMinister":
          return (
            insts.includes("Voz") ||
            [
              "Baixo",
              "Tenor",
              "Barítono",
              "Soprano",
              "Contralto",
              "Mezzo",
            ].includes(vocal)
          );
        case "drummer":
          return insts.includes("Bateria");
        case "bassist":
          return insts.includes("Baixo");
        case "keyboardist":
          return insts.includes("Teclado");
        case "acousticGuitarist":
          return insts.includes("Violão") || insts.includes("Violino");
        case "electricGuitarist":
          return insts.includes("Guitarra");
        case "baritone":
          return ["Tenor", "Baixo", "Barítono"].includes(vocal);
        case "contralto":
          return vocal === "Contralto";
        case "soprano":
          return vocal === "Soprano";
        case "mezzoSoprano":
          return vocal === "Mezzo";
        case "audioTech":
        case "audio_tech":
        case "audioOperator":
        case "audio_operator":
          return (
            m.roles?.multimedia?.includes("audio_tech") ||
            m.roles?.multimedia?.includes("audio_operator") ||
            m.roles?.multimedia?.includes("audio") ||
            m.roles?.multimedia?.includes("sound") ||
            m.roles?.multimedia?.includes("audioTech") ||
            m.roles?.multimedia?.includes("audioOperator") ||
            false
          );
        case "projectionOperator":
        case "projection_operator":
        case "pcOperator":
        case "pc_operator":
        case "projection":
          return (
            m.roles?.multimedia?.includes("projection_operator") ||
            m.roles?.multimedia?.includes("pc_operator") ||
            m.roles?.multimedia?.includes("projection") ||
            m.roles?.multimedia?.includes("projectionOperator") ||
            m.roles?.multimedia?.includes("pcOperator") ||
            m.roles?.multimedia?.includes("pc") ||
            false
          );
        case "mediaCreator":
        case "media_creator":
        case "video":
        case "camera":
        case "camera_operator":
        case "cameraOperator":
        case "photography_operator":
        case "photographyOperator":
        case "photography":
          return (
            m.roles?.multimedia?.includes("media_creator") ||
            m.roles?.multimedia?.includes("camera_operator") ||
            m.roles?.multimedia?.includes("photography_operator") ||
            m.roles?.multimedia?.includes("mediaCreator") ||
            m.roles?.multimedia?.includes("cameraOperator") ||
            m.roles?.multimedia?.includes("photographyOperator") ||
            m.roles?.multimedia?.includes("camera") ||
            m.roles?.multimedia?.includes("photography") ||
            m.roles?.multimedia?.includes("video") ||
            false
          );
        case "socialMediaManager":
        case "social_media_manager":
        case "socialMediaOperator":
        case "social_media_operator":
        case "socialMedia":
        case "social_media":
          return (
            m.roles?.multimedia?.includes("social_media_manager") ||
            m.roles?.multimedia?.includes("social_media_operator") ||
            m.roles?.multimedia?.includes("socialMediaManager") ||
            m.roles?.multimedia?.includes("socialMediaOperator") ||
            m.roles?.multimedia?.includes("social_media") ||
            m.roles?.multimedia?.includes("socialMedia") ||
            false
          );
        case "photographyOperator":
          return (
            m.roles?.multimedia?.includes("photography_operator") ||
            m.roles?.multimedia?.includes("media_creator") ||
            m.roles?.multimedia?.includes("photography") ||
            m.roles?.multimedia?.includes("photographyOperator") ||
            false
          );
        case "cameraOperator":
          return (
            m.roles?.multimedia?.includes("camera_operator") ||
            m.roles?.multimedia?.includes("camera") ||
            m.roles?.multimedia?.includes("cameraOperator") ||
            false
          );
        default:
          if (roleKey.startsWith("custom_instrument_")) {
            const customMeta = customRoleMetadata[roleKey];
            if (customMeta && customMeta.label) {
              const label = customMeta.label.toLowerCase();
              return insts.some((i) => i.toLowerCase() === label);
            }
          }
          return true;
      }
    });
  };

  const groupSchedules = () => {
    if (viewMode === "month") {
      const groups: { [key: string]: Schedule[] } = {};
      schedules.forEach((s) => {
        const date = new Date(
          s.date.includes("T") ? s.date : `${s.date}T12:00:00`,
        );
        const key = date.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        });
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      });
      return Object.entries(groups).sort((a, b) => {
        // Sort keys by actual date descending
        const dateA = new Date(a[1][0].date);
        const dateB = new Date(b[1][0].date);
        return dateB.getTime() - dateA.getTime();
      });
    } else {
      // Group by week
      const groups: { [key: string]: Schedule[] } = {};
      schedules.forEach((s) => {
        const date = new Date(
          s.date.includes("T") ? s.date : `${s.date}T12:00:00`,
        );
        // Get start of week (Sunday)
        const day = date.getDay();
        const diff = date.getDate() - day;
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - day);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const key = `${startOfWeek.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} à ${endOfWeek.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      });
      return Object.entries(groups).sort((a, b) => {
        const dateA = new Date(a[1][0].date);
        const dateB = new Date(b[1][0].date);
        return dateB.getTime() - dateA.getTime();
      });
    }
  };

  const handleOpenMultimediaModal = async (scheduleToEdit: Schedule | null = null) => {
    await loadMultimediaConfig();
    fetchMultimediaDeptMembers();
    
    if (scheduleToEdit) {
      setEditingSchedule(scheduleToEdit);
      setMultimediaDate(scheduleToEdit.date.split("T")[0]);
      setMultimediaLocationType(scheduleToEdit.locationType || "internal");
      setMultimediaLocationName(scheduleToEdit.locationName || "");
      setMultimediaServiceId(scheduleToEdit.serviceId || "");
      setMultimediaNotes((scheduleToEdit as any).multimediaNotes || scheduleToEdit.notes || "");
      
      const pId = (scheduleToEdit as any).multimediaProfileId || "padrao";
      setSelectedMultimediaProfileId(pId);
      
      const snap = await getDoc(doc(db, "services", `multimedia_scale_config_${userData?.churchId}`));
      let activeRolesConfig = {
        pcOperator: { enabled: true, count: 2 },
        socialMediaOperator: { enabled: true, count: 1 },
        photographyOperator: { enabled: true, count: 2 },
        cameraOperator: { enabled: true, count: 1 },
      };
      if (snap.exists()) {
        const data = snap.data();
        let loadedProfiles: any[] = [];
        if (data.profiles && Array.isArray(data.profiles)) {
          loadedProfiles = data.profiles;
        } else if (data.profiles && typeof data.profiles === "object") {
          loadedProfiles = Object.entries(data.profiles).map(([profileId, pData]: [string, any]) => ({
            id: profileId,
            name: pData.name || profileId,
            roles: pData.roles,
          }));
        }
        const foundProf = loadedProfiles.find(p => p.id === pId) || loadedProfiles[0];
        if (foundProf && foundProf.roles) {
          activeRolesConfig = foundProf.roles;
        } else if (data.roles) {
          activeRolesConfig = data.roles;
        }
      }
      
      setMultimediaConfig(activeRolesConfig);

      const initialForm: Record<string, string[]> = {};
      Object.keys(activeRolesConfig).forEach((key) => {
        const dbKey = key.endsWith("s") ? key : `${key}s`;
        initialForm[dbKey] = scheduleToEdit.roles?.[dbKey] || [];
      });
      setMultimediaRolesForm(initialForm);
    } else {
      setEditingSchedule(null);
      setMultimediaDate("");
      setMultimediaLocationType("internal");
      setMultimediaLocationName("");
      setMultimediaServiceId("");
      setMultimediaNotes("");
      setSelectedMultimediaProfileId("padrao");
      
      const initialForm: Record<string, string[]> = {
        pcOperators: [],
        socialMediaOperators: [],
        photographyOperators: [],
        cameraOperators: [],
      };
      setMultimediaRolesForm(initialForm);
    }
    setIsMultimediaModalOpen(true);
  };

  const handleSelectMultimediaMember = (
    roleKey: string,
    index: number,
    memberUid: string
  ) => {
    setMultimediaRolesForm((prev) => {
      const arr = [...(prev[roleKey] || [])];
      while (arr.length <= index) {
        arr.push("");
      }
      arr[index] = arr[index] === memberUid ? "" : memberUid;
      return {
        ...prev,
        [roleKey]: arr,
      };
    });
  };

  const handleSaveMultimedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setMultimediaDateError("");

    if (!canManageMultimedia) {
      setMultimediaDateError("Você não tem permissão de líder para gerenciar escalas de multimídia.");
      return;
    }

    if (multimediaLocationType === "internal" && !multimediaServiceId) {
      setMultimediaDateError("Por favor, selecione um culto para a escala interna.");
      return;
    }

    if (multimediaLocationType === "external" && !multimediaLocationName.trim()) {
      setMultimediaDateError("Por favor, digite o local da escala externa.");
      return;
    }

    // Gathering assigned members dynamically across all form fields (including custom ones)
    const customAllUids: string[] = [];
    Object.values(multimediaRolesForm).forEach((uids) => {
      if (Array.isArray(uids)) {
        customAllUids.push(...uids);
      }
    });
    const allAssignedUids = customAllUids.filter(Boolean);

    try {
      const churchId = userData?.churchId || "";
      if (!churchId) {
        setMultimediaDateError("ID da igreja não encontrado para o usuário atual.");
        return;
      }

      // Compute deterministic schedule ID based on multimedia inputs
      const scheduleId = getDeterministicScheduleId(
        churchId,
        multimediaDate,
        multimediaLocationType,
        multimediaServiceId,
        multimediaLocationName
      );

      // Fetch existing scale to preserve worship and main notes fields
      const docRef = doc(db, "schedules", scheduleId);
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() as any : null;

      // Extract existing worship variables
      const existingRoles = existingData?.roles || {};
      const worshipKeys = [
        "mainMinister", "drummer", "bassist", "keyboardist", "acousticGuitarist",
        "electricGuitarist", "baritone", "contralto", "soprano", "mezzoSoprano",
        "audioTech", "projectionOperator", "mediaCreator", "socialMediaManager"
      ];

      // Build worship roles map using existing fields or default fallback to ""
      const worshipRoles: any = {};
      worshipKeys.forEach((k) => {
        worshipRoles[k] = existingRoles[k] || "";
      });

      // Construct final roles dictionary containing both active multimedia lists and preserved worship fields
      const mergedRoles: any = {
        ...worshipRoles,
      };
      Object.entries(multimediaRolesForm).forEach(([roleKey, value]) => {
        mergedRoles[roleKey] = value || [];
      });

      // Gather current worship members UIDs
      const worshipMembers = worshipKeys.map(k => worshipRoles[k]).filter(Boolean);

      // Union of both teams
      const mergedMembers = Array.from(new Set([...worshipMembers, ...allAssignedUids]));

      // Preserve other worship properties
      const bandId = existingData?.bandId || "master";
      const songs = existingData?.songs || [];
      const worshipNotes = existingData?.notes || "";

      const scheduleData = {
        id: scheduleId,
        date: multimediaDate,
        churchId: churchId,
        bandId: bandId,
        serviceId: multimediaServiceId || "",
        songs: songs,
        roles: mergedRoles,
        members: mergedMembers,
        notes: worshipNotes,
        multimediaNotes: multimediaNotes,
        locationType: multimediaLocationType,
        locationName: multimediaLocationType === "external" ? multimediaLocationName : "",
        rehearsalDate: existingData?.rehearsalDate || "",
        rehearsalTime: existingData?.rehearsalTime || "",
        playlist: existingData?.playlist || [],
        playlistId: existingData?.playlistId || "",
        multimediaProfileId: selectedMultimediaProfileId || "padrao",
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || "system",
        ...(existingData 
          ? {
              createdAt: existingData.createdAt || serverTimestamp(),
              createdBy: existingData.createdBy || user?.uid || "system",
            }
          : {
              createdAt: serverTimestamp(),
              createdBy: user?.uid || "system",
            }
        ),
      };

      await setDoc(docRef, scheduleData);

      // Notifications
      try {
        const churchName = churches.find((c) => c.id === userData?.churchId)?.name || "sua igreja";
        const formattedDate = new Date(multimediaDate).toLocaleDateString("pt-BR");
        const notifTitle = existingData ? "Escala Multimídia Atualizada!" : "Nova Escala Multimídia!";
        const notifBody =
          multimediaLocationType === "external"
            ? `Você foi escalado para o evento externo de multimídia em ${multimediaLocationName} no dia ${formattedDate}.`
            : `Você foi escalado na multimídia para o culto no dia ${formattedDate} na ${churchName}.`;

        const savePromises = allAssignedUids.map(async (mid) => {
          const notifId = `notif_${Date.now()}_multimedia_${mid}`;
          return setDoc(doc(db, "notifications", notifId), {
            id: notifId,
            userId: mid,
            title: notifTitle,
            body: notifBody,
            type: "schedule",
            read: false,
            createdAt: serverTimestamp(),
          });
        });
        await Promise.all(savePromises);

        if (allAssignedUids.length > 0 && user) {
          await fetch("/api/notifications/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await user.getIdToken()}`,
            },
            body: JSON.stringify({
              title: notifTitle,
              body: notifBody,
              userIds: allAssignedUids,
            }),
          });
        }
      } catch (notifErr) {
        console.error("Failed to make multimedia notifications:", notifErr);
      }

      setIsMultimediaModalOpen(false);
      setEditingSchedule(null);
      fetchSchedules(); // refresh page list
    } catch (err) {
      console.error("Error saving multimedia schedule:", err);
      setMultimediaDateError("Erro ao salvar escala de multimídia.");
    }
  };

  const getMultimediaCandidates = () => {
    return members.filter((m) => {
      const isInDept = multimediaDeptMemberUids.includes(m.uid);
      const hasProfileRole = m.roles?.multimedia && m.roles.multimedia.length > 0;
      const matchesRoleStr = m.role?.toLowerCase() === "multimídia" || m.role?.toLowerCase() === "multimedia" || m.role?.toLowerCase() === "mídia" || m.role?.toLowerCase() === "midia" || m.role?.toLowerCase() === "líder de multimídia" || m.role?.toLowerCase() === "lider de multimedia";
      
      const isMultimediaUser = isInDept || hasProfileRole || matchesRoleStr;

      if (multimediaDate && teamAvailability.length > 0) {
        // Find if there is any multimedia candidate among the available individuals
        const anyMultimediaAvailable = members.some((other) => {
          const otherInDept = multimediaDeptMemberUids.includes(other.uid);
          const otherHasProfile = other.roles?.multimedia && other.roles.multimedia.length > 0;
          const otherMatchesRole = other.role?.toLowerCase() === "multimídia" || other.role?.toLowerCase() === "multimedia" || other.role?.toLowerCase() === "mídia" || other.role?.toLowerCase() === "midia" || other.role?.toLowerCase() === "líder de multimídia" || other.role?.toLowerCase() === "lider de multimedia";
          const isOtherMultimedia = otherInDept || otherHasProfile || otherMatchesRole;
          return isOtherMultimedia && teamAvailability.includes(other.uid);
        });

        if (anyMultimediaAvailable) {
          return isMultimediaUser && teamAvailability.includes(m.uid);
        }
      }
      return isMultimediaUser;
    });
  };

  const getMultimediaCandidatesForRole = (configKey: string) => {
    const baseCandidates = getMultimediaCandidates();
    return baseCandidates.filter((m) => {
      const userRoles = m.roles?.multimedia || [];
      if (configKey === "pcOperator" || configKey === "pc_operator") {
        return userRoles.includes("pc_operator") || userRoles.includes("projection_operator") || userRoles.includes("pcOperator");
      }
      if (configKey === "socialMediaOperator" || configKey === "social_media_operator") {
        return userRoles.includes("social_media_operator") || userRoles.includes("social_media_manager") || userRoles.includes("socialMediaOperator");
      }
      if (configKey === "photographyOperator" || configKey === "photography_operator") {
        return userRoles.includes("photography_operator") || userRoles.includes("media_creator") || userRoles.includes("photographyOperator");
      }
      if (configKey === "cameraOperator" || configKey === "camera_operator") {
        return userRoles.includes("camera_operator") || userRoles.includes("cameraOperator");
      }
      if (configKey === "multimedia_leader" || configKey === "multimediaLeader") {
        return userRoles.includes("multimedia_leader") || userRoles.includes("leader") || userRoles.includes("multimediaLeader");
      }
      if (configKey === "audio_operator" || configKey === "audioOperator" || configKey === "audioTech" || configKey === "audio_tech") {
        return userRoles.includes("audio_operator") || userRoles.includes("audio_tech") || userRoles.includes("audioOperator") || userRoles.includes("audioTech");
      }
      
      const camelToSnake = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      const snakeKey = camelToSnake(configKey);
      return userRoles.includes(configKey) || userRoles.includes(snakeKey);
    });
  };

  const groupedData = groupSchedules();

  const isSuperUser = userData?.super_admin === true;

  const hasWorshipLeader = userData?.roles?.worship?.includes("leader");
  const hasMultimediaLeader = userData?.roles?.multimedia?.includes("leader");

  const canManageWorship =
    isSuperUser ||
    hasWorshipLeader ||
    (userData?.role === "líder" && !hasMultimediaLeader);

  const canManageMultimedia =
    isSuperUser ||
    hasMultimediaLeader ||
    (userData?.role === "líder" && !hasWorshipLeader);

  const viewSchedule = selectedScheduleForView;
  const isWorshipScale = viewSchedule ? (activeTab === "worship") : true;
  const viewSafeDate = viewSchedule ? (viewSchedule.date.includes("T") ? viewSchedule.date : `${viewSchedule.date}T12:00:00`) : "";
  const viewServiceName = viewSchedule && viewSchedule.serviceId ? services.find((s) => s.id === viewSchedule.serviceId)?.name : null;
  const viewChurchName = viewSchedule ? (churches.find((c) => c.id === viewSchedule.churchId)?.name || "Igreja") : "";

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Tab Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab("worship")}
          className={`pb-4 px-2 font-display font-black text-lg transition-all relative ${
            activeTab === "worship"
              ? "text-blue-800 dark:text-blue-400 font-bold"
              : "text-slate-400 dark:text-slate-600 hover:text-slate-600"
          }`}
        >
          {activeTab === "worship" && (
            <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-800 dark:bg-blue-400 rounded-full" />
          )}
          Ministério de Louvor
        </button>
        <button
          onClick={() => setActiveTab("multimedia")}
          className={`pb-4 px-2 font-display font-black text-lg transition-all relative ${
            activeTab === "multimedia"
              ? "text-purple-800 dark:text-purple-400 font-bold"
              : "text-slate-400 dark:text-slate-600 hover:text-slate-600"
          }`}
        >
          {activeTab === "multimedia" && (
            <span className="absolute bottom-0 left-0 w-full h-1 bg-purple-800 dark:bg-purple-400 rounded-full" />
          )}
          Ministério de Multimídia
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-display font-black text-slate-900 dark:text-slate-100 italic tracking-tight">
            {activeTab === "worship" ? "Escalas de Louvor" : "Escalas de Multimídia"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
            {activeTab === "worship"
              ? "Organize e visualize o cronograma do seu ministério de música."
              : "Organize e visualize as escalas de som, projeção, fotografia e câmeras do seu ministério de multimídia."}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-[1.25rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => setViewMode("week")}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === "week"
                ? "bg-white dark:bg-slate-700 text-blue-800 dark:text-blue-200 shadow-md transform scale-105"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Semanal
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === "month"
                ? "bg-white dark:bg-slate-700 text-blue-800 dark:text-blue-200 shadow-md transform scale-105"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Mensal
          </button>
        </div>

        {activeTab === "worship" && canManageWorship && (
          <button
            onClick={() => {
              setEditingSchedule(null);
              setSelectedProfileId("padrao");
              setFormData({
                date: "",
                churchId: userData?.churchId || "",
                bandId: "master",
                serviceId: "",
                songs: [],
                roles: {
                  mainMinister: "",
                  drummer: "",
                  bassist: "",
                  keyboardist: "",
                  acousticGuitarist: "",
                  electricGuitarist: "",
                  baritone: "",
                  contralto: "",
                  soprano: "",
                  mezzoSoprano: "",
                  audioTech: "",
                  projectionOperator: "",
                  mediaCreator: "",
                  socialMediaManager: "",
                },
                notes: "",
                locationType: "internal",
                locationName: "",
              });
              setIsModalOpen(true);
            }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-blue-800/20 active:scale-95 ml-auto"
          >
            <Plus className="w-5 h-5" />
            Nova Escala de Louvor
          </button>
        )}

        {activeTab === "multimedia" && canManageMultimedia && (
          <button
            onClick={() => handleOpenMultimediaModal(null)}
            className="bg-purple-800 hover:bg-purple-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-purple-800/20 active:scale-95 ml-auto"
          >
            <Plus className="w-5 h-5" />
            Nova Escala de Multimídia
          </button>
        )}
      </div>

      <div className="space-y-12">
        {loading ? (
          <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
          </div>
        ) : (
          groupedData.map(([groupTitle, items]) => (
            <div key={groupTitle} className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <h3 className="text-sm font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] whitespace-nowrap">
                  {viewMode === "week" ? `Semana: ${groupTitle}` : groupTitle}
                </h3>
                <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800" />
              </div>

              <div className="grid grid-cols-1 gap-6">
                {items.map((schedule) => {
                  const serviceName = schedule.serviceId
                    ? services.find((s) => s.id === schedule.serviceId)?.name
                    : null;
                  const safeDate = schedule.date.includes("T")
                    ? schedule.date
                    : `${schedule.date}T12:00:00`;

                  if (activeTab === "multimedia") {
                    return (
                      <div
                        key={schedule.id}
                        onClick={() => setSelectedScheduleForView(schedule)}
                        className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-900/50 transition-all flex flex-col md:flex-row md:items-center gap-8 relative group cursor-pointer active:scale-[0.99]"
                      >
                        <div className="flex-shrink-0 flex items-center gap-6">
                          <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-[2rem] flex flex-col items-center justify-center text-purple-800 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 shadow-inner">
                            <span className="text-[10px] uppercase font-black tracking-widest">
                              {new Date(safeDate)
                                .toLocaleDateString("pt-BR", { month: "short" })
                                .replace(".", "")}
                            </span>
                            <span className="text-3xl font-black">
                              {new Date(safeDate).getDate()}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 italic">
                              {churches.find((c) => c.id === schedule.churchId)
                                ?.name || "Igreja"}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-md text-[10px] font-black uppercase tracking-wider border border-purple-200 dark:border-purple-800/50">
                                Multimídia
                              </span>
                              {schedule.locationType === "external" ? (
                                <span className="px-2.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-md text-[10px] font-black uppercase tracking-wider border border-rose-200 dark:border-rose-800/50 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-rose-500" />{" "}
                                  Externo:{" "}
                                  {schedule.locationName || "Local Externo"}
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-emerald-500" />{" "}
                                  Interno (Igreja)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500 text-xs font-medium mt-2">
                              {serviceName && (
                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md">
                                  <Clock className="w-3.5 h-3.5" /> {serviceName}
                                </span>
                              )}
                              <span className="flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5" />{" "}
                                {new Date(safeDate).toLocaleDateString("pt-BR", {
                                  weekday: "long",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Mid Section - Roles assigned */}
                        <div className="flex-1 border-y md:border-y-0 md:border-x border-slate-100 dark:border-slate-800 py-6 md:py-0 md:px-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { title: "Projeção (PC)", key: "pcOperators", icon: Monitor, color: "text-blue-500 bg-blue-50/50 dark:bg-blue-900/10 dark:text-blue-400 border-blue-100 dark:border-blue-900/30" },
                            { title: "Redes Sociais", key: "socialMediaOperators", icon: Share2, color: "text-green-500 bg-green-50/50 dark:bg-green-900/10 dark:text-green-400 border-green-100 dark:border-green-900/30" },
                            { title: "Fotografia", key: "photographyOperators", icon: Camera, color: "text-amber-500 bg-amber-50/50 dark:bg-amber-900/10 dark:text-amber-400 border-amber-100 dark:border-amber-900/30" },
                            { title: "Câmera", key: "cameraOperators", icon: Video, color: "text-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30" },
                          ].map((role) => {
                            const uids = (schedule.roles as any)?.[role.key] || [];
                            const IconComp = role.icon;
                            return (
                              <div key={role.title} className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  {role.title}
                                </span>
                                <div className="space-y-1">
                                  {uids.filter(Boolean).length === 0 ? (
                                    <span className="text-[10px] text-slate-400 italic">Vago</span>
                                  ) : (
                                    uids.filter(Boolean).map((uid: string, uIdx: number) => {
                                      const uName = members.find((m) => m.uid === uid)?.name || "Membro";
                                      return (
                                        <div
                                          key={`${uid}-${uIdx}`}
                                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${role.color}`}
                                        >
                                          <IconComp className="w-3 h-3" />
                                          <span className="truncate">{uName.split(" ")[0]}</span>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex-shrink-0 flex items-center gap-4">
                          {canManageMultimedia && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMultimediaModal(schedule);
                              }}
                              className="p-4 text-slate-300 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all bg-slate-50 dark:bg-slate-800/50 rounded-2xl"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={schedule.id}
                      onClick={() => setSelectedScheduleForView(schedule)}
                      className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-900/50 transition-all flex flex-col md:flex-row md:items-center gap-8 relative group cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex-shrink-0 flex items-center gap-6">
                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex flex-col items-center justify-center text-blue-800 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 shadow-inner">
                          <span className="text-[10px] uppercase font-black tracking-widest">
                            {new Date(safeDate)
                              .toLocaleDateString("pt-BR", { month: "short" })
                              .replace(".", "")}
                          </span>
                          <span className="text-3xl font-black">
                            {new Date(safeDate).getDate()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 italic">
                            {churches.find((c) => c.id === schedule.churchId)
                              ?.name || "Igreja"}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md text-[10px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-800/50">
                              {schedule.bandId === "master" || !schedule.bandId
                                ? "Ministério Principal"
                                : bands.find((b) => b.id === schedule.bandId)
                                    ?.name || "Banda Extra"}
                            </span>
                            {schedule.locationType === "external" ? (
                              <span className="px-2.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-md text-[10px] font-black uppercase tracking-wider border border-rose-200 dark:border-rose-800/50 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-500" />{" "}
                                Externo:{" "}
                                {schedule.locationName || "Local Externo"}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-500" />{" "}
                                Interno (Igreja)
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-400 dark:text-slate-500 text-xs font-medium mt-2">
                            {serviceName && (
                              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md">
                                <Clock className="w-3.5 h-3.5" /> {serviceName}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5" />{" "}
                              {new Date(safeDate).toLocaleDateString("pt-BR", {
                                weekday: "long",
                              })}
                            </span>
                            {schedule.rehearsalDate && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/40">
                                🗓️ Ensaio: {new Date(`${schedule.rehearsalDate}T12:00:00`).toLocaleDateString("pt-BR", {day: "numeric", month: "short"})} às {schedule.rehearsalTime}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 border-y md:border-y-0 md:border-x border-slate-100 dark:border-slate-800 py-6 md:py-0 md:px-10 flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
                            <Music className="w-3 h-3" /> Playlist
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {schedule.playlist && schedule.playlist.length > 0 ? (
                              schedule.playlist.map((songId, sIdx) => {
                                const songObj = songs.find((s) => s.id === songId) || personalSongs.find((s) => s.id === songId);
                                return (
                                  <span
                                    key={`${songId}-${sIdx}`}
                                    className="px-3 py-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-750 dark:text-indigo-350 rounded-xl text-xs font-bold border border-indigo-100/30 dark:border-indigo-900/30"
                                  >
                                    {songObj?.title || "..."}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                Nenhuma música na playlist
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
                            <Users className="w-3 h-3" /> Time Escalado
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(schedule.members || []))
                              .filter((mid) => {
                                if (!schedule.roles) return true;
                                const worshipUids = new Set<string>();
                                Object.entries(schedule.roles).forEach(([key, val]) => {
                                  if (isWorshipRole(key) && typeof val === "string" && val.trim()) {
                                    worshipUids.add(val);
                                  }
                                });
                                return worshipUids.has(mid);
                              })
                              .map(
                                (mid) => (
                                  <div
                                    key={mid}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-900/30"
                                  >
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                    {members
                                      .find((m) => m.uid === mid)
                                      ?.name.split(" ")[0] || "..."}
                                  </div>
                                ),
                              )}
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-4">
                        {canManageWorship && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSchedule(schedule);
                              setSelectedProfileId(schedule.profileId || "padrao");
                              setFormData({
                                date: schedule.date.split("T")[0],
                                churchId: schedule.churchId,
                                bandId: schedule.bandId || "master",
                                serviceId: schedule.serviceId || "",
                                songs: schedule.songs,
                                roles: {
                                  mainMinister:
                                    schedule.roles?.mainMinister || "",
                                  drummer: schedule.roles?.drummer || "",
                                  bassist: schedule.roles?.bassist || "",
                                  keyboardist:
                                    schedule.roles?.keyboardist || "",
                                  acousticGuitarist:
                                    schedule.roles?.acousticGuitarist || "",
                                  electricGuitarist:
                                    schedule.roles?.electricGuitarist || "",
                                  baritone: schedule.roles?.baritone || "",
                                  contralto: schedule.roles?.contralto || "",
                                  soprano: schedule.roles?.soprano || "",
                                  mezzoSoprano:
                                    schedule.roles?.mezzoSoprano || "",
                                  audioTech: schedule.roles?.audioTech || "",
                                  projectionOperator:
                                    schedule.roles?.projectionOperator || "",
                                  mediaCreator:
                                    schedule.roles?.mediaCreator || "",
                                  socialMediaManager:
                                    schedule.roles?.socialMediaManager || "",
                                  ...(schedule.roles || {}),
                                } as Record<string, any>,
                                notes: schedule.notes || "",
                                locationType:
                                  schedule.locationType || "internal",
                                locationName: schedule.locationName || "",
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-4 text-slate-300 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all bg-slate-50 dark:bg-slate-800/50 rounded-2xl"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {!loading && groupedData.length === 0 && (
          <div className="p-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] flex flex-col items-center text-center bg-white/50 dark:bg-slate-900/50">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 italic tracking-tight">
              Nenhuma escala programada
            </h3>
            <p className="text-slate-500 max-w-xs mt-2 font-medium">
              Comece planejando o próximo louvor clicando em &quot;Nova Escala&quot;.
            </p>
          </div>
        )}
      </div>

      {/* Detailed Schedule Viewer Popup */}
      {viewSchedule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-all">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedScheduleForView(null)}
            className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity"
          />
          
          {/* Modal Body */}
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-6 sm:p-10 md:p-12 overflow-hidden flex flex-col max-h-[92vh] animate-[fadeIn_0.2s_ease-out]">
            
            {/* Header */}
            <div className="flex justify-between items-start gap-6 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {isWorshipScale ? (
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-100 dark:border-blue-900/40">
                      Ministério de Louvor
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-purple-100 dark:border-purple-900/40">
                      Ministério de Multimídia
                    </span>
                  )}
                  {viewSchedule.bandId && viewSchedule.bandId !== "master" && (
                    <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-100 dark:border-amber-900/40">
                      {bands.find((b) => b.id === viewSchedule.bandId)?.name || "Banda Extra"}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none italic">
                  {viewChurchName}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-400 dark:text-slate-500 text-xs font-semibold mt-3">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                    {new Date(viewSafeDate).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  {viewServiceName && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md">
                      <Clock className="w-3.5 h-3.5" /> {viewServiceName}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {viewSchedule.locationType === "external"
                      ? `Externo: ${viewSchedule.locationName || "Local"}`
                      : "Interno (Templo)"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedScheduleForView(null)}
                className="p-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded-full"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-2 sm:pr-4 custom-scrollbar space-y-8">
              
              {/* Observações / Notas */}
              {viewSchedule.notes && viewSchedule.notes.trim() && (
                <div className="p-5 bg-amber-50/70 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-3xl space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-amber-800 dark:text-amber-500 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Observações (Louvor)
                  </h4>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {viewSchedule.notes}
                  </p>
                </div>
              )}

              {viewSchedule.multimediaNotes && viewSchedule.multimediaNotes.trim() && (
                <div className="p-5 bg-purple-50/70 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 rounded-3xl space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-purple-800 dark:text-purple-500 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-purple-500" /> Observações (Multimídia)
                  </h4>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {viewSchedule.multimediaNotes}
                  </p>
                </div>
              )}

              {/* Seção de Ensaio e Playlist da Escala (Ministro Principal) */}
              {isWorshipScale && (
                <div className="p-6 bg-gradient-to-br from-blue-50/30 to-indigo-50/20 dark:from-blue-950/10 dark:to-indigo-950/5 border border-blue-100/40 dark:border-blue-900/20 rounded-[2rem] space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-blue-900 dark:text-blue-400 flex items-center gap-2">
                        <Music className="w-4 h-4 text-indigo-500" /> Ensaio & Playlist de Estudo
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Definidos pelo Ministro Principal para preparação espiritual e musical do grupo.
                      </p>
                    </div>
                    {((viewSchedule.roles?.mainMinister === user?.uid) || isSuperUser || canManageWorship) && (
                      <button
                        onClick={() => {
                          setPlaylistSchedule(viewSchedule);
                          setRehearsalDate(viewSchedule.rehearsalDate || "");
                          setRehearsalTime(viewSchedule.rehearsalTime || "");
                          setSelectedPlaylistSongs(viewSchedule.playlist || []);
                          setPlaylistSearchTerm("");
                          setIsPlaylistModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md space-x-1.5 transition-all active:scale-95 flex items-center"
                        id="btn-manage-playlist"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Gerenciar Playlist & Ensaio</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Detalhes do Ensaio */}
                    <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                        🗓️ Ensaio Agendado
                      </span>
                      {viewSchedule.rehearsalDate ? (
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
                            {new Date(`${viewSchedule.rehearsalDate}T12:00:00`).toLocaleDateString("pt-BR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </p>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> às {viewSchedule.rehearsalTime || "00:00"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Nenhum ensaio agendado para esta escala ainda.</p>
                      )}
                    </div>

                    {/* Detalhes da Playlist */}
                    <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                        🎵 Músicas para Estudo ({viewSchedule.playlist?.length || 0})
                      </span>
                      {viewSchedule.playlist && viewSchedule.playlist.length > 0 ? (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                          {viewSchedule.playlist.map((songId) => {
                            const songObj = songs.find((s) => s.id === songId) || personalSongs.find((s) => s.id === songId);
                            return (
                              <div
                                key={songId}
                                className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100/50 dark:border-slate-800"
                              >
                                <span className="font-extrabold text-slate-750 dark:text-slate-250 truncate max-w-[140px]">
                                  {songObj?.title || `Música ID: ${songId.slice(0, 5)}...`}
                                </span>
                                {songObj?.artist && (
                                  <span className="text-[9px] text-slate-400 font-medium truncate max-w-[100px]">
                                    {songObj.artist}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Nenhuma música adicionada na playlist de estudo ainda.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Louvor / Worship details: Songs & Musicians */}
              {isWorshipScale ? (
                <>
                  {/* Repertório de Músicas */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                      <Music className="w-3.5 h-3.5" /> Repertório Musical ({viewSchedule.songs?.length || 0})
                    </h4>
                    {viewSchedule.songs && viewSchedule.songs.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {viewSchedule.songs.map((songId, sIdx) => {
                          const songObj = songs.find((s) => s.id === songId);
                          return (
                            <div
                              key={`${songId}-${sIdx}`}
                              className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between"
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                  {songObj?.title || `Música ID: ${songId}`}
                                </p>
                                {songObj?.artist && (
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    {songObj.artist}
                                  </p>
                                )}
                              </div>
                              {songObj?.bpm && (
                                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md text-[9px] font-black">
                                  {songObj.bpm} BPM
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Nenhuma música escolhida para esta escala.</p>
                    )}
                  </div>

                  {/* Escala de Pessoas */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" /> Equipe Escalada
                    </h4>
                    <div className={`grid grid-cols-1 ${isWorshipScale ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-6`}>
                      
                      {/* Vocals column */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-black border-b border-blue-100 dark:border-blue-900/30 pb-1 flex items-center gap-1 text-blue-800 dark:text-blue-400">
                          Vocais
                        </h5>
                        <div className="space-y-2">
                          {(() => {
                            const defaultVocals = [
                              { key: "mainMinister", label: "Ministro Principal" },
                              { key: "soprano", label: "Soprano" },
                              { key: "contralto", label: "Contralto" },
                              { key: "mezzoSoprano", label: "Mezzo" },
                              { key: "baritone", label: "Tenor/Baixo/Barít." },
                            ];
                            
                            const shownVocals = [...defaultVocals];
                            if (viewSchedule.roles) {
                              Object.keys(viewSchedule.roles).forEach((key) => {
                                let baseKey = key;
                                let suffix = "";
                                const match = key.match(/_(\d+)$/);
                                if (match) {
                                  suffix = " " + match[1];
                                  baseKey = key.replace(/_\d+$/, "");
                                }
                                
                                if (defaultVocals.some(v => v.key === baseKey) && !shownVocals.some(v => v.key === key)) {
                                  const baseLabel = defaultVocals.find(v => v.key === baseKey)?.label || baseKey;
                                  shownVocals.push({ key, label: baseLabel + suffix });
                                }
                              });
                            }

                            return shownVocals.filter((role) => {
                              if (role.key === "mainMinister") return true;
                              // Check if assigned
                              if (viewSchedule.roles?.[role.key]) return true;
                              
                              // Check if enabled in active profile
                              if (worshipScaleConfig) {
                                const viewProfileId = viewSchedule?.profileId || "padrao";
                                const viewProfile = worshipProfiles.find(p => p.id === viewProfileId) || worshipProfiles[0];
                                const viewProfileRoles = viewProfile?.roles || {};
                                
                                let baseKey = role.key;
                                if (role.key.match(/_\d+$/)) {
                                  baseKey = role.key.replace(/_\d+$/, "");
                                }
                                
                                const isEnabled = viewProfileRoles[baseKey]?.enabled || false;
                                const count = viewProfileRoles[baseKey]?.count || 1;
                                
                                const match = role.key.match(/_(\d+)$/);
                                if (match) {
                                  return isEnabled && parseInt(match[1]) <= count;
                                }
                                
                                return isEnabled;
                              }
                              return defaultVocals.some(d => d.key === role.key); 
                            }).map((role) => {
                              const uid = viewSchedule.roles?.[role.key];
                              const nameStr = uid ? (members.find((m) => m.uid === uid)?.name || "Membro") : "Vago";
                              return (
                                <div key={role.key} className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{role.label}</span>
                                  <span className={`text-xs font-bold mt-1 ${uid ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 italic'}`}>{nameStr}</span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
 
                      {/* Instruments column */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-black border-b border-amber-100 dark:border-amber-900/30 pb-1 flex items-center gap-1 text-amber-700 dark:text-amber-400">
                          Instrumentos
                        </h5>
                        <div className="space-y-2">
                          {(() => {
                            const defaultInstruments = [
                              { key: "keyboardist", label: "Teclado" },
                              { key: "acousticGuitarist", label: "Violão" },
                              { key: "electricGuitarist", label: "Guitarra" },
                              { key: "bassist", label: "Baixo" },
                              { key: "drummer", label: "Bateria" },
                            ];
                            
                            // Add other keys present in custom metadata or viewSchedule.roles
                            const shownInstruments = [...defaultInstruments];
                            Object.entries(customRoleMetadata).forEach(([key, custom]) => {
                              if (!shownInstruments.some((r) => r.key === key)) {
                                shownInstruments.push({ key, label: custom.label });
                              }
                            });
                            
                            if (viewSchedule.roles) {
                              Object.keys(viewSchedule.roles).forEach((key) => {
                                let baseKey = key;
                                let suffix = "";
                                const match = key.match(/_(\d+)$/);
                                if (match) {
                                  suffix = " " + match[1];
                                  baseKey = key.replace(/_\d+$/, "");
                                }
                                
                                if (
                                  !shownInstruments.some((r) => r.key === key) &&
                                  !["mainMinister", "soprano", "contralto", "mezzoSoprano", "baritone"].includes(baseKey) &&
                                  !["audioTech", "projectionOperator", "mediaCreator", "socialMediaManager", "pcOperators", "socialMediaOperators", "photographyOperators", "cameraOperators"].includes(baseKey)
                                ) {
                                  const baseLabel = defaultInstruments.find(d => d.key === baseKey)?.label || customRoleMetadata[baseKey]?.label || baseKey;
                                  shownInstruments.push({ key, label: baseLabel + suffix });
                                }
                              });
                            }

                            return shownInstruments.filter((role) => {
                              // Check if assigned
                              if (viewSchedule.roles?.[role.key]) return true;

                              // Check if enabled in active profile
                              if (worshipScaleConfig) {
                                const viewProfileId = viewSchedule?.profileId || "padrao";
                                const viewProfile = worshipProfiles.find(p => p.id === viewProfileId) || worshipProfiles[0];
                                const viewProfileRoles = viewProfile?.roles || {};
                                
                                let baseKey = role.key;
                                if (role.key.match(/_\d+$/)) {
                                  baseKey = role.key.replace(/_\d+$/, "");
                                }
                                
                                const isEnabled = viewProfileRoles[baseKey]?.enabled || false;
                                const count = viewProfileRoles[baseKey]?.count || 1;
                                
                                const match = role.key.match(/_(\d+)$/);
                                if (match) {
                                  return isEnabled && parseInt(match[1]) <= count;
                                }
                                
                                return isEnabled;
                              }
                              
                              // Fallback if no config, show standard defaults
                              return defaultInstruments.some((d) => d.key === role.key);
                            }).map((role) => {
                              const uid = viewSchedule.roles?.[role.key];
                              const nameStr = uid ? (members.find((m) => m.uid === uid)?.name || "Membro") : "Vago";
                              return (
                                <div key={role.key} className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{role.label}</span>
                                  <span className={`text-xs font-bold mt-1 ${uid ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 italic'}`}>{nameStr}</span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Crew / Multimedia support column */}
                      {!isWorshipScale && (
                        <div className="space-y-3">
                          <h5 className="text-xs font-black border-b border-purple-100 dark:border-purple-900/30 pb-1 flex items-center gap-1 text-purple-800 dark:text-purple-400">
                            Suporte & Mídia
                          </h5>
                          <div className="space-y-2">
                            {[
                              { key: "audioTech", label: "Som / Áudio", arrayKeys: [] },
                              { key: "projectionOperator", label: "Projeção", arrayKeys: ["pcOperators"] },
                              { key: "mediaCreator", label: "Mídia / Câmeras", arrayKeys: ["cameraOperators", "photographyOperators"] },
                              { key: "socialMediaManager", label: "Social Media", arrayKeys: ["socialMediaOperators"] },
                            ].map((role) => {
                              const uid = viewSchedule.roles?.[role.key];
                              let nameStr = "";
                              let hasAssigned = false;

                              if (uid) {
                                nameStr = members.find((m) => m.uid === uid)?.name || "Membro";
                                hasAssigned = true;
                              } else if (role.arrayKeys.length > 0) {
                                const uids: string[] = [];
                                role.arrayKeys.forEach((ak) => {
                                  const arr = (viewSchedule.roles as any)?.[ak];
                                  if (Array.isArray(arr)) {
                                    uids.push(...arr);
                                  }
                                });
                                const validUids = uids.filter(Boolean);
                                if (validUids.length > 0) {
                                  nameStr = validUids
                                    .map((id) => members.find((m) => m.uid === id)?.name || "Membro")
                                    .join(", ");
                                  hasAssigned = true;
                                }
                              }

                              if (!hasAssigned) {
                                nameStr = "Vago";
                              }

                              return (
                                <div key={role.key} className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{role.label}</span>
                                  <span className={`text-xs font-bold mt-1 ${hasAssigned ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 italic'}`}>{nameStr}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </>
              ) : (
                /* Multimedia / Media scale: list of operators */
                <div className="space-y-6 pt-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> Operadores Escalados
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { title: "Projeção (Letras & Imagens)", key: "pcOperators", icon: Monitor, color: "text-blue-500" },
                      { title: "Redes Sociais (Transmissão / Live)", key: "socialMediaOperators", icon: Share2, color: "text-green-500" },
                      { title: "Fotografia & Filmagem", key: "photographyOperators", icon: Camera, color: "text-amber-500" },
                      { title: "Operador de Câmera (Corte)", key: "cameraOperators", icon: Video, color: "text-indigo-500" },
                    ].map((role) => {
                      const uids = (viewSchedule.roles as any)?.[role.key] || [];
                      const IconComp = role.icon;
                      return (
                        <div key={role.key} className="p-5 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <IconComp className={`w-4 h-4 ${role.color}`} /> {role.title}
                          </span>
                          <div className="space-y-1.5">
                            {uids.filter(Boolean).length === 0 ? (
                              <span className="text-xs text-slate-400 italic font-medium block">Vago</span>
                            ) : (
                              uids.filter(Boolean).map((uid: string, uIdx: number) => {
                                const nameStr = members.find((m) => m.uid === uid)?.name || "Membro";
                                return (
                                  <div
                                    key={`${uid}-${uIdx}`}
                                    className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-xs border border-slate-100 dark:border-slate-700/50"
                                  >
                                    {nameStr}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer / Action */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-6 flex justify-end">
              <button
                onClick={() => setSelectedScheduleForView(null)}
                className="bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-12 overflow-hidden flex flex-col max-h-[90vh]">
            <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 mb-8">
              {editingSchedule ? "Editar Escala" : "Nova Escala"}
            </h2>

            <form
              onSubmit={handleSave}
              className="space-y-10 overflow-y-auto pr-4 custom-scrollbar max-h-[70vh]"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <CalendarIcon size={12} /> Data *
                    </label>
                    <input
                      required
                      type="date"
                      className={`w-full bg-transparent border-b-2 py-3 outline-none transition-colors text-slate-800 dark:text-slate-100 font-bold ${dateError ? "border-red-500 focus:border-red-600" : "border-slate-200 dark:border-slate-800 focus:border-blue-800"}`}
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                    {dateError && (
                      <p className="text-xs text-red-500 mt-2 font-medium">
                        {dateError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={12} /> Local de Escala *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, locationType: "internal" })
                        }
                        className={`py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all ${
                          formData.locationType === "internal"
                            ? "bg-blue-800 border-blue-800 text-white shadow-md"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-100"
                        }`}
                      >
                        Interna (Igreja)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, locationType: "external" })
                        }
                        className={`py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all ${
                          formData.locationType === "external"
                            ? "bg-rose-800 border-rose-800 text-white shadow-md"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-rose-100"
                        }`}
                      >
                        Externa (Evento)
                      </button>
                    </div>
                  </div>

                  {formData.locationType === "external" && (
                    <div className="space-y-1 animate-[fadeIn_0.2s_ease-out]">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Nome do Local Externo *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-800 py-3 outline-none focus:border-blue-800 transition-colors text-slate-800 dark:text-slate-100 font-bold"
                        placeholder="Ex: Praça Central, Ginásio, Casamento, etc."
                        value={formData.locationName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            locationName: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      Igreja / Ministério *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {churches.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, churchId: c.id })
                          }
                          disabled={true}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                            formData.churchId === c.id
                              ? "bg-blue-800 border-blue-800 text-white shadow-lg"
                              : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      Banda / Equipe *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, bandId: "master" })
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                          formData.bandId === "master" || !formData.bandId
                            ? "bg-amber-600 border-amber-600 text-white shadow-lg"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-200"
                        }`}
                      >
                        Ministério Principal
                      </button>
                      {bands.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, bandId: b.id })
                          }
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                            formData.bandId === b.id
                              ? "bg-blue-800 border-blue-800 text-white shadow-lg"
                              : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                          }`}
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {worshipProfiles.length > 0 && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Sliders size={12} /> Perfil do Culto / Escala *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {worshipProfiles.map((p) => {
                          const isSelected = selectedProfileId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={!canManageWorship}
                              onClick={() => handleProfileChangeAndLoadRoles(p.id)}
                              className={`px-4 py-2 border-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/20"
                                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-200"
                              } ${!canManageWorship ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {formData.churchId && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Culto{" "}
                        {formData.locationType === "internal"
                          ? "*"
                          : "(Opcional)"}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {formData.locationType === "external" &&
                          formData.serviceId && (
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, serviceId: "" })
                              }
                              className="px-4 py-2 rounded-xl text-xs font-bold border-2 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:border-slate-700 hover:border-blue-200"
                            >
                              Limpar Culto
                            </button>
                          )}
                        {services
                          .filter(
                            (s) =>
                              s.churchId === formData.churchId &&
                              (s.status !== "inactive" || s.id === formData.serviceId)
                          )
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, serviceId: s.id })
                              }
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                formData.serviceId === s.id
                                  ? "bg-blue-800 border-blue-800 text-white shadow-lg"
                                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                              }`}
                            >
                              {s.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`grid grid-cols-1 md:grid-cols-2 gap-12 transition-opacity ${!formData.date ? "opacity-40 pointer-events-none" : "opacity-100"}`}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                      Vocais
                    </h3>
                    {availabilityLoading && (
                      <div className="w-3 h-3 border-2 border-blue-800 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {(() => {
                      const defaultVocals = [
                        { key: "mainMinister", label: "Ministro Principal" },
                        { key: "soprano", label: "Soprano" },
                        { key: "contralto", label: "Contralto" },
                        { key: "mezzoSoprano", label: "Mezzo" },
                        { key: "baritone", label: "Tenor / Baixo / Barítono" },
                      ];
                      const activeProfile = worshipProfiles.find(p => p.id === selectedProfileId) || worshipProfiles[0];
                      const activeProfileRoles = activeProfile?.roles || {};
                      
                      return defaultVocals.flatMap((role) => {
                        if (role.key !== "mainMinister") {
                          if (worshipScaleConfig && activeProfileRoles[role.key]?.enabled === false) return [];
                        }
                        
                        const roleCount = (worshipScaleConfig && activeProfileRoles[role.key]?.count) ? activeProfileRoles[role.key].count : 1;
                        
                        return Array.from({ length: roleCount }).map((_, idx) => {
                          const actualKey = idx === 0 ? role.key : `${role.key}_${idx + 1}`;
                          const label = roleCount > 1 ? `${role.label} ${idx + 1}` : role.label;
                          
                          const availableMembers = filterMembersForRole(
                            members,
                            role.key, // Base role for filtering logic
                            formData.churchId,
                          );
                          const selectedId = formData.roles[actualKey];

                          return (
                            <div key={actualKey} className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {label}
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {availableMembers.length === 0 ? (
                                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] text-slate-400 font-bold uppercase tracking-wider border border-dashed border-slate-200 dark:border-slate-800">
                                    Nenhum disponível
                                  </div>
                                ) : (
                                  availableMembers.map((m) => {
                                    const isAvailable = teamAvailability.includes(m.uid);
                                    return (
                                      <button
                                        key={m.uid}
                                        type="button"
                                        onClick={() =>
                                          handleRoleChange(
                                            actualKey,
                                            selectedId === m.uid ? "" : m.uid,
                                          )
                                        }
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 flex items-center gap-1.5 ${
                                          selectedId === m.uid
                                            ? "bg-blue-800 border-blue-800 text-white shadow-lg shadow-blue-800/20 active:scale-95"
                                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-900/30"
                                        }`}
                                      >
                                        {m.name}
                                        {m.vocalRange ? `(${m.vocalRange})` : ""}
                                        {isAvailable && (
                                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Disponível"></span>
                                        )}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        });
                      });
                    })()}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                      Banda
                    </h3>
                    {availabilityLoading && (
                      <div className="w-3 h-3 border-2 border-blue-800 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {(() => {
                      const defaultInstruments = [
                        { key: "keyboardist", label: "Teclado" },
                        { key: "acousticGuitarist", label: "Violão / Violino" },
                        { key: "electricGuitarist", label: "Guitarra" },
                        { key: "bassist", label: "Baixo" },
                        { key: "drummer", label: "Bateria" },
                      ];
                      
                      const shownInstruments = [...defaultInstruments];
                      Object.entries(customRoleMetadata).forEach(([key, custom]) => {
                        if (!shownInstruments.some(r => r.key === key)) {
                          shownInstruments.push({ key, label: custom.label });
                        }
                      });

                      const activeProfile = worshipProfiles.find(p => p.id === selectedProfileId) || worshipProfiles[0];
                      const activeProfileRoles = activeProfile?.roles || {};

                      return shownInstruments.flatMap((role) => {
                        if (worshipScaleConfig) {
                          if (activeProfileRoles[role.key]?.enabled === false) return [];
                        } else {
                          if (!defaultInstruments.some(d => d.key === role.key)) return [];
                        }
                        
                        const roleCount = (worshipScaleConfig && activeProfileRoles[role.key]?.count) ? activeProfileRoles[role.key].count : 1;
                        
                        return Array.from({ length: roleCount }).map((_, idx) => {
                          const actualKey = idx === 0 ? role.key : `${role.key}_${idx + 1}`;
                          const label = roleCount > 1 ? `${role.label} ${idx + 1}` : role.label;
                          
                          const availableMembers = filterMembersForRole(
                            members,
                            role.key, // Base role key for actual filtering
                            formData.churchId,
                          );
                          const selectedId = formData.roles[actualKey];

                          return (
                            <div key={actualKey} className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {label}
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {availableMembers.length === 0 ? (
                                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] text-slate-400 font-bold uppercase tracking-wider border border-dashed border-slate-200 dark:border-slate-800">
                                    Nenhum disponível
                                  </div>
                                ) : (
                                  availableMembers.map((m) => {
                                    const isAvailable = teamAvailability.includes(m.uid);
                                    return (
                                      <button
                                        key={m.uid}
                                        type="button"
                                        onClick={() =>
                                          handleRoleChange(
                                            actualKey,
                                            selectedId === m.uid ? "" : m.uid,
                                          )
                                        }
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 flex items-center gap-1.5 ${
                                          selectedId === m.uid
                                            ? "bg-blue-800 border-blue-800 text-white shadow-lg shadow-blue-800/20 active:scale-95"
                                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-900/30"
                                        }`}
                                      >
                                        {m.name}
                                        {isAvailable && (
                                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Disponível"></span>
                                        )}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        });
                      });
                    })()}
                  </div>
                </div>

                {canManageMultimedia && (
                  <div className="space-y-6 md:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                        Multimídia
                      </h3>
                      {availabilityLoading && (
                        <div className="w-3 h-3 border-2 border-blue-800 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[
                        { key: "audioTech", label: "Técnico de Áudio" },
                        { key: "projectionOperator", label: "Projeção (Letras)" },
                        { key: "mediaCreator", label: "Mídia / Câmeras" },
                        { key: "socialMediaManager", label: "Social Media" },
                      ].map((role) => {
                        const availableMembers = filterMembersForRole(
                          members,
                          role.key,
                          formData.churchId,
                        );
                        const selectedId =
                          formData.roles[role.key as keyof typeof formData.roles];

                        return (
                          <div key={role.key} className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {role.label}
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {availableMembers.length === 0 ? (
                                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] text-slate-400 font-bold uppercase tracking-wider border border-dashed border-slate-200 dark:border-slate-800">
                                  Nenhum disponível
                                </div>
                              ) : (
                                availableMembers.map((m) => {
                                  const isAvailable = teamAvailability.includes(m.uid);
                                  return (
                                    <button
                                      key={m.uid}
                                      type="button"
                                      onClick={() =>
                                        handleRoleChange(
                                          role.key as any,
                                          selectedId === m.uid ? "" : m.uid,
                                        )
                                      }
                                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 flex items-center gap-1.5 ${
                                        selectedId === m.uid
                                          ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/20 active:scale-95"
                                          : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-200 dark:hover:border-amber-900/30"
                                      }`}
                                    >
                                      {m.name}
                                      {isAvailable && (
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Disponível"></span>
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Observações Extras
                </label>
                <textarea
                  rows={2}
                  className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-800 py-3 outline-none focus:border-blue-800 transition-colors text-slate-800 dark:text-slate-100 font-medium resize-none"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Link da partitura, dinâmica do culto, etc."
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-[2rem] transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-[2rem] transition-all shadow-xl shadow-blue-800/20 flex items-center justify-center gap-2"
                >
                  <Bell className="w-5 h-5" />
                  {editingSchedule
                    ? "Salvar e Notificar"
                    : "Criar Escala e Notificar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multimedia scale modal */}
      {isMultimediaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 w-full max-w-4xl rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-900 py-10 px-8 md:px-12 my-8 relative max-h-[90vh] overflow-y-auto scrollbar-thin">
            <button
              type="button"
              onClick={() => setIsMultimediaModalOpen(false)}
              className="absolute top-8 right-8 p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-2xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-10">
              <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.25em] block mb-2 font-mono">
                MINISTÉRIO DE MULTIMÍDIA
              </span>
              <h2 className="text-3xl font-display font-black text-slate-900 dark:text-slate-100 italic tracking-tight">
                {editingSchedule ? "Editar Escala de Multimídia" : "Nova Escala de Multimídia"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                Gere uma escala baseada nas funções e quantidades configuradas para a sua igreja.
              </p>
            </div>

            {multimediaDateError && (
              <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400 rounded-2xl flex items-center gap-3 text-xs font-bold leading-relaxed shadow-sm">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>{multimediaDateError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMultimedia} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {/* Date Pick */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      Data da Escala *
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-800 py-3 outline-none focus:border-purple-800 transition-colors text-slate-800 dark:text-slate-100 font-bold"
                      value={multimediaDate}
                      onChange={(e) => setMultimediaDate(e.target.value)}
                    />
                  </div>

                  {/* Location Toggle */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Localização *
                    </label>
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setMultimediaLocationType("internal")}
                        className={`py-3 rounded-xl text-xs font-bold transition-all ${
                          multimediaLocationType === "internal"
                            ? "bg-white dark:bg-slate-800 text-purple-800 dark:text-purple-300 shadow-md scale-[1.02]"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                      >
                        Interno (Templo)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMultimediaLocationType("external")}
                        className={`py-3 rounded-xl text-xs font-bold transition-all ${
                          multimediaLocationType === "external"
                            ? "bg-white dark:bg-slate-800 text-purple-800 dark:text-purple-300 shadow-md scale-[1.02]"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                      >
                        Externo (Evento)
                      </button>
                    </div>
                  </div>

                  {/* External Location Input */}
                  {multimediaLocationType === "external" && (
                    <div className="space-y-2 animate-fadeIn">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                        Nome do Local Externo *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-800 py-3 outline-none focus:border-purple-800 transition-colors text-slate-800 dark:text-slate-100 font-bold"
                        placeholder="Ex: Praça Central, Ginásio, Casamento, etc."
                        value={multimediaLocationName}
                        onChange={(e) => setMultimediaLocationName(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Internal Culto Input */}
                  {multimediaLocationType === "internal" && userData?.churchId && (
                    <div className="space-y-4 animate-fadeIn">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Selecione o Culto *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {services
                          .filter(
                            (s) =>
                              s.churchId === userData.churchId &&
                              (s.status !== "inactive" || s.id === multimediaServiceId)
                          )
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setMultimediaServiceId(s.id)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                multimediaServiceId === s.id
                                  ? "bg-purple-800 border-purple-800 text-white shadow-lg shadow-purple-800/20 animate-scale"
                                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-purple-200"
                              }`}
                            >
                              {s.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Scale Profile selection */}
                  {multimediaProfiles.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 font-mono">
                        <Sliders className="w-3 h-3 text-purple-600" /> Perfil de Escala *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {multimediaProfiles.map((p) => {
                          const isSelected = selectedMultimediaProfileId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectMultimediaProfile(p.id)}
                              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                isSelected
                                  ? "bg-purple-800 border-purple-800 text-white shadow-lg shadow-purple-800/25 scale-[1.02]"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-purple-200 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                              }`}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Extra Remarks info */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">
                      Instruções para a Equipe
                    </label>
                    <textarea
                      rows={4}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 outline-none focus:border-purple-800 transition-colors text-slate-800 dark:text-slate-100 font-medium resize-none shadow-inner"
                      placeholder="Orientações e detalhes específicos sobre a escala, gravação de lives, iluminação do palco, etc."
                      value={multimediaNotes}
                      onChange={(e) => setMultimediaNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SLOTS ALLOCATION */}
              <div
                className={`transition-opacity space-y-8 border-t border-slate-100 dark:border-slate-800 pt-8 ${
                  !multimediaDate ? "opacity-30 pointer-events-none" : "opacity-100"
                }`}
              >
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-600" />
                    Alocação de Funções (Pessoas Necessárias)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Selecione os integrantes que irão operar em cada segmento da escala baseando-se no cronograma.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {getMultimediaRolesToDisplay().map((role) => {
                    const cfg = multimediaConfig[role.configKey];
                    if (!cfg || !cfg.enabled) return null;

                    const slotsCount = cfg.count || 1;
                    const slotsArr = Array.from({ length: slotsCount });
                    const candidates = getMultimediaCandidatesForRole(role.configKey);

                    return (
                      <div key={role.key} className="space-y-4 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-wide">
                          <role.icon className="w-4 h-4 text-purple-600" />
                          {role.title} ({slotsCount} vaga{slotsCount > 1 ? "s" : ""})
                        </h4>

                        <div className="space-y-4">
                          {slotsArr.map((_, idx) => {
                            const selectedUid = multimediaRolesForm[role.key]?.[idx] || "";
                            return (
                              <div key={`${role.key}-${idx}`} className="space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                                  VAGA #{idx + 1}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {candidates.length === 0 ? (
                                    <span className="text-[10px] text-slate-400 italic">Nenhum membro disponível</span>
                                  ) : (
                                    candidates.map((cand) => {
                                      const isSelected = selectedUid === cand.uid;
                                      const isAvailable = teamAvailability.includes(cand.uid);
                                      return (
                                        <button
                                          key={cand.uid}
                                          type="button"
                                          onClick={() => handleSelectMultimediaMember(role.key, idx, cand.uid)}
                                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 flex items-center gap-1.5 ${
                                            isSelected
                                              ? "bg-purple-800 border-purple-800 text-white shadow-lg shadow-purple-800/25 scale-95"
                                              : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-purple-200 dark:hover:border-purple-900/40"
                                          }`}
                                        >
                                          {cand.name ? cand.name.split(" ")[0] : "Anon"}
                                          {isAvailable && (
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Disponível"></span>
                                          )}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Save / Cancel buttons */}
              <div className="flex gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMultimediaModalOpen(false)}
                  className="flex-1 px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-[2rem] transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-5 bg-purple-800 hover:bg-purple-900 text-white font-bold rounded-[2rem] transition-all shadow-xl shadow-purple-800/20 flex items-center justify-center gap-2"
                >
                  <Bell className="w-5 h-5" />
                  {editingSchedule ? "Salvar Escala Multimídia" : "Criar Escala Multimídia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Playlist and Rehearsal Config Modal */}
      {isPlaylistModalOpen && playlistSchedule && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 transition-all animate-fadeIn">
          {/* Backdrop */}
          <div
            onClick={() => setIsPlaylistModalOpen(false)}
            className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md transition-opacity"
          />

          {/* Modal Content container */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-6 sm:p-10 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex justify-between items-start gap-4 pb-6 border-b border-slate-100 dark:border-slate-800 mb-6">
              <div>
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/40">
                  Espaço do Ministro Principal
                </span>
                <h3 className="text-2xl font-display font-black text-slate-900 dark:text-slate-100 italic tracking-tight mt-2">
                  Gerenciar Playlist & Ensaio
                </h3>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold mt-1">
                  Configure o ensaio e monte a playlist com o seu repertório pessoal para estudo dos músicos.
                </p>
              </div>
              <button
                onClick={() => setIsPlaylistModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePlaylist} className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rehearsal Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5" /> Data do Ensaio *
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 outline-none text-sm font-bold text-slate-800 dark:text-slate-100 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all shadow-inner"
                    value={rehearsalDate}
                    onChange={(e) => setRehearsalDate(e.target.value)}
                  />
                </div>

                {/* Rehearsal Time */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Horário do Ensaio *
                  </label>
                  <input
                    type="time"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 outline-none text-sm font-bold text-slate-800 dark:text-slate-100 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all shadow-inner"
                    value={rehearsalTime}
                    onChange={(e) => setRehearsalTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Playlist songs selection from personal Repertoire */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5" /> Repertório Pessoal (Selecione as músicas)
                  </label>
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">
                    {selectedPlaylistSongs.length} selecionada(s)
                  </span>
                </div>

                {/* Search Term Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filtrar por título, artista..."
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 outline-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:border-indigo-600 transition-all"
                    value={playlistSearchTerm}
                    onChange={(e) => setPlaylistSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                </div>

                {/* List container */}
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/20 max-h-56 overflow-y-auto custom-scrollbar space-y-2">
                  {personalSongs.length === 0 ? (
                    <div className="py-6 text-center space-y-1">
                      <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">Sem músicas no repertório</p>
                      <p className="text-[10px] text-slate-400">
                        Por favor, acesse a guia &quot;Músicas&quot; ou Repertório para cadastrar suas músicas pessoais primeiro.
                      </p>
                    </div>
                  ) : (
                    (() => {
                      const filtered = personalSongs.filter(
                        (s) =>
                          s.title.toLowerCase().includes(playlistSearchTerm.toLowerCase()) ||
                          s.artist.toLowerCase().includes(playlistSearchTerm.toLowerCase())
                      );

                      if (filtered.length === 0) {
                        return <p className="text-xs text-slate-400 text-center py-4">Nenhuma música pessoal encontrada.</p>;
                      }

                      return filtered.map((song) => {
                        const isSelected = selectedPlaylistSongs.includes(song.id);
                        return (
                          <div
                            key={song.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedPlaylistSongs(selectedPlaylistSongs.filter((id) => id !== song.id));
                              } else {
                                setSelectedPlaylistSongs([...selectedPlaylistSongs, song.id]);
                              }
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all active:scale-[0.99] ${
                              isSelected
                                ? "bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-300 font-extrabold"
                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="space-y-0.5 truncate max-w-[80%]">
                              <p className="text-xs font-bold leading-tight truncate">{song.title}</p>
                              {song.artist && <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{song.artist}</p>}
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300 dark:border-slate-755"
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPlaylistModalOpen(false)}
                  className="flex-1 px-6 py-3.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 text-slate-600 dark:text-slate-400 font-extrabold text-xs rounded-xl border border-slate-150 dark:border-slate-850 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlaylist}
                  className="flex-1 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingPlaylist ? "Salvando..." : "Salvar Configuração"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
