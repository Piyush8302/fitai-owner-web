'use client';

import { useEffect, useState } from 'react';
import { api, PLANS, PLAN_LABEL, type MemberRow } from '@/lib/api';
import { Modal } from './ui';

// Mark-payment sheet — used from the member detail page AND the members list
// quick action. Pre-fills the fee from the gym's plan prices / member's fee.
export default function PaymentModal({
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
  const [method, setMethod] = useState<'cash' | 'online'>('cash');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlan(membership.plan || 'monthly');
    setAmount(String(membership.fee || ''));
    setMethod('cash');
    setDueDate('');
  }, [open, membership]);

  useEffect(() => {
    const preset = planPrices?.[plan];
    if (preset) setAmount(String(preset));
  }, [plan, planPrices]);

  const submit = async (allowRenew = false) => {
    if (!Number(amount)) return onError('Enter the amount');
    setBusy(true);
    const res = await api.post('/api/gym/payment', {
      membershipId: membership._id,
      amount: Number(amount),
      plan,
      method,
      dueDate: dueDate || undefined,
      allowRenew,
    });
    setBusy(false);
    if (!res.success) {
      if ((res as { alreadyPaid?: boolean }).alreadyPaid) {
        if (confirm(`${res.message}\n\nRenew in advance anyway?`)) return submit(true);
        return;
      }
      return onError(res.message || 'Payment failed');
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
          <label className="mb-1.5 block text-xs font-semibold text-muted">Paid by</label>
          <div className="flex gap-2">
            {(['cash', 'online'] as const).map((m) => (
              <button
                key={m}
                className={`chip flex-1 justify-center ${method === m ? 'chip-active' : ''}`}
                onClick={() => setMethod(m)}
              >
                {m === 'cash' ? '💵 Cash' : '📲 Online'}
              </button>
            ))}
          </div>
        </div>
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
