/**
 * Engine de Detecção de Conflitos de Escala Entre Ministérios Diferentes
 * Identifica quando um mesmo integrante está escalado em 2 ou mais ministérios
 * (ex: Louvor + Multimídia, Louvor + Dança, Multimídia + Dança) no mesmo dia e período/culto.
 */

export type MinistryType = "worship" | "multimedia" | "dance" | string;

export interface MinistryAssignment {
  ministry: MinistryType;
  ministryLabel: string;
  roleKey?: string;
  roleLabel: string;
  scheduleId: string;
}

export interface MemberMinistryConflict {
  memberId: string;
  memberName: string;
  date: string;
  periodKey: string;
  periodLabel: string;
  assignments: MinistryAssignment[];
  ministriesInvolved: string[]; // ["Louvor", "Multimídia"]
  description: string;
}

export interface ScheduleConflictSummary {
  hasConflict: boolean;
  conflicts: MemberMinistryConflict[];
  conflictingMemberNames: string[];
  conflictingMemberIds: Set<string>;
  tooltipText: string;
  shortLabel: string;
}

export const MINISTRY_LABELS: Record<string, string> = {
  worship: "Louvor",
  multimedia: "Multimídia",
  dance: "Dança",
  secretariat: "Secretaria",
};

export const ROLE_METADATA: Record<string, { label: string; ministry: string }> = {
  // Louvor (Worship)
  mainMinister: { label: "Ministro de Louvor", ministry: "worship" },
  drummer: { label: "Bateria", ministry: "worship" },
  bassist: { label: "Baixo", ministry: "worship" },
  keyboardist: { label: "Teclado", ministry: "worship" },
  acousticGuitarist: { label: "Violão", ministry: "worship" },
  electricGuitarist: { label: "Guitarra", ministry: "worship" },
  baritone: { label: "Barítono", ministry: "worship" },
  contralto: { label: "Contralto", ministry: "worship" },
  soprano: { label: "Soprano", ministry: "worship" },
  mezzoSoprano: { label: "Mezzo Soprano", ministry: "worship" },
  audioTech: { label: "Técnico de Som (Louvor)", ministry: "worship" },

  // Multimídia (Multimedia)
  pcOperators: { label: "Projeção (PC)", ministry: "multimedia" },
  projectionOperator: { label: "Projeção", ministry: "multimedia" },
  socialMediaOperators: { label: "Redes Sociais", ministry: "multimedia" },
  socialMediaManager: { label: "Redes Sociais", ministry: "multimedia" },
  mediaCreator: { label: "Criação de Mídia", ministry: "multimedia" },
  photographyOperators: { label: "Fotografia", ministry: "multimedia" },
  cameraOperators: { label: "Câmera / Transmissão", ministry: "multimedia" },
  audioOperators: { label: "Operador de Áudio", ministry: "multimedia" },

  // Dança (Dance)
  danceLeader: { label: "Líder de Dança", ministry: "dance" },
  dancers: { label: "Dançarino(a)", ministry: "dance" },
  choreographer: { label: "Coreógrafo(a)", ministry: "dance" },
  choreographers: { label: "Coreógrafo(a)", ministry: "dance" },
  costume: { label: "Figurino", ministry: "dance" },
  costumeManagers: { label: "Figurino", ministry: "dance" },
  rehearsalDirector: { label: "Direção de Ensaio", ministry: "dance" },
  rehearsalDirectors: { label: "Direção de Ensaio", ministry: "dance" },
};

/**
 * Normaliza e identifica a qual ministério uma chave de role pertence
 */
export function getMinistryFromRoleKey(roleKey: string): { ministry: string; roleLabel: string } {
  if (ROLE_METADATA[roleKey]) {
    const meta = ROLE_METADATA[roleKey];
    return { ministry: meta.ministry, roleLabel: meta.label };
  }

  const baseKey = roleKey.replace(/_\d+$/, "");
  if (ROLE_METADATA[baseKey]) {
    const meta = ROLE_METADATA[baseKey];
    return { ministry: meta.ministry, roleLabel: meta.label };
  }

  if (baseKey.startsWith("custom_instrument_") || baseKey.startsWith("vocal_") || baseKey.includes("instrument")) {
    return { ministry: "worship", roleLabel: "Instrumento / Vocal" };
  }

  if (baseKey.includes("media") || baseKey.includes("photo") || baseKey.includes("camera") || baseKey.includes("video") || baseKey.includes("audio")) {
    return { ministry: "multimedia", roleLabel: "Equipe Multimídia" };
  }

  if (baseKey.includes("dance") || baseKey.includes("danca") || baseKey.includes("coreo")) {
    return { ministry: "dance", roleLabel: "Equipe de Dança" };
  }

  return { ministry: "worship", roleLabel: roleKey };
}

/**
 * Calcula o identificador e rótulo do período do culto (ex: Manhã, Tarde, Noite, ou Culto específico)
 */
export function getSchedulePeriod(
  schedule: any,
  services: Array<{ id: string; name?: string; startTime?: string; [key: string]: any }> = []
): { key: string; label: string } {
  if (!schedule) return { key: "default", label: "Horário Principal" };

  // Se houver serviceId vinculado
  if (schedule.serviceId) {
    const srv = services.find((s) => s.id === schedule.serviceId);
    if (srv) {
      const srvName = srv.name || "Culto";
      if (srv.startTime) {
        const hour = parseInt(srv.startTime.split(":")[0], 10);
        if (!isNaN(hour)) {
          if (hour < 12) return { key: "morning", label: `${srvName} (${srv.startTime} - Manhã)` };
          if (hour < 18) return { key: "afternoon", label: `${srvName} (${srv.startTime} - Tarde)` };
          return { key: "night", label: `${srvName} (${srv.startTime} - Noite)` };
        }
      }
      const lower = srvName.toLowerCase();
      if (lower.includes("manhã") || lower.includes("manha")) {
        return { key: "morning", label: srvName };
      }
      if (lower.includes("tarde")) {
        return { key: "afternoon", label: srvName };
      }
      if (lower.includes("noite")) {
        return { key: "night", label: srvName };
      }
      return { key: `service_${srv.id}`, label: srvName };
    }
    return { key: `service_${schedule.serviceId}`, label: "Culto Específico" };
  }

  // Se a data contiver hora ISO explícita (ex: 2026-10-18T19:00:00)
  if (schedule.date && schedule.date.includes("T")) {
    const timePart = schedule.date.split("T")[1];
    const hour = parseInt(timePart.split(":")[0], 10);
    if (!isNaN(hour) && hour !== 12) {
      if (hour < 12) return { key: "morning", label: `Manhã (${hour}h)` };
      if (hour < 18) return { key: "afternoon", label: `Tarde (${hour}h)` };
      return { key: "night", label: `Noite (${hour}h)` };
    }
  }

  return { key: "general", label: "Culto Principal" };
}

/**
 * Verifica se duas escalas ocorrem no mesmo período/horário
 */
export function areSchedulesInSamePeriod(
  s1: any,
  s2: any,
  services: Array<{ id: string; name?: string; startTime?: string; [key: string]: any }> = []
): boolean {
  if (!s1 || !s2) return false;

  // Se tiverem o mesmo serviceId
  if (s1.serviceId && s2.serviceId && s1.serviceId === s2.serviceId) {
    return true;
  }

  const p1 = getSchedulePeriod(s1, services);
  const p2 = getSchedulePeriod(s2, services);

  // Períodos com chaves idênticas (ex: ambos "morning", ambos "night")
  if (p1.key === p2.key) {
    return true;
  }

  // Se um ou ambos for geral/padrão do dia (sem restrição de turno divergente)
  if (p1.key === "general" || p2.key === "general") {
    return true;
  }

  return false;
}

/**
 * Extrai todos os integrantes escalados em um schedule com seu respectivo ministério e papel
 */
export function extractScheduleAssignments(
  schedule: any,
  membersMap: Map<string, string>
): Map<string, MinistryAssignment[]> {
  const memberAssignments = new Map<string, MinistryAssignment[]>();

  const addAssignment = (memberId: string, ministry: string, roleKey?: string, roleLabel?: string) => {
    if (!memberId || typeof memberId !== "string" || !memberId.trim()) return;
    const cleanId = memberId.trim();
    const existing = memberAssignments.get(cleanId) || [];
    
    // Evita duplicar exatamente o mesmo ministério e papel
    const isDuplicate = existing.some(
      (a) => a.ministry === ministry && a.roleKey === roleKey
    );
    if (!isDuplicate) {
      existing.push({
        ministry,
        ministryLabel: MINISTRY_LABELS[ministry] || ministry,
        roleKey,
        roleLabel: roleLabel || MINISTRY_LABELS[ministry] || ministry,
        scheduleId: schedule.id,
      });
      memberAssignments.set(cleanId, existing);
    }
  };

  const scheduleMinistry = schedule.ministry || "worship";

  // 1. Processa roles mapeadas explicitamente
  if (schedule.roles && typeof schedule.roles === "object") {
    Object.entries(schedule.roles).forEach(([key, val]) => {
      const { ministry, roleLabel } = getMinistryFromRoleKey(key);

      if (typeof val === "string" && val.trim()) {
        addAssignment(val, ministry, key, roleLabel);
      } else if (Array.isArray(val)) {
        val.forEach((id) => {
          if (typeof id === "string" && id.trim()) {
            addAssignment(id, ministry, key, roleLabel);
          }
        });
      }
    });
  }

  // 2. Processa lista geral de members caso algum integrante não esteja em roles
  if (Array.isArray(schedule.members)) {
    schedule.members.forEach((mid: string) => {
      if (typeof mid === "string" && mid.trim()) {
        const cleanMid = mid.trim();
        const existing = memberAssignments.get(cleanMid) || [];
        if (existing.length === 0) {
          // Atribui ao ministério principal desta escala
          addAssignment(
            cleanMid,
            scheduleMinistry,
            undefined,
            MINISTRY_LABELS[scheduleMinistry] || "Voluntário"
          );
        }
      }
    });
  }

  return memberAssignments;
}

/**
 * Detecta todos os conflitos de integrantes escalados em mais de um ministério no mesmo dia e período.
 * Retorna um Map com scheduleId -> ScheduleConflictSummary.
 */
export function detectAllScheduleConflicts(
  allSchedules: any[] = [],
  services: any[] = [],
  members: any[] = []
): Map<string, ScheduleConflictSummary> {
  const conflictsMap = new Map<string, ScheduleConflictSummary>();

  // Mapa de nomes de membros
  const membersMap = new Map<string, string>();
  members.forEach((m) => {
    const id = m.uid || m.id;
    const name = m.name || m.displayName || m.fullName || "Integrante";
    if (id) {
      membersMap.set(id, name);
    }
  });

  // Agrupa escalas por data normalizada (YYYY-MM-DD)
  const schedulesByDate = new Map<string, any[]>();
  allSchedules.forEach((s) => {
    if (!s || !s.date) return;
    const cleanDate = s.date.split("T")[0];
    const list = schedulesByDate.get(cleanDate) || [];
    list.push(s);
    schedulesByDate.set(cleanDate, list);
  });

  // Mapa de conflitos por escala: scheduleId -> MemberMinistryConflict[]
  const rawScheduleConflicts = new Map<string, MemberMinistryConflict[]>();

  // Analisa cada dia
  schedulesByDate.forEach((daySchedules, dateStr) => {
    // 1. Extrai atribuições de cada escala do dia
    const scheduleAssignmentsMap = new Map<string, Map<string, MinistryAssignment[]>>();
    daySchedules.forEach((s) => {
      scheduleAssignmentsMap.set(s.id, extractScheduleAssignments(s, membersMap));
    });

    // 2. Verifica conflitos INTERNOS (dentro da mesma escala, ex: o voluntário toca bateria no louvor E opera câmera na multimídia)
    daySchedules.forEach((s) => {
      const assignments = scheduleAssignmentsMap.get(s.id);
      if (!assignments) return;

      assignments.forEach((memberAssList, memberId) => {
        // Coleta ministérios distintos deste membro nesta escala
        const distinctMinistries = Array.from(new Set(memberAssList.map((a) => a.ministry)));
        if (distinctMinistries.length >= 2) {
          const memberName = membersMap.get(memberId) || "Integrante";
          const period = getSchedulePeriod(s, services);
          const ministryNames = distinctMinistries.map((m) => MINISTRY_LABELS[m] || m);

          const conflictObj: MemberMinistryConflict = {
            memberId,
            memberName,
            date: dateStr,
            periodKey: period.key,
            periodLabel: period.label,
            assignments: memberAssList,
            ministriesInvolved: ministryNames,
            description: `${memberName} está escalado(a) simultaneamente em ${ministryNames.join(" e ")} neste mesmo período (${period.label}).`,
          };

          const curList = rawScheduleConflicts.get(s.id) || [];
          curList.push(conflictObj);
          rawScheduleConflicts.set(s.id, curList);
        }
      });
    });

    // 3. Verifica conflitos CRUZADOS entre escalas distintas no mesmo dia e período
    for (let i = 0; i < daySchedules.length; i++) {
      for (let j = i + 1; j < daySchedules.length; j++) {
        const s1 = daySchedules[i];
        const s2 = daySchedules[j];

        // Se estão no mesmo período
        if (areSchedulesInSamePeriod(s1, s2, services)) {
          const assign1 = scheduleAssignmentsMap.get(s1.id);
          const assign2 = scheduleAssignmentsMap.get(s2.id);
          if (!assign1 || !assign2) continue;

          // Verifica membros em comum
          assign1.forEach((list1, memberId) => {
            const list2 = assign2.get(memberId);
            if (list2 && list2.length > 0) {
              // Verifica se os ministérios diferem
              const ministries1 = new Set(list1.map((a) => a.ministry));
              const ministries2 = new Set(list2.map((a) => a.ministry));

              // Junta ministérios totais
              const allDistinctMinistries = Array.from(
                new Set([...Array.from(ministries1), ...Array.from(ministries2)])
              );

              // Se há mais de 1 ministério diferente envolvido
              if (allDistinctMinistries.length >= 2) {
                const memberName = membersMap.get(memberId) || "Integrante";
                const period = getSchedulePeriod(s1, services);
                const ministryNames = allDistinctMinistries.map((m) => MINISTRY_LABELS[m] || m);
                const allAss = [...list1, ...list2];

                const desc = `${memberName} está escalado(a) em ministérios diferentes (${ministryNames.join(" e ")}) no mesmo dia e período (${period.label}).`;

                const conflictForS1: MemberMinistryConflict = {
                  memberId,
                  memberName,
                  date: dateStr,
                  periodKey: period.key,
                  periodLabel: period.label,
                  assignments: allAss,
                  ministriesInvolved: ministryNames,
                  description: desc,
                };

                const cur1 = rawScheduleConflicts.get(s1.id) || [];
                // Evita duplicata do mesmo membro no mesmo schedule
                if (!cur1.some((c) => c.memberId === memberId)) {
                  cur1.push(conflictForS1);
                  rawScheduleConflicts.set(s1.id, cur1);
                }

                const cur2 = rawScheduleConflicts.get(s2.id) || [];
                if (!cur2.some((c) => c.memberId === memberId)) {
                  cur2.push(conflictForS1);
                  rawScheduleConflicts.set(s2.id, cur2);
                }
              }
            }
          });
        }
      }
    }
  });

  // 4. Formata o resultado consolidado para cada escala
  allSchedules.forEach((s) => {
    const list = rawScheduleConflicts.get(s.id) || [];
    const hasConflict = list.length > 0;
    const memberNames = Array.from(new Set(list.map((c) => c.memberName)));
    const memberIds = new Set(list.map((c) => c.memberId));

    let tooltipText = "";
    let shortLabel = "";

    if (hasConflict) {
      if (list.length === 1) {
        const c = list[0];
        shortLabel = `${c.memberName.split(" ")[0]} (${c.ministriesInvolved.join(" + ")})`;
        tooltipText = `⚠️ Conflito de Escala: ${c.description}`;
      } else {
        shortLabel = `${list.length} integrantes com conflito de ministérios`;
        tooltipText = `⚠️ Conflito de Escala (${list.length} integrantes escalados em ministérios diferentes no mesmo dia e período):\n` +
          list.map((c) => `• ${c.memberName}: ${c.ministriesInvolved.join(" e ")}`).join("\n");
      }
    }

    conflictsMap.set(s.id, {
      hasConflict,
      conflicts: list,
      conflictingMemberNames: memberNames,
      conflictingMemberIds: memberIds,
      tooltipText,
      shortLabel,
    });
  });

  return conflictsMap;
}

export interface OverloadedMemberProfile {
  memberId: string;
  memberName: string;
  avatarUrl?: string;
  photoURL?: string;
  email?: string;
  role?: string;
  totalSchedulesCount: number;
  simultaneousConflictsCount: number;
  overloadScore: number; // 0 - 100
  riskLevel: 'critical' | 'high' | 'moderate' | 'low';
  involvedMinistries: string[];
  conflicts: MemberMinistryConflict[];
  reasons: string[];
  suggestedAction: string;
}

export interface MinisterialOverloadStats {
  totalConflictsDetected: number;
  totalSchedulesAnalyzed: number;
  totalMembersAnalyzed: number;
  totalOverloadedMembers: number;
  criticalRiskCount: number;
  highRiskCount: number;
  moderateRiskCount: number;
  ministryBreakdown: Record<string, number>;
  conflictTypeBreakdown: {
    simultaneousCulto: number;
    excessiveMonthlyVolume: number;
    crossMinistryOverlap: number;
  };
  overloadedMembers: OverloadedMemberProfile[];
  averageOverloadIndex: number; // 0 - 100
}

/**
 * Calcula o dashboard analítico completo de conflitos de escala e sobrecarga ministerial
 */
export function calculateMinisterialOverloadAnalytics(
  allSchedules: any[] = [],
  services: any[] = [],
  members: any[] = [],
  filterDateWindow: 'all' | 'current_month' | 'next_30_days' = 'all'
): MinisterialOverloadStats {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const todayStr = now.toISOString().split('T')[0];
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Filtra escalas pelo período solicitado
  const filteredSchedules = allSchedules.filter((s) => {
    if (!s || !s.date) return false;
    const cleanDate = s.date.split('T')[0];
    if (filterDateWindow === 'current_month') {
      return cleanDate.startsWith(currentMonthPrefix);
    }
    if (filterDateWindow === 'next_30_days') {
      return cleanDate >= todayStr && cleanDate <= in30Days;
    }
    return true;
  });

  // Executa detecção de conflitos de escala
  const conflictsMap = detectAllScheduleConflicts(filteredSchedules, services, members);

  // Mapeia membros para acesso rápido aos metadados (avatar, email, nome)
  const memberMetadataMap = new Map<string, any>();
  members.forEach((m) => {
    const id = m.uid || m.id;
    if (id) {
      memberMetadataMap.set(id, m);
    }
  });

  // Coleta todos os conflitos únicos por membro
  const memberConflictsMap = new Map<string, MemberMinistryConflict[]>();
  const allUniqueConflicts: MemberMinistryConflict[] = [];
  const registeredConflictKeys = new Set<string>();

  conflictsMap.forEach((summary) => {
    summary.conflicts.forEach((c) => {
      const conflictKey = `${c.memberId}_${c.date}_${c.periodKey}`;
      if (!registeredConflictKeys.has(conflictKey)) {
        registeredConflictKeys.add(conflictKey);
        allUniqueConflicts.push(c);

        const curList = memberConflictsMap.get(c.memberId) || [];
        curList.push(c);
        memberConflictsMap.set(c.memberId, curList);
      }
    });
  });

  // Contabiliza presença e funções em escalas por membro
  const memberScheduleCounts = new Map<
    string,
    { count: number; ministries: Set<string>; dates: Set<string> }
  >();

  filteredSchedules.forEach((s) => {
    const sDate = (s.date || '').split('T')[0];
    const sMinistry = s.ministry || 'worship';
    const participantsInSchedule = new Set<string>();

    if (Array.isArray(s.members)) {
      s.members.forEach((m: string) => {
        if (typeof m === 'string' && m.trim()) participantsInSchedule.add(m.trim());
      });
    }

    if (s.roles && typeof s.roles === 'object') {
      Object.values(s.roles).forEach((val) => {
        if (typeof val === 'string' && val.trim()) participantsInSchedule.add(val.trim());
        if (Array.isArray(val)) {
          val.forEach((v) => {
            if (typeof v === 'string' && v.trim()) participantsInSchedule.add(v.trim());
          });
        }
      });
    }

    participantsInSchedule.forEach((id) => {
      const cur = memberScheduleCounts.get(id) || {
        count: 0,
        ministries: new Set<string>(),
        dates: new Set<string>(),
      };
      cur.count += 1;
      cur.ministries.add(sMinistry);
      if (sDate) cur.dates.add(sDate);
      memberScheduleCounts.set(id, cur);
    });
  });

  // Identifica membros avaliados e constrói o ranking de sobrecarga
  const overloadedMembers: OverloadedMemberProfile[] = [];
  const allInvolvedMemberIds = new Set<string>([
    ...Array.from(memberConflictsMap.keys()),
    ...Array.from(memberScheduleCounts.keys()),
  ]);

  let simultaneousCount = 0;
  let excessiveVolumeCount = 0;
  let crossMinistryCount = 0;
  const ministryBreakdown: Record<string, number> = {
    Louvor: 0,
    Multimídia: 0,
    Dança: 0,
    Secretaria: 0,
  };

  allUniqueConflicts.forEach((c) => {
    simultaneousCount += 1;
    c.ministriesInvolved.forEach((mLabel) => {
      ministryBreakdown[mLabel] = (ministryBreakdown[mLabel] || 0) + 1;
    });
  });

  allInvolvedMemberIds.forEach((memberId) => {
    const schedInfo = memberScheduleCounts.get(memberId) || {
      count: 0,
      ministries: new Set<string>(),
      dates: new Set<string>(),
    };
    const conflicts = memberConflictsMap.get(memberId) || [];
    const meta = memberMetadataMap.get(memberId) || {};
    const memberName = meta.name || meta.displayName || conflicts[0]?.memberName || 'Voluntário';

    const hasSimultaneousConflict = conflicts.length > 0;
    const isHighVolume = schedInfo.count >= 3;
    const hasCrossMinistry = schedInfo.ministries.size > 1;

    if (hasCrossMinistry) crossMinistryCount += 1;
    if (isHighVolume) excessiveVolumeCount += 1;

    // Se o membro possui qualquer indicativo de sobrecarga ou conflito
    if (hasSimultaneousConflict || isHighVolume || (hasCrossMinistry && schedInfo.count >= 2)) {
      const reasons: string[] = [];

      if (hasSimultaneousConflict) {
        reasons.push(
          `${conflicts.length} conflito(s) simultâneo(s) de ministério no mesmo culto`
        );
      }
      if (schedInfo.count >= 4) {
        reasons.push(`${schedInfo.count} escalas no período (sobrecarga ministerial crítica)`);
      } else if (schedInfo.count === 3) {
        reasons.push(`3 escalas no período (volume elevado de compromissos)`);
      }
      if (schedInfo.ministries.size > 1) {
        const minLabels = Array.from(schedInfo.ministries).map(
          (m) => MINISTRY_LABELS[m] || m
        );
        reasons.push(`Atuando em ${minLabels.length} frentes (${minLabels.join(' + ')})`);
      }

      // Pontuação de sobrecarga (0 a 100)
      let score = 0;
      score += conflicts.length * 35; // 35 pontos por conflito simultâneo
      if (schedInfo.count >= 4) score += 30;
      else if (schedInfo.count >= 3) score += 20;
      else if (schedInfo.count >= 2) score += 10;
      if (schedInfo.ministries.size > 1) score += 15;

      const overloadScore = Math.min(100, Math.max(10, score));

      // Determina nível de risco
      let riskLevel: 'critical' | 'high' | 'moderate' | 'low' = 'low';
      if (overloadScore >= 70 || conflicts.length >= 2 || schedInfo.count >= 5) {
        riskLevel = 'critical';
      } else if (overloadScore >= 45 || conflicts.length >= 1 || schedInfo.count >= 4) {
        riskLevel = 'high';
      } else if (overloadScore >= 25 || schedInfo.count >= 3) {
        riskLevel = 'moderate';
      }

      // Sugestão prática para o líder
      let suggestedAction = 'Monitorar escala e manter comunicação aberta.';
      if (riskLevel === 'critical') {
        suggestedAction =
          'Intervenção urgente: desescalar de uma das equipes e conceder folga no próximo domingo para evitar burnout ministerial.';
      } else if (riskLevel === 'high') {
        suggestedAction =
          'Revezar função conflitante com outro voluntário e evitar escalas em semanas consecutivas.';
      } else if (riskLevel === 'moderate') {
        suggestedAction =
          'Planejar substituição preventiva caso o voluntário apresente cansaço ou imprevistos.';
      }

      const involvedMinistriesList = Array.from(
        new Set([
          ...Array.from(schedInfo.ministries).map((m) => MINISTRY_LABELS[m] || m),
          ...conflicts.flatMap((c) => c.ministriesInvolved),
        ])
      );

      overloadedMembers.push({
        memberId,
        memberName,
        avatarUrl: meta.photoURL || meta.avatarUrl || undefined,
        photoURL: meta.photoURL || meta.avatarUrl || undefined,
        email: meta.email || undefined,
        role: meta.role || undefined,
        totalSchedulesCount: schedInfo.count,
        simultaneousConflictsCount: conflicts.length,
        overloadScore,
        riskLevel,
        involvedMinistries: involvedMinistriesList,
        conflicts,
        reasons,
        suggestedAction,
      });
    }
  });

  // Ordena ranking: primeiro maior score de sobrecarga, depois maior número de conflitos
  overloadedMembers.sort((a, b) => {
    if (b.overloadScore !== a.overloadScore) {
      return b.overloadScore - a.overloadScore;
    }
    if (b.simultaneousConflictsCount !== a.simultaneousConflictsCount) {
      return b.simultaneousConflictsCount - a.simultaneousConflictsCount;
    }
    return b.totalSchedulesCount - a.totalSchedulesCount;
  });

  const criticalRiskCount = overloadedMembers.filter((m) => m.riskLevel === 'critical').length;
  const highRiskCount = overloadedMembers.filter((m) => m.riskLevel === 'high').length;
  const moderateRiskCount = overloadedMembers.filter((m) => m.riskLevel === 'moderate').length;

  const totalMembersWithSchedules = memberScheduleCounts.size;
  const averageOverloadIndex =
    totalMembersWithSchedules > 0
      ? Math.round((overloadedMembers.length / totalMembersWithSchedules) * 100)
      : 0;

  return {
    totalConflictsDetected: allUniqueConflicts.length,
    totalSchedulesAnalyzed: filteredSchedules.length,
    totalMembersAnalyzed: totalMembersWithSchedules,
    totalOverloadedMembers: overloadedMembers.length,
    criticalRiskCount,
    highRiskCount,
    moderateRiskCount,
    ministryBreakdown,
    conflictTypeBreakdown: {
      simultaneousCulto: simultaneousCount,
      excessiveMonthlyVolume: excessiveVolumeCount,
      crossMinistryOverlap: crossMinistryCount,
    },
    overloadedMembers,
    averageOverloadIndex,
  };
}
