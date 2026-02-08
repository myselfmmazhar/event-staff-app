'use client';

import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EyeIcon, TrashIcon, DocumentDuplicateIcon, BellIcon } from '@/components/ui/icons';
import { formatRate } from '@/lib/utils/currency-formatter';
import { format } from 'date-fns';
import type { RateType } from '@prisma/client';
import { AssignmentMobileCard } from './assignment-mobile-card';

export interface AssignmentData {
  id: string;
  callTimeId: string;
  startDate: Date | string;
  startTime: string | null;
  endDate: Date | string;
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
  onView?: (assignment: AssignmentData) => void;
  onEdit?: (assignment: AssignmentData) => void;
  onManageStaff?: (assignment: AssignmentData) => void;
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

function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
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
  onView,
  onDelete,
  onDuplicate,
  onSendReminder,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
}: AssignmentTableProps) {
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
      headerClassName: 'text-left py-3 px-4 w-28',
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onView?.(item)}
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          {onDuplicate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onDuplicate(item)}
              title="Duplicate Assignment"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
            </Button>
          )}
          {onSendReminder && item.confirmedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onSendReminder(item)}
              title="Send Reminder"
            >
              <BellIcon className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(item)}
              title="Delete Assignment"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
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
      label: 'Event',
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
      label: 'Position',
      sortable: true,
      render: (item) => (
        <span className="text-foreground">
          {item.service?.title || 'No Position'}
        </span>
      ),
    },
    {
      key: 'venue',
      label: 'Venue',
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
      label: 'Staff',
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
          {item.needsStaff ? 'Needs Staff' : 'Filled'}
        </Badge>
      ),
    },
    {
      key: 'payRate',
      label: 'Pay Rate',
      render: (item) => (
        <span className="text-foreground">
          {formatRate(getPayRateValue(item.payRate), item.payRateType)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
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
          onView={() => onView?.(item)}
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
