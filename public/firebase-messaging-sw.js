// Firebase Cloud Messaging Service Worker
// This file MUST be in /public/ to be served at the root URL

// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here — other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Service workers cannot read Next.js environment variables. Fetch the public
// Firebase web config from the same origin at runtime instead of relying on an
// undefined injected global.
const messagingReady = fetch('/api/push/config', { cache: 'no-cache' })
  .then((response) => {
    if (!response.ok) throw new Error(`Push config request failed (${response.status})`);
    return response.json();
  })
  .then((config) => {
    firebase.initializeApp(config);
    return firebase.messaging();
  })
  .catch((error) => {
    console.error('[firebase-messaging-sw.js] Firebase initialization failed:', error);
    return null;
  });

messagingReady.then((messaging) => {
  if (!messaging) return;
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'Vormex';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: payload.data?.type || 'general',
      data: {
        url: payload.data?.url || '/',
        type: payload.data?.type,
      },
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
});

// Handle notification click — navigate to the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
