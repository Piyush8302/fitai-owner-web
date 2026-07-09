'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { Avatar, Loading, Empty } from '@/components/ui';

type Notif = {
  _id: string;
  title: string;
  body: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
  data?: { screen?: string; gymId?: string; membershipId?: string; avatar?: string; memberName?: string; kind?: string };
};

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

export default function NotificationsPage() {
  const router = useRouter();
  const { refreshUnread } = useApp();
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await api.get<Notif[]>('/api/notifications', { limit: 50 });
    if (res.success && Array.isArray(res.data)) setRows(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    await api.put('/api/notifications/read-all');
    refreshUnread();
    load();
  };

  const open = async (n: Notif) => {
    if (!n.isRead) {
      api.put(`/api/notifications/${n._id}/read`).then(refreshUnread);
    }
    if (n.data?.membershipId && n.data?.gymId) router.push(`/members/${n.data.membershipId}?g=${n.data.gymId}`);
  };

  return (
    <div>
      <div className="grad-hero rounded-b-[28px] px-5 pb-5 pt-12 text-white safe-top">
        <button onClick={() => router.back()} className="mb-3 flex items-center gap-1 text-sm font-semibold text-white/90">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">Notifications</h1>
          <button className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold" onClick={markAll}>
            <CheckCheck size={14} /> Mark all read
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty text="No notifications yet." />
        ) : (
          <div className="card divide-y divide-border">
            {rows.map((n) => (
              <button key={n._id} className="flex w-full items-start gap-3 p-3 text-left" onClick={() => open(n)}>
                <Avatar src={n.data?.avatar} name={n.data?.memberName || n.title.replace(/[^\p{L}\p{N}]/gu, '')} size={40} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.isRead ? 'font-medium text-ink-2' : 'font-bold'}`}>{n.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{n.body}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-muted">{timeAgo(n.createdAt)}</span>
                  {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
