importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA7iciugybuvq7r0hnnJS_Ys3W4tDDAeUI",
  authDomain: "gen-lang-client-0915512211.firebaseapp.com",
  projectId: "gen-lang-client-0915512211",
  storageBucket: "gen-lang-client-0915512211.firebasestorage.app",
  messagingSenderId: "745966057739",
  appId: "1:745966057739:web:a199374975d281666f0a0e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  if (!payload.notification?.title) return;
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon_applane.png'
  });
});
