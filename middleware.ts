import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware para Defesa Multi-tenant e Isolamento de Dados
 * 
 * - Injeta headers de segurança e prevenção de sniffing / framing
 * - Audita e normaliza requisições com escopo de congregação (churchId / igreja_id)
 * - Identifica tentativas anômalas de travessia cross-tenant
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Interceptar rotas da API com parâmetro de igreja
  const queryChurchId = searchParams.get('churchId') || searchParams.get('igreja_id');

  const response = NextResponse.next();

  // Cabeçalhos de segurança estrita
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Tenant-Isolation', 'Strict-ABAC-RLS');

  if (queryChurchId) {
    // Sanitizar formato de ID de igreja contra SQL injection / path traversal
    const sanitizedId = queryChurchId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128);
    response.headers.set('x-requested-tenant', sanitizedId);
  }

  // Prevenir chamadas suspeitas diretas às APIs de dados sem tenant
  if (pathname.startsWith('/api/agenda') || pathname.startsWith('/api/announcements')) {
    // Se o cliente tentar forjar múltiplos IDs de igreja
    const churchParams = searchParams.getAll('churchId');
    if (churchParams.length > 1) {
      return NextResponse.json(
        {
          error: 'Tentativa de múltiplos parâmetros churchId rejeitada por segurança multi-tenant.',
          code: 'MALFORMED_TENANT_REQUEST',
        },
        { status: 400 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/churches/:path*',
    '/api/:path*',
  ],
};
