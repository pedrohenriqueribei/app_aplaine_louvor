import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import {
  AuditSecurityConfig,
  DEFAULT_AUDIT_SECURITY_CONFIG,
  evaluateUserAuditAccess,
} from '@/lib/audit-security';
import { createAuditEntryServer } from '@/lib/audit-service';

const POLICY_CACHE_FILE = path.join('/tmp', 'applaine_audit_security_policy.json');

function readLocalPolicy(): AuditSecurityConfig | null {
  try {
    if (fs.existsSync(POLICY_CACHE_FILE)) {
      const data = fs.readFileSync(POLICY_CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // quiet fallback
  }
  return null;
}

function writeLocalPolicy(config: AuditSecurityConfig) {
  try {
    fs.writeFileSync(POLICY_CACHE_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // quiet fallback
  }
}

export const dynamic = 'force-dynamic';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Não autenticado', status: 401 };
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const isOwnerEmail = decoded.email === 'pedrohenriqueribei@gmail.com';
    const isSuperAdminClaim = decoded.super_admin === true;

    let userRole = 'membro';
    let userChurchId = '';
    let userName = decoded.name || 'Usuário';
    let userRoles: any = {};

    try {
      const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
      if (userSnap.exists) {
        const u = userSnap.data();
        userRole = u?.role || userRole;
        userChurchId = u?.churchId || '';
        userName = u?.name || userName;
        userRoles = u?.roles || {};
      }
    } catch (e: any) {
      console.warn('User lookup in adminDb unavailable, using token claims:', e?.message || e);
    }

    const isSuperAdmin = Boolean(isOwnerEmail || isSuperAdminClaim || userRole === 'super_admin');

    return {
      user: {
        uid: decoded.uid,
        email: decoded.email || '',
        name: userName,
        role: userRole,
        roles: userRoles,
        churchId: userChurchId,
        isSuperAdmin,
      },
    };
  } catch {
    return { error: 'Token inválido ou expirado', status: 401 };
  }
}

/**
 * GET /api/admin/audit-permissions
 * Retorna as configurações de segurança vigentes e a avaliação de permissão do usuário.
 */
export async function GET(req: NextRequest) {
  try {
    const authRes = await authenticate(req);
    if ('error' in authRes) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    const { user } = authRes;

    let config: AuditSecurityConfig = readLocalPolicy() || DEFAULT_AUDIT_SECURITY_CONFIG;

    try {
      const docRef = adminDb.collection('system_settings').doc('audit_security_policy');
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const data = docSnap.data() as any;
        config = {
          ...DEFAULT_AUDIT_SECURITY_CONFIG,
          ...data,
          rules: Array.isArray(data.rules) && data.rules.length > 0 ? data.rules : DEFAULT_AUDIT_SECURITY_CONFIG.rules,
        };
        writeLocalPolicy(config);
      }
    } catch (dbErr: any) {
      console.warn('adminDb audit_security_policy read skipped (using local policy cache):', dbErr?.message || dbErr);
    }

    const userEvaluation = evaluateUserAuditAccess(user, config);

    return NextResponse.json({
      success: true,
      config,
      userEvaluation,
      isSuperAdmin: user.isSuperAdmin,
    });
  } catch (error: any) {
    console.warn('[API /api/admin/audit-permissions GET]:', error?.message || error);
    return NextResponse.json({
      success: true,
      config: DEFAULT_AUDIT_SECURITY_CONFIG,
      userEvaluation: evaluateUserAuditAccess(
        { uid: 'guest', role: 'membro', isSuperAdmin: false },
        DEFAULT_AUDIT_SECURITY_CONFIG
      ),
      isSuperAdmin: false,
    });
  }
}

/**
 * POST /api/admin/audit-permissions
 * Atualiza as políticas de acesso aos logs de auditoria (Restrito ao Super Administrador).
 */
export async function POST(req: NextRequest) {
  try {
    const authRes = await authenticate(req);
    if ('error' in authRes) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    const { user } = authRes;

    // Strict Super Admin Verification
    if (!user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Apenas Super Administradores podem alterar as políticas de segurança de auditoria.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { rules, defaultNonConfiguredRoles, allowSuperAdminGlobal } = body;

    if (!Array.isArray(rules)) {
      return NextResponse.json(
        { error: 'Formato inválido. "rules" deve ser um array de regras de permissão.' },
        { status: 400 }
      );
    }

    let oldConfig = readLocalPolicy() || DEFAULT_AUDIT_SECURITY_CONFIG;
    try {
      const oldDoc = await adminDb.collection('system_settings').doc('audit_security_policy').get();
      if (oldDoc.exists) oldConfig = oldDoc.data() as any;
    } catch {
      // quiet fallback
    }

    const newConfig: AuditSecurityConfig = {
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
      updatedByEmail: user.email,
      allowSuperAdminGlobal: allowSuperAdminGlobal !== false,
      defaultNonConfiguredRoles: defaultNonConfiguredRoles || 'deny',
      rules,
    };

    writeLocalPolicy(newConfig);

    try {
      await adminDb.collection('system_settings').doc('audit_security_policy').set(newConfig);
    } catch (saveErr: any) {
      console.warn('adminDb audit_security_policy write skipped (saved to local policy store):', saveErr?.message || saveErr);
    }

    // Record this critical security event in Audit Logs
    try {
      await createAuditEntryServer({
        action: 'UPDATE',
        entityType: 'System',
        entityId: 'audit_security_policy',
        entityLabel: 'Políticas de Acesso aos Logs de Auditoria por Cargo',
        oldData: oldConfig,
        newData: newConfig,
        churchId: user.churchId || 'global_system',
        departmentId: 'security',
        source: 'api',
        actorUserId: user.uid,
        actorName: user.name,
        actorEmail: user.email,
        actorRole: 'super_admin',
        metadata: {
          totalRulesConfigured: rules.length,
          allowedRolesCount: rules.filter((r: any) => r.enabled).length,
        },
      });
    } catch (auditErr) {
      console.warn('Could not record security policy change in audit log:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações de segurança atualizadas com sucesso.',
      config: newConfig,
    });
  } catch (error: any) {
    console.warn('[API /api/admin/audit-permissions POST]:', error?.message || error);
    return NextResponse.json(
      { error: 'Falha ao salvar configurações de segurança', details: error.message },
      { status: 500 }
    );
  }
}
