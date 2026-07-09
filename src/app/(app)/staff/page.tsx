'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus, CheckCircle2, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import GymSwitcher from '@/components/GymSwitcher';
import { Avatar, Loading, Empty, Modal, Toast, StatusBadge } from '@/components/ui';
import PhotoPicker from '@/components/PhotoPicker';

export type StaffRow = {
  _id: string;
  name: string;
  phone?: string;
  avatar?: string;
  staffRole?: string;
  staffSalary?: number;
  staffStatus?: string;
  presentToday?: boolean;
  monthCount?: number;
};

export default function StaffPage() {
  const { user, gymId, gyms, setGymId } = useApp();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean }>({ msg: '' });
  const isOwner = user?.role !== 'gym_staff';

  const show = (msg: string, error = true) => {
    setToast({ msg, error });
    setTimeout(() => setToast({ msg: '' }), 3000);
  };

  useEffect(() => {
    if (gymId === 'all' && gyms.length) setGymId(gyms[0]._id);
  }, [gymId, gyms, setGymId]);

  const load = useCallback(async () => {
    if (!gymId || gymId === 'all') return;
    setLoading(true);
    const res = await api.get<StaffRow[]>(`/api/gym/${gymId}/staff`);
    if (res.success && Array.isArray(res.data)) setRows(res.data);
    setLoading(false);
  }, [gymId]);

  useEffect(() => {
    load();
  }, [load]);

  const markPresent = async (staffId: string) => {
    const res = await api.post('/api/gym/staff/attendance', { gymId, staffId });
    if (!res.success) return show(res.message || 'Could not mark present');
    show((res as { data?: { duplicate?: boolean } }).data?.duplicate ? 'Already marked present today' : 'Present marked ✅', false);
    load();
  };

  return (
    <div>
      <div className="grad-4 rounded-b-[28px] px-5 pb-5 pt-12 text-white safe-top">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">Staff</h1>
          {isOwner && (
            <button className="rounded-full bg-white/20 p-2.5" onClick={() => setShowAdd(true)} aria-label="Add staff">
              <UserPlus size={20} />
            </button>
          )}
        </div>
        <div className="mt-3">
          <GymSwitcher allowAll={false} />
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty text="No staff yet. Add your first one!" />
        ) : (
          <div className="card divide-y divide-border">
            {rows.map((s) => (
              <div key={s._id} className="flex items-center gap-3 p-3">
                <Link href={isOwner ? `/staff/${s._id}?g=${gymId}` : '#'} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar src={s.avatar} name={s.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-muted">
                      {s.staffRole || 'Staff'} · {s.monthCount ?? 0} days this month
                    </p>
                    {s.staffStatus && s.staffStatus !== 'active' && <StatusBadge status={s.staffStatus} />}
                  </div>
                </Link>
                {s.presentToday ? (
                  <span className="badge bg-green-100 text-green-700">Present</span>
                ) : (
                  <button className="chip chip-active" onClick={() => markPresent(s._id)}>
                    <CheckCircle2 size={13} /> Present
                  </button>
                )}
                {isOwner && (
                  <Link href={`/staff/${s._id}?g=${gymId}`} aria-label="Detail">
                    <ChevronRight size={16} className="text-muted" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Staff">
        <AddStaffForm
          gymId={gymId}
          onDone={() => {
            setShowAdd(false);
            show('Staff added ✅', false);
            load();
          }}
          onError={show}
        />
      </Modal>
      <Toast msg={toast.msg} error={toast.error} />
    </div>
  );
}

function AddStaffForm({ gymId, onDone, onError }: { gymId: string; onDone: () => void; onError: (m: string) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [avatar, setAvatar] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <PhotoPicker value={avatar} name={name} onChange={setAvatar} />
      <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input
        className="input"
        placeholder="Phone"
        type="tel"
        inputMode="numeric"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <input className="input" placeholder="Role (e.g. Trainer, Receptionist)" value={role} onChange={(e) => setRole(e.target.value)} />
      <input
        className="input"
        placeholder="Monthly salary (₹, optional)"
        type="number"
        inputMode="numeric"
        value={salary}
        onChange={(e) => setSalary(e.target.value)}
      />
      <button
        className="btn"
        disabled={busy}
        onClick={async () => {
          const cleanPhone = phone.replace(/\D/g, '');
          if (!name.trim()) return onError('Enter staff name');
          if (cleanPhone.length < 10) return onError('Enter a 10-digit phone number');
          setBusy(true);
          const res = await api.post('/api/gym/staff', {
            gymId,
            name: name.trim(),
            phone: cleanPhone,
            staffRole: role.trim() || undefined,
            salary: salary ? Number(salary) : undefined,
            avatar: avatar || undefined,
          });
          setBusy(false);
          if (!res.success) return onError(res.message || 'Could not add staff');
          onDone();
        }}
      >
        {busy ? 'Adding…' : 'Add Staff'}
      </button>
    </div>
  );
}
