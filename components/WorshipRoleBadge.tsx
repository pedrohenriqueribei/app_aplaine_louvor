"use client";

import React from "react";
import { Crown, Mic2, Music } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorshipRoleType = "mainMinister" | "vocalist" | "musician";

export interface WorshipBadgeInfo {
  type: WorshipRoleType;
  label: "Ministro Principal" | "Vocalista" | "Músico";
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  badgeClass: string;
  dotColor: string;
}

interface MemberLike {
  uid?: string;
  name?: string;
  role?: string;
  churchId?: string;
  instruments?: string[];
  instrument?: string;
  vocalRange?: string;
  roles?: {
    worship?: string[];
    multimedia?: string[];
    secretariat?: string[];
    dance?: string[];
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Identifica e extrai badges dinâmicos de 'Ministro Principal', 'Vocalista' e 'Músico'
 * para o integrante, avaliando primordialmente as roles salvas no documento do usuário (Firestore),
 * com suporte ao contexto da escala ativa (schedule.roles).
 */
export function getMemberWorshipBadges(
  member?: MemberLike | null,
  scheduleRoles?: Record<string, any> | null,
  memberUid?: string
): WorshipBadgeInfo[] {
  const targetUid = memberUid || member?.uid;
  const badges: WorshipBadgeInfo[] = [];

  // 1. Normalização de dados do documento do usuário
  const worshipRoles: string[] = Array.isArray(member?.roles?.worship)
    ? member.roles.worship.map((r) => String(r).toLowerCase().trim())
    : [];

  const userRoleStr = String(member?.role || "").toLowerCase().trim();

  const userInstruments: string[] = [];
  if (Array.isArray(member?.instruments)) {
    member.instruments.forEach((inst) => {
      if (typeof inst === "string" && inst.trim()) {
        userInstruments.push(inst.trim());
      }
    });
  }
  if (typeof member?.instrument === "string" && member.instrument.trim()) {
    userInstruments.push(member.instrument.trim());
  }

  const userVocalRange = typeof member?.vocalRange === "string" ? member.vocalRange.trim() : "";

  // 2. Normalização de atribuições na escala ativa (se houver scheduleRoles)
  const scheduledAsMainMinister = Boolean(
    targetUid &&
      scheduleRoles &&
      (scheduleRoles.mainMinister === targetUid ||
        Object.entries(scheduleRoles).some(
          ([k, v]) => k.startsWith("mainMinister") && v === targetUid
        ))
  );

  const vocalRoleKeys = [
    "soprano",
    "contralto",
    "mezzosoprano",
    "baritone",
    "vocal",
    "vocalist",
    "tenor",
    "baixo",
    "mezzo",
  ];

  const scheduledInVocalSlot = Boolean(
    targetUid &&
      scheduleRoles &&
      Object.entries(scheduleRoles).some(([key, val]) => {
        if (typeof val !== "string" || val !== targetUid) return false;
        const baseKey = key.replace(/_\d+$/, "").toLowerCase();
        return vocalRoleKeys.includes(baseKey);
      })
  );

  const instrumentRoleKeys = [
    "drummer",
    "bassist",
    "keyboardist",
    "acousticguitarist",
    "electricguitarist",
    "guitarist",
    "pianist",
  ];

  const scheduledInInstrumentSlot = Boolean(
    targetUid &&
      scheduleRoles &&
      Object.entries(scheduleRoles).some(([key, val]) => {
        if (typeof val !== "string" || val !== targetUid) return false;
        const baseKey = key.replace(/_\d+$/, "").toLowerCase();
        return (
          instrumentRoleKeys.includes(baseKey) ||
          baseKey.startsWith("custom_instrument_")
        );
      })
  );

  // 3. Verificação: MINISTRO PRINCIPAL
  const isMainMinister = Boolean(
    scheduledAsMainMinister ||
      worshipRoles.includes("mainminister") ||
      worshipRoles.includes("main_minister") ||
      worshipRoles.includes("leader") ||
      worshipRoles.includes("lider") ||
      worshipRoles.includes("ministro") ||
      worshipRoles.includes("ministro_principal") ||
      userRoleStr === "líder" ||
      userRoleStr === "lider" ||
      userRoleStr === "ministro" ||
      userRoleStr === "ministro principal" ||
      userRoleStr === "mainminister" ||
      userRoleStr === "main_minister"
  );

  if (isMainMinister) {
    badges.push({
      type: "mainMinister",
      label: "Ministro Principal",
      icon: Crown,
      badgeClass:
        "bg-amber-100/90 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700/80 shadow-amber-500/10",
      dotColor: "bg-amber-500",
    });
  }

  // 4. Verificação: VOCALISTA
  const hasVoiceInstrument = userInstruments.some((inst) => {
    const l = inst.toLowerCase();
    return l === "voz" || l.includes("vocal") || l.includes("canto");
  });

  const isVocalist = Boolean(
    scheduledInVocalSlot ||
      worshipRoles.includes("vocalist") ||
      worshipRoles.includes("vocal") ||
      worshipRoles.includes("vocalista") ||
      worshipRoles.includes("cantor") ||
      worshipRoles.includes("soprano") ||
      worshipRoles.includes("contralto") ||
      worshipRoles.includes("baritone") ||
      worshipRoles.includes("mezzo") ||
      userVocalRange.length > 0 ||
      hasVoiceInstrument ||
      userRoleStr === "vocalista" ||
      userRoleStr === "vocal"
  );

  if (isVocalist) {
    badges.push({
      type: "vocalist",
      label: "Vocalista",
      icon: Mic2,
      badgeClass:
        "bg-purple-100/90 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-700/80 shadow-purple-500/10",
      dotColor: "bg-purple-500",
    });
  }

  // 5. Verificação: MÚSICO
  const hasMusicalInstrument = userInstruments.some((inst) => {
    const l = inst.toLowerCase();
    return l !== "voz" && !l.includes("vocal") && !l.includes("canto");
  });

  const isMusician = Boolean(
    scheduledInInstrumentSlot ||
      worshipRoles.includes("musician") ||
      worshipRoles.includes("musico") ||
      worshipRoles.includes("músico") ||
      worshipRoles.includes("instrumentist") ||
      worshipRoles.includes("instrumentista") ||
      hasMusicalInstrument ||
      userRoleStr === "músico" ||
      userRoleStr === "musico" ||
      userRoleStr === "instrumentista"
  );

  if (isMusician) {
    badges.push({
      type: "musician",
      label: "Músico",
      icon: Music,
      badgeClass:
        "bg-sky-100/90 text-sky-900 border-sky-300 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-700/80 shadow-sky-500/10",
      dotColor: "bg-sky-500",
    });
  }

  // Fallback: se nenhum badge foi identificado mas o membro possui role em louvor, associar a Músico
  if (badges.length === 0 && worshipRoles.length > 0) {
    badges.push({
      type: "musician",
      label: "Músico",
      icon: Music,
      badgeClass:
        "bg-sky-100/90 text-sky-900 border-sky-300 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-700/80 shadow-sky-500/10",
      dotColor: "bg-sky-500",
    });
  }

  return badges;
}

interface WorshipRoleBadgeProps {
  badge: WorshipBadgeInfo;
  size?: "xs" | "sm" | "md";
  showIcon?: boolean;
}

export function WorshipRoleBadge({
  badge,
  size = "xs",
  showIcon = true,
}: WorshipRoleBadgeProps) {
  const Icon = badge.icon;
  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.5 gap-1 rounded-md",
    sm: "text-[10px] px-2 py-0.5 gap-1 rounded-lg",
    md: "text-xs px-2.5 py-1 gap-1.5 rounded-xl font-black",
  };
  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-black uppercase tracking-wider border shadow-2xs transition-all whitespace-nowrap select-none",
        sizeClasses[size],
        badge.badgeClass
      )}
      title={`Função cadastrada: ${badge.label}`}
    >
      {showIcon && <Icon className={cn("shrink-0", iconSizes[size])} />}
      <span>{badge.label}</span>
    </span>
  );
}

interface WorshipRoleBadgesProps {
  member?: MemberLike | null;
  scheduleRoles?: Record<string, any> | null;
  memberUid?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  maxBadges?: number;
}

export function WorshipRoleBadges({
  member,
  scheduleRoles,
  memberUid,
  size = "xs",
  className,
  maxBadges,
}: WorshipRoleBadgesProps) {
  const badges = getMemberWorshipBadges(member, scheduleRoles, memberUid);
  const displayed = maxBadges ? badges.slice(0, maxBadges) : badges;

  if (displayed.length === 0) return null;

  return (
    <span className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      {displayed.map((badge) => (
        <WorshipRoleBadge
          key={`${badge.type}-${badge.label}`}
          badge={badge}
          size={size}
        />
      ))}
    </span>
  );
}
