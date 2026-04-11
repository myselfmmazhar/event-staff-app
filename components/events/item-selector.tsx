'use client';

import { useState, useMemo } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchIcon, PlusIcon, ChevronDownIcon, CheckIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/client/trpc';

export interface ServiceItem {
  id: string;
  serviceId: string;
  title: string;
  cost: number | null;
  price: number | null;
  costUnitType: string | null;
  description: string | null;
  isActive: boolean;
}

export interface ProductItem {
  id: string;
  productId: string;
  title: string;
  cost: number | null;
  price: number | null;
  priceUnitType: string | null;
  description: string | null;
  category: string | null;
  isActive: boolean;
}

interface ItemSelectorProps<T extends 'service' | 'product'> {
  type: T;
  excludeIds: string[];
  onSelect: (item: T extends 'service' ? ServiceItem : ProductItem) => void;
  onCreateNew?: () => void;
  disabled?: boolean;
}

export function ItemSelector<T extends 'service' | 'product'>({
  type,
  excludeIds,
  onSelect,
  onCreateNew,
  disabled = false,
}: ItemSelectorProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch services or products based on type
  const servicesQuery = trpc.service.getAll.useQuery(
    { search: '', isActive: true, limit: 100 },
    { enabled: type === 'service' }
  );

  const productsQuery = trpc.product.getAll.useQuery(
    { search: '', isActive: true, limit: 100 },
    { enabled: type === 'product' }
  );

  const isLoading = type === 'service' ? servicesQuery.isLoading : productsQuery.isLoading;

  // Get items based on type
  const items = useMemo(() => {
    if (type === 'service') {
      const data = servicesQuery.data?.data || [];
      return data
        .filter((item) => !excludeIds.includes(item.id))
        .filter((item) =>
          search.trim() === '' ||
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.serviceId.toLowerCase().includes(search.toLowerCase())
        ) as ServiceItem[];
    } else {
      const data = productsQuery.data?.data || [];
      return data
        .filter((item) => !excludeIds.includes(item.id))
        .filter((item) =>
          search.trim() === '' ||
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.productId.toLowerCase().includes(search.toLowerCase()) ||
          (item.category && item.category.toLowerCase().includes(search.toLowerCase()))
        ) as ProductItem[];
    }
  }, [type, servicesQuery.data, productsQuery.data, excludeIds, search]);

  const handleSelect = (item: ServiceItem | ProductItem) => {
    onSelect(item as T extends 'service' ? ServiceItem : ProductItem);
    setOpen(false);
    setSearch('');
  };

  const formatPrice = (cost: number | null) => {
    if (cost === null || cost === undefined) return '';
    return `$${Number(cost).toFixed(2)}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Add {type === 'service' ? 'Service' : 'Product'}
          <ChevronDownIcon className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${type === 'service' ? 'services' : 'products'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {search ? 'No items found' : `No ${type === 'service' ? 'services' : 'products'} available`}
            </div>
          ) : (
            <div className="py-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-accent/50 transition-colors',
                  )}
                  onClick={() => handleSelect(item)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {'serviceId' in item ? item.serviceId : item.productId}
                      {'category' in item && item.category && ` • ${item.category}`}
                    </div>
                  </div>
                  {item.cost !== null && (
                    <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                      {formatPrice(item.cost)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {onCreateNew && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => {
                onCreateNew();
                setOpen(false);
              }}
            >
              <PlusIcon className="h-4 w-4" />
              Create New {type === 'service' ? 'Service' : 'Product'}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
