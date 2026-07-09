'use client';

import { useEffect } from 'react';
import { registerSW } from '@/lib/push';

export default function SWRegister() {
  useEffect(() => {
    registerSW();
    // Ask the browser for persistent storage so login/session data survives
    // automatic cache eviction (does not protect against a manual "clear data").
    try {
      navigator.storage?.persist?.();
    } catch {
      // older browsers — ignore
    }
  }, []);
  return null;
}
