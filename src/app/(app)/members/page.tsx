'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, UserPlus, ChevronRight } from 'lucide-react';
import { api, can, fmtDate, PLANS, PLAN_LABEL, type MemberRow } from '@/lib/api';
import { useApp } from '@/lib/store';
import GymSwitcher from '@/components/GymSwitcher';
import { Avatar, Modal, Loading, Empty, StatusBadge, DueBadge, Toast } from '@/components/ui';
import PhotoPicker from '@/components/PhotoPicker';

const STATUSES = ['all', 'active', 'inactive', 'blocked', 'left'] as const;

function MembersInner() {
  const { user, gymId, gym, gyms } = useApp();
  const params = useSearchParams();
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showAdd, setShowAdd] = useState(params.get('add') === '1');
  const [toast, setToast] = useState<{ msg: string; error?: boolean }>({ msg: '' });
  const sentinel = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (msg: string, error = true) => {
    setToast({ msg, error });
    setTimeout(() => setToast({ msg: '' }), 3000);
  };

  const load = useCallback(
    async (p: number, append: boolean, q: string, st: string) => {
      if (!gymId) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      if (gymId === 'all') {
        const res = await api.get<MemberRow[]>('/api/gym/all/members');
        if (res.success && Array.isArray(res.data)) {
          let d = res.data;
          if (q) {
            const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            d = d.filter((m) => rx.test(m.user?.name || '') || rx.test(m.user?.phone || ''));
          }
          if (st !== 'all') d = d.filter((m) => m.status === st);
          setRows(d);
          setTotal(d.length);
          setHasMore(false);
        }
      } else {
        const res = await api.get<MemberRow[]>(`/api/gym/${gymId}/members`, {
          page: p,
          limit: 20,
          search: q || undefined,
          status: st !== 'all' ? st : undefined,
        });
        if (res.success && Array.isArray(res.data)) {
          setRows((prev) => (append ? [...prev, ...res.data!] : res.data!));
          setTotal(Number(res.total) || 0);
          setHasMore(!!res.hasMore);
          setPage(p);
        }
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [gymId]
  );

  useEffect(() => {
    setRows([]);
    load(1, false, search, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId, status]);

  const onSearch = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, false, v, status), 400);
  };

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) load(page + 1, true, search, status);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading, page, search, status, load]);

  return (
    <div>
      <div className="grad-hero rounded-b-[28px] px-5 pb-5 pt-12 text-white safe-top">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">Members {total ? `(${total})` : ''}</h1>
          {can(user, 'canAddMember') && gymId !== 'all' && (
            <button className="rounded-full bg-white/20 p-2.5" onClick={() => setShowAdd(true)} aria-label="Add member">
              <UserPlus size={20} />
            </button>
          )}
        </div>
        <div className="mt-3">
          <GymSwitcher />
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/20 px-3.5 py-2.5">
          <Search size={17} className="text-white/80" />
          <input
            className="w-full bg-transparent text-sm text-white placeholder-white/70 outline-none"
            placeholder="Search by name or phone"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 pt-3">
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
          {STATUSES.map((s) => (
            <button key={s} className={`chip capitalize ${status === s ? 'chip-active' : ''}`} onClick={() => setStatus(s)}>
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty text="No members found." />
        ) : (
          <div className="card divide-y divide-border">
            {rows.map((m) => (
              <Link
                key={m._id}
                href={`/members/${m._id}?g=${m.gym?._id || gymId}`}
                className="flex items-center gap-3 p-3"
              >
                <Avatar src={m.user?.avatar} name={m.user?.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.user?.name}</p>
                  <p className="text-xs text-muted">
                    {PLAN_LABEL[m.plan] || m.plan} · Due {fmtDate(m.dueDate)}
                    {gymId === 'all' && m.gym ? ` · ${m.gym.name}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {m.status !== 'active' ? <StatusBadge status={m.status} /> : <DueBadge isDue={m.isDue} />}
                  <ChevronRight size={16} className="text-muted" />
                </div>
              </Link>
            ))}
          </div>
        )}
        <div ref={sentinel} />
        {loadingMore && <Loading />}
      </div>

      <AddMemberModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        gymId={gymId === 'all' ? gyms[0]?._id || '' : gymId}
        planPrices={gym?.planPrices || gyms[0]?.planPrices}
        onDone={(msg) => {
          show(msg, false);
          load(1, false, search, status);
        }}
        onError={show}
      />
      <Toast msg={toast.msg} error={toast.error} />
    </div>
  );
}

function AddMemberModal({
  open,
  onClose,
  gymId,
  planPrices,
  onDone,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  gymId: string;
  planPrices?: { [k: string]: number | undefined };
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState('monthly');
  const [fee, setFee] = useState('');
  const [avatar, setAvatar] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const preset = planPrices?.[plan];
    if (preset) setFee(String(preset));
  }, [plan, planPrices]);

  const submit = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!name.trim()) return onError('Enter member name');
    if (cleanPhone.length !== 10) return onError('Enter a valid 10-digit phone number');
    setBusy(true);
    const res = await api.post('/api/gym/members', {
      gymId,
      name: name.trim(),
      phone: cleanPhone,
      plan,
      fee: Number(fee) || 0,
      avatar: avatar || undefined,
    });
    setBusy(false);
    if (!res.success) return onError(res.message || 'Could not add member');
    if ((res as { alreadyMember?: boolean }).alreadyMember) return onError('This member is already added');
    setName('');
    setPhone('');
    setFee('');
    setAvatar('');
    onClose();
    onDone('Member added ✅');
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Member">
      <div className="mb-4">
        <PhotoPicker value={avatar} name={name} onChange={setAvatar} />
      </div>
      <div className="space-y-3">
        <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className="input"
          placeholder="Phone (10 digits)"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          maxLength={10}
        />
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {PLANS.map((p) => (
            <button key={p} className={`chip ${plan === p ? 'chip-active' : ''}`} onClick={() => setPlan(p)}>
              {PLAN_LABEL[p]}
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="Fee (₹)"
          type="number"
          inputMode="numeric"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
        />
        <button className="btn" onClick={submit} disabled={busy}>
          {busy ? 'Adding…' : 'Add Member'}
        </button>
      </div>
    </Modal>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={<Loading full />}>
      <MembersInner />
    </Suspense>
  );
}
