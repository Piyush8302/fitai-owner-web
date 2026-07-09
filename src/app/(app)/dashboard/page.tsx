'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Users, Footprints, AlertCircle, IndianRupee, UserPlus, ScanLine } from 'lucide-react';
import { api, fmtMoney, fmtTime } from '@/lib/api';
import { useApp } from '@/lib/store';
import GymSwitcher from '@/components/GymSwitcher';
import { Avatar, Loading, Empty } from '@/components/ui';
import InstallHint from '@/components/InstallHint';

type Stats = { totalMembers: number; todayFootfall: number; dueMembers: number; pendingFees: number; branches?: number };
type AttRow = { _id: string; user?: { name?: string; phone?: string }; checkInAt: string; method: string };

const istDay = () => {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
};

export default function DashboardPage() {
  const { user, gymId, gym, unread } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [today, setToday] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    if (gymId === 'all') {
      const res = await api.get<Stats>('/api/gym/all/dashboard');
      if (res.success && res.data) setStats(res.data);
      setToday([]);
    } else {
      const [d, a] = await Promise.all([
        api.get<Stats>(`/api/gym/${gymId}/dashboard`),
        api.get<AttRow[]>(`/api/gym/${gymId}/attendance`, { day: istDay() }),
      ]);
      if (d.success && d.data) setStats(d.data);
      if (a.success && Array.isArray(a.data)) setToday(a.data);
    }
    setLoading(false);
  }, [gymId]);

  useEffect(() => {
    load();
  }, [load]);

  const tiles = [
    { label: 'Members', value: stats?.totalMembers ?? '—', icon: Users, cls: 'grad-hero' },
    { label: "Today's Footfall", value: stats?.todayFootfall ?? '—', icon: Footprints, cls: 'grad-3' },
    { label: 'Fee Due', value: stats?.dueMembers ?? '—', icon: AlertCircle, cls: 'grad-2' },
    { label: 'Pending Fees', value: fmtMoney(stats?.pendingFees), icon: IndianRupee, cls: 'grad-4' },
  ];

  return (
    <div>
      <div className="grad-hero rounded-b-[28px] px-5 pb-6 pt-12 text-white safe-top">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/80">Namaste 🙏</p>
            <h1 className="text-xl font-extrabold">{user?.name || 'Owner'}</h1>
          </div>
          <Link href="/notifications" className="relative rounded-full bg-white/20 p-2.5">
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
        </div>
        <div className="mt-4">
          <GymSwitcher />
        </div>
      </div>

      <div className="px-4 pt-4">
        <InstallHint />
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className={`${t.cls} rounded-2xl p-4 text-white shadow-md`}>
                <div className="mb-2 inline-flex rounded-xl bg-white/20 p-2">
                  <Icon size={18} />
                </div>
                <p className="text-2xl font-extrabold leading-tight">{t.value}</p>
                <p className="text-xs font-medium text-white/85">{t.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/members?add=1" className="card flex items-center gap-2.5 p-3.5">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <UserPlus size={18} />
            </div>
            <span className="text-sm font-bold">Add Member</span>
          </Link>
          <Link href="/more" className="card flex items-center gap-2.5 p-3.5">
            <div className="rounded-xl bg-accent/10 p-2 text-accent">
              <ScanLine size={18} />
            </div>
            <span className="text-sm font-bold">Gym QR</span>
          </Link>
        </div>

        {gymId !== 'all' && (
          <div className="mt-5">
            <h2 className="mb-2 text-base font-bold">Aaj ke Check-ins {gym ? `— ${gym.name}` : ''}</h2>
            {loading ? (
              <Loading />
            ) : today.length === 0 ? (
              <Empty text="Aaj abhi tak koi check-in nahi hua." />
            ) : (
              <div className="card divide-y divide-border">
                {today.map((a) => (
                  <div key={a._id} className="flex items-center gap-3 p-3">
                    <Avatar name={a.user?.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{a.user?.name || 'Member'}</p>
                      <p className="text-xs text-muted">{a.user?.phone}</p>
                    </div>
                    <span className="text-xs font-semibold text-ink-2">{fmtTime(a.checkInAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
