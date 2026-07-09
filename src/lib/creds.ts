// Chrome Password Manager backup for the login session (Android).
// Password-manager entries SURVIVE "clear browsing data" (and sync with the
// Google account), so after a history/site-data wipe we can silently restore
// the session instead of forcing a fresh OTP. No-op on browsers without the
// Credential Management API (e.g. iOS Safari — where the installed PWA's
// storage isn't touched by Safari clears anyway).
import { API_BASE_URL, saveAuth, type AuthUser } from './api';

type PasswordCredentialCtor = new (init: { id: string; password: string; name?: string }) => Credential;
type CredWithPassword = Credential & { id: string; password?: string };

const pcCtor = (): PasswordCredentialCtor | null =>
  typeof window === 'undefined'
    ? null
    : ((window as unknown as { PasswordCredential?: PasswordCredentialCtor }).PasswordCredential ?? null);

export async function storeLoginCredential(phone: string, token: string, name?: string): Promise<void> {
  try {
    const PC = pcCtor();
    if (!PC || !navigator.credentials?.store) return;
    await navigator.credentials.store(new PC({ id: phone, password: token, name }));
  } catch {
    // user declined the save prompt — fine
  }
}

export async function forgetSilentLogin(): Promise<void> {
  try {
    await navigator.credentials?.preventSilentAccess?.();
  } catch {
    // ignore
  }
}

// Try to restore a session from the password manager. Returns:
//  'restored'  — token was valid, session saved, caller should enter the app
//  a string    — token dead but we know the phone; caller can prefill it
//  null        — nothing available
export async function restoreLoginSilently(): Promise<'restored' | string | null> {
  try {
    const PC = pcCtor();
    if (!PC || !navigator.credentials?.get) return null;
    const cred = (await navigator.credentials.get({
      password: true,
      mediation: 'silent',
    } as CredentialRequestOptions)) as CredWithPassword | null;
    if (!cred?.id) return null;
    const phone = cred.id.replace(/\D/g, '').slice(0, 10);

    if (cred.password) {
      const r = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${cred.password}` },
      })
        .then((x) => x.json())
        .catch(() => null);
      const u = r?.user;
      if (r?.success && u && ['gym_owner', 'gym_staff', 'admin'].includes(u.role)) {
        saveAuth(cred.password, {
          id: u._id || u.id,
          name: u.name,
          phone: u.phone,
          email: u.email,
          role: u.role,
          canAccessCashbook: u.canAccessCashbook,
          canAccessReports: u.canAccessReports,
          canAddMember: u.canAddMember,
          canMarkPayment: u.canMarkPayment,
          canMarkPresent: u.canMarkPresent,
          canManageStatus: u.canManageStatus,
          canEditGym: u.canEditGym,
          canSetLocation: u.canSetLocation,
        } as AuthUser);
        return 'restored';
      }
    }
    return phone || null;
  } catch {
    return null;
  }
}
