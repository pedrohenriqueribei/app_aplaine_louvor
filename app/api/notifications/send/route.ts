import { NextRequest, NextResponse } from 'next/server';
import { adminMessaging, adminDb, adminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const MAX_RECIPIENTS = 500;

async function resolveRecipientTokens(callerUid: string, isSuperAdmin: boolean, userIds: string[]) {
  const callerSnap = await adminDb.collection('users').doc(callerUid).get();
  const callerChurchId = callerSnap.exists ? (callerSnap.data()?.churchId ?? '') : '';

  if (!isSuperAdmin && !callerChurchId) {
    return { tokens: [], skipped: userIds.length };
  }

  const uniqueIds = [...new Set(userIds)].slice(0, MAX_RECIPIENTS);
  const refs = uniqueIds.map((uid) => adminDb.collection('users').doc(uid));
  const snaps = await adminDb.getAll(...refs);

  const tokens: string[] = [];
  let skipped = 0;

  for (const snap of snaps) {
    const data = snap.exists ? snap.data() : null;
    if (!data) {
      skipped++;
      continue;
    }
    if (!isSuperAdmin && data.churchId !== callerChurchId) {
      skipped++;
      continue;
    }
    if (Array.isArray(data.fcmTokens)) {
      tokens.push(...data.fcmTokens.filter((t: unknown) => typeof t === 'string' && t.length > 0));
    }
  }

  return { tokens: [...new Set(tokens)], skipped };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    const { title, body, userIds } = await req.json();

    if (typeof title !== 'string' || !title.trim() || typeof body !== 'string' || !body.trim()) {
      return NextResponse.json({ error: 'Título e corpo são obrigatórios.' }, { status: 400 });
    }

    if (!Array.isArray(userIds) || userIds.some((id) => typeof id !== 'string')) {
      return NextResponse.json({ error: 'userIds deve ser uma lista de IDs.' }, { status: 400 });
    }

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, successCount: 0, failureCount: 0, skipped: 0 });
    }

    const { tokens, skipped } = await resolveRecipientTokens(
      decodedToken.uid,
      decodedToken.super_admin === true,
      userIds
    );

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, successCount: 0, failureCount: 0, skipped });
    }

    try {
      const response = await adminMessaging.sendEachForMulticast({
        tokens,
        notification: {
          title: title.slice(0, 200),
          body: body.slice(0, 1000)
        },
        webpush: {
          fcmOptions: {
            link: '/dashboard'
          }
        }
      });

      return NextResponse.json({
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        skipped
      });
    } catch (fcmError: any) {
      const errMsg = fcmError instanceof Error ? fcmError.message : String(fcmError);
      const isPermissionDenied = errMsg.includes('PERMISSION_DENIED') ||
                                 fcmError.code === 'messaging/permission-denied';

      if (isPermissionDenied) {
        console.warn('FCM permission denied. Enable the Cloud Messaging API and grant the service account access.', errMsg);
        return NextResponse.json({
          success: false,
          error: 'FCM_PERMISSION_DENIED',
          message: 'A API do Firebase Cloud Messaging não está habilitada ou a service account não tem permissão.'
        }, { status: 503 });
      }

      throw fcmError;
    }

  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: 'Falha ao enviar notificação.' }, { status: 500 });
  }
}
