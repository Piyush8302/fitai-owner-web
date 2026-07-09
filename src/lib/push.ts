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

// Ask permission → subscribe → save on backend. Returns a human message.
export async function enablePush(): Promise<{ ok: boolean; message: string }> {
  if (!pushSupported()) {
    if (isIOS() && !isStandalone())
      return { ok: false, message: 'iPhone pe pehle "Add to Home Screen" karo, phir installed app me notifications on karo.' };
    return { ok: false, message: 'Is browser me push notifications supported nahi hain.' };
  }
  if (!getToken()) return { ok: false, message: 'Login required' };

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, message: 'Notification permission deni hogi (browser settings me allow karo).' };

  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerSW());
  if (!reg) return { ok: false, message: 'Service worker register nahi hua.' };
  await navigator.serviceWorker.ready;

  const keyRes = await fetch(`${API_BASE_URL}/api/notifications/web-push/key`).then((r) => r.json()).catch(() => null);
  const publicKey: string | undefined = keyRes?.key;
  if (!publicKey) return { ok: false, message: 'Server pe web-push keys configured nahi hain (Render env).' };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
    });
  }
  const res = await api.post('/api/notifications/web-push/subscribe', { subscription: sub.toJSON() });
  if (!res.success) return { ok: false, message: res.message || 'Subscribe fail ho gaya' };
  return { ok: true, message: 'Notifications on! 🔔' };
}
