'use client';

import { useEffect, useState } from 'react';
import { messaging, db } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';

export function useNotifications() {
  const { user, userData } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    async function requestPermission() {
      if (typeof window === 'undefined' || !user || !userData) return;

      try {
        const messagingInstance = await messaging?.();
        if (!messagingInstance) {
          console.warn('Messaging not supported in this browser');
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Register service worker explicitly to avoid registration issues in iframe/proxy environments
          await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          const registration = await navigator.serviceWorker.ready;
          
          // You need to replace this VAPID key with your own from Firebase Console
          // Settings > Cloud Messaging > Web configuration > Web Push certificates
          const fcmToken = await getToken(messagingInstance, {
            vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
            serviceWorkerRegistration: registration
          });

          if (fcmToken) {
            setToken(fcmToken);
            // Save token to user profile
            await updateDoc(doc(db, 'users', user.uid), {
              fcmTokens: arrayUnion(fcmToken)
            });
          }
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }

    requestPermission();

    // Foreground message listener
    let unsubscribe: (() => void) | undefined;
    async function setupForegroundListener() {
      const messagingInstance = await messaging?.();
      if (messagingInstance) {
        unsubscribe = onMessage(messagingInstance, (payload) => {
          if (payload.notification?.title && Notification.permission === 'granted') {
            new Notification(payload.notification.title, {
              body: payload.notification.body,
              icon: '/icon_applane.png',
            });
          }
        });
      }
    }
    setupForegroundListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid]);

  return { token };
}
