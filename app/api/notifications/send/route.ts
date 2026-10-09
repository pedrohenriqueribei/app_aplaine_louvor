import { NextRequest, NextResponse } from 'next/server';
import { adminMessaging, adminDb, adminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const MAX_RECIPIENTS = 500;

async function resolveRecipientTokens(
  callerUid: string,
  isSuperAdmin: boolean,
  userIds: string[],
  clientTokens?: string[]
): Promise<{ tokens: string[]; skipped: number }> {
  const providedTokens = Array.isArray(clientTokens)
    ? clientTokens.filter((t): t is string => typeof t === 'string' && t.length > 0)
    : [];

  let dbTokens: string[] = [];
  let skipped = 0;

  try {
    const callerSnap = await adminDb.collection('users').doc(callerUid).get();
    const callerChurchId = callerSnap.exists ? (callerSnap.data()?.churchId ?? '') : '';

    if (!isSuperAdmin && !callerChurchId) {
      return { tokens: [...new Set(providedTokens)], skipped: userIds.length };
    }

    const uniqueIds = [...new Set(userIds)].slice(0, MAX_RECIPIENTS);
    const refs = uniqueIds.map((uid) => adminDb.collection('users').doc(uid));
    const snaps = await adminDb.getAll(...refs);

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
        dbTokens.push(...data.fcmTokens.filter((t: unknown) => typeof t === 'string' && t.length > 0));
      }
    }
  } catch (dbErr: any) {
    const errMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    console.warn('adminDb lookup skipped in push dispatch (server IAM/credential restriction):', errMsg);
  }

  const allTokens = [...new Set([...providedTokens, ...dbTokens])];
  return { tokens: allTokens, skipped };
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

    const { title, body, userIds, tokens: clientTokens } = await req.json();

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
      userIds,
      clientTokens
    );

    if (tokens.length === 0) {
      return NextResponse.json({
        success: true,
        successCount: 0,
        failureCount: 0,
        skipped,
        message: 'Notificações registradas. Nenhum token FCM registrado para os destinatários.'
      });
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
                                 errMsg.includes('Missing or insufficient permissions') ||
                                 errMsg.includes('7') ||
                                 fcmError.code === 'messaging/permission-denied';
      const isCredentialError = errMsg.includes('ENOENT') ||
                                errMsg.includes('credential') ||
                                errMsg.includes('Could not load the default credentials');

      if (isPermissionDenied || isCredentialError) {
        console.warn('FCM push dispatch info (notificações salvas internamente no app):', errMsg);
        return NextResponse.json({
          success: false,
          error: isCredentialError ? 'FCM_CREDENTIALS_UNAVAILABLE' : 'FCM_PERMISSION_DENIED',
          message: 'Notificações salvas internamente no aplicativo. O envio de push externo via FCM requer credenciais de conta de serviço no ambiente do servidor.',
          inAppDelivered: true,
          skipped
        }, { status: 200 });
      }

      throw fcmError;
    }

  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const isPermissionDenied = errMsg.includes('PERMISSION_DENIED') || errMsg.includes('Missing or insufficient permissions');

    if (isPermissionDenied) {
      console.warn('FCM dispatch warning (notificações salvas no app):', errMsg);
      return NextResponse.json({
        success: false,
        error: 'PERMISSION_DENIED',
        message: 'Notificações salvas internamente no aplicativo. O envio de push externo requer credenciais de conta de serviço do Firebase Admin.',
        inAppDelivered: true
      }, { status: 200 });
    }

    console.error('Error sending push notification:', error);
    return NextResponse.json({
      error: 'Falha ao processar envio de notificações.',
      details: errMsg
    }, { status: 500 });
  }
}
