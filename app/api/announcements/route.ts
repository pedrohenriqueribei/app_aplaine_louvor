import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import {
  getAnnouncementsStore,
  saveAnnouncementToStore,
  deleteAnnouncementFromStore,
  AnnouncementRecord,
} from '@/lib/announcementsStore';
import {
  requireTenantAuth,
  validateTenantAccess,
  enforceTenantPayload,
  TenantAuthError,
} from '@/lib/tenant-guard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/announcements?churchId=...
 * Lista comunicados ativos estritamente da congregação do usuário.
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenantAuth(req);
    const { searchParams } = new URL(req.url);
    const requestedChurchId = searchParams.get('churchId');

    // Validação de isolamento: usuário não pode acessar congregação diferente da sua
    validateTenantAccess(requestedChurchId, tenant);

    const activeChurchId = tenant.isSuperAdmin && requestedChurchId
      ? requestedChurchId
      : tenant.churchId;

    let items: any[] = [];

    // 1. Ler Firestore adminDb com filtro estrito por churchId
    try {
      const query = adminDb.collection('announcements').where('churchId', '==', activeChurchId);
      const snap = await query.get();
      if (!snap.empty) {
        items = snap.docs.map((doc) => doc.data());
      }
    } catch (dbErr: any) {
      console.warn('[Announcements API] adminDb query notice (using isolated fallback):', dbErr?.message || dbErr);
    }

    // 2. Se vazio, usar fallback store estritamente filtrado pelo tenant
    if (items.length === 0) {
      const allStore = getAnnouncementsStore();
      items = allStore.filter((a) => a.churchId === activeChurchId);
    }

    // Ordenar: fixados primeiro, depois mais recentes
    items.sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return NextResponse.json({ announcements: items, tenantChurchId: activeChurchId });
  } catch (error: any) {
    if (error instanceof TenantAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.warn('[Announcements API] Unexpected fetch error:', error?.message || error);
    return NextResponse.json({ error: 'Erro ao consultar comunicados.' }, { status: 500 });
  }
}

/**
 * POST /api/announcements
 * Liderança cria comunicado estritamente na congregação associada.
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await requireTenantAuth(req, { requiredLeadership: true });
    const body = await req.json();
    const {
      id,
      title,
      content,
      category = 'Geral',
      isPinned = false,
      targetAudience = 'Todos os Membros',
    } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Título e conteúdo são obrigatórios' }, { status: 400 });
    }

    // Bloqueio Cross-Tenant
    validateTenantAccess(body.churchId, tenant);
    const safePayload = enforceTenantPayload(body, tenant);

    const announcementId = id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const record: AnnouncementRecord = {
      id: announcementId,
      title: title.trim(),
      content: content.trim(),
      category: category || 'Geral',
      churchId: safePayload.churchId,
      authorId: tenant.uid,
      authorName: tenant.name || 'Liderança',
      authorRole: tenant.role || 'Líder Ministerial',
      authorPhotoURL: body.authorPhotoURL || null,
      isPinned: Boolean(isPinned),
      targetAudience: targetAudience || 'Todos os Membros',
      createdAt: body.createdAt || nowIso,
      updatedAt: nowIso,
    };

    // 1. Salvar no store em memória / cache
    saveAnnouncementToStore(record);

    // 2. Persistir no Firestore adminDb
    try {
      await adminDb.collection('announcements').doc(announcementId).set(record, { merge: true });
    } catch (saveErr: any) {
      console.warn('[Announcements API] adminDb save notice:', saveErr?.message || saveErr);
    }

    return NextResponse.json({ success: true, announcement: record });
  } catch (error: any) {
    if (error instanceof TenantAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.warn('[Announcements API] Error saving announcement:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Failed to save' }, { status: 500 });
  }
}

/**
 * DELETE /api/announcements?id=...
 * Exclui comunicado verificando posse pelo tenant.
 */
export async function DELETE(req: NextRequest) {
  try {
    const tenant = await requireTenantAuth(req, { requiredLeadership: true });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Validar propriedade do comunicado
    try {
      const existingSnap = await adminDb.collection('announcements').doc(id).get();
      if (existingSnap.exists) {
        const existingData = existingSnap.data();
        if (existingData?.churchId && !tenant.isSuperAdmin && existingData.churchId !== tenant.churchId) {
          throw new TenantAuthError(
            403,
            'CROSS_TENANT_VIOLATION',
            'Tentativa de excluir comunicado de outra congregação foi bloqueada.'
          );
        }
      }
    } catch (checkErr: any) {
      if (checkErr instanceof TenantAuthError) throw checkErr;
    }

    // 1. Remover do store resiliente
    deleteAnnouncementFromStore(id);

    // 2. Remover do Firestore adminDb
    try {
      await adminDb.collection('announcements').doc(id).delete();
    } catch (deleteErr: any) {
      console.warn('[Announcements API] adminDb delete notice:', deleteErr?.message || deleteErr);
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    if (error instanceof TenantAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.warn('[Announcements API] Error deleting announcement:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Failed to delete' }, { status: 500 });
  }
}
