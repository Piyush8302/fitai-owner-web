'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Avatar({ src, name, size = 44 }: { src?: string; name?: string; size?: number }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="grad-hero flex items-center justify-center rounded-full font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-200 text-gray-600',
  blocked: 'bg-red-100 text-red-700',
  left: 'bg-orange-100 text-orange-700',
  expired: 'bg-yellow-100 text-yellow-700',
  frozen: 'bg-blue-100 text-blue-700',
};

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  return <span className={`badge capitalize ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

export function DueBadge({ isDue }: { isDue?: boolean }) {
  return isDue ? <span className="badge bg-red-100 text-red-700">Fee Due</span> : null;
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  // With viewport interactive-widget=resizes-visual the keyboard overlays the
  // page instead of resizing it — so lift the sheet by the keyboard height,
  // otherwise the submit button hides behind the keyboard.
  const [kb, setKb] = useState(0);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!open || !vv) {
      setKb(0);
      return () => {
        document.body.style.overflow = '';
      };
    }
    const onResize = () => setKb(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    onResize();
    return () => {
      document.body.style.overflow = '';
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="sheet w-full max-w-md overflow-y-auto rounded-t-[30px] bg-card px-5 pb-8 pt-3 safe-bottom"
        style={{
          marginBottom: kb,
          maxHeight: kb ? `calc(100dvh - ${kb + 24}px)` : '88dvh',
          transition: 'margin-bottom 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[19px] font-bold tracking-tight">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-surface p-2 active:scale-90 transition-transform" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Loading({ full }: { full?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${full ? 'min-h-[60dvh]' : 'py-10'}`}>
      <div className="spinner" />
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted">{text}</p>;
}

export function Toast({ msg, error }: { msg: string; error?: boolean }) {
  if (!msg) return null;
  return (
    <div
      className={`fixed bottom-28 left-1/2 z-[60] w-[88%] max-w-sm -translate-x-1/2 rounded-2xl px-4 py-3.5 text-center text-sm font-semibold text-white shadow-xl backdrop-blur ${
        error ? 'bg-error/95' : 'bg-ink/92'
      }`}
    >
      {msg}
    </div>
  );
}
