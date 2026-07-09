'use client';

import { useRef } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { Avatar } from './ui';
import { fileToSmallBase64 } from '@/lib/image';

// Camera + Gallery photo picker (same UX as the app / web check-in pages).
// Camera opens the device camera directly; Gallery opens the photo library.
export default function PhotoPicker({
  value,
  name,
  onChange,
  size = 72,
}: {
  value?: string;
  name?: string;
  onChange: (base64: string) => void;
  size?: number;
}) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onChange(await fileToSmallBase64(f));
    e.target.value = '';
  };

  return (
    <div className="flex flex-col items-center gap-2.5">
      <Avatar src={value} name={name || '+'} size={size} />
      <div className="flex gap-2">
        <button type="button" className="chip" onClick={() => camRef.current?.click()}>
          <Camera size={14} /> Camera
        </button>
        <button type="button" className="chip" onClick={() => galRef.current?.click()}>
          <ImageIcon size={14} /> Gallery
        </button>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={handle} />
    </div>
  );
}
