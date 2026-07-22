'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, MapPin } from 'lucide-react';
import { API_BASE_URL, api, can, type Gym } from '@/lib/api';
import { useApp } from '@/lib/store';
import { Modal } from './ui';

// Static wall QR — encodes the public check-in URL (never changes, printable).
export default function QrModal({ open, onClose, gym }: { open: boolean; onClose: () => void; gym: Gym }) {
  const { user } = useApp();
  const [dataUrl, setDataUrl] = useState('');
  const [locBusy, setLocBusy] = useState(false);
  const [locMsg, setLocMsg] = useState<{ msg: string; error: boolean } | null>(null);
  const url = `${API_BASE_URL}/g/${gym.gymCode}`;

  useEffect(() => {
    if (!open) return;
    setLocMsg(null);
    QRCode.toDataURL(url, { width: 480, margin: 2 }).then(setDataUrl).catch(() => {});
  }, [open, url]);

  // Same flow as the mobile app's "Set gym location": capture THIS device's GPS
  // and save it as the gym's check-in geofence center. Stand inside the gym.
  const setGymLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocMsg({ msg: 'This browser has no location support. Use the mobile app instead.', error: true });
      return;
    }
    if (!window.confirm('Stand INSIDE the gym — your current spot becomes the check-in area (100m). Continue?')) return;
    setLocBusy(true);
    setLocMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const res = await api.put(`/api/gym/${gym._id}/location`, { lat, lng });
        setLocBusy(false);
        if (res.success) setLocMsg({ msg: `📍 ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${Math.round(accuracy || 0)}m) — ${res.message}`, error: false });
        else setLocMsg({ msg: res.message || 'Could not save location', error: true });
      },
      (err) => {
        setLocBusy(false);
        setLocMsg({
          msg:
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied. Allow location for this site (browser settings) and try again.'
              : 'Could not get your location. Move near a window / outdoors, make sure GPS is on, and retry.',
          error: true,
        });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

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
        {can(user, 'canSetLocation') && (
          <button className="btn w-full" onClick={setGymLocation} disabled={locBusy}>
            <MapPin size={17} /> {locBusy ? 'Getting location…' : 'Set gym location'}
          </button>
        )}
        {locMsg && (
          <p className={`text-center text-xs font-semibold ${locMsg.error ? 'text-error' : 'text-success'}`}>{locMsg.msg}</p>
        )}
      </div>
    </Modal>
  );
}
