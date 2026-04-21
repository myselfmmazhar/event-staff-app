'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import {
  SquaresIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  MapPinIcon,
  ClipboardListIcon,
} from '@/components/ui/icons';
import { trpc as api } from '@/lib/client/trpc';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Tab = {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};

const ALL_TABS: Tab[] = [
  { id: 'categories', name: 'Categories', href: '/catalog/categories', icon: SquaresIcon },
  { id: 'requirements', name: 'Requirements', href: '/catalog/requirements', icon: ClipboardListIcon },
  { id: 'services', name: 'Services', href: '/catalog/services', icon: WrenchScrewdriverIcon },
  { id: 'products', name: 'Products', href: '/catalog/products', icon: CubeIcon },
  { id: 'locations', name: 'Locations', href: '/catalog/locations', icon: MapPinIcon, disabled: true },
];

function SortableTab({ tab, isActive }: { tab: Tab; isActive: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
    disabled: tab.disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = tab.icon;

  if (tab.disabled) {
    return (
      <div
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
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-1 px-4 py-3 transition-all duration-200 border-b-2 -mb-[2px]",
        isActive
          ? "text-primary border-primary font-semibold translate-y-[2px] z-10"
          : "text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/30"
      )}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
        onClick={(e) => e.preventDefault()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <Link href={tab.href} className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
        <span className="whitespace-nowrap">{tab.name}</span>
      </Link>
      {isActive && (
        <div className="absolute inset-0 bg-primary/5 rounded-t-lg -z-10 animate-in fade-in duration-300" />
      )}
    </div>
  );
}

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tabs, setTabs] = useState<Tab[]>(ALL_TABS);

  const { data: prefs } = api.userPreference.getTabOrders.useQuery();
  const saveOrder = api.userPreference.saveCatalogTabOrder.useMutation();

  useEffect(() => {
    if (prefs?.catalogTabOrder?.length) {
      const ordered = prefs.catalogTabOrder
        .map((id) => ALL_TABS.find((t) => t.id === id))
        .filter(Boolean) as Tab[];
      const missing = ALL_TABS.filter((t) => !prefs.catalogTabOrder.includes(t.id));
      setTabs([...ordered, ...missing]);
    }
  }, [prefs]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setTabs((prev) => {
      const oldIndex = prev.findIndex((t) => t.id === active.id);
      const newIndex = prev.findIndex((t) => t.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      saveOrder.mutate({ order: next.map((t) => t.id) });
      return next;
    });
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Catalog Manager</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your organization&apos;s catalog including service categories, individual services, product inventory, and operational locations.
          </p>
        </div>

        <div className="flex items-center gap-1 border-b border-border w-full">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={tabs.filter((t) => !t.disabled).map((t) => t.id)}
              strategy={horizontalListSortingStrategy}
            >
              {tabs.map((tab) => (
                <SortableTab key={tab.id} tab={tab} isActive={pathname.startsWith(tab.href)} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
