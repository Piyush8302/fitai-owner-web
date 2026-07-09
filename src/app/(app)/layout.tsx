'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, IndianRupee, Wallet, Menu } from 'lucide-react';
import { AppProvider, useApp } from '@/lib/store';
import { can } from '@/lib/api';
import { Loading } from '@/components/ui';

function BottomNav() {
  const path = usePathname();
  const { user } = useApp();
  const tabs = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/members', label: 'Members', icon: Users },
    { href: '/fees', label: 'Fees', icon: IndianRupee },
    ...(can(user, 'canAccessCashbook') ? [{ href: '/cashbook', label: 'Cash', icon: Wallet }] : []),
    { href: '/more', label: 'More', icon: Menu },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-card safe-bottom">
      <div className="flex">
        {tabs.map((t) => {
          const active = path.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                active ? 'text-primary' : 'text-muted'
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { ready } = useApp();
  if (!ready) return <Loading full />;
  return (
    <>
      <main className="pb-24">{children}</main>
      <BottomNav />
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
