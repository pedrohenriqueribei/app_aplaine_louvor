importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

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
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
