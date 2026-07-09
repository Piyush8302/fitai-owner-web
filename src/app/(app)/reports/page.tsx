'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { api, fmtDate, fmtMoney, PLAN_LABEL } from '@/lib/api';
import { useApp } from '@/lib/store';
import GymSwitcher from '@/components/GymSwitcher';
import { Loading, Empty } from '@/components/ui';

type Report = {
  gym: { name?: string; location?: string };
  month: string;
  rows: {
    name: string;
    phone: string;
    plan: string;
    fee: number;
    present: number;
    paid: number;
    isDue: boolean;
    dueDate?: string;
    status: string;
  }[];
  totals: { members: number; totalPresent: number; totalCollected: number; totalDue: number; pendingAmount: number };
};

const monthStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function ReportsPage() {
  const router = useRouter();
  const { gymId, gyms, setGymId } = useApp();
  const [month, setMonth] = useState(monthStr());
  const [months, setMonths] = useState(1);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gymId === 'all' && gyms.length) setGymId(gyms[0]._id);
  }, [gymId, gyms, setGymId]);

  const load = useCallback(async () => {
    if (!gymId || gymId === 'all') return;
    setLoading(true);
    const res = await api.get<Report>(`/api/gym/${gymId}/report`, { month, months });
    if (res.success && res.data) setReport(res.data);
    setLoading(false);
  }, [gymId, month, months]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 px-5 pb-3 pt-14 backdrop-blur-xl safe-top print:hidden">
        <button onClick={() => router.back()} className="icon-btn mb-4" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-extrabold tracking-tight">Reports</h1>
          <button className="icon-btn" onClick={() => window.print()} aria-label="Print report">
            <Printer size={18} />
          </button>
        </div>
        <div className="mt-3">
          <GymSwitcher allowAll={false} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="month"
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-sm outline-none"
            value={month}
            onChange={(e) => setMonth(e.target.value || monthStr())}
          />
          <button className={`chip ${months === 1 ? 'chip-active' : ''}`} onClick={() => setMonths(1)}>
            1 Month
          </button>
          <button className={`chip ${months === 3 ? 'chip-active' : ''}`} onClick={() => setMonths(3)}>
            3 Months
          </button>
        </div>
      </div>

      <div className="px-4">
        {loading ? (
          <Loading />
        ) : !report ? (
          <Empty text="Could not load the report." />
        ) : (
          <>
            <div className="mb-3 text-center">
              <h2 className="text-lg font-extrabold">{report.gym?.name}</h2>
              <p className="text-xs text-muted">{report.month}</p>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <Stat label="Members" value={String(report.totals.members)} />
              <Stat label="Total Check-ins" value={String(report.totals.totalPresent)} />
              <Stat label="Collected" value={fmtMoney(report.totals.totalCollected)} good />
              <Stat label={`Pending (${report.totals.totalDue})`} value={fmtMoney(report.totals.pendingAmount)} bad />
            </div>

            <div className="card overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="p-2.5">Member</th>
                    <th className="p-2.5">Plan</th>
                    <th className="p-2.5 text-center">Days</th>
                    <th className="p-2.5 text-right">Paid</th>
                    <th className="p-2.5 text-right">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="p-2.5">
                        <p className="font-semibold">{r.name}</p>
                        <p className="text-[10px] text-muted">{r.phone}</p>
                      </td>
                      <td className="p-2.5">{PLAN_LABEL[r.plan] || r.plan}</td>
                      <td className="p-2.5 text-center font-semibold">{r.present}</td>
                      <td className="p-2.5 text-right font-semibold text-success">{r.paid ? fmtMoney(r.paid) : '—'}</td>
                      <td className={`p-2.5 text-right ${r.isDue ? 'font-bold text-error' : 'text-muted'}`}>
                        {r.isDue ? fmtDate(r.dueDate) : 'OK'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="card p-3.5">
      <p className={`text-xl font-extrabold ${good ? 'text-success' : bad ? 'text-error' : 'text-ink'}`}>{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
