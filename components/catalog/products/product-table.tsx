'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, ColumnDef } from '@/components/common/data-table';
import { EditIcon, TrashIcon } from '@/components/ui/icons';
import type { ProductTableRow } from '@/lib/types/product';
import { MINIMUM_PURCHASE_LABELS, PRICE_UNIT_TYPE_LABELS } from '@/lib/constants/enums';
import { useColumnLabels } from '@/lib/hooks/use-column-labels';
import { formatDollarOrPlaceholder } from '@/lib/utils/currency-formatter';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';

interface ProductTableProps {
  products: ProductTableRow[];
  isLoading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onSort: (column: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Optional selection props
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function ProductTable({
  products,
  isLoading,
  onEdit,
  onDelete,
  onToggleActive,
  onSort,
  sortBy,
  sortOrder,
  selectedIds,
  onSelectionChange,
}: ProductTableProps) {
  const columnLabels = useColumnLabels('products', {
    productId: 'Product ID',
    title: 'Title',
    cost: 'Cost',
    price: 'Price',
    priceUnitType: 'Unit',
    minimumPurchase: 'Minimum',
    trackInventory: 'Inventory',
    category: 'Category',
    status: 'Status',
    actions: 'Actions',
  });

  // Selection handlers
  const allSelected =
    selectedIds && products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected = selectedIds && products.some((p) => selectedIds.has(p.id));

  const toggleAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    if (allSelected) {
      const newSet = new Set(selectedIds);
      products.forEach((p) => newSet.delete(p.id));
      onSelectionChange(newSet);
    } else {
      const newSet = new Set(selectedIds);
      products.forEach((p) => newSet.add(p.id));
      onSelectionChange(newSet);
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  const columns: ColumnDef<ProductTableRow>[] = [
    ...(selectedIds && onSelectionChange
      ? [
        {
          key: 'select' as const,
          label: (
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onChange={toggleAll}
              aria-label="Select all"
            />
          ),
          headerClassName: 'w-12 py-3 px-4 text-left',
          className: 'w-12 py-4 px-4',
          render: (product: ProductTableRow) => (
            <Checkbox
              checked={selectedIds.has(product.id)}
              onChange={() => toggleOne(product.id)}
              aria-label={`Select ${product.title}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          ),
        },
      ]
      : []),
    {
      key: 'actions',
      label: columnLabels.actions,
      headerClassName: 'text-left py-3 px-4 w-10',
      className: 'w-10 py-4 px-4',
      render: (product) => {
        const actions: ActionItem[] = [
          {
            label: 'Edit product',
            icon: <EditIcon className="h-3.5 w-3.5" />,
            onClick: () => onEdit(product.id),
          },
          {
            label: 'Delete product',
            icon: <TrashIcon className="h-3.5 w-3.5" />,
            onClick: () => onDelete(product.id),
            variant: 'destructive',
          },
          {
            label: product.isActive ? 'Deactivate product' : 'Activate product',
            onClick: () => onToggleActive(product.id, !product.isActive),
          },
        ];

        return <ActionDropdown actions={actions} />;
      },
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
      key: 'price',
      label: columnLabels.price,
      sortable: true,
      className: 'py-4 px-4 whitespace-nowrap text-sm text-muted-foreground',
      render: (product) => formatDollarOrPlaceholder(product.price),
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
  ];

  const renderMobileCard = (product: ProductTableRow) => {
    return (
      <div key={product.id} className="bg-card rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="font-mono text-xs text-muted-foreground mb-1">{product.productId}</div>
            <h3 className="font-semibold text-card-foreground">{product.title}</h3>
            <div className="text-sm text-muted-foreground mt-1">
              Cost: {formatDollarOrPlaceholder(product.cost)} | Price: {formatDollarOrPlaceholder(product.price)}
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
      tableId="catalog-products"
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

