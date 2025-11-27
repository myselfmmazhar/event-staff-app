'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EditIcon, TrashIcon, EyeIcon } from '@/components/ui/icons';
import type { ClientTableRow } from '@/lib/types/client';
import { DataTable, ColumnDef } from '@/components/common/data-table';

interface ClientTableProps {
  clients: ClientTableRow[];
  isLoading?: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSort: (column: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function ClientTable({
  clients,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onSort,
  sortBy,
  sortOrder,
}: ClientTableProps) {
  const columns: ColumnDef<ClientTableRow>[] = [
    {
      key: 'clientId',
      label: 'Client ID',
      sortable: true,
      className: 'py-4 px-4 whitespace-nowrap',
      render: (client) => (
        <span className="font-mono text-sm text-muted-foreground">
          {client.clientId}
        </span>
      ),
    },
    {
      key: 'businessName',
      label: 'Business Name',
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
      label: 'Contact Person',
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (client) => `${client.firstName} ${client.lastName}`,
    },
    {
      key: 'email',
      label: 'Email',
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (client) => client.email,
    },
    {
      key: 'phone',
      label: 'Cell Phone',
      className: 'py-4 px-4 text-sm text-muted-foreground whitespace-nowrap',
      render: (client) => client.cellPhone,
    },
    {
      key: 'location',
      label: 'Location',
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (client) => `${client.city}, ${client.state}`,
    },
    {
      key: 'access',
      label: 'Access',
      className: 'py-4 px-4 whitespace-nowrap',
      render: (client) => (
        <Badge variant={client.hasLoginAccess ? 'success' : 'secondary'} asSpan>
          {client.hasLoginAccess ? 'Portal Access' : 'No Access'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'py-4 px-4',
      headerClassName: 'text-right py-3 px-4',
      render: (client) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(client.id)}
            title="View client details"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(client.id)}
            title="Edit client"
          >
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(client.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete client"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
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
          <div className="font-mono text-xs text-muted-foreground mb-1">
            {client.clientId}
          </div>
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
          onClick={() => onView(client.id)}
          className="flex-1"
        >
          <EyeIcon className="h-4 w-4 mr-1" />
          View
        </Button>
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
