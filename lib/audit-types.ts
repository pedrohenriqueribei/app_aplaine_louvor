export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export type AuditEntityType =
  | 'Member'
  | 'Schedule'
  | 'WorshipService'
  | 'Song'
  | 'Department'
  | 'Church'
  | 'Visitor'
  | 'Appointment'
  | 'Band'
  | 'DanceGroup'
  | 'Choreography'
  | 'DanceRehearsal'
  | 'Broadcast'
  | 'ScaleConfig'
  | 'Playlist'
  | 'Notification'
  | 'Announcement'
  | 'ScheduleConflictAlert'
  | 'System';

export interface AuditLocationInfo {
  city?: string | null;
  region?: string | null;
  region_code?: string | null;
  country?: string | null;
  country_code?: string | null;
  timezone?: string | null;
  isp?: string | null;
  org?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_local?: boolean;
  is_approximate?: boolean;
}

export interface AuditSecurityAssessment {
  is_leadership_account: boolean;
  risk_level: 'low' | 'medium' | 'high';
  suspicious_flags: string[];
  flagged: boolean;
  explanation?: string | null;
}

export interface AuditLogEntry {
  id: string;
  actor_user_id: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: AuditAction;
  entity_type: AuditEntityType | string;
  entity_id: string;
  entity_label: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_fields: string[];
  church_id: string;
  department_id?: string | null;
  created_at: string; // ISO 8601 string
  source: 'web_app' | 'api' | 'system';
  correlation_id: string;
  user_agent?: string | null;
  ip_address?: string | null;
  location?: AuditLocationInfo | null;
  geo_summary?: string | null;
  security_assessment?: AuditSecurityAssessment | null;
  metadata?: Record<string, any>;
}

export interface AuditDiffResult {
  hasChanges: boolean;
  changedFields: string[];
  oldValues: Record<string, any>;
  newValues: Record<string, any>;
}

export interface RecordAuditParams {
  action: AuditAction;
  entityType: AuditEntityType | string;
  entityId: string;
  entityLabel: string;
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  churchId?: string;
  departmentId?: string | null;
  source?: 'web_app' | 'api' | 'system';
  correlationId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  location?: AuditLocationInfo | null;
  geoSummary?: string | null;
  securityAssessment?: AuditSecurityAssessment | null;
  actorOverride?: {
    userId?: string;
    name?: string;
    email?: string;
    role?: string;
  };
}
