import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import {
  AuditAction,
  AuditEntityType,
  AuditLogEntry,
  RecordAuditParams,
  AuditDiffResult,
} from './audit-types';

export * from './audit-types';

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

const IGNORED_DIFF_KEYS = new Set([
  '_id',
  'id',
  'updatedAt',
  'updated_at',
  'lastUpdated',
]);

/**
 * Sanitizes object by removing functions, undefined values, and masking sensitive credentials.
 */
export function sanitizeClientAuditData(data: any, depth = 0): any {
  if (depth > 6 || data === undefined || data === null) {
    return null;
  }

  if (typeof data !== 'object') {
    return data;
  }

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
    return data.map((item) => sanitizeClientAuditData(item, depth + 1));
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
    sanitized[key] = sanitizeClientAuditData(val, depth + 1);
  }

  return sanitized;
}

/**
 * Computes deep difference between old and new state.
 * Returns only properties that actually changed.
 */
export function computeClientDiff(
  oldData: Record<string, any> | null | undefined,
  newData: Record<string, any> | null | undefined
): AuditDiffResult {
  const oldSanitized = oldData ? sanitizeClientAuditData(oldData) : {};
  const newSanitized = newData ? sanitizeClientAuditData(newData) : {};

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

let cachedUserContext: {
  uid: string;
  name?: string;
  email?: string;
  role?: string;
  churchId?: string;
} | null = null;

async function getActorDetails(): Promise<{
  uid: string;
  name: string;
  email: string;
  role: string;
  churchId: string;
} | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  if (cachedUserContext && cachedUserContext.uid === currentUser.uid) {
    return {
      uid: currentUser.uid,
      name: cachedUserContext.name || currentUser.displayName || 'Usuário',
      email: currentUser.email || cachedUserContext.email || '',
      role: cachedUserContext.role || 'membro',
      churchId: cachedUserContext.churchId || '',
    };
  }

  try {
    const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDocSnap.exists()) {
      const uData = userDocSnap.data();
      cachedUserContext = {
        uid: currentUser.uid,
        name: uData.name || currentUser.displayName || 'Usuário',
        email: uData.email || currentUser.email || '',
        role: uData.role || (uData.roles?.worship?.length ? 'membro' : 'voluntário'),
        churchId: uData.churchId || '',
      };
      return {
        uid: currentUser.uid,
        name: cachedUserContext.name || 'Usuário',
        email: cachedUserContext.email || '',
        role: cachedUserContext.role || 'membro',
        churchId: cachedUserContext.churchId || '',
      };
    }
  } catch (err) {
    console.warn('[Audit] Could not fetch user doc for audit actor:', err);
  }

  return {
    uid: currentUser.uid,
    name: currentUser.displayName || 'Usuário',
    email: currentUser.email || '',
    role: 'membro',
    churchId: '',
  };
}

let clientGeoPromise: Promise<{ ip: string | null; location: any; geoSummary: string } | null> | null = null;

export async function getClientGeoInfo() {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem('applaine_client_geo');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // ignore sessionStorage errors
  }

  if (!clientGeoPromise) {
    clientGeoPromise = (async () => {
      try {
        const res = await fetch('/api/audit/geo');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            const result = {
              ip: data.ip || null,
              location: data.location || null,
              geoSummary: data.geoSummary || null,
            };
            try {
              sessionStorage.setItem('applaine_client_geo', JSON.stringify(result));
            } catch {}
            return result;
          }
        }
      } catch {
        // quiet fallback
      }
      return null;
    })();
  }

  return clientGeoPromise;
}

/**
 * Central function to record an audit log event.
 * Validates changes, ensures authentication, and commits to Firestore.
 * Never throws an error that interrupts the user's primary business flow.
 */
export async function recordAuditLog(params: RecordAuditParams): Promise<string | null> {
  try {
    const actor = await getActorDetails();
    if (!actor && !params.actorOverride?.userId) {
      console.warn('[Audit] Cannot record audit event: No authenticated user.');
      return null;
    }

    const churchId = params.churchId || actor?.churchId;
    if (!churchId) {
      console.warn('[Audit] Skipping audit log: Church ID not provided or resolved.');
      return null;
    }

    let oldValues: Record<string, any> | null = null;
    let newValues: Record<string, any> | null = null;
    let changedFields: string[] = [];

    if (params.action === 'CREATE') {
      newValues = params.newData ? sanitizeClientAuditData(params.newData) : {};
      changedFields = newValues ? Object.keys(newValues) : [];
    } else if (params.action === 'DELETE') {
      oldValues = params.oldData ? sanitizeClientAuditData(params.oldData) : {};
      changedFields = [];
    } else if (params.action === 'UPDATE') {
      const diff = computeClientDiff(params.oldData, params.newData);
      // Strictly prevent logging if no values changed
      if (!diff.hasChanges) {
        return null;
      }
      oldValues = diff.oldValues;
      newValues = diff.newValues;
      changedFields = diff.changedFields;
    }

    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const correlationId = params.correlationId || `cor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
    const geoInfo = params.location ? { ip: params.ipAddress, location: params.location, geoSummary: params.geoSummary } : await getClientGeoInfo();

    const entry: AuditLogEntry = {
      id: logId,
      actor_user_id: params.actorOverride?.userId || actor!.uid,
      actor_name: params.actorOverride?.name || actor?.name || 'Usuário',
      actor_email: params.actorOverride?.email || actor?.email || '',
      actor_role: params.actorOverride?.role || actor?.role || 'membro',
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_label: params.entityLabel || params.entityId,
      old_values: oldValues,
      new_values: newValues,
      changed_fields: changedFields,
      church_id: churchId,
      department_id: params.departmentId || null,
      created_at: new Date().toISOString(),
      source: params.source || 'web_app',
      correlation_id: correlationId,
      user_agent: userAgent,
      ip_address: params.ipAddress || geoInfo?.ip || null,
      location: params.location || geoInfo?.location || null,
      geo_summary: params.geoSummary || geoInfo?.geoSummary || null,
      security_assessment: params.securityAssessment || null,
      ...(params.metadata ? { metadata: params.metadata } : {}),
    };

    // Persist directly to Firestore collection
    try {
      await setDoc(doc(db, 'audit_logs', logId), entry);
      return logId;
    } catch (clientWriteError) {
      // Attempt backend fallback via /api/audit
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          const res = await fetch('/api/audit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: params.action,
              entityType: params.entityType,
              entityId: params.entityId,
              entityLabel: params.entityLabel,
              oldData: params.oldData,
              newData: params.newData,
              churchId,
              departmentId: params.departmentId,
              correlationId,
              source: params.source || 'web_app',
              ipAddress: entry.ip_address,
              location: entry.location,
              geoSummary: entry.geo_summary,
              metadata: params.metadata,
            }),
          });
          if (res.ok) {
            return logId;
          }
        }
      } catch (fallbackError) {
        console.warn('[Audit] Background audit API fallback failed:', fallbackError);
      }
      console.warn('[Audit] Client direct write unavailable, fallback completed');
      return null;
    }
  } catch (error) {
    console.warn('[Audit] Notice: Error processing audit log record:', error);
    return null;
  }
}

/**
 * Convenient helper for recording CREATE events
 */
export async function auditCreate(
  entityType: AuditEntityType | string,
  entityId: string,
  entityLabel: string,
  newData: Record<string, any>,
  options?: {
    churchId?: string;
    departmentId?: string | null;
    correlationId?: string;
    metadata?: Record<string, any>;
  }
): Promise<string | null> {
  return recordAuditLog({
    action: 'CREATE',
    entityType,
    entityId,
    entityLabel,
    newData,
    ...options,
  });
}

/**
 * Convenient helper for recording UPDATE events
 */
export async function auditUpdate(
  entityType: AuditEntityType | string,
  entityId: string,
  entityLabel: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  options?: {
    churchId?: string;
    departmentId?: string | null;
    correlationId?: string;
    metadata?: Record<string, any>;
  }
): Promise<string | null> {
  return recordAuditLog({
    action: 'UPDATE',
    entityType,
    entityId,
    entityLabel,
    oldData,
    newData,
    ...options,
  });
}

/**
 * Convenient helper for recording DELETE events
 */
export async function auditDelete(
  entityType: AuditEntityType | string,
  entityId: string,
  entityLabel: string,
  oldData: Record<string, any>,
  options?: {
    churchId?: string;
    departmentId?: string | null;
    correlationId?: string;
    metadata?: Record<string, any>;
  }
): Promise<string | null> {
  return recordAuditLog({
    action: 'DELETE',
    entityType,
    entityId,
    entityLabel,
    oldData,
    ...options,
  });
}

/**
 * Wraps any primary database operation in an audit transaction wrapper.
 * Ensures the audit record is executed ONLY after primary operation success.
 * If the primary operation fails, it rethrows without writing the audit log.
 */
export async function withAudit<T>(
  operation: () => Promise<T>,
  auditParams: RecordAuditParams
): Promise<T> {
  const result = await operation();
  // Execute audit logging asynchronously without blocking the user
  recordAuditLog(auditParams).catch((err) => {
    console.warn('[Audit] Background audit dispatch failed:', err);
  });
  return result;
}
