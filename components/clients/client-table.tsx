'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EditIcon, TrashIcon } from '@/components/ui/icons';
import type { ClientTableRow } from '@/lib/types/client';
import { DataTable, ColumnDef } from '@/components/common/data-table';
import { useColumnLabels } from '@/lib/hooks/use-column-labels';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';

interface ClientTableProps {
  clients: ClientTableRow[];
  isLoading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSort: (column: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Optional selection props (used for export selected)
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function ClientTable({
  clients,
  isLoading,
  onEdit,
  onDelete,
  onSort,
  sortBy,
  sortOrder,
  selectedIds,
  onSelectionChange,
}: ClientTableProps) {
  // Get column labels from saved configuration
  const columnLabels = useColumnLabels('clients', {
    clientId: 'Client ID',
    businessName: 'Business Name',
    contact: 'Contact Person',
    email: 'Email',
    phone: 'Cell Phone',
    location: 'Location',
    access: 'Access',
    actions: 'Actions',
  });

  // Selection handlers
  const allSelected =
    selectedIds && clients.length > 0 && clients.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds && clients.some((c) => selectedIds.has(c.id));

  const toggleAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    if (allSelected) {
      const newSet = new Set(selectedIds);
      clients.forEach((c) => newSet.delete(c.id));
      onSelectionChange(newSet);
    } else {
      const newSet = new Set(selectedIds);
      clients.forEach((c) => newSet.add(c.id));
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

  const columns: ColumnDef<ClientTableRow>[] = [
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
          headerClassName: 'w-12 py-3 px-4',
          className: 'w-12 py-4 px-4',
          render: (client: ClientTableRow) => (
            <Checkbox
              checked={selectedIds.has(client.id)}
              onChange={() => toggleOne(client.id)}
              aria-label={`Select ${client.businessName}`}
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
      render: (client) => {
        const actions: ActionItem[] = [
          {
            label: 'Edit client',
            icon: <EditIcon className="h-3.5 w-3.5" />,
            onClick: () => onEdit(client.id),
          },
          {
            label: 'Delete client',
            icon: <TrashIcon className="h-3.5 w-3.5" />,
            onClick: () => onDelete(client.id),
            variant: 'destructive',
          },
        ];

        return <ActionDropdown actions={actions} />;
      },
    },
    /* {
      key: 'clientId',
      label: columnLabels.clientId,
      sortable: true,
      className: 'py-4 px-4 whitespace-nowrap',
      render: (client) => (
        <span className="font-mono text-sm text-muted-foreground">
          {client.clientId}
        </span>
      ),
    }, */
    {
      key: 'businessName',
      label: columnLabels.businessName,
      sortable: true,
      className: 'py-4 px-4',
      render: (client) => (
        <div className="font-medium text-foreground">
          {client.businessName}
        </div>
      ),
    },
    {
      key: 'contact',
      label: columnLabels.contact,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (client) => `${client.firstName} ${client.lastName}`,
    },
    {
      key: 'email',
      label: columnLabels.email,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (client) => client.email,
    },
    {
      key: 'phone',
      label: columnLabels.phone,
      className: 'py-4 px-4 text-sm text-muted-foreground whitespace-nowrap',
      render: (client) => client.cellPhone,
    },
    {
      key: 'location',
      label: columnLabels.location,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (client) => `${client.city}, ${client.state}`,
    },
    {
      key: 'access',
      label: columnLabels.access,
      className: 'py-4 px-4 whitespace-nowrap',
      render: (client) => (
        <Badge variant={client.hasLoginAccess ? 'success' : 'secondary'} asSpan>
          {client.hasLoginAccess ? 'Portal Access' : 'No Access'}
        </Badge>
      ),
    },
  ];

  const renderMobileCard = (client: ClientTableRow) => (
    <div
      key={client.id}
      className="bg-card rounded-lg border border-border p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* <div className="font-mono text-xs text-muted-foreground mb-1">
            {client.clientId}
          </div> */}
          <h3 className="font-semibold text-card-foreground">
            {client.businessName}
          </h3>
          <div className="text-sm text-muted-foreground mt-1">
            {client.firstName} {client.lastName}
          </div>
        </div>
        <Badge variant={client.hasLoginAccess ? 'success' : 'secondary'} asSpan>
          {client.hasLoginAccess ? 'Portal Access' : 'No Access'}
        </Badge>
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <div>{client.email}</div>
        <div>{client.cellPhone}</div>
        <div>{client.city}, {client.state}</div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(client.id)}
          className="flex-1"
        >
          <EditIcon className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(client.id)}
          className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <DataTable
      tableId="clients"
      data={clients}
      columns={columns}
      isLoading={isLoading}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      emptyMessage="No clients found"
      emptyDescription="Try adjusting your search or filters"
      mobileCard={renderMobileCard}
      getRowKey={(client) => client.id}
    />
  );
}
