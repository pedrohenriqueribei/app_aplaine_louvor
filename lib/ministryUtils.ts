export type SupportedMinistryKey =
  | "worship"
  | "multimedia"
  | "dance"
  | "secretariat"
  | "kids";

export interface ScheduleMinistryBadge {
  key: SupportedMinistryKey;
  label: string;
  shortLabel: string;
  colorClass: string;
}

export interface ResolvedScheduleMinistries {
  primary: SupportedMinistryKey;
  ministries: SupportedMinistryKey[];
  badges: ScheduleMinistryBadge[];
  primaryLabel: string;
  primaryBadgeColor: string;
}

export const MINISTRY_COLORS: Record<SupportedMinistryKey, string> = {
  worship: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  multimedia: "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  dance: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
  secretariat: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  kids: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
};

/**
 * Returns the full custom or standard name for a ministry.
 */
export function getMinistryCustomName(
  type: SupportedMinistryKey | string,
  churchData?: any,
  churchDepartments?: any[]
): string {
  const norm = String(type || "").toLowerCase();

  if (norm === "worship" || norm.includes("louvor") || norm.includes("mus")) {
    return (
      churchData?.worshipMinistryName ||
      churchDepartments?.find(
        (d: any) =>
          d.id === "worship" ||
          d.type === "worship" ||
          d.id === "louvor" ||
          d.type === "louvor"
      )?.name ||
      "Ministério de Louvor"
    );
  }

  if (norm === "dance" || norm.includes("dan")) {
    return (
      churchData?.danceMinistryName ||
      churchDepartments?.find(
        (d: any) =>
          d.id === "dance" ||
          d.type === "dance" ||
          d.id === "danca" ||
          d.type === "danca" ||
          d.id === "dança" ||
          d.type === "dança"
      )?.name ||
      "Ministério de Dança"
    );
  }

  if (norm === "multimedia" || norm.includes("multi") || norm.includes("midia") || norm.includes("mídia")) {
    return (
      churchData?.multimediaMinistryName ||
      churchDepartments?.find(
        (d: any) =>
          d.id === "multimedia" ||
          d.type === "multimedia" ||
          d.id === "multimidia" ||
          d.type === "multimidia" ||
          d.id === "midia" ||
          d.type === "midia" ||
          d.id === "mídia" ||
          d.type === "mídia"
      )?.name ||
      "Ministério de Multimídia"
    );
  }

  if (norm === "secretariat" || norm.includes("sec") || norm.includes("acolh")) {
    return (
      churchData?.secretariatMinistryName ||
      churchDepartments?.find(
        (d: any) =>
          d.id === "secretariat" ||
          d.type === "secretariat" ||
          d.id === "secretaria" ||
          d.type === "secretaria"
      )?.name ||
      "Secretaria & Acolhimento"
    );
  }

  if (norm === "kids" || norm.includes("kid") || norm.includes("infan")) {
    return (
      churchData?.kidsMinistryName ||
      churchDepartments?.find(
        (d: any) =>
          d.id === "kids" ||
          d.type === "kids" ||
          d.id === "infantil" ||
          d.type === "infantil"
      )?.name ||
      "Ministério Infantil"
    );
  }

  return type;
}

/**
 * Returns a short, user-friendly badge label (e.g. "Dança", "Multimídia", "Louvor").
 */
export function getMinistryShortName(
  type: SupportedMinistryKey | string,
  churchData?: any,
  churchDepartments?: any[]
): string {
  const fullName = getMinistryCustomName(type, churchData, churchDepartments);
  if (fullName.startsWith("Ministério de ")) {
    return fullName.replace("Ministério de ", "");
  }
  return fullName;
}

/**
 * Accurately analyzes any schedule to determine all ministries involved and the primary ministry.
 */
export function resolveScheduleMinistries(
  s: any,
  churchData?: any,
  churchDepartments?: any[],
  activeLens?: string
): ResolvedScheduleMinistries {
  const detected = new Set<SupportedMinistryKey>();
  const rawMin = String(s.ministry || s.department || s.departmentId || "").toLowerCase();

  // 1. Explicit string match
  if (rawMin.includes("dan")) detected.add("dance");
  if (rawMin.includes("multi") || rawMin.includes("midia") || rawMin.includes("mídia")) detected.add("multimedia");
  if (rawMin.includes("worship") || rawMin.includes("louvor") || rawMin.includes("mus")) detected.add("worship");
  if (rawMin.includes("sec") || rawMin.includes("acolh")) detected.add("secretariat");
  if (rawMin.includes("kid") || rawMin.includes("infan")) detected.add("kids");

  // 2. Dance indicators
  const hasDance = Boolean(
    s.danceProfileId ||
    (s.danceNotes && String(s.danceNotes).trim()) ||
    (s.choreography && String(s.choreography).trim()) ||
    (s.costume && String(s.costume).trim()) ||
    (Array.isArray(s.roles?.dancers) && s.roles.dancers.some(Boolean)) ||
    (Array.isArray(s.roles?.danceLeader) && s.roles.danceLeader.some(Boolean)) ||
    (Array.isArray(s.roles?.choreographer) && s.roles.choreographer.some(Boolean)) ||
    (Array.isArray(s.roles?.costume) && s.roles.costume.some(Boolean)) ||
    (Array.isArray(s.roles?.costumeManagers) && s.roles.costumeManagers.some(Boolean)) ||
    (Array.isArray(s.roles?.rehearsalDirector) && s.roles.rehearsalDirector.some(Boolean))
  );
  if (hasDance) detected.add("dance");

  // 3. Multimedia indicators
  const hasMultimedia = Boolean(
    s.multimediaProfileId ||
    (s.multimediaNotes && String(s.multimediaNotes).trim()) ||
    (Array.isArray(s.roles?.audioOperators) && s.roles.audioOperators.some(Boolean)) ||
    (Array.isArray(s.roles?.pcOperators) && s.roles.pcOperators.some(Boolean)) ||
    (Array.isArray(s.roles?.cameraOperators) && s.roles.cameraOperators.some(Boolean)) ||
    (Array.isArray(s.roles?.photographyOperators) && s.roles.photographyOperators.some(Boolean)) ||
    (Array.isArray(s.roles?.socialMediaOperators) && s.roles.socialMediaOperators.some(Boolean)) ||
    Boolean(s.roles?.audioTech) ||
    Boolean(s.roles?.projectionOperator) ||
    Boolean(s.roles?.mediaCreator) ||
    Boolean(s.roles?.socialMediaManager)
  );
  if (hasMultimedia) detected.add("multimedia");

  // 4. Worship indicators
  const hasWorship = Boolean(
    (Array.isArray(s.songs) && s.songs.length > 0) ||
    (Array.isArray(s.playlist) && s.playlist.length > 0) ||
    (s.bandId && s.bandId !== "master") ||
    Boolean(s.roles?.mainMinister) ||
    Boolean(s.roles?.drummer) ||
    Boolean(s.roles?.bassist) ||
    Boolean(s.roles?.keyboardist) ||
    Boolean(s.roles?.acousticGuitarist) ||
    Boolean(s.roles?.electricGuitarist) ||
    Boolean(s.roles?.baritone || s.roles?.contralto || s.roles?.soprano || s.roles?.mezzoSoprano)
  );
  if (hasWorship) detected.add("worship");

  // If nothing detected, fallback gracefully based on activeLens or worship
  if (detected.size === 0) {
    if (activeLens && activeLens !== "all" && ["worship", "multimedia", "dance", "secretariat", "kids"].includes(activeLens)) {
      detected.add(activeLens as SupportedMinistryKey);
    } else {
      detected.add("worship");
    }
  }

  const ministriesList = Array.from(detected);

  // Determine primary ministry: prioritize activeLens if it is present in the schedule
  let primary: SupportedMinistryKey = ministriesList[0];
  if (activeLens && activeLens !== "all" && detected.has(activeLens as SupportedMinistryKey)) {
    primary = activeLens as SupportedMinistryKey;
  }

  const badges: ScheduleMinistryBadge[] = ministriesList.map((m) => ({
    key: m,
    label: getMinistryCustomName(m, churchData, churchDepartments),
    shortLabel: getMinistryShortName(m, churchData, churchDepartments),
    colorClass: MINISTRY_COLORS[m] || MINISTRY_COLORS.worship,
  }));

  const primaryBadge = badges.find((b) => b.key === primary) || badges[0];

  return {
    primary,
    ministries: ministriesList,
    badges,
    primaryLabel: primaryBadge.shortLabel,
    primaryBadgeColor: primaryBadge.colorClass,
  };
}
