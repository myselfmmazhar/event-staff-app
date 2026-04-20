'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, ColumnDef } from '@/components/common/data-table';
import { EditIcon, TrashIcon } from '@/components/ui/icons';
import type { ServiceTableRow } from '@/lib/types/service';
import {
  COST_UNIT_TYPE_LABELS,
} from '@/lib/constants/enums';
import { useColumnLabels } from '@/lib/hooks/use-column-labels';
import { formatDollarOrPlaceholder } from '@/lib/utils/currency-formatter';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';

interface ServiceTableProps {
  services: ServiceTableRow[];
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

export function ServiceTable({
  services,
  isLoading,
  onEdit,
  onDelete,
  onToggleActive,
  onSort,
  sortBy,
  sortOrder,
  selectedIds,
  onSelectionChange,
}: ServiceTableProps) {
  const columnLabels = useColumnLabels('services', {
    serviceId: 'Service ID',
    title: 'Title',
    cost: 'Cost',
    price: 'Price',
    minimum: 'Minimum',
    costUnitType: 'Rate Type',
    status: 'Status',
    actions: 'Actions',
  });

  // Selection handlers
  const allSelected =
    selectedIds && services.length > 0 && services.every((s) => selectedIds.has(s.id));
  const someSelected = selectedIds && services.some((s) => selectedIds.has(s.id));

  const toggleAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    if (allSelected) {
      const newSet = new Set(selectedIds);
      services.forEach((s) => newSet.delete(s.id));
      onSelectionChange(newSet);
    } else {
      const newSet = new Set(selectedIds);
      services.forEach((s) => newSet.add(s.id));
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

  const columns: ColumnDef<ServiceTableRow>[] = [
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
          render: (service: ServiceTableRow) => (
            <Checkbox
              checked={selectedIds.has(service.id)}
              onChange={() => toggleOne(service.id)}
              aria-label={`Select ${service.title}`}
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
      render: (service) => {
        const actions: ActionItem[] = [
          {
            label: 'Edit service',
            icon: <EditIcon className="h-3.5 w-3.5" />,
            onClick: () => onEdit(service.id),
          },
          {
            label: 'Delete service',
            icon: <TrashIcon className="h-3.5 w-3.5" />,
            onClick: () => onDelete(service.id),
            variant: 'destructive',
          },
          {
            label: service.isActive ? 'Deactivate service' : 'Activate service',
            onClick: () => onToggleActive(service.id, !service.isActive),
          },
        ];

        return <ActionDropdown actions={actions} />;
      },
    },
    {
      key: 'status',
      label: columnLabels.status,
      className: 'py-4 px-4 whitespace-nowrap',
      render: (service) => (
        <Badge variant={service.isActive ? 'success' : 'secondary'} asSpan>
          {service.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'serviceId',
      label: columnLabels.serviceId,
      className: 'py-4 px-4 whitespace-nowrap',
      render: (service) => (
        <span className="font-mono text-sm text-muted-foreground">{service.serviceId}</span>
      ),
    },
    {
      key: 'title',
      label: columnLabels.title,
      sortable: true,
      className: 'py-4 px-4',
      render: (service) => <span className="font-medium text-foreground">{service.title}</span>,
    },
    {
      key: 'cost',
      label: columnLabels.cost,
      sortable: true,
      className: 'py-4 px-4 whitespace-nowrap text-sm text-muted-foreground',
      render: (service) => formatDollarOrPlaceholder(service.cost),
    },
    {
      key: 'price',
      label: columnLabels.price,
      sortable: true,
      className: 'py-4 px-4 whitespace-nowrap text-sm text-muted-foreground',
      render: (service) => formatDollarOrPlaceholder(service.price),
    },
    {
      key: 'minimum',
      label: columnLabels.minimum,
      className: 'py-4 px-4 whitespace-nowrap text-sm text-muted-foreground',
      render: (service) => {
        if (service.minimum == null) return '-';
        const val = typeof service.minimum === 'object' && 'toNumber' in service.minimum
          ? (service.minimum as { toNumber: () => number }).toNumber()
          : Number(service.minimum);

        const suffix = service.costUnitType === 'HOURLY' ? ' hrs' : '';
        return `${val}${suffix}`;
      },
    },
    {
      key: 'costUnitType',
      label: columnLabels.costUnitType,
      className: 'py-4 px-4 whitespace-nowrap text-sm text-muted-foreground',
      render: (service) =>
        service.costUnitType ? COST_UNIT_TYPE_LABELS[service.costUnitType] : '-',
    },
  ];

  const renderMobileCard = (service: ServiceTableRow) => {
    return (
      <div
        key={service.id}
        className="bg-card rounded-lg border border-border p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="font-mono text-xs text-muted-foreground mb-1">{service.serviceId}</div>
            <h3 className="font-semibold text-card-foreground">{service.title}</h3>
            <div className="text-sm text-muted-foreground mt-1">
              Cost: {formatDollarOrPlaceholder(service.cost)} | Price: {formatDollarOrPlaceholder(service.price)} 
              {service.minimum != null && ` | Min: ${(typeof service.minimum === 'object' && 'toNumber' in service.minimum ? (service.minimum as { toNumber: () => number }).toNumber() : Number(service.minimum))}${service.costUnitType === 'HOURLY' ? ' hrs' : ''}`}
            </div>
          </div>
          <Badge variant={service.isActive ? 'success' : 'secondary'} asSpan>
            {service.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(service.id)}
            className="flex-1"
          >
            <EditIcon className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(service.id)}
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
      tableId="catalog-services"
      data={services}
      columns={columns}
      isLoading={isLoading}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      getRowKey={(service) => service.id}
      emptyMessage="No services found"
      mobileCard={renderMobileCard}
      minWidth="1000px"
    />
  );
}

