'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, IndianRupee, CalendarClock, Trash2, Phone } from 'lucide-react';
import { api, can, fmtDate, fmtMoney, fmtTime, PLANS, PLAN_LABEL, type MemberRow } from '@/lib/api';
import { useApp } from '@/lib/store';
import { Avatar, Modal, Loading, StatusBadge, DueBadge, Toast, Empty } from '@/components/ui';

type Detail = {
  membership: MemberRow;
  attendance: { _id: string; day: string; checkInAt: string; method: string }[];
  payments: { _id: string; amount: number; plan: string; paidDate: string; periodMonths?: number }[];
  thisMonth: number;
  totalPaid: number;
  totalCheckins: number;
};

const MEMBER_STATUSES = ['active', 'inactive', 'blocked', 'left'] as const;

function MemberDetailInner() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const { user, gymId: storeGymId, gym } = useApp();
  const gymId = sp.get('g') || (storeGymId !== 'all' ? storeGymId : '');

  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean }>({ msg: '' });

  const show = (msg: string, error = true) => {
    setToast({ msg, error });
    setTimeout(() => setToast({ msg: '' }), 3500);
  };

  const load = useCallback(async () => {
    if (!gymId || !id) return;
    const res = await api.get<Detail>(`/api/gym/${gymId}/member/${id}`);
    if (res.success && res.data) setD(res.data);
    else show(res.message || 'Member load nahi hua');
    setLoading(false);
  }, [gymId, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading full />;
  if (!d) return <Empty text="Member nahi mila." />;

  const m = d.membership;

  const markPresent = async () => {
    if (busy) return;
    setBusy(true);
    const res = await api.post('/api/gym/attendance', { gymId, userId: m.user._id });
    setBusy(false);
    if (!res.success) return show(res.message || 'Attendance fail');
    show((res as { data?: { duplicate?: boolean } }).data?.duplicate ? 'Aaj already checked-in hai' : 'Attendance marked ✅', false);
    load();
  };

  const removeMember = async () => {
    if (!confirm(`${m.user.name} ko gym se remove karna hai? Ye undo nahi hoga.`)) return;
    const res = await api.del(`/api/gym/member/${m._id}`);
    if (!res.success) return show(res.message || 'Remove fail');
    router.replace('/members');
  };

  return (
    <div>
      <div className="grad-hero rounded-b-[28px] px-5 pb-6 pt-12 text-white safe-top">
        <button onClick={() => router.back()} className="mb-3 flex items-center gap-1 text-sm font-semibold text-white/90">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-4">
          <Avatar src={m.user.avatar} name={m.user.name} size={64} />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold">{m.user.name}</h1>
            <a href={`tel:${m.user.phone}`} className="mt-0.5 flex items-center gap-1 text-sm text-white/85">
              <Phone size={13} /> {m.user.phone}
            </a>
            <div className="mt-1.5 flex gap-2">
              <StatusBadge status={m.status} />
              <DueBadge isDue={m.isDue} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        <div className="card grid grid-cols-3 divide-x divide-border p-3 text-center">
          <div>
            <p className="text-lg font-extrabold text-primary">{d.thisMonth}</p>
            <p className="text-[11px] text-muted">This Month</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-accent">{d.totalCheckins}</p>
            <p className="text-[11px] text-muted">Total Visits</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-success">{fmtMoney(d.totalPaid)}</p>
            <p className="text-[11px] text-muted">Total Paid</p>
          </div>
        </div>

        <div className="card space-y-2 p-4 text-sm">
          <Row label="Gym" value={gym?.name || '—'} />
          <Row label="Plan" value={`${PLAN_LABEL[m.plan] || m.plan} · ${fmtMoney(m.fee)}`} />
          <Row label="Joined" value={fmtDate(m.joinDate)} />
          <Row label="Last Paid" value={fmtDate(m.lastPaidDate)} />
          <Row label="Next Due" value={fmtDate(m.dueDate)} strong={m.isDue} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {can(user, 'canMarkPresent') && (
            <button className="btn" onClick={markPresent} disabled={busy}>
              <CheckCircle2 size={17} /> Present
            </button>
          )}
          {can(user, 'canMarkPayment') && (
            <button className="btn grad-3" onClick={() => setPayOpen(true)}>
              <IndianRupee size={17} /> Payment
            </button>
          )}
          {can(user, 'canMarkPayment') && (
            <button className="btn btn-ghost" onClick={() => setDueOpen(true)}>
              <CalendarClock size={17} /> Due Date
            </button>
          )}
          {can(user, 'canManageStatus') && (
            <button className="btn btn-ghost" onClick={() => setStatusOpen(true)}>
              Status Change
            </button>
          )}
        </div>

        <section>
          <h2 className="mb-2 text-base font-bold">Payments</h2>
          {d.payments.length === 0 ? (
            <Empty text="Abhi tak koi payment nahi." />
          ) : (
            <div className="card divide-y divide-border">
              {d.payments.map((p) => (
                <div key={p._id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="font-semibold">{fmtMoney(p.amount)}</p>
                    <p className="text-xs text-muted">{PLAN_LABEL[p.plan] || p.plan}</p>
                  </div>
                  <span className="text-xs text-muted">{fmtDate(p.paidDate)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-base font-bold">Recent Attendance</h2>
          {d.attendance.length === 0 ? (
            <Empty text="Koi check-in nahi." />
          ) : (
            <div className="card divide-y divide-border">
              {d.attendance.slice(0, 15).map((a) => (
                <div key={a._id} className="flex items-center justify-between p-3 text-sm">
                  <span className="font-medium">{fmtDate(a.checkInAt)}</span>
                  <span className="text-xs text-muted">
                    {fmtTime(a.checkInAt)} · {a.method.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {user?.role !== 'gym_staff' && (
          <button className="btn btn-danger" onClick={removeMember}>
            <Trash2 size={17} /> Remove Member
          </button>
        )}
      </div>

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        membership={m}
        planPrices={gym?.planPrices}
        onDone={(msg) => {
          show(msg, false);
          load();
        }}
        onError={show}
      />

      <Modal open={dueOpen} onClose={() => setDueOpen(false)} title="Due Date Change">
        <DueDateForm
          membershipId={m._id}
          current={m.dueDate}
          onDone={(msg) => {
            setDueOpen(false);
            show(msg, false);
            load();
          }}
          onError={show}
        />
      </Modal>

      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} title="Member Status">
        <div className="grid grid-cols-2 gap-2">
          {MEMBER_STATUSES.map((s) => (
            <button
              key={s}
              className={`chip justify-center py-3 capitalize ${m.status === s ? 'chip-active' : ''}`}
              onClick={async () => {
                const res = await api.put(`/api/gym/member/${m._id}/status`, { status: s });
                setStatusOpen(false);
                if (!res.success) return show(res.message || 'Status change fail');
                show(`Member ${s} ✅`, false);
                load();
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </Modal>

      <Toast msg={toast.msg} error={toast.error} />
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${strong ? 'text-error' : ''}`}>{value}</span>
    </div>
  );
}

function PaymentModal({
  open,
  onClose,
  membership,
  planPrices,
  onDone,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  membership: MemberRow;
  planPrices?: { [k: string]: number | undefined };
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [plan, setPlan] = useState(membership.plan || 'monthly');
  const [amount, setAmount] = useState(String(membership.fee || ''));
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const preset = planPrices?.[plan];
    if (preset) setAmount(String(preset));
  }, [plan, planPrices]);

  const submit = async (allowRenew = false) => {
    if (!Number(amount)) return onError('Amount daalo');
    setBusy(true);
    const res = await api.post('/api/gym/payment', {
      membershipId: membership._id,
      amount: Number(amount),
      plan,
      dueDate: dueDate || undefined,
      allowRenew,
    });
    setBusy(false);
    if (!res.success) {
      if ((res as { alreadyPaid?: boolean }).alreadyPaid) {
        if (confirm(`${res.message}\n\nPhir bhi advance renew karna hai?`)) return submit(true);
        return;
      }
      return onError(res.message || 'Payment fail');
    }
    onClose();
    onDone('Payment marked ✅');
  };

  return (
    <Modal open={open} onClose={onClose} title={`Payment — ${membership.user?.name}`}>
      <div className="space-y-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {PLANS.filter((p) => p !== 'trial').map((p) => (
            <button key={p} className={`chip ${plan === p ? 'chip-active' : ''}`} onClick={() => setPlan(p)}>
              {PLAN_LABEL[p]}
            </button>
          ))}
        </div>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          placeholder="Amount (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Custom next due date (optional)</label>
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <button className="btn" onClick={() => submit(false)} disabled={busy}>
          {busy ? 'Saving…' : `Mark Paid ${amount ? `₹${amount}` : ''}`}
        </button>
      </div>
    </Modal>
  );
}

function DueDateForm({
  membershipId,
  current,
  onDone,
  onError,
}: {
  membershipId: string;
  current?: string;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [dueDate, setDueDate] = useState(current ? new Date(current).toISOString().slice(0, 10) : '');
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <button
        className="btn"
        disabled={busy || !dueDate}
        onClick={async () => {
          setBusy(true);
          const res = await api.put(`/api/gym/member/${membershipId}/duedate`, { dueDate });
          setBusy(false);
          if (!res.success) return onError(res.message || 'Update fail');
          onDone('Due date updated ✅');
        }}
      >
        {busy ? 'Saving…' : 'Update Due Date'}
      </button>
    </div>
  );
}

export default function MemberDetailPage() {
  return (
    <Suspense fallback={<Loading full />}>
      <MemberDetailInner />
    </Suspense>
  );
}
