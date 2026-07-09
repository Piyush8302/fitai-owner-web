'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer } from 'lucide-react';
import { API_BASE_URL, type Gym } from '@/lib/api';
import { Modal } from './ui';

// Static wall QR — encodes the public check-in URL (never changes, printable).
export default function QrModal({ open, onClose, gym }: { open: boolean; onClose: () => void; gym: Gym }) {
  const [dataUrl, setDataUrl] = useState('');
  const url = `${API_BASE_URL}/g/${gym.gymCode}`;

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 480, margin: 2 }).then(setDataUrl).catch(() => {});
  }, [open, url]);

  return (
    <Modal open={open} onClose={onClose} title={`${gym.name} — Wall QR`}>
      <div className="flex flex-col items-center gap-3">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="Gym check-in QR" className="w-64 rounded-2xl border border-border" />
        ) : (
          <div className="spinner" />
        )}
        <p className="text-center text-xs text-muted">
          Members scan this to check in (GPS geofence protected).
          <br />
          Gym Code: <b>{gym.gymCode}</b>
        </p>
        <button
          className="btn"
          onClick={() => {
            const w = window.open('', '_blank');
            if (!w) return;
            w.document.write(
              `<html><head><title>${gym.name} QR</title></head><body style="display:flex;flex-direction:column;align-items:center;font-family:sans-serif"><h2>${gym.name}</h2><img src="${dataUrl}" style="width:420px"/><p>Scan to check in · ${gym.gymCode}</p><script>window.onload=()=>window.print()</script></body></html>`
            );
            w.document.close();
          }}
        >
          <Printer size={17} /> Print QR
        </button>
      </div>
    </Modal>
  );
}
