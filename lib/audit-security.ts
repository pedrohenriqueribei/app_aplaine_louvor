export interface AuditRolePermissionRule {
  id: string;
  name: string;
  category: 'administracao' | 'ministerio' | 'lideranca' | 'outro';
  roleKey: string;
  departmentId: string | null; // e.g. 'danca', 'louvor', 'multimidia', 'secretaria' or null (all)
  departmentName: string | null;
  enabled: boolean;
  scope: 'church' | 'department'; // 'church' = all church logs, 'department' = strictly filtered to that department
  allowedEntityTypes?: string[];
  description: string;
  isSystemProtected?: boolean;
}

export interface AuditSecurityConfig {
  updatedAt: string;
  updatedBy: string;
  updatedByEmail?: string;
  allowSuperAdminGlobal: boolean;
  defaultNonConfiguredRoles: 'deny' | 'allow_church';
  rules: AuditRolePermissionRule[];
}

export const DEFAULT_AUDIT_SECURITY_RULES: AuditRolePermissionRule[] = [
  {
    id: 'admin',
    name: 'Administrador da Igreja',
    category: 'administracao',
    roleKey: 'admin',
    departmentId: null,
    departmentName: null,
    enabled: true,
    scope: 'church',
    description: 'Acesso completo a todos os logs e departamentos da sua respectiva igreja.',
    isSystemProtected: false,
  },
  {
    id: 'pastor',
    name: 'Pastor / Presbitério',
    category: 'administracao',
    roleKey: 'pastor',
    departmentId: null,
    departmentName: null,
    enabled: true,
    scope: 'church',
    description: 'Acesso de supervisão pastoral a todos os registros da sua igreja.',
    isSystemProtected: false,
  },
  {
    id: 'dance_leader',
    name: 'Líder do Ministério de Dança',
    category: 'ministerio',
    roleKey: 'dance_leader',
    departmentId: 'danca',
    departmentName: 'Ministério de Dança',
    enabled: true,
    scope: 'department',
    allowedEntityTypes: ['DanceGroup', 'Choreography', 'DanceRehearsal', 'Schedule'],
    description: 'Acesso restrito exclusivamente aos logs de eventos, escalas e membros do Ministério de Dança.',
    isSystemProtected: false,
  },
  {
    id: 'worship_leader',
    name: 'Líder do Ministério de Louvor',
    category: 'ministerio',
    roleKey: 'worship_leader',
    departmentId: 'louvor',
    departmentName: 'Ministério de Louvor',
    enabled: true,
    scope: 'department',
    allowedEntityTypes: ['Song', 'Band', 'Playlist', 'Schedule'],
    description: 'Acesso restrito exclusivamente aos logs de músicas, bandas e escalas do Ministério de Louvor.',
    isSystemProtected: false,
  },
  {
    id: 'multimedia_leader',
    name: 'Líder do Ministério de Multimídia',
    category: 'ministerio',
    roleKey: 'multimedia_leader',
    departmentId: 'multimidia',
    departmentName: 'Ministério de Multimídia',
    enabled: true,
    scope: 'department',
    allowedEntityTypes: ['Broadcast', 'Schedule'],
    description: 'Acesso restrito exclusivamente aos logs e transmissões do Ministério de Multimídia.',
    isSystemProtected: false,
  },
  {
    id: 'secretariat_leader',
    name: 'Líder da Secretaria / Membresia',
    category: 'ministerio',
    roleKey: 'secretariat_leader',
    departmentId: 'secretaria',
    departmentName: 'Secretaria',
    enabled: true,
    scope: 'department',
    allowedEntityTypes: ['Member', 'Visitor', 'Appointment'],
    description: 'Acesso restrito aos logs de membros, visitantes e atendimentos pastorais.',
    isSystemProtected: false,
  },
  {
    id: 'general_leader',
    name: 'Líder Geral / Coordenador',
    category: 'lideranca',
    roleKey: 'general_leader',
    departmentId: null,
    departmentName: null,
    enabled: true,
    scope: 'church',
    description: 'Coordenação geral de ministérios com visão ampla da igreja.',
    isSystemProtected: false,
  },
  {
    id: 'member',
    name: 'Membro / Integrante Comum',
    category: 'outro',
    roleKey: 'member',
    departmentId: null,
    departmentName: null,
    enabled: false,
    scope: 'department',
    description: 'Usuários regulares da plataforma não possuem acesso a auditoria interna.',
    isSystemProtected: true,
  },
];

export const DEFAULT_AUDIT_SECURITY_CONFIG: AuditSecurityConfig = {
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
  updatedByEmail: 'sistema@applane.com',
  allowSuperAdminGlobal: true,
  defaultNonConfiguredRoles: 'deny',
  rules: DEFAULT_AUDIT_SECURITY_RULES,
};

export interface UserAuditEvaluation {
  canAccess: boolean;
  isSuperAdmin: boolean;
  scope: 'all' | 'church' | 'department' | 'none';
  forcedDepartmentId: string | null;
  allowedDepartmentAliases: string[];
  roleTitle: string;
  ruleMatched?: AuditRolePermissionRule;
  allowedEntityTypes?: string[];
  restrictionReason?: string;
}

/**
 * Checks if a string list contains a leader designation
 */
function isArrayLeader(rolesList: any): boolean {
  if (!Array.isArray(rolesList)) return false;
  return rolesList.some((r) => {
    const s = String(r).toLowerCase().trim();
    return s === 'leader' || s === 'lider' || s === 'líder' || s === 'coordinator' || s === 'coordenador';
  });
}

/**
 * Evaluates a user's exact audit permissions against the platform security config
 */
export function evaluateUserAuditAccess(
  user: {
    uid?: string;
    role?: string;
    roles?: {
      dance?: string[];
      worship?: string[];
      multimedia?: string[];
      secretariat?: string[];
      [key: string]: any;
    };
    isSuperAdmin?: boolean;
    churchId?: string;
    email?: string;
  },
  config: AuditSecurityConfig = DEFAULT_AUDIT_SECURITY_CONFIG
): UserAuditEvaluation {
  // 1. Super Admin is always fully unrestricted
  const isSuperAdmin = Boolean(
    user.isSuperAdmin ||
    user.role === 'super_admin' ||
    user.email === 'pedrohenriqueribei@gmail.com'
  );

  if (isSuperAdmin) {
    return {
      canAccess: true,
      isSuperAdmin: true,
      scope: 'all',
      forcedDepartmentId: null,
      allowedDepartmentAliases: [],
      roleTitle: 'Super Administrador',
    };
  }

  const roleStr = String(user.role || '').toLowerCase();
  const rules = config.rules || DEFAULT_AUDIT_SECURITY_RULES;

  // 2. Check if user is Church Admin or Pastor
  if (roleStr === 'admin' || roleStr === 'administrador') {
    const rule = rules.find((r) => r.roleKey === 'admin') || rules.find((r) => r.id === 'admin');
    if (rule?.enabled) {
      return {
        canAccess: true,
        isSuperAdmin: false,
        scope: rule.scope,
        forcedDepartmentId: rule.departmentId,
        allowedDepartmentAliases: [],
        roleTitle: rule.name,
        ruleMatched: rule,
      };
    }
  }

  if (roleStr === 'pastor' || roleStr === 'lead_pastor' || roleStr === 'presbítero') {
    const rule = rules.find((r) => r.roleKey === 'pastor') || rules.find((r) => r.id === 'pastor');
    if (rule?.enabled) {
      return {
        canAccess: true,
        isSuperAdmin: false,
        scope: rule.scope,
        forcedDepartmentId: rule.departmentId,
        allowedDepartmentAliases: [],
        roleTitle: rule.name,
        ruleMatched: rule,
      };
    }
  }

  // 3. Check Ministerial Leaders (Dança, Louvor, Multimídia, Secretaria)
  // Check Dance Leader first:
  const isDanceLeader =
    roleStr === 'lider_danca' ||
    roleStr === 'lider_dança' ||
    roleStr === 'dance_leader' ||
    isArrayLeader(user.roles?.dance);

  if (isDanceLeader) {
    const rule = rules.find((r) => r.roleKey === 'dance_leader') || rules.find((r) => r.id === 'dance_leader');
    if (rule && rule.enabled) {
      return {
        canAccess: true,
        isSuperAdmin: false,
        scope: 'department',
        forcedDepartmentId: 'danca',
        allowedDepartmentAliases: ['danca', 'dance', 'Ministério de Dança'],
        roleTitle: rule.name,
        ruleMatched: rule,
        allowedEntityTypes: rule.allowedEntityTypes || ['DanceGroup', 'Choreography', 'DanceRehearsal', 'Schedule'],
        restrictionReason: 'Acesso restrito exclusivamente ao Ministério de Dança por determinação de segurança do Super Administrador.',
      };
    } else {
      return {
        canAccess: false,
        isSuperAdmin: false,
        scope: 'none',
        forcedDepartmentId: null,
        allowedDepartmentAliases: [],
        roleTitle: 'Líder do Ministério de Dança',
        restrictionReason: 'O acesso a logs de auditoria para Líderes de Dança está desativado nas configurações de segurança.',
      };
    }
  }

  // Check Worship Leader:
  const isWorshipLeader =
    roleStr === 'lider_louvor' ||
    roleStr === 'worship_leader' ||
    isArrayLeader(user.roles?.worship);

  if (isWorshipLeader) {
    const rule = rules.find((r) => r.roleKey === 'worship_leader') || rules.find((r) => r.id === 'worship_leader');
    if (rule && rule.enabled) {
      return {
        canAccess: true,
        isSuperAdmin: false,
        scope: 'department',
        forcedDepartmentId: 'louvor',
        allowedDepartmentAliases: ['louvor', 'worship', 'Ministério de Louvor'],
        roleTitle: rule.name,
        ruleMatched: rule,
        allowedEntityTypes: rule.allowedEntityTypes || ['Song', 'Band', 'Playlist', 'Schedule'],
        restrictionReason: 'Acesso restrito exclusivamente ao Ministério de Louvor.',
      };
    } else {
      return {
        canAccess: false,
        isSuperAdmin: false,
        scope: 'none',
        forcedDepartmentId: null,
        allowedDepartmentAliases: [],
        roleTitle: 'Líder do Ministério de Louvor',
        restrictionReason: 'O acesso a logs de auditoria para Líderes de Louvor está desativado nas configurações de segurança.',
      };
    }
  }

  // Check Multimedia Leader:
  const isMultimediaLeader =
    roleStr === 'lider_multimidia' ||
    roleStr === 'multimedia_leader' ||
    isArrayLeader(user.roles?.multimedia);

  if (isMultimediaLeader) {
    const rule = rules.find((r) => r.roleKey === 'multimedia_leader') || rules.find((r) => r.id === 'multimedia_leader');
    if (rule && rule.enabled) {
      return {
        canAccess: true,
        isSuperAdmin: false,
        scope: 'department',
        forcedDepartmentId: 'multimidia',
        allowedDepartmentAliases: ['multimidia', 'multimedia', 'Ministério de Multimídia'],
        roleTitle: rule.name,
        ruleMatched: rule,
        allowedEntityTypes: rule.allowedEntityTypes || ['Broadcast', 'Schedule'],
        restrictionReason: 'Acesso restrito exclusivamente ao Ministério de Multimídia.',
      };
    } else {
      return {
        canAccess: false,
        isSuperAdmin: false,
        scope: 'none',
        forcedDepartmentId: null,
        allowedDepartmentAliases: [],
        roleTitle: 'Líder do Ministério de Multimídia',
        restrictionReason: 'O acesso a logs para Líderes de Multimídia está desativado nas configurações de segurança.',
      };
    }
  }

  // Check Secretariat Leader:
  const isSecretariatLeader =
    roleStr === 'lider_secretaria' ||
    roleStr === 'secretariat_leader' ||
    isArrayLeader(user.roles?.secretariat);

  if (isSecretariatLeader) {
    const rule = rules.find((r) => r.roleKey === 'secretariat_leader') || rules.find((r) => r.id === 'secretariat_leader');
    if (rule && rule.enabled) {
      return {
        canAccess: true,
        isSuperAdmin: false,
        scope: 'department',
        forcedDepartmentId: 'secretaria',
        allowedDepartmentAliases: ['secretaria', 'secretariat', 'Secretaria'],
        roleTitle: rule.name,
        ruleMatched: rule,
        allowedEntityTypes: rule.allowedEntityTypes || ['Member', 'Visitor', 'Appointment'],
        restrictionReason: 'Acesso restrito exclusivamente à Secretaria.',
      };
    } else {
      return {
        canAccess: false,
        isSuperAdmin: false,
        scope: 'none',
        forcedDepartmentId: null,
        allowedDepartmentAliases: [],
        roleTitle: 'Líder da Secretaria',
        restrictionReason: 'Acesso a logs desativado para o cargo nas configurações de segurança.',
      };
    }
  }

  // 4. Check Generic Leader:
  if (roleStr === 'líder' || roleStr === 'lider' || roleStr === 'leader') {
    const rule = rules.find((r) => r.roleKey === 'general_leader') || rules.find((r) => r.id === 'general_leader');
    if (rule?.enabled) {
      return {
        canAccess: true,
        isSuperAdmin: false,
        scope: rule.scope,
        forcedDepartmentId: rule.departmentId,
        allowedDepartmentAliases: [],
        roleTitle: rule.name,
        ruleMatched: rule,
      };
    }
  }

  // 5. Default Non-configured or Member
  return {
    canAccess: false,
    isSuperAdmin: false,
    scope: 'none',
    forcedDepartmentId: null,
    allowedDepartmentAliases: [],
    roleTitle: user.role || 'Membro',
    restrictionReason: 'Seu perfil de acesso atual não possui permissão concedida pelo Super Administrador para visualizar logs de auditoria.',
  };
}
