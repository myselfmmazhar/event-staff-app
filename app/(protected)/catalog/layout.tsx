'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SquaresIcon, WrenchScrewdriverIcon, CubeIcon, MapPinIcon } from '@/components/ui/icons';

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { 
      name: 'Categories', 
      href: '/catalog/categories', 
      description: 'Service categories', 
      icon: SquaresIcon 
    },
    { 
      name: 'Services', 
      href: '/catalog/services', 
      description: 'Available services', 
      icon: WrenchScrewdriverIcon 
    },
    { 
      name: 'Products', 
      href: '/catalog/products', 
      description: 'Physical products', 
      icon: CubeIcon 
    },
    { 
      name: 'Locations', 
      href: '/catalog/locations', 
      description: 'Service areas', 
      icon: MapPinIcon,
      disabled: true
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Catalog Manager</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your organization&apos;s catalog including service categories, individual services, product inventory, and operational locations.
          </p>
        </div>

        <div className="flex items-center gap-1 border-b border-border w-full overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            
            if (tab.disabled) {
              return (
                <div
                  key={tab.name}
                  className="group relative px-6 py-3 border-b-2 -mb-[2px] border-transparent text-muted-foreground/40 cursor-not-allowed select-none"
                  title="Coming Soon"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="whitespace-nowrap">{tab.name}</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-tight">Soon</span>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "group relative px-6 py-3 transition-all duration-200 border-b-2 -mb-[2px]",
                  isActive
                    ? "text-primary border-primary font-semibold translate-y-[2px] z-10"
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
