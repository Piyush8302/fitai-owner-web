/* FitAI Owner — service worker: web push + notification click. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'FitAI Owner', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'FitAI Owner';
  // Member photo (Cloudinary URL or /api/gym/avatar/:id) — shown as the
  // notification's icon (like the app's thumbnail) AND as the big picture
  // on Android when expanded.
  const photo = payload.image || (payload.data && payload.data.avatar) || null;
  const options = {
    body: payload.body || '',
    icon: photo || '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
  };
  if (photo) options.image = photo;
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  // Deep-link to the member when the payload carries one (same as app push taps).
  const url = d.membershipId && d.gymId ? `/members/${d.membershipId}?g=${d.gymId}` : '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          w.focus();
          if ('navigate' in w) w.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
