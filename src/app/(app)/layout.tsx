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
    <nav className="tabbar">
      <div className="flex px-2 py-1.5">
        {tabs.map((t) => {
          const active = path.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10.5px] font-semibold ${
                active ? 'text-primary' : 'text-muted'
              }`}
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  active ? 'bg-primary/12' : ''
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              </span>
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
      <main className="pb-32">{children}</main>
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
