import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import {
  createAuditEntryServer,
  queryAuditLogsServer,
} from '@/lib/audit-service';
import { AuditAction } from '@/lib/audit-types';
import {
  DEFAULT_AUDIT_SECURITY_CONFIG,
  evaluateUserAuditAccess,
} from '@/lib/audit-security';
import {
  extractClientIp,
  resolveIpLocation,
  evaluateLeadershipSecurity,
} from '@/lib/geo-ip';

export const dynamic = 'force-dynamic';

async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Não autenticado. Token não fornecido.', status: 401 };
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Check if user is super_admin
    const isOwnerEmail = decodedToken.email === 'pedrohenriqueribei@gmail.com';
    const hasSuperAdminClaim = decodedToken.super_admin === true;

    // Fetch user doc to get accurate role, roles, and churchId
    let userRole = 'membro';
    let userChurchId = '';
    let userName = decodedToken.name || 'Usuário';
    let userRoles: any = {};
    let isLeader = false;

    try {
      const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();
      if (userSnap.exists) {
        const uData = userSnap.data();
        userRole = uData?.role || 'membro';
        userChurchId = uData?.churchId || '';
        userName = uData?.name || userName;
        userRoles = uData?.roles || {};

        if (
          userRole === 'líder' ||
          userRole === 'super_admin' ||
          uData?.roles?.worship?.length ||
          uData?.roles?.multimedia?.length ||
          uData?.roles?.dance?.length ||
          uData?.roles?.secretariat?.length
        ) {
          isLeader = true;
        }
      }
    } catch (e: any) {
      console.warn('[Audit API] adminDb user lookup unavailable, using token context:', e?.message || e);
    }

    const isSuperAdmin = Boolean(hasSuperAdminClaim || isOwnerEmail || userRole === 'super_admin');

    return {
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        name: userName,
        role: userRole,
        roles: userRoles,
        churchId: userChurchId,
        isSuperAdmin,
        isLeader,
      },
    };
  } catch (err: any) {
    return { error: 'Token de autenticação inválido ou expirado.', status: 401 };
  }
}

/**
 * GET /api/audit
 * Fetches audit logs with security validation and data isolation.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;
    const { searchParams } = new URL(req.url);

    const requestedChurchId = searchParams.get('churchId');
    const action = searchParams.get('action') as AuditAction | null;
    const entityType = searchParams.get('entityType') || undefined;
    const requestedDepartmentId = searchParams.get('departmentId') || undefined;
    const actorUserId = searchParams.get('actorUserId') || undefined;
    const search = searchParams.get('search') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    // Load active Security Policy
    let securityConfig = DEFAULT_AUDIT_SECURITY_CONFIG;
    try {
      const policyDoc = await adminDb.collection('system_settings').doc('audit_security_policy').get();
      if (policyDoc.exists) {
        const policyData = policyDoc.data() as any;
        securityConfig = {
          ...DEFAULT_AUDIT_SECURITY_CONFIG,
          ...policyData,
          rules: Array.isArray(policyData.rules) && policyData.rules.length > 0 ? policyData.rules : DEFAULT_AUDIT_SECURITY_CONFIG.rules,
        };
      }
    } catch (policyErr: any) {
      console.warn('[Audit API] Security policy lookup in adminDb unavailable, using defaults:', policyErr?.message || policyErr);
    }

    // Evaluate user access based on role & configured policies
    const evaluation = evaluateUserAuditAccess(user, securityConfig);

    if (!evaluation.canAccess) {
      return NextResponse.json(
        {
          error: evaluation.restrictionReason || 'Acesso negado aos logs de auditoria para o cargo atual.',
          userEvaluation: evaluation,
        },
        { status: 403 }
      );
    }

    // Strict Data Isolation Check:
    // If user is not super_admin, they can ONLY view logs of their own church
    let targetChurchId = user.churchId;
    if (user.isSuperAdmin && requestedChurchId) {
      targetChurchId = requestedChurchId;
    } else if (!user.isSuperAdmin && requestedChurchId && requestedChurchId !== user.churchId) {
      return NextResponse.json(
        { error: 'Acesso negado. Você não tem permissão para visualizar logs de outra igreja.' },
        { status: 403 }
      );
    }

    // Departmental Scope Isolation:
    // If user's scope is 'department' (e.g. Dance Leader), strictly enforce departmental restriction.
    let effectiveDepartmentId = requestedDepartmentId;
    let forcedDepartmentId: string | undefined = undefined;

    if (evaluation.scope === 'department' && evaluation.forcedDepartmentId) {
      forcedDepartmentId = evaluation.forcedDepartmentId;

      // If client attempts to query a different department, reject
      if (
        requestedDepartmentId &&
        requestedDepartmentId !== 'all' &&
        !evaluation.allowedDepartmentAliases.includes(requestedDepartmentId.toLowerCase()) &&
        requestedDepartmentId.toLowerCase() !== evaluation.forcedDepartmentId.toLowerCase()
      ) {
        return NextResponse.json(
          {
            error: `Acesso negado: seu cargo (${evaluation.roleTitle}) tem permissão restrita exclusivamente ao departamento ${evaluation.forcedDepartmentId}.`,
            userEvaluation: evaluation,
          },
          { status: 403 }
        );
      }

      effectiveDepartmentId = evaluation.forcedDepartmentId;
    }

    const logs = await queryAuditLogsServer({
      churchId: targetChurchId,
      isSuperAdmin: user.isSuperAdmin,
      action: action || undefined,
      entityType,
      departmentId: effectiveDepartmentId,
      actorUserId,
      search,
      startDate,
      endDate,
      limit,
      forcedDepartmentId,
      allowedDepartmentAliases: evaluation.allowedDepartmentAliases,
      allowedEntityTypes: evaluation.allowedEntityTypes,
    });

    return NextResponse.json({
      success: true,
      churchId: targetChurchId,
      total: logs.length,
      userEvaluation: evaluation,
      logs,
    });
  } catch (error: any) {
    console.warn('[API /api/audit GET Error]:', error?.message || error);
    return NextResponse.json(
      { error: 'Erro ao buscar registros de auditoria.', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audit
 * Securely writes an audit log entry on the backend.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;
    const body = await req.json();

    const {
      action,
      entityType,
      entityId,
      entityLabel,
      oldData,
      newData,
      churchId: bodyChurchId,
      departmentId,
      correlationId,
      source = 'api',
      metadata,
    } = body;

    if (!action || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: action, entityType, entityId.' },
        { status: 400 }
      );
    }

    const churchId = bodyChurchId || user.churchId;
    if (!churchId) {
      return NextResponse.json(
        { error: 'church_id é obrigatório para registrar auditoria.' },
        { status: 400 }
      );
    }

    // Tenant check: User must belong to church unless super admin or leader or user without linked church
    if (!user.isSuperAdmin && !user.isLeader && user.churchId && churchId !== user.churchId) {
      return NextResponse.json(
        { error: 'Acesso negado. Ação não autorizada para esta igreja.' },
        { status: 403 }
      );
    }

    // Extract real client IP and user agent
    const clientIp = extractClientIp(req.headers) || body.ipAddress || null;
    const userAgent = req.headers.get('user-agent') || body.userAgent || null;

    // Resolve approximate geolocation
    const { location, geoSummary } = await resolveIpLocation(clientIp, req.headers);

    // Evaluate leadership security assessment to flag suspicious accesses
    const securityAssessment = evaluateLeadershipSecurity(
      user.role,
      user.email,
      location,
      clientIp
    );

    const entry = await createAuditEntryServer({
      action,
      entityType,
      entityId,
      entityLabel: entityLabel || entityId,
      oldData,
      newData,
      churchId,
      departmentId,
      correlationId,
      source,
      actorUserId: user.uid,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role,
      ipAddress: clientIp,
      userAgent,
      location,
      geoSummary,
      securityAssessment,
      metadata,
    });

    if (!entry) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Nenhum campo modificado detectado. Log não gerado de acordo com a política de auditoria.',
      });
    }

    return NextResponse.json({
      success: true,
      id: entry.id,
      entry,
    });
  } catch (error: any) {
    console.warn('[API /api/audit POST Error]:', error?.message || error);
    return NextResponse.json(
      { error: 'Falha ao processar evento de auditoria.', details: error.message },
      { status: 500 }
    );
  }
}
