import { NextRequest, NextResponse } from 'next/server';
import { adminMessaging, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { type, title, body, tokens } = await req.json();

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ 
        message: 'No recipients with registered tokens found.',
        success: true 
      }, { status: 200 });
    }

    // Remove duplicates
    const uniqueTokens = [...new Set(tokens as string[])];

    // Multicast sends message to multiple tokens
    try {
      const response = await adminMessaging.sendEachForMulticast({
        tokens: uniqueTokens,
        notification: {
          title,
          body
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
        failureCount: response.failureCount 
      });
    } catch (fcmError: any) {
      console.warn('FCM send failed (likely missing configuration or permissions). Logging warning and continuing gracefully:', fcmError);
      
      const errMsg = fcmError instanceof Error ? fcmError.message : String(fcmError);
      const isPermissionDenied = errMsg.includes('PERMISSION_DENIED') || 
                                 errMsg.includes('7') || 
                                 fcmError.code === 'messaging/permission-denied';

      if (isPermissionDenied) {
        return NextResponse.json({ 
          success: false, 
          error: 'FCM_PERMISSION_DENIED',
          message: 'Firebase Cloud Messaging API is not enabled or the service account lacks permission. Please assign "Firebase Cloud Messaging Admin" role or enable Cloud Messaging API in Google Cloud Console.',
          details: errMsg
        }, { status: 200 }); // Graceful standard HTTP 200 response to prevent breaking UI workflow
      }
      
      throw fcmError;
    }

  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
