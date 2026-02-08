'use client';

import { AssignmentTable, type AssignmentData } from './assignment-table';
import { Pagination } from '@/components/common/pagination';
import { useAssignmentsFilters } from '@/store/assignments-filters.store';
import { trpc } from '@/lib/client/trpc';

interface AllAssignmentsViewProps {
  onView?: (assignment: AssignmentData) => void;
  onDelete?: (assignment: AssignmentData) => void;
  onDuplicate?: (assignment: AssignmentData) => void;
  onSendReminder?: (assignment: AssignmentData) => void;
  // Selection support
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function AllAssignmentsView({
  onView,
  onDelete,
  onDuplicate,
  onSendReminder,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
}: AllAssignmentsViewProps) {
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
    quickFilter,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
  } = useAssignmentsFilters();

  // Calculate date range for quick filters
  const getQuickFilterDates = () => {
    if (quickFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { dateFrom: today, dateTo: today };
    }

    if (quickFilter === 'thisWeek') {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return { dateFrom: startOfWeek, dateTo: endOfWeek };
    }

    return {};
  };

  const quickFilterDates = getQuickFilterDates();

  // Determine staffing status from quick filter
  const staffingStatus = quickFilter === 'needsStaff' ? 'needsStaff' :
                         quickFilter === 'filled' ? 'fullyStaffed' : 'all';

  const { data, isLoading } = trpc.callTime.getAll.useQuery({
    page,
    limit,
    search: search || undefined,
    eventId: selectedEventIds.length === 1 ? selectedEventIds[0] : undefined,
    serviceId: selectedServiceIds.length === 1 ? selectedServiceIds[0] : undefined,
    dateFrom: quickFilterDates.dateFrom || (dateFrom ? new Date(dateFrom) : undefined),
    dateTo: quickFilterDates.dateTo || (dateTo ? new Date(dateTo) : undefined),
    sortBy: sortBy as 'startDate' | 'position' | 'event',
    sortOrder,
    staffingStatus,
  });

  const assignments: AssignmentData[] = (data?.data || []).map((item) => ({
    id: item.id,
    callTimeId: item.callTimeId,
    startDate: item.startDate,
    startTime: item.startTime,
    endDate: item.endDate,
    endTime: item.endTime,
    numberOfStaffRequired: item.numberOfStaffRequired,
    payRate: item.payRate,
    payRateType: item.payRateType,
    service: item.service,
    event: item.event,
    confirmedCount: item.confirmedCount,
    needsStaff: item.needsStaff,
    invitations: item.invitations,
  }));

  const handleSortBy = (field: string) => {
    if (field === 'startDate' || field === 'position' || field === 'event') {
      setSortBy(field);
    }
  };

  return (
    <div className="space-y-4">
      <AssignmentTable
        data={assignments}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        setSortBy={handleSortBy}
        setSortOrder={setSortOrder}
        onView={onView}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onSendReminder={onSendReminder}
        selectable={selectable}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
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
