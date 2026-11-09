import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import {
  getEventsStore,
  saveEventToStore,
  deleteEventFromStore,
  EventRecord,
} from '@/lib/eventsStore';
import {
  requireTenantAuth,
  validateTenantAccess,
  enforceTenantPayload,
  TenantAuthError,
} from '@/lib/tenant-guard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agenda/events?churchId=...
 * Retorna os eventos da congregação do usuário autenticado.
 * Aplica ISOLAMENTO ESTRITO: Rejeita usuários órfãos e bloqueia acessos cross-tenant.
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

    let items: EventRecord[] = [];

    // 1. Ler estritamente filtrado por churchId no Firestore adminDb
    try {
      const q = adminDb.collection('events').where('churchId', '==', activeChurchId);
      const snap = await q.get();
      if (!snap.empty) {
        items = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            churchId: d.churchId || activeChurchId,
            title: d.title || 'Evento',
            date: d.date || '',
            time: d.time || '',
            endTime: d.endTime || '',
            category: d.category || 'outro',
            location: d.location || '',
            description: d.description || '',
            createdBy: d.createdBy || '',
            createdByName: d.createdByName || '',
            createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : String(d.createdAt || new Date().toISOString()),
            updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : (d.updatedAt ? String(d.updatedAt) : undefined),
          } as EventRecord;
        });
      }
    } catch (dbErr: any) {
      console.warn('[Agenda Events API] adminDb query notice (using isolated fallback):', dbErr?.message || dbErr);
    }

    // 2. Se vazio, usar store em memória estritamente filtrado pelo tenant
    if (items.length === 0) {
      const allStore = getEventsStore();
      items = allStore.filter((e) => e.churchId === activeChurchId);
    }

    // Ordenar cronologicamente por data e horário
    items.sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return (a.time || '').localeCompare(b.time || '');
    });

    return NextResponse.json({ events: items, tenantChurchId: activeChurchId });
  } catch (error: any) {
    if (error instanceof TenantAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('[Agenda Events API] Unexpected error in GET:', error);
    return NextResponse.json({ error: 'Erro ao consultar eventos da igreja.' }, { status: 500 });
  }
}

/**
 * POST /api/agenda/events
 * Criação de evento com tenant garantido pela sessão autenticada.
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await requireTenantAuth(req);
    const body = await req.json();
    const { title, date } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: 'Título e data são obrigatórios' },
        { status: 400 }
      );
    }

    // Bloqueio Cross-Tenant: impede criar evento forjando outra igreja no payload
    validateTenantAccess(body.churchId, tenant);

    const safePayload = enforceTenantPayload(body, tenant);
    const eventId = body.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const eventRecord: EventRecord = {
      id: eventId,
      churchId: safePayload.churchId,
      title: title.trim(),
      date,
      time: body.time || '',
      endTime: body.endTime || '',
      category: body.category || 'outro',
      location: body.location || '',
      description: body.description || '',
      createdBy: tenant.uid,
      createdByName: tenant.name || body.createdByName || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Salvar no Firestore via adminDb
    try {
      await adminDb.collection('events').doc(eventId).set({
        ...eventRecord,
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
    } catch (dbErr: any) {
      console.warn('[Agenda Events API] adminDb write notice:', dbErr?.message || dbErr);
    }

    // 2. Salvar no store em memória / cache resiliente
    saveEventToStore(eventRecord);

    return NextResponse.json({ success: true, event: eventRecord });
  } catch (error: any) {
    if (error instanceof TenantAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('[Agenda Events API] Error creating event:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar evento' }, { status: 500 });
  }
}

/**
 * PUT /api/agenda/events
 * Atualiza um evento garantindo isolamento da igreja dona do registro.
 */
export async function PUT(req: NextRequest) {
  try {
    const tenant = await requireTenantAuth(req);
    const body = await req.json();
    const { id, title, date } = body;

    if (!id || !title || !date) {
      return NextResponse.json(
        { error: 'ID, título e data são obrigatórios para atualização' },
        { status: 400 }
      );
    }

    // Verificar se o evento pertence à igreja do usuário
    try {
      const existingSnap = await adminDb.collection('events').doc(id).get();
      if (existingSnap.exists) {
        const existingData = existingSnap.data();
        if (existingData?.churchId && !tenant.isSuperAdmin && existingData.churchId !== tenant.churchId) {
          throw new TenantAuthError(
            403,
            'CROSS_TENANT_VIOLATION',
            'Tentativa de atualizar evento pertencente a outra congregação foi bloqueada.'
          );
        }
      }
    } catch (checkErr: any) {
      if (checkErr instanceof TenantAuthError) throw checkErr;
    }

    validateTenantAccess(body.churchId, tenant);
    const safePayload = enforceTenantPayload(body, tenant);

    const eventRecord: EventRecord = {
      id,
      churchId: safePayload.churchId,
      title: title.trim(),
      date,
      time: body.time || '',
      endTime: body.endTime || '',
      category: body.category || 'outro',
      location: body.location || '',
      description: body.description || '',
      createdBy: body.createdBy || tenant.uid,
      createdByName: body.createdByName || tenant.name || '',
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Atualizar no Firestore via adminDb
    try {
      await adminDb.collection('events').doc(id).set({
        ...eventRecord,
        updatedAt: new Date(),
      }, { merge: true });
    } catch (dbErr: any) {
      console.warn('[Agenda Events API] adminDb update notice:', dbErr?.message || dbErr);
    }

    // 2. Atualizar no store resiliente
    saveEventToStore(eventRecord);

    return NextResponse.json({ success: true, event: eventRecord });
  } catch (error: any) {
    if (error instanceof TenantAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('[Agenda Events API] Error updating event:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar evento' }, { status: 500 });
  }
}

/**
 * DELETE /api/agenda/events?id=...
 * Exclui um evento garantindo isolamento da congregação.
 */
export async function DELETE(req: NextRequest) {
  try {
    const tenant = await requireTenantAuth(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do evento é obrigatório' }, { status: 400 });
    }

    // Verificar posse do registro por tenancy
    try {
      const existingSnap = await adminDb.collection('events').doc(id).get();
      if (existingSnap.exists) {
        const existingData = existingSnap.data();
        if (existingData?.churchId && !tenant.isSuperAdmin && existingData.churchId !== tenant.churchId) {
          throw new TenantAuthError(
            403,
            'CROSS_TENANT_VIOLATION',
            'Tentativa de excluir evento pertencente a outra congregação foi bloqueada.'
          );
        }
      }
    } catch (checkErr: any) {
      if (checkErr instanceof TenantAuthError) throw checkErr;
    }

    // 1. Excluir no Firestore via adminDb
    try {
      await adminDb.collection('events').doc(id).delete();
    } catch (dbErr: any) {
      console.warn('[Agenda Events API] adminDb delete notice:', dbErr?.message || dbErr);
    }

    // 2. Excluir no store resiliente
    deleteEventFromStore(id);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    if (error instanceof TenantAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('[Agenda Events API] Error deleting event:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir evento' }, { status: 500 });
  }
}
