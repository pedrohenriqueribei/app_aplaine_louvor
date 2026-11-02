import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import {
  getEventsStore,
  saveEventToStore,
  deleteEventFromStore,
  EventRecord,
} from '@/lib/eventsStore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agenda/events?churchId=...
 * Returns all agenda events for the specified church or all churches.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const churchId = searchParams.get('churchId');

    let items: EventRecord[] = [];

    // 1. Tentar ler do Firestore via adminDb
    try {
      let q: FirebaseFirestore.Query = adminDb.collection('events');
      if (churchId && churchId.trim() !== '') {
        q = q.where('churchId', '==', churchId);
      }
      const snap = await q.get();
      if (!snap.empty) {
        items = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            churchId: d.churchId || churchId || '',
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
      console.warn('[Agenda Events API] adminDb query notice (using fallback store):', dbErr?.message || dbErr);
    }

    // 2. Se o Firestore adminDb não retornou registros ou falhou, usar o store resiliente
    if (items.length === 0) {
      const allStore = getEventsStore();
      items = churchId && churchId.trim() !== ''
        ? allStore.filter((e) => !e.churchId || e.churchId === churchId || e.churchId === '')
        : allStore;
    }

    // Ordenar cronologicamente por data e horário
    items.sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return (a.time || '').localeCompare(b.time || '');
    });

    return NextResponse.json({ events: items });
  } catch (error: any) {
    console.error('[Agenda Events API] Unexpected error in GET:', error);
    return NextResponse.json({ events: getEventsStore() });
  }
}

/**
 * POST /api/agenda/events
 * Creates a new agenda event
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, date, churchId } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: 'Título e data são obrigatórios' },
        { status: 400 }
      );
    }

    const eventId = body.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const eventRecord: EventRecord = {
      id: eventId,
      churchId: churchId || '',
      title: title.trim(),
      date,
      time: body.time || '',
      endTime: body.endTime || '',
      category: body.category || 'outro',
      location: body.location || '',
      description: body.description || '',
      createdBy: body.createdBy || '',
      createdByName: body.createdByName || '',
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
    console.error('[Agenda Events API] Error creating event:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar evento' }, { status: 500 });
  }
}

/**
 * PUT /api/agenda/events
 * Updates an existing agenda event
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, date } = body;

    if (!id || !title || !date) {
      return NextResponse.json(
        { error: 'ID, título e data são obrigatórios para atualização' },
        { status: 400 }
      );
    }

    const eventRecord: EventRecord = {
      id,
      churchId: body.churchId || '',
      title: title.trim(),
      date,
      time: body.time || '',
      endTime: body.endTime || '',
      category: body.category || 'outro',
      location: body.location || '',
      description: body.description || '',
      createdBy: body.createdBy || '',
      createdByName: body.createdByName || '',
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
    console.error('[Agenda Events API] Error updating event:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar evento' }, { status: 500 });
  }
}

/**
 * DELETE /api/agenda/events?id=...
 * Deletes an event
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do evento é obrigatório' }, { status: 400 });
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
    console.error('[Agenda Events API] Error deleting event:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir evento' }, { status: 500 });
  }
}
