// public/sw-push.js
// Push notification handlers — importado pelo service worker gerado pelo workbox

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'CodeCraft Gen-Z', {
      body: data.body || '',
      icon: '/favicon-192x192.png',
      badge: '/favicon-192x192.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  try {
    const parsed = new URL(target, self.location.origin);
    const allowed = parsed.origin === self.location.origin || parsed.hostname.endsWith('codecraftgenz.com.br');
    event.waitUntil(clients.openWindow(allowed ? target : '/'));
  } catch {
    event.waitUntil(clients.openWindow('/'));
  }
});
