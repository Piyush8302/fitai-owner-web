'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trash2, Phone } from 'lucide-react';
import { api, fmtDate, fmtMoney, fmtTime } from '@/lib/api';
import { useApp } from '@/lib/store';
import { Avatar, Loading, Empty, Toast, StatusBadge } from '@/components/ui';
import type { StaffRow } from '../page';

type FullStaff = StaffRow & {
  staffJoinDate?: string;
  canAccessCashbook?: boolean;
  canAccessReports?: boolean;
  canAddMember?: boolean;
  canMarkPayment?: boolean;
  canMarkPresent?: boolean;
  canManageStatus?: boolean;
  canEditGym?: boolean;
  canSetLocation?: boolean;
};

const PERMS: { key: keyof FullStaff; label: string }[] = [
  { key: 'canMarkPresent', label: 'Mark attendance' },
  { key: 'canAddMember', label: 'Add members' },
  { key: 'canMarkPayment', label: 'Mark payments' },
  { key: 'canManageStatus', label: 'Change member status' },
  { key: 'canAccessCashbook', label: 'Cashbook access' },
  { key: 'canAccessReports', label: 'Reports access' },
  { key: 'canEditGym', label: 'Edit gym' },
  { key: 'canSetLocation', label: 'Set gym location' },
];

const STAFF_STATUSES = ['active', 'inactive', 'blocked', 'left'] as const;

type Att = { _id: string; day: string; checkInAt: string };

function StaffDetailInner() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const { gymId: storeGymId } = useApp();
  const gymId = sp.get('g') || (storeGymId !== 'all' ? storeGymId : '');

  const [staff, setStaff] = useState<FullStaff | null>(null);
  const [att, setAtt] = useState<Att[]>([]);
  const [thisMonth, setThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; error?: boolean }>({ msg: '' });

  const show = (msg: string, error = true) => {
    setToast({ msg, error });
    setTimeout(() => setToast({ msg: '' }), 3000);
  };

  const load = useCallback(async () => {
    if (!gymId || !id) return;
    const [list, hist] = await Promise.all([
      api.get<FullStaff[]>(`/api/gym/${gymId}/staff`),
      api.get<Att[]>(`/api/gym/${gymId}/staff/${id}/attendance`),
    ]);
    if (list.success && Array.isArray(list.data)) setStaff(list.data.find((s) => s._id === id) || null);
    if (hist.success && Array.isArray(hist.data)) {
      setAtt(hist.data);
      setThisMonth(Number((hist as { thisMonth?: number }).thisMonth) || 0);
    }
    setLoading(false);
  }, [gymId, id]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (patch: Record<string, unknown>, okMsg: string) => {
    const res = await api.put(`/api/gym/staff/${id}`, patch);
    if (!res.success) return show(res.message || 'Update failed');
    show(okMsg, false);
    load();
  };

  if (loading) return <Loading full />;
  if (!staff) return <Empty text="Staff not found." />;

  return (
    <div>
      <div className="px-5 pb-4 pt-14 safe-top">
        <button onClick={() => router.back()} className="icon-btn mb-4" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-4">
          <Avatar src={staff.avatar} name={staff.name} size={68} />
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-extrabold tracking-tight">{staff.name}</h1>
            <p className="text-sm font-medium text-muted">{staff.staffRole || 'Staff'}</p>
            {staff.phone && (
              <a href={`tel:${staff.phone}`} className="mt-0.5 flex items-center gap-1 text-sm font-medium text-muted">
                <Phone size={13} /> {staff.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4">
        <div className="card grid grid-cols-3 divide-x divide-border p-3 text-center">
          <div>
            <p className="text-lg font-extrabold text-primary">{thisMonth}</p>
            <p className="text-[11px] text-muted">This Month</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-accent">{fmtMoney(staff.staffSalary)}</p>
            <p className="text-[11px] text-muted">Salary</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-success">{fmtDate(staff.staffJoinDate)}</p>
            <p className="text-[11px] text-muted">Joined</p>
          </div>
        </div>

        <section className="card p-4">
          <h2 className="mb-2 text-sm font-bold">Status</h2>
          <div className="flex flex-wrap gap-2">
            {STAFF_STATUSES.map((s) => (
              <button
                key={s}
                className={`chip capitalize ${(staff.staffStatus || 'active') === s ? 'chip-active' : ''}`}
                onClick={() => update({ staffStatus: s }, `Staff marked ${s} ✅`)}
              >
                {s}
              </button>
            ))}
          </div>
          {staff.staffStatus && staff.staffStatus !== 'active' && (
            <p className="mt-2 text-xs text-muted">
              Non-active staff cannot perform gym actions. <StatusBadge status={staff.staffStatus} />
            </p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-bold">Permissions (delete stays owner-only)</h2>
          <div className="space-y-2.5">
            {PERMS.map((p) => {
              const on = !!staff[p.key];
              return (
                <label key={p.key} className="flex items-center justify-between text-sm">
                  <span>{p.label}</span>
                  <button
                    role="switch"
                    aria-checked={on}
                    onClick={() => update({ [p.key]: !on }, 'Permission updated ✅')}
                    className={`h-6 w-11 rounded-full p-0.5 transition-colors ${on ? 'bg-primary' : 'bg-border'}`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`}
                    />
                  </button>
                </label>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-base font-bold">Attendance History</h2>
          {att.length === 0 ? (
            <Empty text="No attendance records yet." />
          ) : (
            <div className="card divide-y divide-border">
              {att.slice(0, 20).map((a) => (
                <div key={a._id} className="flex items-center justify-between p-3 text-sm">
                  <span className="font-medium">{fmtDate(a.checkInAt)}</span>
                  <span className="text-xs text-muted">{fmtTime(a.checkInAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <button
          className="btn btn-danger"
          onClick={async () => {
            if (!confirm(`Remove ${staff.name} from staff? Their account becomes a normal user.`)) return;
            const res = await api.del(`/api/gym/staff/${id}`);
            if (!res.success) return show(res.message || 'Remove failed');
            router.replace('/staff');
          }}
        >
          <Trash2 size={17} /> Remove Staff
        </button>
      </div>
      <Toast msg={toast.msg} error={toast.error} />
    </div>
  );
}

export default function StaffDetailPage() {
  return (
    <Suspense fallback={<Loading full />}>
      <StaffDetailInner />
    </Suspense>
  );
}
