'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrashIcon } from '@/components/ui/icons';
import type { ServiceItem, ProductItem } from './item-selector';

export interface AttachedServiceItem {
  serviceId: string;
  quantity: number;
  customPrice?: number | null;
  notes?: string | null;
  service: ServiceItem;
}

export interface AttachedProductItem {
  productId: string;
  quantity: number;
  customPrice?: number | null;
  notes?: string | null;
  product: ProductItem;
}

interface AttachedItemsListProps<T extends 'service' | 'product'> {
  type: T;
  items: T extends 'service' ? AttachedServiceItem[] : AttachedProductItem[];
  onQuantityChange: (itemId: string, quantity: number) => void;
  onCustomPriceChange: (itemId: string, price: number | null) => void;
  onRemove: (itemId: string) => void;
  disabled?: boolean;
}

export function AttachedItemsList<T extends 'service' | 'product'>({
  type,
  items,
  onQuantityChange,
  onCustomPriceChange,
  onRemove,
  disabled = false,
}: AttachedItemsListProps<T>) {
  if (items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
        No {type === 'service' ? 'services' : 'products'} attached
      </div>
    );
  }

  const formatPrice = (cost: number | null | undefined) => {
    if (cost === null || cost === undefined) return '-';
    return `$${Number(cost).toFixed(2)}`;
  };

  const getLineTotal = (item: AttachedServiceItem | AttachedProductItem) => {
    const baseItem = 'service' in item ? item.service : item.product;
    const price = item.customPrice ?? baseItem.cost;
    if (price === null || price === undefined) return null;
    return Number(price) * item.quantity;
  };

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isService = 'service' in item;
        const baseItem = isService ? (item as AttachedServiceItem).service : (item as AttachedProductItem).product;
        const itemId = isService ? (item as AttachedServiceItem).serviceId : (item as AttachedProductItem).productId;
        const lineTotal = getLineTotal(item);

        return (
          <div
            key={itemId}
            className="flex items-center gap-3 p-3 bg-background border rounded-lg"
          >
            {/* Item Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{baseItem.title}</div>
              <div className="text-xs text-muted-foreground">
                Base: {formatPrice(baseItem.cost)}
                {'costUnitType' in baseItem && baseItem.costUnitType && ` / ${baseItem.costUnitType.toLowerCase()}`}
                {'priceUnitType' in baseItem && baseItem.priceUnitType && ` / ${baseItem.priceUnitType.toLowerCase()}`}
              </div>
            </div>

            {/* Quantity */}
            <div className="w-20">
              <Input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (value >= 1) {
                    onQuantityChange(itemId, value);
                  }
                }}
                disabled={disabled}
                className="h-8 text-center text-sm"
              />
            </div>

            {/* Custom Price */}
            <div className="w-24">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={baseItem.cost !== null ? String(baseItem.cost) : '0.00'}
                  value={item.customPrice ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      onCustomPriceChange(itemId, null);
                    } else {
                      const price = parseFloat(value);
                      if (!isNaN(price) && price >= 0) {
                        onCustomPriceChange(itemId, price);
                      }
                    }
                  }}
                  disabled={disabled}
                  className="h-8 pl-5 text-sm"
                />
              </div>
            </div>

            {/* Line Total */}
            <div className="w-20 text-right text-sm font-medium">
              {lineTotal !== null ? `$${lineTotal.toFixed(2)}` : '-'}
            </div>

            {/* Remove Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(itemId)}
              disabled={disabled}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      {/* Total */}
      <div className="flex justify-end items-center gap-4 pt-2 border-t">
        <span className="text-sm font-medium text-muted-foreground">
          {type === 'service' ? 'Services' : 'Products'} Total:
        </span>
        <span className="text-sm font-bold w-20 text-right">
          ${items.reduce((sum, item) => {
            const total = getLineTotal(item);
            return sum + (total ?? 0);
          }, 0).toFixed(2)}
        </span>
        <div className="w-8" /> {/* Spacer for alignment with remove button */}
      </div>
    </div>
  );
}
