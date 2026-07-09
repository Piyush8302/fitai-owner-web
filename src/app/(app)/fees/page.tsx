'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { api, fmtDate, fmtMoney, type MemberRow } from '@/lib/api';
import { useApp } from '@/lib/store';
import GymSwitcher from '@/components/GymSwitcher';
import { Avatar, Loading, Empty } from '@/components/ui';

type Summary = {
  activeMembers: number;
  dueMembers: number;
  dueToday: number;
  upcoming: number;
  overdue: number;
  totalPending: number;
  dueTodayAmount: number;
  overdueAmount: number;
  upcomingAmount: number;
};

const BUCKETS = [
  { key: 'due', label: 'Due Now' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Due Today' },
  { key: 'upcoming', label: 'Next 7 Days' },
  { key: 'all', label: 'All' },
] as const;

export default function FeesPage() {
  const { gymId, gyms, setGymId } = useApp();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [bucket, setBucket] = useState<string>('due');
  const [loading, setLoading] = useState(true);

  // Fees API is per-gym — in "All Gyms" mode fall back to the first gym.
  useEffect(() => {
    if (gymId === 'all' && gyms.length) setGymId(gyms[0]._id);
  }, [gymId, gyms, setGymId]);

  const load = useCallback(async () => {
    if (!gymId || gymId === 'all') return;
    setLoading(true);
    const res = await api.get<MemberRow[]>(`/api/gym/${gymId}/fees`);
    if (res.success) {
      setSummary((res as { summary?: Summary }).summary || null);
      setMembers(Array.isArray(res.data) ? res.data : []);
    }
    setLoading(false);
  }, [gymId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = members.filter((m) => {
    if (bucket === 'all') return true;
    if (bucket === 'due') return m.bucket === 'overdue' || m.bucket === 'today';
    return m.bucket === bucket;
  });

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 px-5 pb-3 pt-14 backdrop-blur-xl safe-top">
        <h1 className="text-[26px] font-extrabold tracking-tight">Fees</h1>
        <div className="mt-3">
          <GymSwitcher allowAll={false} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2.5 text-center">
          <div className="card p-3">
            <p className="text-[17px] font-extrabold tracking-tight text-error">{fmtMoney(summary?.totalPending)}</p>
            <p className="text-[10.5px] font-medium text-muted">Pending</p>
          </div>
          <div className="card p-3">
            <p className="text-[17px] font-extrabold tracking-tight">{summary?.overdue ?? '—'}</p>
            <p className="text-[10.5px] font-medium text-muted">Overdue</p>
          </div>
          <div className="card p-3">
            <p className="text-[17px] font-extrabold tracking-tight text-warning">{summary?.dueToday ?? '—'}</p>
            <p className="text-[10.5px] font-medium text-muted">Due Today</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
          {BUCKETS.map((b) => (
            <button key={b.key} className={`chip ${bucket === b.key ? 'chip-active' : ''}`} onClick={() => setBucket(b.key)}>
              {b.label}
            </button>
          ))}
        </div>
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Empty text="No members in this bucket. 🎉" />
        ) : (
          <div className="card divide-y divide-border">
            {filtered.map((m) => (
              <Link key={m._id} href={`/members/${m._id}?g=${gymId}`} className="flex items-center gap-3 p-3">
                <Avatar src={m.user?.avatar} name={m.user?.name} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.user?.name}</p>
                  <p className="text-xs text-muted">
                    Due {fmtDate(m.dueDate)}
                    {typeof m.daysDiff === 'number' &&
                      (m.daysDiff < 0
                        ? ` · ${-m.daysDiff} day${-m.daysDiff > 1 ? 's' : ''} late`
                        : m.daysDiff === 0
                          ? ' · today'
                          : ` · in ${m.daysDiff} day${m.daysDiff > 1 ? 's' : ''}`)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-sm font-bold ${
                      m.bucket === 'overdue' ? 'text-error' : m.bucket === 'today' ? 'text-warning' : 'text-ink-2'
                    }`}
                  >
                    {fmtMoney(m.fee)}
                  </span>
                  <ChevronRight size={15} className="text-muted" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
