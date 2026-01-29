'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, ColumnDef } from '@/components/common/data-table';
import { EditIcon, EyeIcon, TrashIcon } from '@/components/ui/icons';
import type { ServiceTableRow } from '@/lib/types/service';
import {
  COST_UNIT_TYPE_LABELS,
  EXPERIENCE_REQUIREMENT_LABELS,
  STAFF_RATING_LABELS,
} from '@/lib/constants/enums';
import { useColumnLabels } from '@/lib/hooks/use-column-labels';
import { formatDollarOrPlaceholder } from '@/lib/utils/currency-formatter';

interface ServiceTableProps {
  services: ServiceTableRow[];
  isLoading?: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onSort: (column: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function ServiceTable({
  services,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
  onSort,
  sortBy,
  sortOrder,
}: ServiceTableProps) {
  const columnLabels = useColumnLabels('services', {
    serviceId: 'Service ID',
    title: 'Title',
    cost: 'Cost',
    costUnitType: 'Unit',
    experienceRequirement: 'Experience',
    ratingRequirement: 'Rating',
    status: 'Status',
    actions: 'Actions',
  });

  const columns: ColumnDef<ServiceTableRow>[] = [
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
      key: 'costUnitType',
      label: columnLabels.costUnitType,
      className: 'py-4 px-4 whitespace-nowrap text-sm text-muted-foreground',
      render: (service) =>
        service.costUnitType ? COST_UNIT_TYPE_LABELS[service.costUnitType] : '-',
    },
    {
      key: 'experienceRequirement',
      label: columnLabels.experienceRequirement,
      className: 'py-4 px-4 whitespace-nowrap text-sm text-muted-foreground',
      render: (service) =>
        service.experienceRequirement
          ? EXPERIENCE_REQUIREMENT_LABELS[service.experienceRequirement]
          : '-',
    },
    {
      key: 'ratingRequirement',
      label: columnLabels.ratingRequirement,
      className: 'py-4 px-4 whitespace-nowrap text-sm text-muted-foreground',
      render: (service) =>
        service.ratingRequirement ? STAFF_RATING_LABELS[service.ratingRequirement] : '-',
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
      key: 'actions',
      label: columnLabels.actions,
      className: 'py-4 px-4',
      headerClassName: 'text-right py-3 px-4',
      render: (service) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={() => onView(service.id)}
            title="View service details"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={() => onEdit(service.id)}
            title="Edit service"
          >
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleActive(service.id, !service.isActive)}
            title={service.isActive ? 'Deactivate service' : 'Activate service'}
          >
            {service.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(service.id)}
            title="Delete service"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
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
            <div className="text-sm text-muted-foreground mt-1">{formatDollarOrPlaceholder(service.cost)}</div>
          </div>
          <Badge variant={service.isActive ? 'success' : 'secondary'} asSpan>
            {service.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(service.id)}
            className="flex-1"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            View
          </Button>
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

