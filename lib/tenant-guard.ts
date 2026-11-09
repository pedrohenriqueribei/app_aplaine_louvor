import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export interface TenantUser {
  uid: string;
  email?: string;
  name?: string;
  churchId: string;
  role?: string;
  isSuperAdmin: boolean;
  status: 'active' | 'inactive';
  roles?: {
    worship?: string[];
    multimedia?: string[];
    secretariat?: string[];
    dance?: string[];
    [key: string]: any;
  };
}

export class TenantAuthError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'TenantAuthError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Valida a autenticação e extrai o vínculo de tenant (igreja_id / churchId) do usuário.
 * 
 * Regras aplicadas:
 * 1. Rejeita requisições sem token de autorização Bearer válido (401 Unauthorized).
 * 2. Bloqueia usuários inativos (403 Forbidden).
 * 3. Bloqueia Usuários Órfãos (churchId IS NULL ou vazio) de acessar recursos de igreja (403 Forbidden).
 */
export async function requireTenantAuth(
  req: NextRequest,
  options?: {
    allowOrphanForProfileSetup?: boolean;
    requiredLeadership?: boolean;
  }
): Promise<TenantUser> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new TenantAuthError(
      401,
      'UNAUTHORIZED',
      'Token de autenticação não fornecido no cabeçalho Authorization.'
    );
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    throw new TenantAuthError(401, 'INVALID_TOKEN', 'Token Bearer malformado ou vazio.');
  }

  let decodedToken: any;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (err: any) {
    throw new TenantAuthError(
      401,
      'TOKEN_EXPIRED_OR_INVALID',
      `Falha na validação do token JWT: ${err?.message || 'Token inválido'}`
    );
  }

  const uid = decodedToken.uid;
  const tokenEmail = decodedToken.email || '';
  const isSuperAdminEmail = tokenEmail === 'pedrohenriqueribei@gmail.com';
  const hasSuperAdminClaim = decodedToken.super_admin === true;

  // 1. Buscar registro do usuário no Firestore adminDb
  let userData: any = null;
  try {
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (userDoc.exists) {
      userData = userDoc.data();
    }
  } catch (dbErr: any) {
    console.warn(`[tenant-guard] Falha ao ler users/${uid}:`, dbErr?.message || dbErr);
  }

  const isSuperAdmin = Boolean(
    isSuperAdminEmail ||
    hasSuperAdminClaim ||
    userData?.role === 'super_admin' ||
    userData?.super_admin === true
  );

  const churchId = String(userData?.churchId || decodedToken.churchId || decodedToken.igreja_id || '').trim();
  const status = (userData?.status || 'active') as 'active' | 'inactive';

  if (status === 'inactive') {
    throw new TenantAuthError(
      403,
      'ACCOUNT_INACTIVE',
      'Conta de usuário inativa ou suspensa. Contate a liderança.'
    );
  }

  // REGRA: Sem Acesso Global/Órfão
  if (!churchId && !isSuperAdmin && !options?.allowOrphanForProfileSetup) {
    throw new TenantAuthError(
      403,
      'ORPHAN_USER_BLOCKED',
      'Isolamento Estrito: Usuário sem vínculo ativo com nenhuma igreja (churchId IS NULL). Acesso negado a dados congregais.'
    );
  }

  const tenantUser: TenantUser = {
    uid,
    email: userData?.email || tokenEmail,
    name: userData?.name || decodedToken.name,
    churchId,
    role: userData?.role || 'membro',
    isSuperAdmin,
    status,
    roles: userData?.roles || {},
  };

  if (options?.requiredLeadership && !isSuperAdmin) {
    const isPastor = ['pastor', 'pastor_titular', 'pastor_auxiliar', 'líder'].includes(tenantUser.role || '');
    const isDeptLeader = Object.values(tenantUser.roles || {}).some(
      (deptRoles: any) => Array.isArray(deptRoles) && deptRoles.some((r: string) => r.includes('leader') || r.includes('lider'))
    );

    if (!isPastor && !isDeptLeader) {
      throw new TenantAuthError(
        403,
        'INSUFFICIENT_PERMISSIONS',
        'Operação restrita à liderança pastoral ou departamental da igreja.'
      );
    }
  }

  return tenantUser;
}

/**
 * Valida o isolamento de tenant estrito entre o recurso solicitado e o usuário autenticado.
 * Impede vazamentos cross-tenant e adulteração de parâmetros de URL ou corpo de requisição.
 */
export function validateTenantAccess(
  requestedChurchId: string | null | undefined,
  user: TenantUser
): void {
  // Super Admin tem permissão de supervisão multi-tenant
  if (user.isSuperAdmin) {
    return;
  }

  const targetChurchId = String(requestedChurchId || '').trim();

  // 1. Usuário órfão não tem acesso a nenhuma igreja
  if (!user.churchId) {
    throw new TenantAuthError(
      403,
      'ORPHAN_ACCESS_DENIED',
      'Acesso bloqueado: Usuário sem congregação ativa vinculada não pode manipular dados de igreja.'
    );
  }

  // 2. Bloqueio Cross-Tenant: Proibido acessar outra igreja diferente da do usuário
  if (targetChurchId && targetChurchId !== user.churchId) {
    throw new TenantAuthError(
      403,
      'CROSS_TENANT_VIOLATION',
      `Bloqueio Cross-Tenant: Tentativa de leitura ou gravação na igreja '${targetChurchId}', enquanto sua sessão pertence exclusivamente à igreja '${user.churchId}'.`
    );
  }
}

/**
 * Sanitiza o payload garantindo que churchId / igreja_id seja forçado para o tenant do usuário.
 */
export function enforceTenantPayload<T extends Record<string, any>>(
  payload: T,
  user: TenantUser
): T {
  if (user.isSuperAdmin && payload.churchId) {
    return payload;
  }
  return {
    ...payload,
    churchId: user.churchId,
    igreja_id: user.churchId,
  };
}

/**
 * Helper de alto nível para proteger rotas Next.js App Router (app/api/...)
 */
export function withTenantGuard(
  handler: (req: NextRequest, tenant: TenantUser) => Promise<NextResponse>,
  options?: {
    allowOrphanForProfileSetup?: boolean;
    requiredLeadership?: boolean;
  }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const tenant = await requireTenantAuth(req, options);
      return await handler(req, tenant);
    } catch (err: any) {
      if (err instanceof TenantAuthError) {
        return NextResponse.json(
          {
            error: err.message,
            code: err.code,
            status: err.status,
            securityRule: 'Strict Multi-Tenant Isolation',
          },
          { status: err.status }
        );
      }
      console.error('[TenantGuard] Erro interno:', err);
      return NextResponse.json(
        { error: 'Erro interno ao validar isolamento de igreja.', details: err?.message || err },
        { status: 500 }
      );
    }
  };
}
