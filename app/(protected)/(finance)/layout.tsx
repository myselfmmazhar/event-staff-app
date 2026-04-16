'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Banknote, FileText, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs: Array<{
    name: string;
    href: string;
    description: string;
    icon: LucideIcon;
  }> = [
    {
      name: 'Bills',
      href: '/bills',
      description: 'Manage spend and payments',
      icon: Banknote,
    },
    {
      name: 'Estimates',
      href: '/estimates',
      description: 'Quotes and approvals',
      icon: FileText,
    },
    {
      name: 'Invoices',
      href: '/invoices',
      description: 'Customer billing',
      icon: Receipt,
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Finance Manager</h1>
          <p className="text-muted-foreground mt-1 text-sm text-amber-500/80 italic">
            Overview of your financial operations, including incoming estimates, outgoing bills, and customer invoices.
          </p>
        </div>

        <div className="flex items-center gap-1 border-b border-border w-full overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "group relative px-6 py-3 transition-all duration-200 border-b-2 -mb-[2px]",
                  isActive
                    ? "text-primary border-primary font-semibold z-10"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/30"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  <span className="whitespace-nowrap">{tab.name}</span>
                </div>
                {isActive && (
                  <div className="absolute inset-0 bg-primary/5 rounded-t-lg -z-10 animate-in fade-in duration-300" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
