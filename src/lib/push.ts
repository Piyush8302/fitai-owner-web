import { api, API_BASE_URL, getToken } from './api';

// Web Push registration. On iOS this only works after the PWA is installed
// ("Add to Home Screen", iOS 16.4+); in a normal Safari tab there is no push.
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

async function subscribeAndSave(reg: ServiceWorkerRegistration): Promise<{ ok: boolean; message: string }> {
  const keyRes = await fetch(`${API_BASE_URL}/api/notifications/web-push/key`).then((r) => r.json()).catch(() => null);
  const publicKey: string | undefined = keyRes?.key;
  if (!publicKey) return { ok: false, message: 'Web-push keys are not configured on the server (Render env).' };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
    });
  }
  const res = await api.post('/api/notifications/web-push/subscribe', { subscription: sub.toJSON() });
  if (!res.success) return { ok: false, message: res.message || 'Subscription failed' };
  return { ok: true, message: 'Notifications enabled! 🔔' };
}

// Silent re-sync on every app open: if permission is already granted, make sure
// the subscription exists AND is saved on the CURRENT user. Fixes Android cases
// where the endpoint drifted (site data evicted, or another login on this device
// took over the token) without the user having to tap "Enable" again.
export async function syncPushSilently(): Promise<void> {
  try {
    if (!pushSupported() || Notification.permission !== 'granted' || !getToken()) return;
    const reg = (await navigator.serviceWorker.getRegistration()) || (await registerSW());
    if (!reg) return;
    await navigator.serviceWorker.ready;
    await subscribeAndSave(reg);
  } catch {
    // silent — user can always tap Enable Push manually
  }
}

// Ask permission → subscribe → save on backend. Returns a human message.
export async function enablePush(): Promise<{ ok: boolean; message: string }> {
  if (!pushSupported()) {
    if (isIOS() && !isStandalone())
      return { ok: false, message: 'On iPhone, first "Add to Home Screen", then enable notifications inside the installed app.' };
    return { ok: false, message: 'Push notifications are not supported in this browser.' };
  }
  if (!getToken()) return { ok: false, message: 'Login required' };

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, message: 'Notification permission is required (allow it in browser settings).' };

  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerSW());
  if (!reg) return { ok: false, message: 'Service worker could not be registered.' };
  await navigator.serviceWorker.ready;

  return subscribeAndSave(reg);
}
