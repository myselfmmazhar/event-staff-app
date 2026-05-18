'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EditIcon, EyeIcon, TrashIcon, MailIcon } from '@/components/ui/icons';
import type { ClientTableRow } from '@/lib/types/client';
import { DataTable, ColumnDef } from '@/components/common/data-table';
import { useColumnLabels } from '@/lib/hooks/use-column-labels';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';
import { ClientExpandedRow } from './client-expanded-row';

interface ClientTableProps {
  clients: ClientTableRow[];
  isLoading?: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onResendInvitation?: (id: string) => void;
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
  onView,
  onEdit,
  onDelete,
  onResendInvitation,
  onSort,
  sortBy,
  sortOrder,
  selectedIds,
  onSelectionChange,
}: ClientTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpanded = (clientId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  // Get column labels from saved configuration
  const columnLabels = useColumnLabels('clients', {
    clientId: 'Client ID',
    businessName: 'Business Name',
    contact: 'Contact Person',
    email: 'Email',
    phone: 'Cell Phone',
    location: 'Billing Address',
    access: 'Access',
    actions: 'Actions',
    status: 'Status',
    lastLogin: 'Last Login',
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
          headerClassName: 'w-12 py-3 px-4 text-left',
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
            label: 'View details',
            icon: <EyeIcon className="h-3.5 w-3.5" />,
            onClick: () => onView(client.id),
          },
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

        if (onResendInvitation && client.hasLoginAccess && !client.userId) {
          actions.splice(2, 0, {
            label: 'Resend invitation',
            icon: <MailIcon className="h-3.5 w-3.5" />,
            onClick: () => onResendInvitation(client.id),
          });
        }

        return <ActionDropdown actions={actions} />;
      },
    },
    {
      key: 'status',
      label: <span className="font-normal">{columnLabels.status}</span>,
      sortable: true,
      className: 'py-4 px-4 whitespace-nowrap',
      render: (client) => {
        const linkedUser = client.users_clients_userIdTousers;
        if (!linkedUser) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <Badge variant={linkedUser.isActive ? 'success' : 'destructive'} asSpan>
            {linkedUser.isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
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
        <div
          className="font-medium text-primary cursor-pointer hover:underline"
          onClick={() => onEdit(client.id)}
        >
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
      render: (client) => {
        const cityStateZip = [
          [client.city, client.state].filter(Boolean).join(', '),
          client.zipCode,
        ]
          .filter(Boolean)
          .join(' ');
        const fullAddress = [
          client.businessAddress,
          client.businessAddressLine2,
          cityStateZip,
        ]
          .filter(Boolean)
          .join(', ');
        return fullAddress || '-';
      },
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
    {
      key: 'lastLoginAt',
      label: columnLabels.lastLogin,
      sortable: true,
      className: 'py-4 px-4 text-sm text-muted-foreground whitespace-nowrap',
      render: (client) => {
        const lastLoginAt = client.users_clients_userIdTousers?.lastLoginAt;
        if (!lastLoginAt) {
          return <span className="text-muted-foreground">Never logged in</span>;
        }
        const date = new Date(lastLoginAt);
        return (
          <div>
            <div>{format(date, 'MMM dd, yyyy')}</div>
            <div className="text-xs text-muted-foreground">{format(date, 'h:mm a')}</div>
          </div>
        );
      },
    },
  ];

  const renderMobileCard = (client: ClientTableRow) => {
    const linkedUser = client.users_clients_userIdTousers;
    const lastLoginAt = linkedUser?.lastLoginAt;
    return (
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
        <div className="flex flex-col items-end gap-1">
          <Badge variant={client.hasLoginAccess ? 'success' : 'secondary'} asSpan>
            {client.hasLoginAccess ? 'Portal Access' : 'No Access'}
          </Badge>
          {linkedUser && (
            <Badge variant={linkedUser.isActive ? 'success' : 'destructive'} asSpan>
              {linkedUser.isActive ? 'Active' : 'Inactive'}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <div>{client.email}</div>
        <div>{client.cellPhone}</div>
        <div>
          {(() => {
            const cityStateZip = [
              [client.city, client.state].filter(Boolean).join(', '),
              client.zipCode,
            ]
              .filter(Boolean)
              .join(' ');
            const fullAddress = [
              client.businessAddress,
              client.businessAddressLine2,
              cityStateZip,
            ]
              .filter(Boolean)
              .join(', ');
            return fullAddress || '-';
          })()}
        </div>
        <div>
          Last login:{' '}
          {lastLoginAt
            ? format(new Date(lastLoginAt), 'MMM dd, yyyy h:mm a')
            : 'Never logged in'}
        </div>
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
        {onResendInvitation && client.hasLoginAccess && !client.userId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResendInvitation(client.id)}
            className="flex-1"
          >
            <MailIcon className="h-4 w-4 mr-1" />
            Resend
          </Button>
        )}
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
  };

  const renderExpandedContent = (client: ClientTableRow) => (
    <ClientExpandedRow clientId={client.id} />
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
      expandableContent={renderExpandedContent}
      expandedKeys={expandedRows}
      onToggleExpand={toggleRowExpanded}
    />
  );
}
