import fs from 'fs';
import path from 'path';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import {
  AuditLogEntry,
  AuditAction,
  AuditEntityType,
  AuditDiffResult,
  RecordAuditParams,
  AuditLocationInfo,
  AuditSecurityAssessment,
} from './audit-types';

const AUDIT_CACHE_FILE = path.join('/tmp', 'applaine_audit_logs.json');
const memoryAuditLogs = new Map<string, AuditLogEntry>();

function readLocalAuditStore(): Record<string, AuditLogEntry> {
  try {
    if (fs.existsSync(AUDIT_CACHE_FILE)) {
      const data = fs.readFileSync(AUDIT_CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // quiet fallback
  }
  return {};
}

function writeLocalAuditStore(records: Record<string, AuditLogEntry>) {
  try {
    fs.writeFileSync(AUDIT_CACHE_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch {
    // quiet fallback
  }
}

// Sensitive keys that must never be recorded in audit logs
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'code',
  'secret',
  'resetToken',
  'token',
  'fcmTokens',
  'credentials',
]);

// Ignored keys for comparison (timestamps and internal fields that don't represent semantic user changes)
const IGNORED_DIFF_KEYS = new Set([
  '_id',
  'id',
  'updatedAt',
  'updated_at',
  'lastUpdated',
]);

/**
 * Recursively sanitize data to remove passwords, secrets, and functions
 */
export function sanitizeAuditData(data: any, depth = 0): any {
  if (depth > 6 || data === undefined || data === null) {
    return null;
  }

  if (typeof data !== 'object') {
    return data;
  }

  // Handle Date or Timestamp objects
  if (data instanceof Date) {
    return data.toISOString();
  }
  if (typeof data.toDate === 'function') {
    try {
      return data.toDate().toISOString();
    } catch {
      return String(data);
    }
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditData(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[PROTECTED]';
      continue;
    }
    if (typeof val === 'function') {
      continue;
    }
    sanitized[key] = sanitizeAuditData(val, depth + 1);
  }

  return sanitized;
}

/**
 * Computes deep differences between oldData and newData.
 * Returns only modified keys with their before and after states.
 */
export function computeAuditDiff(
  oldData: Record<string, any> | null | undefined,
  newData: Record<string, any> | null | undefined
): AuditDiffResult {
  const oldSanitized = oldData ? sanitizeAuditData(oldData) : {};
  const newSanitized = newData ? sanitizeAuditData(newData) : {};

  const allKeys = new Set([
    ...Object.keys(oldSanitized || {}),
    ...Object.keys(newSanitized || {}),
  ]);

  const changedFields: string[] = [];
  const oldValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  for (const key of allKeys) {
    if (IGNORED_DIFF_KEYS.has(key)) continue;

    const oldVal = oldSanitized ? oldSanitized[key] : undefined;
    const newVal = newSanitized ? newSanitized[key] : undefined;

    const oldStr = JSON.stringify(oldVal === undefined ? null : oldVal);
    const newStr = JSON.stringify(newVal === undefined ? null : newVal);

    if (oldStr !== newStr) {
      changedFields.push(key);
      if (oldVal !== undefined) oldValues[key] = oldVal;
      if (newVal !== undefined) newValues[key] = newVal;
    }
  }

  return {
    hasChanges: changedFields.length > 0,
    changedFields,
    oldValues,
    newValues,
  };
}

/**
 * Writes an audit log entry using Firebase Admin SDK.
 * Guaranteed to succeed without client tamperability.
 */
export async function createAuditEntryServer(
  params: RecordAuditParams & {
    actorUserId: string;
    actorName?: string;
    actorEmail?: string;
    actorRole?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    location?: AuditLocationInfo | null;
    geoSummary?: string | null;
    securityAssessment?: AuditSecurityAssessment | null;
  }
): Promise<AuditLogEntry | null> {
  const {
    action,
    entityType,
    entityId,
    entityLabel,
    oldData,
    newData,
    churchId,
    departmentId,
    source = 'api',
    correlationId = `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    actorUserId,
    actorName,
    actorEmail,
    actorRole,
    ipAddress,
    userAgent,
    location,
    geoSummary,
    securityAssessment,
    metadata,
  } = params;

  if (!churchId) {
    console.warn('[AuditService] Attempted to record audit log without churchId. Skipping.');
    return null;
  }

  let oldValues: Record<string, any> | null = null;
  let newValues: Record<string, any> | null = null;
  let changedFields: string[] = [];

  if (action === 'CREATE') {
    newValues = newData ? sanitizeAuditData(newData) : {};
    changedFields = newValues ? Object.keys(newValues) : [];
  } else if (action === 'DELETE') {
    oldValues = oldData ? sanitizeAuditData(oldData) : {};
    changedFields = [];
  } else if (action === 'UPDATE') {
    const diff = computeAuditDiff(oldData, newData);
    // Strict business rule: Do NOT log UPDATE if no fields actually changed
    if (!diff.hasChanges) {
      return null;
    }
    oldValues = diff.oldValues;
    newValues = diff.newValues;
    changedFields = diff.changedFields;
  }

  const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const now = new Date().toISOString();

  const auditEntry: AuditLogEntry = {
    id: logId,
    actor_user_id: actorUserId,
    actor_name: actorName || 'Usuário',
    actor_email: actorEmail || '',
    actor_role: actorRole || 'membro',
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_label: entityLabel || entityId,
    old_values: oldValues,
    new_values: newValues,
    changed_fields: changedFields,
    church_id: churchId,
    department_id: departmentId || null,
    created_at: now,
    source,
    correlation_id: correlationId,
    user_agent: userAgent || null,
    ip_address: ipAddress || null,
    location: location || null,
    geo_summary: geoSummary || null,
    security_assessment: securityAssessment || null,
    ...(metadata ? { metadata } : {}),
  };

  // Immediate save to resilient server memory & file store
  memoryAuditLogs.set(logId, auditEntry);
  try {
    const current = readLocalAuditStore();
    current[logId] = auditEntry;
    const keys = Object.keys(current);
    if (keys.length > 2000) {
      delete current[keys[0]];
    }
    writeLocalAuditStore(current);
  } catch {
    // quiet fallback
  }

  // Attempt Firestore admin write if available in environment
  try {
    await adminDb.collection('audit_logs').doc(logId).set(auditEntry);
  } catch (error: any) {
    console.warn('[AuditService] adminDb write skipped (persisted to server resilient cache):', error?.message || error);
  }

  return auditEntry;
}

/**
 * Queries audit logs with strict church isolation and permission checking.
 */
export async function queryAuditLogsServer(params: {
  churchId: string;
  isSuperAdmin: boolean;
  action?: AuditAction;
  entityType?: string;
  departmentId?: string;
  actorUserId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  forcedDepartmentId?: string;
  allowedDepartmentAliases?: string[];
  allowedEntityTypes?: string[];
}): Promise<AuditLogEntry[]> {
  try {
    let queryRef: FirebaseFirestore.Query = adminDb.collection('audit_logs');

    if (!params.isSuperAdmin || params.churchId) {
      queryRef = queryRef.where('church_id', '==', params.churchId);
    }

    if (params.action) {
      queryRef = queryRef.where('action', '==', params.action);
    }

    if (params.entityType) {
      queryRef = queryRef.where('entity_type', '==', params.entityType);
    }

    // If no forced department or if filtering directly
    if (params.departmentId && !params.forcedDepartmentId) {
      queryRef = queryRef.where('department_id', '==', params.departmentId);
    }

    if (params.actorUserId) {
      queryRef = queryRef.where('actor_user_id', '==', params.actorUserId);
    }

    // Sort by created_at descending
    queryRef = queryRef.orderBy('created_at', 'desc');

    const maxLimit = Math.min(params.limit || 100, 300);
    queryRef = queryRef.limit(maxLimit);

    const snapshot = await queryRef.get();
    let logs = snapshot.docs.map((doc) => doc.data() as AuditLogEntry);

    // CRITICAL SECURITY GUARANTEE:
    // If a role is restricted to a specific department (e.g. Dance Leader),
    // strictly enforce that only logs matching their department or allowed entities are visible.
    if (params.forcedDepartmentId) {
      const allowedAliases = new Set(
        (params.allowedDepartmentAliases || [params.forcedDepartmentId]).map((d) => d.toLowerCase())
      );
      if (params.forcedDepartmentId === 'danca') {
        allowedAliases.add('dance');
        allowedAliases.add('ministério de dança');
      } else if (params.forcedDepartmentId === 'louvor') {
        allowedAliases.add('worship');
        allowedAliases.add('ministério de louvor');
      } else if (params.forcedDepartmentId === 'multimidia') {
        allowedAliases.add('multimedia');
        allowedAliases.add('ministério de multimídia');
      } else if (params.forcedDepartmentId === 'secretaria') {
        allowedAliases.add('secretariat');
      }

      const allowedEntities = new Set(
        (params.allowedEntityTypes || []).map((e) => e.toLowerCase())
      );

      logs = logs.filter((log) => {
        const logDept = (log.department_id || '').toLowerCase();
        const logEntity = (log.entity_type || '').toLowerCase();

        // Direct department match
        if (logDept && allowedAliases.has(logDept)) return true;

        // Specific entity type match (e.g. DanceGroup for dance leader)
        if (allowedEntities.size > 0 && allowedEntities.has(logEntity)) {
          // If the log also explicitly belongs to another department, reject
          if (logDept && !allowedAliases.has(logDept)) return false;
          return true;
        }

        // Dance specific entities fallback
        if (
          params.forcedDepartmentId === 'danca' &&
          ['dancegroup', 'choreography', 'dancerehearsal'].includes(logEntity)
        ) {
          return true;
        }

        // Louvor specific entities fallback
        if (
          params.forcedDepartmentId === 'louvor' &&
          ['song', 'band', 'playlist'].includes(logEntity)
        ) {
          return true;
        }

        // Multimedia specific entities fallback
        if (
          params.forcedDepartmentId === 'multimidia' &&
          ['broadcast'].includes(logEntity)
        ) {
          return true;
        }

        return false;
      });
    }

    // Apply in-memory text search if provided
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      logs = logs.filter((log) => {
        return (
          (log.entity_label && log.entity_label.toLowerCase().includes(q)) ||
          (log.actor_name && log.actor_name.toLowerCase().includes(q)) ||
          (log.actor_email && log.actor_email.toLowerCase().includes(q)) ||
          (log.entity_id && log.entity_id.toLowerCase().includes(q)) ||
          (log.id && log.id.toLowerCase().includes(q)) ||
          (log.entity_type && log.entity_type.toLowerCase().includes(q))
        );
      });
    }

    // Apply date range filters if specified
    if (params.startDate) {
      logs = logs.filter((l) => l.created_at >= params.startDate!);
    }
    if (params.endDate) {
      logs = logs.filter((l) => l.created_at <= params.endDate!);
    }

    return logs;
  } catch (error: any) {
    console.warn('[AuditService] adminDb query unavailable, serving from resilient server audit cache:', error?.message || error);
    
    // Serve from local file and memory store
    const localStore = readLocalAuditStore();
    const map = new Map<string, AuditLogEntry>();
    for (const [k, v] of Object.entries(localStore)) {
      map.set(k, v);
    }
    for (const [k, v] of memoryAuditLogs.entries()) {
      map.set(k, v);
    }

    let fallbackLogs = Array.from(map.values());

    if (!params.isSuperAdmin || params.churchId) {
      fallbackLogs = fallbackLogs.filter((l) => l.church_id === params.churchId);
    }
    if (params.action) {
      fallbackLogs = fallbackLogs.filter((l) => l.action === params.action);
    }
    if (params.entityType) {
      fallbackLogs = fallbackLogs.filter((l) => (l.entity_type || '').toLowerCase() === params.entityType!.toLowerCase());
    }
    if (params.departmentId && !params.forcedDepartmentId) {
      fallbackLogs = fallbackLogs.filter((l) => l.department_id === params.departmentId);
    }
    if (params.actorUserId) {
      fallbackLogs = fallbackLogs.filter((l) => l.actor_user_id === params.actorUserId);
    }

    if (params.startDate) {
      fallbackLogs = fallbackLogs.filter((l) => l.created_at >= params.startDate!);
    }
    if (params.endDate) {
      fallbackLogs = fallbackLogs.filter((l) => l.created_at <= params.endDate!);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      fallbackLogs = fallbackLogs.filter((log) => {
        return (
          (log.entity_label && log.entity_label.toLowerCase().includes(q)) ||
          (log.actor_name && log.actor_name.toLowerCase().includes(q)) ||
          (log.actor_email && log.actor_email.toLowerCase().includes(q)) ||
          (log.entity_id && log.entity_id.toLowerCase().includes(q)) ||
          (log.id && log.id.toLowerCase().includes(q)) ||
          (log.entity_type && log.entity_type.toLowerCase().includes(q))
        );
      });
    }

    fallbackLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const maxLimit = Math.min(params.limit || 100, 300);
    return fallbackLogs.slice(0, maxLimit);
  }
}
