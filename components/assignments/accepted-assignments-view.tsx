'use client';

import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EyeIcon, CheckCircleIcon, CalendarIcon } from '@/components/ui/icons';
import { Pagination } from '@/components/common/pagination';
import { useAssignmentsFilters } from '@/store/assignments-filters.store';
import { trpc } from '@/lib/client/trpc';
import { formatRate } from '@/lib/utils/currency-formatter';
import { format } from 'date-fns';
import type { RateType } from '@prisma/client';
import { isDateNullOrUBD } from '@/lib/utils/date-formatter';

interface AcceptedStaffRow {
  id: string; // unique row id (invitation id)
  staffId: string;
  firstName: string;
  lastName: string;
  phone: string;
  isConfirmed: boolean;
  confirmedAt: Date | null;
  position: string;
  assignmentDate: Date | string | null;
  startTime: string | null;
  endTime: string | null;
  eventTitle: string;
  eventId: string;
  payRate: number | string | { toNumber?: () => number };
  payRateType: RateType;
  callTimeId: string;
  duration: number; // in hours
}

interface AcceptedAssignmentsViewProps {
  onViewAssignment?: (assignmentId: string) => void;
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

function calculateDuration(startTime: string | null, endTime: string | null): number {
  if (!startTime || !endTime) return 0;
  const startParts = startTime.split(':');
  const endParts = endTime.split(':');
  if (startParts.length < 2 || endParts.length < 2) return 0;
  const startHours = parseInt(startParts[0] || '0', 10);
  const startMinutes = parseInt(startParts[1] || '0', 10);
  const endHours = parseInt(endParts[0] || '0', 10);
  const endMinutes = parseInt(endParts[1] || '0', 10);
  if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) return 0;
  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;
  return Math.max(0, (endTotal - startTotal) / 60);
}

function getPayRateValue(payRate: AcceptedStaffRow['payRate']): number {
  if (typeof payRate === 'number') return payRate;
  if (typeof payRate === 'string') return parseFloat(payRate);
  if (payRate && typeof payRate === 'object' && 'toNumber' in payRate && payRate.toNumber) {
    return payRate.toNumber();
  }
  return 0;
}

export function AcceptedAssignmentsView({ onViewAssignment }: AcceptedAssignmentsViewProps) {
  const {
    page,
    limit,
    setPage,
    setLimit,
    search,
    selectedEventIds,
    selectedServiceIds,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    selectedEventStatuses,
  } = useAssignmentsFilters();

  const { data, isLoading } = trpc.callTime.getAll.useQuery({
    page,
    limit,
    search: search || undefined,
    eventId: selectedEventIds.length === 1 ? selectedEventIds[0] : undefined,
    serviceId: selectedServiceIds.length === 1 ? selectedServiceIds[0] : undefined,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    sortBy: sortBy as 'startDate' | 'position' | 'event',
    sortOrder,
    staffingStatus: 'all',
    eventStatuses: selectedEventStatuses as any[],
  });

  // Flatten the data to show one row per confirmed staff member
  const acceptedStaffRows: AcceptedStaffRow[] = [];

  if (data?.data) {
    for (const assignment of data.data) {
      const confirmedInvitations = assignment.invitations.filter(
        (inv) => inv.status === 'ACCEPTED' && inv.isConfirmed
      );

      for (const invitation of confirmedInvitations) {
        acceptedStaffRows.push({
          id: invitation.id,
          staffId: invitation.staff.id,
          firstName: invitation.staff.firstName,
          lastName: invitation.staff.lastName,
          phone: (invitation as any).staff.phone || '',
          isConfirmed: invitation.isConfirmed,
          confirmedAt: (invitation as any).confirmedAt || null,
          position: assignment.service?.title || 'No Position',
          assignmentDate: assignment.startDate,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          eventTitle: assignment.event.title,
          eventId: assignment.event.eventId,
          payRate: assignment.payRate,
          payRateType: assignment.payRateType,
          callTimeId: assignment.id,
          duration: calculateDuration(assignment.startTime, assignment.endTime),
        });
      }
    }
  }

  const handleSortBy = (field: string) => {
    if (field === 'startDate' || field === 'position' || field === 'event' ||
      field === 'firstName' || field === 'lastName') {
      // Map field to valid sortBy if needed
      if (field === 'firstName' || field === 'lastName') {
        setSortBy('startDate'); // Default to date sorting for staff fields
      } else {
        setSortBy(field as 'startDate' | 'position' | 'event');
      }
    }
  };

  const columns: ColumnDef<AcceptedStaffRow>[] = [
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: 'text-left py-3 px-4 w-20',
      render: (item) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onViewAssignment?.(item.callTimeId)}
          title="View Assignment"
        >
          <EyeIcon className="h-4 w-4" />
        </Button>
      ),
    },
    {
      key: 'firstName',
      label: 'First Name',
      sortable: true,
      render: (item) => (
        <span className="font-medium text-foreground">{item.firstName}</span>
      ),
    },
    {
      key: 'lastName',
      label: 'Last Name',
      sortable: true,
      render: (item) => (
        <span className="font-medium text-foreground">{item.lastName}</span>
      ),
    },
    {
      key: 'position',
      label: 'Position',
      sortable: true,
      render: (item) => (
        <span className="text-foreground">{item.position}</span>
      ),
    },
    {
      key: 'startDate',
      label: 'Date/Time',
      sortable: true,
      render: (item) => {
        const dateIsUBD = isDateNullOrUBD(item.assignmentDate);
        const date = dateIsUBD ? null : (typeof item.assignmentDate === 'string'
          ? new Date(item.assignmentDate)
          : item.assignmentDate);
        return (
          <div className="text-sm">
            <p className="font-medium text-foreground">
              {dateIsUBD ? 'UBD' : format(date!, 'EEE, MMM d, yyyy')}
            </p>
            <p className="text-muted-foreground">
              {formatTime(item.startTime)} - {formatTime(item.endTime)}
            </p>
          </div>
        );
      },
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (item) => (
        <span className="text-muted-foreground">
          {item.duration.toFixed(1)} hrs
        </span>
      ),
    },
    {
      key: 'event',
      label: 'Event',
      render: (item) => (
        <div className="text-sm">
          <p className="font-medium text-foreground">{item.eventTitle}</p>
          <p className="text-muted-foreground">{item.eventId}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (item) => (
        <span className="text-muted-foreground">{item.phone || '-'}</span>
      ),
    },
    {
      key: 'confirmed',
      label: 'Confirmed',
      render: (item) => (
        <Badge variant={item.isConfirmed ? 'success' : 'secondary'}>
          {item.isConfirmed ? 'Yes' : 'No'}
        </Badge>
      ),
    },
  ];

  const mobileCard = (item: AcceptedStaffRow) => {
    const dateIsUBD = isDateNullOrUBD(item.assignmentDate);
    const date = dateIsUBD ? null : (typeof item.assignmentDate === 'string'
      ? new Date(item.assignmentDate)
      : item.assignmentDate);

    return (
      <Card className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground">
              {item.firstName} {item.lastName}
            </h3>
            <p className="text-sm text-muted-foreground">{item.position}</p>
          </div>
          <Badge variant={item.isConfirmed ? 'success' : 'secondary'}>
            {item.isConfirmed ? 'Confirmed' : 'Pending'}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>
              {dateIsUBD ? 'UBD' : format(date!, 'EEE, MMM d')} &middot; {formatTime(item.startTime)} - {formatTime(item.endTime)}
            </span>
          </div>

          {item.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{item.phone}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
          <span className="text-sm text-muted-foreground">{item.eventTitle}</span>
          <span className="text-sm font-medium text-foreground">
            {formatRate(getPayRateValue(item.payRate), item.payRateType)}
          </span>
        </div>
      </Card>
    );
  };

  if (acceptedStaffRows.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <CheckCircleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-foreground text-lg">No accepted staff</p>
        <p className="text-muted-foreground text-sm mt-2">
          Staff will appear here once they accept assignment offers
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataTable
        data={acceptedStaffRows}
        columns={columns}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        setSortBy={handleSortBy}
        setSortOrder={setSortOrder}
        emptyMessage="No accepted staff found"
        emptyDescription="Staff will appear here once they accept assignment offers"
        getRowKey={(item) => item.id}
        minWidth="1100px"
        mobileCard={mobileCard}
      />

      {data && data.meta.total > 0 && (
        <Pagination
          currentPage={page}
          totalPages={data.meta.totalPages}
          totalItems={data.meta.total}
          itemsPerPage={limit}
          onPageChange={setPage}
          onItemsPerPageChange={setLimit}
        />
      )}
    </div>
  );
}
