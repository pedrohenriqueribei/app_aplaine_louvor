import { NextRequest, NextResponse } from 'next/server';
import { adminMessaging, adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { type, title, body, memberIds, churchId } = await req.json();

    let tokens: string[] = [];

    if (type === 'schedule') {
      // Fetch tokens for specific members
      if (!memberIds || memberIds.length === 0) {
        return NextResponse.json({ error: 'No members specified' }, { status: 400 });
      }

      const usersSnap = await adminDb.collection('users')
        .where('uid', 'in', memberIds)
        .get();

      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
          tokens.push(...data.fcmTokens);
        }
      });
    } else if (type === 'broadcast') {
      // Fetch all active users' tokens
      // If churchId is provided, filter by church
      let query = adminDb.collection('users').where('status', '==', 'active');
      if (churchId) {
        query = query.where('churchId', '==', churchId);
      }

      const usersSnap = await query.get();
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
      return NextResponse.json({ message: 'No recipients with registered tokens found' }, { status: 200 });
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
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
