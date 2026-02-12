'use client';

import { useState } from 'react';
import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SettingsIcon, TrashIcon, DocumentDuplicateIcon, BellIcon, SearchIcon } from '@/components/ui/icons';
import { formatRate } from '@/lib/utils/currency-formatter';
import { format } from 'date-fns';
import type { GroupedAssignment } from '@/lib/utils/call-time-grouping';
import { AssignmentExpandedRow } from './assignment-expanded-row';
import { GroupedAssignmentMobileCard } from './grouped-assignment-mobile-card';
import { useStaffTerm, useTerminology } from '@/lib/hooks/use-terminology';

interface GroupedAssignmentTableProps {
  data: GroupedAssignment[];
  isLoading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  setSortBy?: (field: string) => void;
  setSortOrder?: (order: 'asc' | 'desc') => void;
  onManage?: (callTimeId: string) => void;
  onFindTalent?: (callTimeId: string) => void;
  onDelete?: (group: GroupedAssignment) => void;
  onDuplicate?: (group: GroupedAssignment) => void;
  onSendReminder?: (group: GroupedAssignment) => void;
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

function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return 'UBD';
  const d = typeof date === 'string' ? new Date(date) : date;
  // Check for epoch date (superjson bug workaround for null dates)
  if (d.getFullYear() === 1970) return 'UBD';
  return format(d, 'EEE, MMM d');
}

export function GroupedAssignmentTable({
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
}: GroupedAssignmentTableProps) {
  const staffTerm = useStaffTerm();
  const { terminology } = useTerminology();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const handleToggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // For selection, we use the primary call time ID
  const allSelected = data.length > 0 && data.every((item) => selectedIds.has(item.primaryCallTimeId));
  const someSelected = data.some((item) => selectedIds.has(item.primaryCallTimeId)) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      const newSet = new Set(selectedIds);
      data.forEach((item) => {
        // Remove all call time IDs in the group
        item.callTimeIds.forEach((id) => newSet.delete(id));
      });
      onSelectionChange?.(newSet);
    } else {
      const newSet = new Set(selectedIds);
      data.forEach((item) => {
        // Add all call time IDs in the group
        item.callTimeIds.forEach((id) => newSet.add(id));
      });
      onSelectionChange?.(newSet);
    }
  };

  const handleSelectOne = (group: GroupedAssignment) => {
    const newSet = new Set(selectedIds);
    const isSelected = group.callTimeIds.every((id) => selectedIds.has(id));
    if (isSelected) {
      group.callTimeIds.forEach((id) => newSet.delete(id));
    } else {
      group.callTimeIds.forEach((id) => newSet.add(id));
    }
    onSelectionChange?.(newSet);
  };

  const columns: ColumnDef<GroupedAssignment>[] = [
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
            render: (item: GroupedAssignment) => {
              const isSelected = item.callTimeIds.every((id) => selectedIds.has(id));
              return (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSelectOne(item)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              );
            },
          } as ColumnDef<GroupedAssignment>,
        ]
      : []),
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: 'text-left py-3 px-4 w-28',
      render: (item) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {onManage && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onManage(item.primaryCallTimeId)}
              title="Manage Assignment"
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
          )}
          {onFindTalent && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onFindTalent(item.primaryCallTimeId)}
              title="Find Talent"
            >
              <SearchIcon className="h-4 w-4" />
            </Button>
          )}
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
        <div className="flex items-center gap-2">
          <span className="text-foreground">{item.serviceName}</span>
          {item.callTimeIds.length > 1 && (
            <Badge variant="secondary" size="sm">
              x{item.callTimeIds.length}
            </Badge>
          )}
        </div>
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
          {item.needsStaff ? `Needs ${staffTerm.singular}` : 'Filled'}
        </Badge>
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
      getRowKey={(item) => item.groupKey}
      minWidth="1000px"
      expandableContent={(item) => (
        <AssignmentExpandedRow
          group={item}
          onFindTalent={(callTimeId) => onFindTalent?.(callTimeId)}
          onViewDetails={(callTimeId) => onManage?.(callTimeId)}
        />
      )}
      expandedKeys={expandedKeys}
      onToggleExpand={handleToggleExpand}
      mobileCard={(item) => (
        <GroupedAssignmentMobileCard
          group={item}
          onManage={onManage ? () => onManage(item.primaryCallTimeId) : undefined}
          onFindTalent={onFindTalent ? () => onFindTalent(item.primaryCallTimeId) : undefined}
          onDelete={onDelete ? () => onDelete(item) : undefined}
          onDuplicate={onDuplicate ? () => onDuplicate(item) : undefined}
          onSendReminder={onSendReminder ? () => onSendReminder(item) : undefined}
          selectable={selectable}
          selected={item.callTimeIds.every((id) => selectedIds.has(id))}
          onSelect={() => handleSelectOne(item)}
          isExpanded={expandedKeys.has(item.groupKey)}
          onToggleExpand={() => handleToggleExpand(item.groupKey)}
        />
      )}
    />
  );
}
