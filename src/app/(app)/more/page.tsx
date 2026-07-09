'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  FileBarChart,
  Bell,
  QrCode,
  Pencil,
  BellRing,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { api, can, type Gym } from '@/lib/api';
import { useApp } from '@/lib/store';
import GymSwitcher from '@/components/GymSwitcher';
import { Avatar, Modal, Toast } from '@/components/ui';
import { enablePush } from '@/lib/push';
import InstallHint from '@/components/InstallHint';
import QrModal from '@/components/QrModal';

export default function MorePage() {
  const { user, gym, gymId, gyms, setGymId, logout, refreshGyms } = useApp();
  const [qrOpen, setQrOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean }>({ msg: '' });
  const [pushBusy, setPushBusy] = useState(false);

  const show = (msg: string, error = true) => {
    setToast({ msg, error });
    setTimeout(() => setToast({ msg: '' }), 4000);
  };

  useEffect(() => {
    if (gymId === 'all' && gyms.length) setGymId(gyms[0]._id);
  }, [gymId, gyms, setGymId]);

  const isOwner = user?.role !== 'gym_staff';

  const items = [
    ...(isOwner ? [{ label: 'Staff Management', icon: Users, href: '/staff' }] : []),
    ...(can(user, 'canAccessReports') ? [{ label: 'Reports', icon: FileBarChart, href: '/reports' }] : []),
    { label: 'Notifications', icon: Bell, href: '/notifications' },
  ];

  return (
    <div>
      <div className="px-5 pb-3 pt-14 safe-top">
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} size={60} />
          <div>
            <h1 className="text-[24px] font-extrabold tracking-tight">{user?.name}</h1>
            <p className="text-sm font-medium text-muted">
              {user?.role === 'gym_staff' ? 'Staff' : 'Gym Owner'} · {user?.phone || user?.email}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <GymSwitcher allowAll={false} />
        </div>
      </div>

      <div className="space-y-4 px-4">
        <InstallHint />

        <div className="card divide-y divide-border">
          <MenuBtn icon={QrCode} label="Gym Wall QR (check-in)" onClick={() => setQrOpen(true)} />
          {can(user, 'canEditGym') && <MenuBtn icon={Pencil} label="Edit Gym (hours, fees, details)" onClick={() => setEditOpen(true)} />}
          <MenuBtn
            icon={BellRing}
            label={pushBusy ? 'Enabling…' : 'Enable Push Notifications'}
            onClick={async () => {
              setPushBusy(true);
              const r = await enablePush();
              setPushBusy(false);
              show(r.message, !r.ok);
            }}
          />
        </div>

        <div className="card divide-y divide-border">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="flex items-center gap-3 p-3.5">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <it.icon size={18} />
              </div>
              <span className="flex-1 text-sm font-semibold">{it.label}</span>
              <ChevronRight size={16} className="text-muted" />
            </Link>
          ))}
        </div>

        <button className="btn btn-danger" onClick={logout}>
          <LogOut size={17} /> Logout
        </button>
        <p className="pb-2 text-center text-[11px] text-muted">FitAI Owner Web · same data as the mobile app</p>
      </div>

      {gym && <QrModal open={qrOpen} onClose={() => setQrOpen(false)} gym={gym} />}
      {gym && (
        <EditGymModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          gym={gym}
          onDone={() => {
            setEditOpen(false);
            show('Gym updated ✅', false);
            refreshGyms();
          }}
          onError={show}
        />
      )}
      <Toast msg={toast.msg} error={toast.error} />
    </div>
  );
}

function MenuBtn({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button className="flex w-full items-center gap-3 p-3.5 text-left" onClick={onClick}>
      <div className="rounded-xl bg-accent/10 p-2 text-accent">
        <Icon size={18} />
      </div>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <ChevronRight size={16} className="text-muted" />
    </button>
  );
}

function EditGymModal({
  open,
  onClose,
  gym,
  onDone,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  gym: Gym;
  onDone: () => void;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState(gym.name);
  const [location, setLocation] = useState(gym.location || '');
  const [phone, setPhone] = useState(gym.phone || '');
  const [slots, setSlots] = useState<{ open: string; close: string }[]>(gym.slots || []);
  const [prices, setPrices] = useState({
    monthly: gym.planPrices?.monthly || 0,
    quarterly: gym.planPrices?.quarterly || 0,
    half_yearly: gym.planPrices?.half_yearly || 0,
    yearly: gym.planPrices?.yearly || 0,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(gym.name);
    setLocation(gym.location || '');
    setPhone(gym.phone || '');
    setSlots(gym.slots || []);
    setPrices({
      monthly: gym.planPrices?.monthly || 0,
      quarterly: gym.planPrices?.quarterly || 0,
      half_yearly: gym.planPrices?.half_yearly || 0,
      yearly: gym.planPrices?.yearly || 0,
    });
  }, [open, gym]);

  const save = async () => {
    if (!name.trim()) return onError('Enter the gym name');
    for (const s of slots) if (!s.open || !s.close) return onError('Fill open & close time for every slot');
    setBusy(true);
    const res = await api.put(`/api/gym/${gym._id}`, {
      name: name.trim(),
      location: location.trim(),
      phone: phone.trim(),
      slots,
      planPrices: prices,
    });
    setBusy(false);
    if (!res.success) return onError(res.message || 'Update failed');
    onDone();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Gym">
      <div className="space-y-3">
        <input className="input" placeholder="Gym name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="input" placeholder="Gym phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <div>
          <p className="mb-1.5 text-xs font-bold text-muted">GYM HOURS (empty = open 24×7)</p>
          {slots.map((s, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <input
                className="input flex-1"
                type="time"
                value={s.open}
                onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))}
              />
              <span className="text-xs text-muted">to</span>
              <input
                className="input flex-1"
                type="time"
                value={s.close}
                onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))}
              />
              <button className="text-error text-xs font-bold" onClick={() => setSlots(slots.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button className="chip" onClick={() => setSlots([...slots, { open: '', close: '' }])}>
            + Add slot
          </button>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold text-muted">FEE PLANS (₹)</p>
          <div className="grid grid-cols-2 gap-2">
            {(['monthly', 'quarterly', 'half_yearly', 'yearly'] as const).map((k) => (
              <div key={k}>
                <label className="text-[10px] font-semibold capitalize text-muted">{k.replace('_', ' ')}</label>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  value={prices[k] || ''}
                  onChange={(e) => setPrices({ ...prices, [k]: Number(e.target.value) || 0 })}
                />
              </div>
            ))}
          </div>
        </div>

        <button className="btn" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
