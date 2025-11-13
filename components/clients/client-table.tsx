'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EditIcon, TrashIcon, EyeIcon } from '@/components/ui/icons';
import type { ClientTableRow } from '@/lib/types/client';

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
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">
              <button
                onClick={() => onSort('clientId')}
                className="hover:text-foreground flex items-center gap-1"
              >
                Client ID
                {sortBy === 'clientId' && (
                  <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold">
              <button
                onClick={() => onSort('businessName')}
                className="hover:text-foreground flex items-center gap-1"
              >
                Business Name
                {sortBy === 'businessName' && (
                  <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Contact Person</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Cell Phone</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Location</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Access</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map((client) => (
            <tr key={client.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{client.clientId}</td>
              <td className="px-4 py-3 text-sm font-medium">{client.businessName}</td>
              <td className="px-4 py-3 text-sm">{client.firstName} {client.lastName}</td>
              <td className="px-4 py-3 text-sm">{client.email}</td>
              <td className="px-4 py-3 text-sm">{client.cellPhone}</td>
              <td className="px-4 py-3 text-sm">{client.city}, {client.state}</td>
              <td className="px-4 py-3 text-sm">
                <Badge variant={client.hasLoginAccess ? 'default' : 'secondary'}>
                  {client.hasLoginAccess ? 'Portal Access' : 'No Access'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onView(client.id)}
                    disabled={isLoading}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(client.id)}
                    disabled={isLoading}
                  >
                    <EditIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(client.id)}
                    disabled={isLoading}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
