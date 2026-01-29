'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, ColumnDef } from '@/components/common/data-table';
import { EditIcon, EyeIcon, TrashIcon } from '@/components/ui/icons';
import type { ProductTableRow } from '@/lib/types/product';
import { MINIMUM_PURCHASE_LABELS, PRICE_UNIT_TYPE_LABELS } from '@/lib/constants/enums';
import { useColumnLabels } from '@/lib/hooks/use-column-labels';
import { formatDollarOrPlaceholder } from '@/lib/utils/currency-formatter';

interface ProductTableProps {
  products: ProductTableRow[];
  isLoading?: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onSort: (column: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function ProductTable({
  products,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
  onSort,
  sortBy,
  sortOrder,
}: ProductTableProps) {
  const columnLabels = useColumnLabels('products', {
    productId: 'Product ID',
    title: 'Title',
    cost: 'Cost',
    priceUnitType: 'Unit',
    minimumPurchase: 'Minimum',
    trackInventory: 'Inventory',
    category: 'Category',
    status: 'Status',
    actions: 'Actions',
  });

  const columns: ColumnDef<ProductTableRow>[] = [
    {
      key: 'productId',
      label: columnLabels.productId,
      className: 'py-4 px-4 whitespace-nowrap',
      render: (product) => (
        <span className="font-mono text-sm text-muted-foreground">{product.productId}</span>
      ),
    },
    {
      key: 'title',
      label: columnLabels.title,
      sortable: true,
      className: 'py-4 px-4',
      render: (product) => <span className="font-medium text-foreground">{product.title}</span>,
    },
    {
      key: 'cost',
      label: columnLabels.cost,
      sortable: true,
      className: 'py-4 px-4 whitespace-nowrap text-sm text-muted-foreground',
      render: (product) => formatDollarOrPlaceholder(product.cost),
    },
    {
      key: 'priceUnitType',
      label: columnLabels.priceUnitType,
      className: 'py-4 px-4 whitespace-nowrap text-sm text-muted-foreground',
      render: (product) =>
        product.priceUnitType ? PRICE_UNIT_TYPE_LABELS[product.priceUnitType] : '-',
    },
    {
      key: 'minimumPurchase',
      label: columnLabels.minimumPurchase,
      className: 'py-4 px-4 whitespace-nowrap text-sm text-muted-foreground',
      render: (product) =>
        product.minimumPurchase ? MINIMUM_PURCHASE_LABELS[product.minimumPurchase] : '-',
    },
    {
      key: 'trackInventory',
      label: columnLabels.trackInventory,
      className: 'py-4 px-4 whitespace-nowrap text-sm text-muted-foreground',
      render: (product) => (product.trackInventory ? 'Yes' : 'No'),
    },
    {
      key: 'category',
      label: columnLabels.category,
      sortable: true,
      className: 'py-4 px-4 whitespace-nowrap text-sm text-muted-foreground',
      render: (product) => product.category || '-',
    },
    {
      key: 'status',
      label: columnLabels.status,
      className: 'py-4 px-4 whitespace-nowrap',
      render: (product) => (
        <Badge variant={product.isActive ? 'success' : 'secondary'} asSpan>
          {product.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: columnLabels.actions,
      className: 'py-4 px-4',
      headerClassName: 'text-right py-3 px-4',
      render: (product) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={() => onView(product.id)}
            title="View product details"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={() => onEdit(product.id)}
            title="Edit product"
          >
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleActive(product.id, !product.isActive)}
            title={product.isActive ? 'Deactivate product' : 'Activate product'}
          >
            {product.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(product.id)}
            title="Delete product"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (product: ProductTableRow) => {
    return (
      <div key={product.id} className="bg-card rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="font-mono text-xs text-muted-foreground mb-1">{product.productId}</div>
            <h3 className="font-semibold text-card-foreground">{product.title}</h3>
            <div className="text-sm text-muted-foreground mt-1">
              {formatDollarOrPlaceholder(product.cost)}
            </div>
          </div>
          <Badge variant={product.isActive ? 'success' : 'secondary'} asSpan>
            {product.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(product.id)}
            className="flex-1"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(product.id)}
            className="flex-1"
          >
            <EditIcon className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(product.id)}
            className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <TrashIcon className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DataTable
      data={products}
      columns={columns}
      isLoading={isLoading}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      getRowKey={(product) => product.id}
      emptyMessage="No products found"
      mobileCard={renderMobileCard}
      minWidth="1100px"
    />
  );
}

