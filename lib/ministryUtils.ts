import React from "react";
import {
  Mic2,
  Monitor,
  Briefcase,
  BookOpen,
  HeartHandshake,
  Flame,
  Globe,
  Coins,
  Building2,
  Users,
  Sparkles,
} from "lucide-react";
import { BallerinaIcon } from "@/components/BallerinaIcon";

export type SupportedMinistryKey =
  | "worship"
  | "multimedia"
  | "dance"
  | "secretariat"
  | "kids"
  | "biblico"
  | "acolhimento"
  | "intercessao"
  | "evangelismo"
  | "tesouraria"
  | "patrimonio"
  | (string & {});

export interface MinistryRoleDefinition {
  id: string;
  label: string;
  description?: string;
  isLeader?: boolean;
}

export interface MinistryDefinition {
  id: string;
  name: string;
  shortName: string;
  acronym: string;
  description: string;
  color: string; // "blue" | "purple" | "rose" | "emerald" | "amber" | "indigo" | "teal" | "orange" | "cyan" | "slate"
  badgeColorClass: string;
  headerGradientClass: string;
  iconBgClass: string;
  iconKey: string;
  defaultRoles: MinistryRoleDefinition[];
  isCustom?: boolean;
}

export interface ScheduleMinistryBadge {
  key: string;
  label: string;
  shortLabel: string;
  colorClass: string;
}

export interface ResolvedScheduleMinistries {
  primary: string;
  ministries: string[];
  badges: ScheduleMinistryBadge[];
  primaryLabel: string;
  primaryBadgeColor: string;
}

export const MINISTRY_COLORS: Record<string, string> = {
  worship: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  louvor: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  multimedia: "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  multimidia: "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  dance: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
  danca: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
  secretariat: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  secretaria: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  kids: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  biblico: "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
  acolhimento: "bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800",
  intercessao: "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800",
  evangelismo: "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800",
  tesouraria: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  patrimonio: "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800",
};

/**
 * Standard Built-in Ministry Presets
 */
export const STANDARD_MINISTRIES_PRESETS: MinistryDefinition[] = [
  {
    id: "louvor",
    name: "Ministério de Louvor",
    shortName: "Louvor",
    acronym: "ML",
    description: "Equipe dedicada à adoração através da música, instrumentos, vozes e cifras nos cultos e celebrações.",
    color: "blue",
    badgeColorClass: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    headerGradientClass: "bg-blue-50 dark:bg-blue-900/10",
    iconBgClass: "bg-blue-800 text-white shadow-blue-800/30",
    iconKey: "mic",
    defaultRoles: [
      { id: "leader", label: "Líder de Louvor", isLeader: true },
      { id: "mainMinister", label: "Ministro de Louvor", isLeader: true },
      { id: "vocalist", label: "Vocalista" },
      { id: "keyboardist", label: "Tecladista" },
      { id: "acousticGuitarist", label: "Violonista" },
      { id: "electricGuitarist", label: "Guitarrista" },
      { id: "bassist", label: "Baixista" },
      { id: "drummer", label: "Baterista" },
    ],
  },
  {
    id: "multimidia",
    name: "Ministério de Multimídia",
    shortName: "Multimídia",
    acronym: "MM",
    description: "Gestão técnica de som, projeção de letras, transmissões ao vivo, fotografia e redes sociais da congregação.",
    color: "purple",
    badgeColorClass: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    headerGradientClass: "bg-purple-50 dark:bg-purple-900/10",
    iconBgClass: "bg-purple-800 text-white shadow-purple-800/30",
    iconKey: "monitor",
    defaultRoles: [
      { id: "leader", label: "Líder de Multimídia", isLeader: true },
      { id: "audio_operator", label: "Operador de Áudio" },
      { id: "pc_operator", label: "Projeção & Telão" },
      { id: "camera_operator", label: "Câmera / Transmissão" },
      { id: "photography_operator", label: "Fotografia" },
      { id: "social_media_operator", label: "Redes Sociais" },
    ],
  },
  {
    id: "danca",
    name: "Ministério de Dança",
    shortName: "Dança",
    acronym: "MD",
    description: "Expressão de adoração profética através de coreografias, teatro, fitas, estandartes e artes corporais.",
    color: "rose",
    badgeColorClass: "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    headerGradientClass: "bg-rose-50 dark:bg-rose-900/10",
    iconBgClass: "bg-rose-800 text-white shadow-rose-800/30",
    iconKey: "ballerina",
    defaultRoles: [
      { id: "leader", label: "Líder de Dança", isLeader: true },
      { id: "choreographer", label: "Coreógrafo(a)" },
      { id: "dancer", label: "Bailarino(a)" },
      { id: "costume_manager", label: "Figurino & Acessórios" },
      { id: "rehearsal_director", label: "Diretor(a) de Ensaio" },
    ],
  },
  {
    id: "secretaria",
    name: "Secretaria & Administração",
    shortName: "Secretaria",
    acronym: "SEC",
    description: "Organização administrativa, cadastro de membros, atas, documentos e suporte pastoral da igreja.",
    color: "emerald",
    badgeColorClass: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    headerGradientClass: "bg-emerald-50 dark:bg-emerald-900/10",
    iconBgClass: "bg-emerald-800 text-white shadow-emerald-800/30",
    iconKey: "briefcase",
    defaultRoles: [
      { id: "leader", label: "Secretário(a) Geral", isLeader: true },
      { id: "admin", label: "Administrador(a)", isLeader: true },
      { id: "clerk", label: "Auxiliar de Secretaria" },
      { id: "records_manager", label: "Gestor(a) de Membresia" },
    ],
  },
  {
    id: "biblico",
    name: "Ministério Bíblico & Ensino",
    shortName: "Ensino Bíblico",
    acronym: "MBE",
    description: "Escola Bíblica Dominical (EBD), discipulado de novos convertidos, cursos teológicos e capacitação de líderes.",
    color: "indigo",
    badgeColorClass: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    headerGradientClass: "bg-indigo-50 dark:bg-indigo-900/10",
    iconBgClass: "bg-indigo-800 text-white shadow-indigo-800/30",
    iconKey: "book",
    defaultRoles: [
      { id: "leader", label: "Superintendente de Ensino", isLeader: true },
      { id: "teacher", label: "Professor(a) de EBD" },
      { id: "discipler", label: "Discipulador(a)" },
      { id: "curriculum_manager", label: "Coordenação Pedagógica" },
      { id: "secretary_ebd", label: "Secretário(a) da EBD" },
    ],
  },
  {
    id: "acolhimento",
    name: "Ministério de Acolhimento & Recepção",
    shortName: "Acolhimento",
    acronym: "MAR",
    description: "Recepção calorosa nas portas do templo, acolhimento de visitantes, encaminhamento e integração na congregação.",
    color: "teal",
    badgeColorClass: "bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    headerGradientClass: "bg-teal-50 dark:bg-teal-900/10",
    iconBgClass: "bg-teal-800 text-white shadow-teal-800/30",
    iconKey: "heart",
    defaultRoles: [
      { id: "leader", label: "Coordenador(a) de Acolhimento", isLeader: true },
      { id: "host", label: "Recepcionista de Templo" },
      { id: "visitor_guide", label: "Integrador(a) de Visitantes" },
      { id: "door_greeter", label: "Boas-Vindas / Portaria" },
    ],
  },
  {
    id: "intercessao",
    name: "Ministério de Intercessão & Oração",
    shortName: "Intercessão",
    acronym: "MIO",
    description: "Vigílias, oração contínua pelas famílias, cultos, pastores, enfermos e clamor pelos propósitos do Reino.",
    color: "violet",
    badgeColorClass: "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    headerGradientClass: "bg-violet-50 dark:bg-violet-900/10",
    iconBgClass: "bg-violet-800 text-white shadow-violet-800/30",
    iconKey: "flame",
    defaultRoles: [
      { id: "leader", label: "Líder de Intercessão", isLeader: true },
      { id: "intercessor", label: "Intercessor(a) de Turno" },
      { id: "vigil_coordinator", label: "Coordenador(a) de Vigílias" },
      { id: "prayer_chain", label: "Sentinela de Oração" },
    ],
  },
  {
    id: "evangelismo",
    name: "Ministério de Evangelismo & Missões",
    shortName: "Evangelismo",
    acronym: "MEM",
    description: "Ações evangelísticas urbanas, visitas missionárias, impactos sociais, folhetos e expansão do Evangelho.",
    color: "orange",
    badgeColorClass: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    headerGradientClass: "bg-orange-50 dark:bg-orange-900/10",
    iconBgClass: "bg-orange-700 text-white shadow-orange-700/30",
    iconKey: "globe",
    defaultRoles: [
      { id: "leader", label: "Líder de Missões & Evangelismo", isLeader: true },
      { id: "evangelist", label: "Evangelista de Campo" },
      { id: "missions_support", label: "Agente Missionário" },
      { id: "social_action", label: "Ação Social & Comunidade" },
    ],
  },
  {
    id: "tesouraria",
    name: "Tesouraria & Finanças",
    shortName: "Tesouraria",
    acronym: "TES",
    description: "Gestão transparente de dízimos, ofertas, relatórios de prestação de contas e planejamento financeiro da igreja.",
    color: "emerald",
    badgeColorClass: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
    headerGradientClass: "bg-emerald-50 dark:bg-emerald-900/10",
    iconBgClass: "bg-emerald-800 text-white shadow-emerald-800/30",
    iconKey: "coins",
    defaultRoles: [
      { id: "leader", label: "Primeiro(a) Tesoureiro(a)", isLeader: true },
      { id: "vice_treasurer", label: "Segundo(a) Tesoureiro(a)", isLeader: true },
      { id: "auditor", label: "Conselheiro(a) Fiscal / Auditor" },
      { id: "cashier", label: "Auxiliar de Caixa" },
    ],
  },
  {
    id: "patrimonio",
    name: "Patrimônio & Zeladoria",
    shortName: "Patrimônio",
    acronym: "PAT",
    description: "Inventário de bens, zeladoria do templo, manutenção predial, climatização, limpeza e conservação dos espaços.",
    color: "cyan",
    badgeColorClass: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    headerGradientClass: "bg-cyan-50 dark:bg-cyan-900/10",
    iconBgClass: "bg-cyan-800 text-white shadow-cyan-800/30",
    iconKey: "building",
    defaultRoles: [
      { id: "leader", label: "Coordenador(a) de Patrimônio", isLeader: true },
      { id: "caretaker", label: "Zelador(a) do Templo" },
      { id: "maintenance", label: "Técnico(a) de Manutenção" },
      { id: "inventory", label: "Controle de Inventário" },
    ],
  },
];

/**
 * Normalizes a ministry type string (e.g. "worship" -> "louvor", "dance" -> "danca")
 */
export function normalizeMinistryKey(type: string): string {
  const norm = String(type || "").toLowerCase().trim();
  if (norm === "worship") return "louvor";
  if (norm === "multimedia") return "multimidia";
  if (norm === "dance" || norm === "dança") return "danca";
  if (norm === "secretariat") return "secretaria";
  return norm;
}

/**
 * Returns the full custom or standard name for a ministry.
 */
export function getMinistryCustomName(
  type: SupportedMinistryKey | string,
  churchData?: any,
  churchDepartments?: any[]
): string {
  const norm = normalizeMinistryKey(type);

  // Check custom ministries from churchData
  if (churchData?.ministries && Array.isArray(churchData.ministries)) {
    const found = churchData.ministries.find(
      (m: any) => normalizeMinistryKey(m.id) === norm || normalizeMinistryKey(m.name) === norm
    );
    if (found?.name) return found.name;
  }

  // Check church departments
  if (churchDepartments && Array.isArray(churchDepartments)) {
    const foundDept = churchDepartments.find(
      (d: any) => normalizeMinistryKey(d.id || d.type) === norm
    );
    if (foundDept?.name) return foundDept.name;
  }

  // Standard presets
  const preset = STANDARD_MINISTRIES_PRESETS.find(
    (p) => normalizeMinistryKey(p.id) === norm || normalizeMinistryKey(p.shortName) === norm
  );
  if (preset) return preset.name;

  // Specific legacy fallbacks
  if (norm === "louvor" || norm.includes("louvor") || norm.includes("mus")) {
    return churchData?.worshipMinistryName || "Ministério de Louvor";
  }
  if (norm === "danca" || norm.includes("dan")) {
    return churchData?.danceMinistryName || "Ministério de Dança";
  }
  if (norm === "multimidia" || norm.includes("multi") || norm.includes("midia")) {
    return churchData?.multimediaMinistryName || "Ministério de Multimídia";
  }
  if (norm === "secretaria" || norm.includes("sec")) {
    return churchData?.secretariatMinistryName || "Secretaria & Administração";
  }

  // Format capitalized fallback
  return norm
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Returns a short, user-friendly badge label (e.g. "Dança", "Multimídia", "Louvor").
 */
export function getMinistryShortName(
  type: SupportedMinistryKey | string,
  churchData?: any,
  churchDepartments?: any[]
): string {
  const norm = normalizeMinistryKey(type);
  const preset = STANDARD_MINISTRIES_PRESETS.find(
    (p) => normalizeMinistryKey(p.id) === norm || normalizeMinistryKey(p.shortName) === norm
  );
  if (preset) return preset.shortName;

  const fullName = getMinistryCustomName(type, churchData, churchDepartments);
  if (fullName.startsWith("Ministério de ")) {
    return fullName.replace("Ministério de ", "");
  }
  if (fullName.startsWith("Ministério ")) {
    return fullName.replace("Ministério ", "");
  }
  return fullName;
}

/**
 * Returns an icon component for the specified ministry
 */
export function getMinistryIconComponent(iconKey: string, size: number = 24, className?: string) {
  const key = String(iconKey || "").toLowerCase();
  if (key === "mic" || key === "music" || key === "worship") {
    return React.createElement(Mic2, { size, className });
  }
  if (key === "monitor" || key === "multimedia" || key === "video") {
    return React.createElement(Monitor, { size, className });
  }
  if (key === "ballerina" || key === "dance") {
    return React.createElement(BallerinaIcon, { size, className });
  }
  if (key === "briefcase" || key === "secretaria" || key === "admin") {
    return React.createElement(Briefcase, { size, className });
  }
  if (key === "book" || key === "biblico" || key === "ensino") {
    return React.createElement(BookOpen, { size, className });
  }
  if (key === "heart" || key === "acolhimento") {
    return React.createElement(HeartHandshake, { size, className });
  }
  if (key === "flame" || key === "intercessao" || key === "oracao") {
    return React.createElement(Flame, { size, className });
  }
  if (key === "globe" || key === "evangelismo" || key === "missoes") {
    return React.createElement(Globe, { size, className });
  }
  if (key === "coins" || key === "wallet" || key === "tesouraria") {
    return React.createElement(Coins, { size, className });
  }
  if (key === "building" || key === "patrimonio") {
    return React.createElement(Building2, { size, className });
  }
  return React.createElement(Sparkles, { size, className });
}

/**
 * Returns full unified definition for a ministry
 */
export function resolveMinistryDefinition(
  type: string,
  churchData?: any
): MinistryDefinition {
  const norm = normalizeMinistryKey(type);

  // Check custom in churchData
  if (churchData?.ministries && Array.isArray(churchData.ministries)) {
    const custom = churchData.ministries.find(
      (m: any) => normalizeMinistryKey(m.id) === norm
    );
    if (custom) {
      return {
        id: custom.id,
        name: custom.name || getMinistryCustomName(custom.id, churchData),
        shortName: custom.shortName || custom.name,
        acronym: custom.acronym || custom.name.substring(0, 3).toUpperCase(),
        description: custom.description || "Ministério atuante na comunidade.",
        color: custom.color || "blue",
        badgeColorClass: custom.badgeColorClass || "bg-blue-100 text-blue-800 border-blue-200",
        headerGradientClass: "bg-blue-50 dark:bg-blue-900/10",
        iconBgClass: "bg-blue-800 text-white shadow-blue-800/30",
        iconKey: custom.iconKey || "sparkles",
        defaultRoles: custom.defaultRoles || [
          { id: "leader", label: "Líder", isLeader: true },
          { id: "member", label: "Integrante" },
        ],
        isCustom: true,
      };
    }
  }

  // Check preset
  const preset = STANDARD_MINISTRIES_PRESETS.find(
    (p) => normalizeMinistryKey(p.id) === norm
  );
  if (preset) {
    // If church has customized names for louvor or danca
    if (norm === "louvor" && churchData?.worshipMinistryName) {
      return {
        ...preset,
        name: churchData.worshipMinistryName,
        acronym: churchData.worshipMinistryAcronym || preset.acronym,
      };
    }
    if (norm === "danca" && churchData?.danceMinistryName) {
      return {
        ...preset,
        name: churchData.danceMinistryName,
        acronym: churchData.danceMinistryAcronym || preset.acronym,
      };
    }
    return preset;
  }

  // Fallback generic definition for any new custom ministry
  return {
    id: norm,
    name: getMinistryCustomName(type, churchData),
    shortName: getMinistryShortName(type, churchData),
    acronym: norm.substring(0, 3).toUpperCase(),
    description: "Ministério com atuação e serviços na comunidade.",
    color: "blue",
    badgeColorClass: "bg-blue-100 text-blue-800 border-blue-200",
    headerGradientClass: "bg-blue-50 dark:bg-blue-900/10",
    iconBgClass: "bg-blue-800 text-white shadow-blue-800/30",
    iconKey: "sparkles",
    defaultRoles: [
      { id: "leader", label: "Líder", isLeader: true },
      { id: "member", label: "Integrante" },
    ],
    isCustom: true,
  };
}

/**
 * Returns the complete list of all ministries available for a church.
 * Merges standard presets with any custom ministries configured for this church.
 */
export function getAllChurchMinistries(churchData?: any): MinistryDefinition[] {
  const result: MinistryDefinition[] = [];
  const registeredIds = new Set<string>();

  // 1. Process custom ministries first if any
  if (churchData?.ministries && Array.isArray(churchData.ministries)) {
    churchData.ministries.forEach((m: any) => {
      const def = resolveMinistryDefinition(m.id, churchData);
      result.push(def);
      registeredIds.add(normalizeMinistryKey(m.id));
    });
  }

  // 2. Add standard presets that haven't been customized/replaced
  STANDARD_MINISTRIES_PRESETS.forEach((preset) => {
    const norm = normalizeMinistryKey(preset.id);
    if (!registeredIds.has(norm)) {
      result.push(resolveMinistryDefinition(preset.id, churchData));
      registeredIds.add(norm);
    }
  });

  return result;
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
  const detected = new Set<string>();
  const rawMin = String(s.ministry || s.department || s.departmentId || "").toLowerCase();

  // 1. Explicit string match for known keywords
  if (rawMin.includes("dan")) detected.add("danca");
  if (rawMin.includes("multi") || rawMin.includes("midia") || rawMin.includes("mídia")) detected.add("multimidia");
  if (rawMin.includes("worship") || rawMin.includes("louvor") || rawMin.includes("mus")) detected.add("louvor");
  if (rawMin.includes("sec")) detected.add("secretaria");
  if (rawMin.includes("bibl") || rawMin.includes("ensin") || rawMin.includes("ebd")) detected.add("biblico");
  if (rawMin.includes("acolh") || rawMin.includes("recep")) detected.add("acolhimento");
  if (rawMin.includes("interces") || rawMin.includes("orac") || rawMin.includes("oração")) detected.add("intercessao");
  if (rawMin.includes("evang") || rawMin.includes("miss")) detected.add("evangelismo");
  if (rawMin.includes("tesour") || rawMin.includes("finan")) detected.add("tesouraria");
  if (rawMin.includes("patrim") || rawMin.includes("zelad")) detected.add("patrimonio");

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
  if (hasDance) detected.add("danca");

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
  if (hasMultimedia) detected.add("multimidia");

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
  if (hasWorship) detected.add("louvor");

  // If nothing detected, fallback gracefully based on activeLens or louvor
  if (detected.size === 0) {
    if (activeLens && activeLens !== "all") {
      detected.add(normalizeMinistryKey(activeLens));
    } else {
      detected.add("louvor");
    }
  }

  const ministriesList = Array.from(detected);

  // Determine primary ministry: prioritize activeLens if it is present in the schedule
  let primary: string = ministriesList[0];
  if (activeLens && activeLens !== "all" && detected.has(normalizeMinistryKey(activeLens))) {
    primary = normalizeMinistryKey(activeLens);
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
