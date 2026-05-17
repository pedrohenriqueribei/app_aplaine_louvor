import { NextRequest, NextResponse } from 'next/server';
import { adminMessaging, adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { type, title, body, memberIds, churchId } = await req.json();

    let tokens: string[] = [];

    if (type === 'schedule' || (type === 'broadcast' && memberIds && memberIds.length > 0)) {
      // Fetch tokens for specific members
      const targetIds = memberIds || [];
      if (targetIds.length === 0) {
        return NextResponse.json({ error: 'No members specified' }, { status: 400 });
      }

      const usersSnap = await adminDb.collection('users')
        .where('uid', 'in', targetIds)
        .get();

      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
          tokens.push(...data.fcmTokens);
        }
      });
    } else if (type === 'broadcast') {
      // Fallback: Fetch all active users' tokens if memberIds not provided
      let q = adminDb.collection('users').where('status', '==', 'active');
      if (churchId) {
        q = q.where('churchId', '==', churchId);
      }

      const usersSnap = await q.get();
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
          tokens.push(...data.fcmTokens);
        }
      });
    }

    // Remove duplicates
    tokens = [...new Set(tokens)];

    if (tokens.length === 0) {
      return NextResponse.json({ 
        message: 'No recipients with registered tokens found.',
        success: true 
      }, { status: 200 });
    }

    // Multicast sends message to multiple tokens
    const response = await adminMessaging.sendEachForMulticast({
      tokens,
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

  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
