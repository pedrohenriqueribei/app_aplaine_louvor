import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import {
  getAnnouncementsStore,
  saveAnnouncementToStore,
  deleteAnnouncementFromStore,
  AnnouncementRecord,
} from '@/lib/announcementsStore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/announcements?churchId=...
 * Lists all active announcements for the church
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const churchId = searchParams.get('churchId');

    let items: any[] = [];

    // 1. Attempt Firestore adminDb
    try {
      let query: FirebaseFirestore.Query = adminDb.collection('announcements');
      if (churchId) {
        query = query.where('churchId', '==', churchId);
      }
      const snap = await query.get();
      if (!snap.empty) {
        items = snap.docs.map((doc) => doc.data());
      }
    } catch (dbErr: any) {
      console.warn('[Announcements API] adminDb query skipped (using fallback store):', dbErr?.message || dbErr);
    }

    // 2. If Firestore adminDb returned nothing or was unauthorized, serve from resilient store
    if (items.length === 0) {
      const allStore = getAnnouncementsStore();
      items = churchId
        ? allStore.filter((a) => !a.churchId || a.churchId === churchId || a.churchId === 'church')
        : allStore;
    }

    // Sort pinned first, then newest first
    items.sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return NextResponse.json({ announcements: items });
  } catch (error: any) {
    console.warn('[Announcements API] Unexpected fetch error, serving defaults:', error?.message || error);
    return NextResponse.json({ announcements: getAnnouncementsStore() });
  }
}

/**
 * POST /api/announcements
 * Leadership creates or updates an announcement
 */
export async function POST(req: NextRequest) {
  try {
    let uid = 'unknown';
    let authorName = 'Liderança';
    let authorRole = 'Líder Ministerial';
    let authorPhotoURL = null;

    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        uid = decodedToken.uid;
        authorName = decodedToken.name || decodedToken.email?.split('@')[0] || authorName;
        authorPhotoURL = decodedToken.picture || null;
      } catch (authErr) {
        console.warn('[Announcements API] verifyIdToken skipped (using payload identity):', authErr);
      }
    }

    const body = await req.json();
    const {
      id,
      title,
      content,
      category = 'Geral',
      churchId,
      isPinned = false,
      targetAudience = 'Todos os Membros',
    } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Título e conteúdo são obrigatórios' }, { status: 400 });
    }

    const announcementId = id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const record: AnnouncementRecord = {
      id: announcementId,
      title: title.trim(),
      content: content.trim(),
      category: category || 'Geral',
      churchId: churchId || '',
      authorId: body.authorId || uid,
      authorName: body.authorName || authorName,
      authorRole: body.authorRole || authorRole,
      authorPhotoURL: body.authorPhotoURL || authorPhotoURL,
      isPinned: Boolean(isPinned),
      targetAudience: targetAudience || 'Todos os Membros',
      createdAt: body.createdAt || nowIso,
      updatedAt: nowIso,
    };

    // 1. Save to resilient server store
    saveAnnouncementToStore(record);

    // 2. Safely attempt to persist to Firestore adminDb
    try {
      await adminDb.collection('announcements').doc(announcementId).set(record, { merge: true });
    } catch (saveErr: any) {
      console.warn('[Announcements API] adminDb save skipped (persisted to server store):', saveErr?.message || saveErr);
    }

    return NextResponse.json({ success: true, announcement: record });
  } catch (error: any) {
    console.warn('[Announcements API] Error saving announcement:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Failed to save' }, { status: 500 });
  }
}

/**
 * DELETE /api/announcements?id=...
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
      await adminAuth.verifyIdToken(token);
    } catch (authErr) {
      console.warn('[Announcements API] verifyIdToken skipped on delete:', authErr);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // 1. Remove from resilient server store
    deleteAnnouncementFromStore(id);

    // 2. Safely attempt to remove from Firestore adminDb
    try {
      await adminDb.collection('announcements').doc(id).delete();
    } catch (deleteErr: any) {
      console.warn('[Announcements API] adminDb delete skipped (removed from server store):', deleteErr?.message || deleteErr);
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.warn('[Announcements API] Error deleting announcement:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Failed to delete' }, { status: 500 });
  }
}
