'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Phone, Mail, ArrowLeft } from 'lucide-react';
import { api, saveAuth, getToken, getUser, type AuthUser } from '@/lib/api';
import { Toast } from '@/components/ui';

type Step = 'id' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [step, setStep] = useState<Step>('id');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean }>({ msg: '' });
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = getUser();
    if (getToken() && u && ['gym_owner', 'gym_staff', 'admin'].includes(u.role)) router.replace('/dashboard');
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const show = (msg: string, error = true) => {
    setToast({ msg, error });
    setTimeout(() => setToast({ msg: '' }), 3500);
  };

  const sendOtp = async () => {
    const body = mode === 'phone' ? { phone: phone.replace(/\D/g, '') } : { email: email.trim().toLowerCase() };
    const res = await api.post('/api/auth/send-otp', body);
    if (!res.success) {
      show(res.message || 'OTP send failed');
      return false;
    }
    setCooldown(45);
    return true;
  };

  const handleContinue = async () => {
    if (busy) return;
    if (mode === 'phone') {
      const clean = phone.replace(/\D/g, '');
      if (clean.length < 10) return show('Enter a 10-digit mobile number');
      setBusy(true);
      // Same gating as the app's Admin chip: only approved owners/staff proceed.
      const st = await api.post<{ status?: string }>('/api/auth/owner-status', { phone: clean });
      const status = (st as { status?: string }).status;
      if (!st.success) {
        setBusy(false);
        return show(st.message || 'Something went wrong');
      }
      if (status !== 'approved') {
        setBusy(false);
        if (status === 'pending') return show('Your gym-owner request is still pending approval.');
        if (status === 'rejected') return show('Your owner request was rejected. Please contact support.');
        return show('This number is not an approved gym owner/staff. Register your gym in the FitAI app first.');
      }
      if (await sendOtp()) setStep('otp');
      setBusy(false);
    } else {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return show('Enter a valid email address');
      setBusy(true);
      if (await sendOtp()) setStep('otp');
      setBusy(false);
    }
  };

  const verify = async (code: string) => {
    if (busy) return;
    setBusy(true);
    const body =
      mode === 'phone'
        ? { phone: phone.replace(/\D/g, ''), otp: code }
        : { email: email.trim().toLowerCase(), otp: code };
    const res = await api.post('/api/auth/verify-otp', body);
    const token = (res as { token?: string }).token;
    const user = (res as { user?: AuthUser }).user;
    if (!res.success || !token || !user) {
      setBusy(false);
      setOtp('');
      return show(res.message || 'Invalid OTP');
    }
    if (!['gym_owner', 'gym_staff', 'admin'].includes(user.role)) {
      setBusy(false);
      setOtp('');
      return show('This account is not a gym owner/staff account.');
    }
    saveAuth(token, user);
    router.replace('/dashboard');
  };

  const onOtpChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    if (digits.length === 6) verify(digits);
  };

  return (
    <div className="flex min-h-dvh flex-col safe-top">
      <div className="grad-hero rounded-b-[36px] px-6 pb-12 pt-14 text-white">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
          <Dumbbell size={30} />
        </div>
        <h1 className="text-3xl font-extrabold">FitAI Owner</h1>
        <p className="mt-1 text-sm text-white/85">Manage your gym — members, fees, attendance & more.</p>
      </div>

      <div className="flex-1 px-5 pt-8">
        {step === 'id' ? (
          <>
            <div className="mb-5 flex gap-2">
              <button
                className={`chip flex-1 justify-center py-2.5 ${mode === 'phone' ? 'chip-active' : ''}`}
                onClick={() => setMode('phone')}
              >
                <Phone size={14} /> Phone
              </button>
              <button
                className={`chip flex-1 justify-center py-2.5 ${mode === 'email' ? 'chip-active' : ''}`}
                onClick={() => setMode('email')}
              >
                <Mail size={14} /> Email
              </button>
            </div>
            {mode === 'phone' ? (
              <input
                className="input"
                type="tel"
                inputMode="numeric"
                placeholder="Mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={13}
              />
            ) : (
              <input
                className="input"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
            <button className="btn mt-5" onClick={handleContinue} disabled={busy}>
              {busy ? 'Checking…' : 'Send OTP'}
            </button>
            <p className="mt-6 text-center text-xs text-muted">
              Only approved gym owners / staff can log in.
              <br />
              Want to register a new gym? Use the FitAI app.
            </p>
          </>
        ) : (
          <>
            <button className="mb-4 flex items-center gap-1 text-sm font-semibold text-primary" onClick={() => { setStep('id'); setOtp(''); }}>
              <ArrowLeft size={16} /> Change {mode}
            </button>
            <p className="mb-3 text-sm text-ink-2">
              OTP sent to <b>{mode === 'phone' ? phone : email}</b>
            </p>
            <input
              ref={otpRef}
              className="input text-center text-2xl tracking-[0.5em] font-bold"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              value={otp}
              onChange={(e) => onOtpChange(e.target.value)}
              maxLength={6}
              autoFocus
            />
            <button className="btn mt-5" onClick={() => verify(otp)} disabled={busy || otp.length !== 6}>
              {busy ? 'Verifying…' : 'Verify & Login'}
            </button>
            <button
              className="mt-4 w-full text-center text-sm font-semibold text-primary disabled:text-muted"
              disabled={cooldown > 0 || busy}
              onClick={sendOtp}
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </button>
          </>
        )}
      </div>
      <Toast msg={toast.msg} error={toast.error} />
    </div>
  );
}
