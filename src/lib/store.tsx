'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, getUser, clearAuth, type AuthUser, type Gym } from './api';
import { syncPushSilently } from './push';
import { forgetSilentLogin } from './creds';

type AppState = {
  user: AuthUser | null;
  gyms: Gym[];
  gymId: string; // selected gym id, or 'all' (owners with 2+ gyms)
  gym: Gym | null; // selected gym object (null when 'all')
  setGymId: (id: string) => void;
  refreshGyms: () => Promise<void>;
  unread: number;
  refreshUnread: () => Promise<void>;
  logout: () => void;
  ready: boolean;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymId, setGymIdState] = useState<string>('');
  const [unread, setUnread] = useState(0);
  const [ready, setReady] = useState(false);

  const setGymId = useCallback((id: string) => {
    setGymIdState(id);
    localStorage.setItem('gymId', id);
  }, []);

  const refreshGyms = useCallback(async () => {
    const res = await api.get<Gym[]>('/api/gym/mine');
    if (res.success && Array.isArray(res.data)) {
      setGyms(res.data);
      const saved = localStorage.getItem('gymId');
      const valid = res.data.some((g) => g._id === saved) || (saved === 'all' && res.data.length > 1);
      if (!valid && res.data.length) {
        setGymIdState(res.data[0]._id);
        localStorage.setItem('gymId', res.data[0]._id);
      } else if (saved) {
        setGymIdState(saved);
      }
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    const res = await api.get('/api/notifications/unread-count');
    if (res.success) setUnread(Number((res as { unreadCount?: number }).unreadCount) || 0);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    // Explicit logout must stick — block silent credential restore until the
    // user logs in again themselves.
    forgetSilentLogin();
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    const token = getToken();
    const u = getUser();
    if (!token || !u || !['gym_owner', 'gym_staff', 'admin'].includes(u.role)) {
      clearAuth();
      router.replace('/login');
      return;
    }
    setUser(u);
    Promise.all([refreshGyms(), refreshUnread()]).finally(() => setReady(true));
    // Keep the push subscription bound to this user on every open (Android fix).
    syncPushSilently();
  }, [router, refreshGyms, refreshUnread]);

  const gym = useMemo(() => gyms.find((g) => g._id === gymId) || null, [gyms, gymId]);

  const value = useMemo(
    () => ({ user, gyms, gymId, gym, setGymId, refreshGyms, unread, refreshUnread, logout, ready }),
    [user, gyms, gymId, gym, setGymId, refreshGyms, unread, refreshUnread, logout, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
