'use client';

import { Badge } from '@/components/ui/badge';
import { CloseIcon } from '@/components/ui/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Product } from '@/lib/types/product';
import {
  MINIMUM_PURCHASE_LABELS,
  PRICE_UNIT_TYPE_LABELS,
} from '@/lib/constants/enums';
import { formatDollarOrPlaceholder } from '@/lib/utils/currency-formatter';

interface ViewProductModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export function ViewProductModal({ product, open, onClose }: ViewProductModalProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose} className="max-w-3xl">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>Product Details</DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-muted-foreground">{product.productId}</div>
              <h3 className="text-lg font-semibold text-foreground">{product.title}</h3>
            </div>
            <Badge variant={product.isActive ? 'success' : 'secondary'} asSpan>
              {product.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Cost</div>
              <div className="text-foreground font-medium">
                {formatDollarOrPlaceholder(product.cost)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Price Unit</div>
              <div className="text-foreground font-medium">
                {product.priceUnitType ? PRICE_UNIT_TYPE_LABELS[product.priceUnitType] : '-'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Minimum Purchase</div>
              <div className="text-foreground font-medium">
                {product.minimumPurchase ? MINIMUM_PURCHASE_LABELS[product.minimumPurchase] : '-'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Track Inventory</div>
              <div className="text-foreground font-medium">{product.trackInventory ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Category</div>
              <div className="text-foreground font-medium">{product.category || '-'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Supplier</div>
              <div className="text-foreground font-medium">{product.supplier || '-'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Brand</div>
              <div className="text-foreground font-medium">{product.brand || '-'}</div>
            </div>
          </div>

          {product.description && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">Description</div>
              <div className="text-sm text-foreground whitespace-pre-wrap">{product.description}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

