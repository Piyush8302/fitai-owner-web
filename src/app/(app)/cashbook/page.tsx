'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { api, can, fmtDate, fmtMoney } from '@/lib/api';
import { useApp } from '@/lib/store';
import GymSwitcher from '@/components/GymSwitcher';
import { Loading, Empty, Modal, Toast } from '@/components/ui';

type Entry = {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  description?: string;
  source?: string;
  method?: 'cash' | 'online';
  date: string;
  gym?: { name?: string };
};
type Book = { entries: Entry[]; income: number; expense: number; balance: number };

const monthStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function CashbookPage() {
  const { user, gymId } = useApp();
  const [book, setBook] = useState<Book | null>(null);
  const [month, setMonth] = useState(monthStr());
  const [view, setView] = useState<'month' | 'today'>('month');
  const [loading, setLoading] = useState(true);
  const [addType, setAddType] = useState<'income' | 'expense' | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean }>({ msg: '' });

  const show = (msg: string, error = true) => {
    setToast({ msg, error });
    setTimeout(() => setToast({ msg: '' }), 3000);
  };

  const load = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    const path = gymId === 'all' ? '/api/gym/all/cashbook' : `/api/gym/${gymId}/cashbook`;
    const res = await api.get<Book>(path, { month });
    if (res.success && res.data) setBook(res.data);
    setLoading(false);
  }, [gymId, month]);

  useEffect(() => {
    load();
  }, [load]);

  const todayKey = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const entries = (book?.entries || []).filter((e) => {
    if (view !== 'today') return true;
    return new Date(new Date(e.date).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10) === todayKey;
  });
  const shownIncome = entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const shownExpense = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 px-5 pb-3 pt-14 backdrop-blur-xl safe-top">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-extrabold tracking-tight">Cashbook</h1>
          <input
            type="month"
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-sm outline-none"
            value={month}
            onChange={(e) => setMonth(e.target.value || monthStr())}
          />
        </div>
        <div className="mt-3">
          <GymSwitcher />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-[18px] border border-success/15 bg-success/10 p-3">
            <p className="text-[15px] font-extrabold tracking-tight text-success">{fmtMoney(shownIncome)}</p>
            <p className="text-[10.5px] font-semibold text-success/70">Income ↑</p>
          </div>
          <div className="rounded-[18px] border border-error/15 bg-error/10 p-3">
            <p className="text-[15px] font-extrabold tracking-tight text-error">{fmtMoney(shownExpense)}</p>
            <p className="text-[10.5px] font-semibold text-error/70">Expense ↓</p>
          </div>
          <div className="rounded-[18px] border border-primary/15 bg-primary/10 p-3">
            <p className="text-[15px] font-extrabold tracking-tight text-primary">{fmtMoney(shownIncome - shownExpense)}</p>
            <p className="text-[10.5px] font-semibold text-primary/70">Balance</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button className={`chip ${view === 'month' ? 'chip-active' : ''}`} onClick={() => setView('month')}>
              This Month
            </button>
            <button className={`chip ${view === 'today' ? 'chip-active' : ''}`} onClick={() => setView('today')}>
              Today
            </button>
          </div>
          {gymId !== 'all' && can(user, 'canAccessCashbook') && (
            <div className="flex gap-2">
              <button
                className="chip border-success bg-success text-white shadow-md shadow-success/30"
                onClick={() => setAddType('income')}
              >
                <Plus size={13} /> Income
              </button>
              <button
                className="chip border-error bg-error text-white shadow-md shadow-error/30"
                onClick={() => setAddType('expense')}
              >
                <Minus size={13} /> Expense
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <Loading />
        ) : entries.length === 0 ? (
          <Empty text="No entries yet." />
        ) : (
          <div className="card divide-y divide-border">
            {entries.map((e) => (
              <div key={e._id} className="flex items-center gap-3 p-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    e.type === 'income' ? 'bg-green-100 text-success' : 'bg-red-100 text-error'
                  }`}
                >
                  {e.type === 'income' ? <Plus size={16} /> : <Minus size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.description || (e.type === 'income' ? 'Income' : 'Expense')}</p>
                  <p className="text-xs text-muted">
                    {fmtDate(e.date)}
                    {e.gym?.name ? ` · ${e.gym.name}` : ''}
                    {e.method ? ` · ${e.method === 'online' ? '📲 Online' : '💵 Cash'}` : ''}
                  </p>
                </div>
                <span className={`text-sm font-bold ${e.type === 'income' ? 'text-success' : 'text-error'}`}>
                  {e.type === 'income' ? '+' : '−'}
                  {fmtMoney(e.amount)}
                </span>
                {can(user, 'canAccessCashbook') && (
                  <button
                    onClick={async () => {
                      // Membership rows mirror a real payment — deleting only removes
                      // the ledger line, it does NOT undo the payment or the due date.
                      const warn =
                        e.source === 'membership'
                          ? 'This entry came from a member payment.\n\nDeleting it only removes it from the cashbook — the payment and the member\'s due date stay as they are.\n\nDelete anyway?'
                          : 'Delete this entry?';
                      if (!confirm(warn)) return;
                      const res = await api.del(`/api/gym/cashbook/${e._id}`);
                      if (!res.success) return show(res.message || 'Delete failed');
                      load();
                    }}
                    aria-label="Delete entry"
                  >
                    <Trash2 size={15} className="text-muted" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!addType} onClose={() => setAddType(null)} title={addType === 'income' ? 'Add Income' : 'Add Expense'}>
        {addType && (
          <AddEntryForm
            type={addType}
            gymId={gymId}
            onDone={() => {
              setAddType(null);
              show('Entry added ✅', false);
              load();
            }}
            onError={show}
          />
        )}
      </Modal>
      <Toast msg={toast.msg} error={toast.error} />
    </div>
  );
}

function AddEntryForm({
  type,
  gymId,
  onDone,
  onError,
}: {
  type: 'income' | 'expense';
  gymId: string;
  onDone: () => void;
  onError: (m: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <input
        className="input"
        type="number"
        inputMode="numeric"
        placeholder="Amount (₹)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        className="input"
        placeholder="Description (e.g. Electricity bill)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button
        className={`btn ${type === 'expense' ? 'btn-danger' : ''}`}
        disabled={busy || !Number(amount)}
        onClick={async () => {
          setBusy(true);
          const res = await api.post('/api/gym/cashbook', { gymId, type, amount: Number(amount), description });
          setBusy(false);
          if (!res.success) return onError(res.message || 'Could not add entry');
          onDone();
        }}
      >
        {busy ? 'Saving…' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
      </button>
    </div>
  );
}
