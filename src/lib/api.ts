// Same live backend as the mobile app — the web app holds no secrets.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://fitai-backend-icbh.onrender.com';

export type ApiResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: unknown;
};

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export type AuthUser = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: 'user' | 'admin' | 'gym_owner' | 'gym_staff';
  canAccessCashbook?: boolean;
  canAccessReports?: boolean;
  canAddMember?: boolean;
  canMarkPayment?: boolean;
  canMarkPresent?: boolean;
  canManageStatus?: boolean;
  canEditGym?: boolean;
  canSetLocation?: boolean;
};

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('gymId');
}

// Owner = full rights; staff = per-permission flags granted by the owner.
export function can(user: AuthUser | null, perm: keyof AuthUser): boolean {
  if (!user) return false;
  if (user.role === 'gym_owner' || user.role === 'admin') return true;
  return !!user[perm];
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | undefined>
): Promise<ApiResult<T>> {
  let qs = '';
  if (params) {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') clean[k] = String(v);
    if (Object.keys(clean).length) qs = '?' + new URLSearchParams(clean).toString();
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${API_BASE_URL}${path}${qs}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return (await res.json()) as ApiResult<T>;
  } catch {
    return { success: false, message: 'Network error — check your connection' };
  }
}

export const api = {
  get: <T = unknown>(path: string, params?: Record<string, string | number | undefined>) =>
    request<T>('GET', path, undefined, params),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T = unknown>(path: string) => request<T>('DELETE', path),
};

// ---- Shared shapes returned by the gym API ----
export type Gym = {
  _id: string;
  name: string;
  location?: string;
  city?: string;
  phone?: string;
  gymCode: string;
  lat?: number;
  lng?: number;
  slots?: { open: string; close: string }[];
  planPrices?: { monthly?: number; quarterly?: number; half_yearly?: number; yearly?: number };
  isActive?: boolean;
};

export type MemberRow = {
  _id: string; // membershipId
  user: { _id: string; name: string; phone?: string; email?: string; avatar?: string };
  gym?: { _id: string; name: string };
  plan: string;
  fee: number;
  joinDate?: string;
  dueDate?: string;
  lastPaidDate?: string;
  status: 'active' | 'inactive' | 'blocked' | 'left' | 'expired' | 'frozen';
  isDue?: boolean;
  bucket?: 'overdue' | 'today' | 'upcoming' | 'ok';
  daysDiff?: number | null;
};

export const PLANS = ['trial', 'day_pass', 'monthly', 'quarterly', 'half_yearly', 'yearly'] as const;
export const PLAN_LABEL: Record<string, string> = {
  trial: 'Trial',
  day_pass: 'Day Pass',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half Yearly',
  yearly: 'Yearly',
};

export const fmtMoney = (n?: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
export const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtTime = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '';
