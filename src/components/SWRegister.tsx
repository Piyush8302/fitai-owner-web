'use client';

import { useEffect } from 'react';
import { registerSW } from '@/lib/push';

export default function SWRegister() {
  useEffect(() => {
    registerSW();
  }, []);
  return null;
}
