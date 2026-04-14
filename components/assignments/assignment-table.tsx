'use client';

import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SettingsIcon, TrashIcon, DocumentDuplicateIcon, BellIcon, SearchIcon } from '@/components/ui/icons';
import { formatRate } from '@/lib/utils/currency-formatter';
import { format } from 'date-fns';
import type { RateType } from '@prisma/client';
import { AssignmentMobileCard } from './assignment-mobile-card';
import { useStaffTerm, useTerminology } from '@/lib/hooks/use-terminology';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';

export interface AssignmentData {
  id: string;
  callTimeId: string;
  startDate: Date | string | null;
  startTime: string | null;
  endDate: Date | string | null;
  endTime: string | null;
  numberOfStaffRequired: number;
  payRate: number | string | { toNumber?: () => number };
  payRateType: RateType;
  service: { id: string; title: string } | null;
  event: {
    id: string;
    eventId: string;
    title: string;
    venueName: string | null;
    city: string | null;
    state: string | null;
  };
  confirmedCount: number;
  needsStaff: boolean;
  invitations: Array<{
    id: string;
    status: string;
    isConfirmed: boolean;
    staff: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

interface AssignmentTableProps {
  data: AssignmentData[];
  isLoading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  setSortBy?: (field: string) => void;
  setSortOrder?: (order: 'asc' | 'desc') => void;
  onManage?: (assignment: AssignmentData) => void;
  onFindTalent?: (assignment: AssignmentData) => void;
  onDelete?: (assignment: AssignmentData) => void;
  onDuplicate?: (assignment: AssignmentData) => void;
  onSendReminder?: (assignment: AssignmentData) => void;
  // Selection support
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

function formatTime(time: string | null): string {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return '';
  const hours = parts[0] || '0';
  const minutes = parts[1] || '00';
  const hour = parseInt(hours, 10);
  if (isNaN(hour)) return '';
  const ampm = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes}${ampm}`;
}

function formatDateShort(date: Date | string | null): string {
  if (!date) return 'UBD';
  const d = typeof date === 'string' ? new Date(date) : date;
  // Check for epoch date (superjson bug workaround for null dates)
  if (d.getFullYear() === 1970) return 'UBD';
  return format(d, 'EEE, MMM d');
}

function getPayRateValue(payRate: AssignmentData['payRate']): number {
  if (typeof payRate === 'number') return payRate;
  if (typeof payRate === 'string') return parseFloat(payRate);
  if (payRate && typeof payRate === 'object' && 'toNumber' in payRate && payRate.toNumber) {
    return payRate.toNumber();
  }
  return 0;
}

export function AssignmentTable({
  data,
  isLoading = false,
  sortBy,
  sortOrder = 'asc',
  setSortBy,
  setSortOrder,
  onManage,
  onFindTalent,
  onDelete,
  onDuplicate,
  onSendReminder,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
}: AssignmentTableProps) {
  const staffTerm = useStaffTerm();
  const { terminology } = useTerminology();
  const allSelected = data.length > 0 && data.every((item) => selectedIds.has(item.id));
  const someSelected = data.some((item) => selectedIds.has(item.id)) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all current page items
      const newSet = new Set(selectedIds);
      data.forEach((item) => newSet.delete(item.id));
      onSelectionChange?.(newSet);
    } else {
      // Select all current page items
      const newSet = new Set(selectedIds);
      data.forEach((item) => newSet.add(item.id));
      onSelectionChange?.(newSet);
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange?.(newSet);
  };
  const columns: ColumnDef<AssignmentData>[] = [
    // Selection checkbox column (conditionally added)
    ...(selectable
      ? [
        {
          key: 'select',
          label: (
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={handleSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          ),
          headerClassName: 'text-center py-3 px-2 w-10',
          render: (item: AssignmentData) => (
            <input
              type="checkbox"
              checked={selectedIds.has(item.id)}
              onChange={() => handleSelectOne(item.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          ),
        } as ColumnDef<AssignmentData>,
      ]
      : []),
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: 'text-left py-3 px-4 w-10',
      className: 'w-10 py-4 px-4',
      render: (item) => {
        const actions: ActionItem[] = [];

        if (onManage) {
          actions.push({
            label: 'Manage Assignment',
            icon: <SettingsIcon className="h-3.5 w-3.5" />,
            onClick: () => onManage(item),
          });
        }

        if (onFindTalent) {
          actions.push({
            label: 'Find Talent',
            icon: <SearchIcon className="h-3.5 w-3.5" />,
            onClick: () => onFindTalent(item),
          });
        }

        if (onDuplicate) {
          actions.push({
            label: 'Duplicate Assignment',
            icon: <DocumentDuplicateIcon className="h-3.5 w-3.5" />,
            onClick: () => onDuplicate(item),
          });
        }

        if (onSendReminder && item.confirmedCount > 0) {
          actions.push({
            label: 'Send Reminder',
            icon: <BellIcon className="h-3.5 w-3.5" />,
            onClick: () => onSendReminder(item),
          });
        }

        if (onDelete) {
          actions.push({
            label: 'Delete Assignment',
            icon: <TrashIcon className="h-3.5 w-3.5" />,
            onClick: () => onDelete(item),
            variant: 'destructive',
          });
        }

        return <ActionDropdown actions={actions} />;
      },
    },
    {
      key: 'startDate',
      label: 'Date',
      sortable: true,
      render: (item) => (
        <span className="font-medium text-foreground">
          {formatDateShort(item.startDate)}
        </span>
      ),
    },
    {
      key: 'time',
      label: 'Time',
      render: (item) => (
        <span className="text-muted-foreground">
          {formatTime(item.startTime)} - {formatTime(item.endTime)}
        </span>
      ),
    },
    {
      key: 'event',
      label: terminology.event.singular,
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-foreground">{item.event.title}</p>
          <p className="text-sm text-muted-foreground">{item.event.eventId}</p>
        </div>
      ),
    },
    {
      key: 'position',
      label: 'Service',
      sortable: true,
      render: (item) => (
        <span className="text-foreground">
          {item.service?.title || 'No Service'}
        </span>
      ),
    },
    {
      key: 'venue',
      label: 'Location',
      render: (item) => (
        <div className="text-sm">
          <p className="text-foreground">{item.event.venueName || '-'}</p>
          {(item.event.city || item.event.state) && (
            <p className="text-muted-foreground">
              {[item.event.city, item.event.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'staff',
      label: 'Progress',
      // label: staffTerm.singular,
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className={`font-medium ${item.needsStaff ? 'text-yellow-600' : 'text-green-600'}`}>
            {item.confirmedCount}/{item.numberOfStaffRequired}
          </span>
          <span className="text-muted-foreground text-sm">filled</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <Badge variant={item.needsStaff ? 'warning' : 'success'}>
          {item.needsStaff ? `Needs ${staffTerm.singular}` : 'Filled'}
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      tableId="assignments"
      data={data}
      columns={columns}
      isLoading={isLoading}
      sortBy={sortBy}
      sortOrder={sortOrder}
      setSortBy={setSortBy}
      setSortOrder={setSortOrder}
      emptyMessage="No assignments found"
      emptyDescription="Try adjusting your filters or create a new assignment"
      getRowKey={(item) => item.id}
      minWidth="1000px"
      mobileCard={(item) => (
        <AssignmentMobileCard
          assignment={item}
          onManage={onManage ? () => onManage(item) : undefined}
          onFindTalent={onFindTalent ? () => onFindTalent(item) : undefined}
          onDelete={onDelete ? () => onDelete(item) : undefined}
          onDuplicate={onDuplicate ? () => onDuplicate(item) : undefined}
          onSendReminder={onSendReminder ? () => onSendReminder(item) : undefined}
          selectable={selectable}
          selected={selectedIds.has(item.id)}
          onSelect={() => handleSelectOne(item.id)}
        />
      )}
    />
  );
}
