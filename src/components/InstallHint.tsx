'use client';

import { useEffect, useState } from 'react';
import { Share, X } from 'lucide-react';
import { isIOS, isStandalone } from '@/lib/push';

// iOS Safari can't auto-prompt install and gives push ONLY to installed PWAs —
// so nudge iPhone users to Add to Home Screen (dismissable, remembered).
export default function InstallHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (isIOS() && !isStandalone() && !localStorage.getItem('installHintDismissed')) setShow(true);
  }, []);
  if (!show) return null;
  return (
    <div className="card mb-3 flex items-start gap-3 border border-primary/20 p-3.5">
      <div className="rounded-xl bg-primary/10 p-2 text-primary">
        <Share size={18} />
      </div>
      <div className="flex-1 text-xs leading-relaxed text-ink-2">
        <b>iPhone pe app jaisa use karo + notifications pao:</b> Safari me{' '}
        <b>Share <Share size={11} className="inline" /></b> dabao → <b>&ldquo;Add to Home Screen&rdquo;</b> select karo.
        Installed app me hi push notifications milte hain.
      </div>
      <button
        onClick={() => {
          localStorage.setItem('installHintDismissed', '1');
          setShow(false);
        }}
        aria-label="Dismiss"
      >
        <X size={16} className="text-muted" />
      </button>
    </div>
  );
}
