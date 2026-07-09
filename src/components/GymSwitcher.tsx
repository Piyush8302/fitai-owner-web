'use client';

import { useApp } from '@/lib/store';

// Horizontal gym chips — mirrors the app's swipe-to-switch-gym. Owners with
// multiple branches also get an "All Gyms" combined view.
export default function GymSwitcher({ allowAll = true }: { allowAll?: boolean }) {
  const { gyms, gymId, setGymId } = useApp();
  if (gyms.length <= 1 && !allowAll) return null;
  if (gyms.length === 0) return null;
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      {gyms.map((g) => (
        <button
          key={g._id}
          className={`chip ${gymId === g._id ? 'chip-active' : ''}`}
          onClick={() => setGymId(g._id)}
        >
          {g.name}
        </button>
      ))}
      {allowAll && gyms.length > 1 && (
        <button className={`chip ${gymId === 'all' ? 'chip-active' : ''}`} onClick={() => setGymId('all')}>
          All Gyms
        </button>
      )}
    </div>
  );
}
