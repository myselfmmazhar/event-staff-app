'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StaffSearchTable } from '@/components/call-times/staff-search-table';
import { Pagination } from '@/components/common/pagination';
import { useAssignmentsFilters } from '@/store/assignments-filters.store';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { useStaffTerm } from '@/lib/hooks/use-terminology';
import { formatRate } from '@/lib/utils/currency-formatter';
import { format } from 'date-fns';
import { isDateNullOrUBD } from '@/lib/utils/date-formatter';
import {
  SendIcon,
  UsersIcon,
  CalendarIcon,
  MapPinIcon,
  ChevronRightIcon,
  AlertIcon,
} from '@/components/ui/icons';
import type { AssignmentData } from './assignment-table';

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

function getPayRateValue(payRate: AssignmentData['payRate']): number {
  if (typeof payRate === 'number') return payRate;
  if (typeof payRate === 'string') return parseFloat(payRate);
  if (payRate && typeof payRate === 'object' && 'toNumber' in payRate && payRate.toNumber) {
    return payRate.toNumber();
  }
  return 0;
}

export function OpenAssignmentsView() {
  const staffTerm = useStaffTerm();
  const { toast } = useToast();
  const utils = trpc.useUtils();

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
    selectedAssignmentId,
    setSelectedAssignmentId,
    selectedEventStatuses,
  } = useAssignmentsFilters();

  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [includeAlreadyInvited, setIncludeAlreadyInvited] = useState(false);

  // Fetch open assignments (needs staff)
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
    staffingStatus: 'needsStaff',
    eventStatuses: selectedEventStatuses as any[],
  });

  // Fetch available staff for selected assignment
  const { data: staffData, isLoading: isLoadingStaff } = trpc.callTime.searchStaff.useQuery(
    {
      callTimeId: selectedAssignmentId || '',
      includeAlreadyInvited,
    },
    {
      enabled: Boolean(selectedAssignmentId),
    }
  );

  // Send invitations mutation
  const sendInvitations = trpc.callTime.sendInvitations.useMutation({
    onSuccess: (result) => {
      toast({
        title: 'Offers sent',
        description: `Successfully sent ${result.sent} offer(s)`,
      });
      setSelectedStaffIds([]);
      if (selectedAssignmentId) {
        utils.callTime.getAll.invalidate();
        utils.callTime.searchStaff.invalidate({ callTimeId: selectedAssignmentId });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  const handleSendInvitations = () => {
    if (selectedStaffIds.length === 0 || !selectedAssignmentId) return;
    sendInvitations.mutate({
      callTimeId: selectedAssignmentId,
      staffIds: selectedStaffIds,
    });
  };

  const handleSelectAssignment = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId === selectedAssignmentId ? null : assignmentId);
    setSelectedStaffIds([]);
  };

  const openAssignments: AssignmentData[] = (data?.data || []).filter((item) => item.needsStaff);
  const selectedAssignment = openAssignments.find((a) => a.id === selectedAssignmentId);

  if (openAssignments.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-foreground text-lg">No open assignments</p>
        <p className="text-muted-foreground text-sm mt-2">
          All assignments have {staffTerm.lower}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Panel - Open Assignments List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">Open Assignments</h3>
          <span className="text-sm text-muted-foreground">
            {openAssignments.length} assignment{openAssignments.length !== 1 ? 's' : ''} need {staffTerm.lower}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {openAssignments.map((assignment) => {
              const isSelected = assignment.id === selectedAssignmentId;
              const dateIsUBD = isDateNullOrUBD(assignment.startDate);
              const startDate = dateIsUBD ? null : (typeof assignment.startDate === 'string'
                ? new Date(assignment.startDate)
                : assignment.startDate);
              const staffNeeded = assignment.numberOfStaffRequired - assignment.confirmedCount;

              return (
                <Card
                  key={assignment.id}
                  className={`p-4 cursor-pointer transition-colors ${isSelected
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                    }`}
                  onClick={() => handleSelectAssignment(assignment.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-foreground">
                        {assignment.service?.title || 'No Position'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {assignment.event.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="info">
                        {staffNeeded} more needed
                      </Badge>
                      <ChevronRightIcon className={`h-4 w-4 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{dateIsUBD ? 'UBD' : format(startDate!, 'MMM d')}</span>
                    </div>
                    <span>{formatTime(assignment.startTime)} - {formatTime(assignment.endTime)}</span>
                    {assignment.event.city && (
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{assignment.event.city}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      {assignment.confirmedCount}/{assignment.numberOfStaffRequired} filled
                    </span>
                    <span className="text-sm font-medium">
                      {formatRate(getPayRateValue(assignment.payRate), assignment.payRateType)}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

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

      {/* Right Panel - Staff Search */}
      <div className="lg:col-span-3 space-y-4 min-w-0">
        {selectedAssignment ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Find {staffTerm.plural}</h3>
                <p className="text-sm text-muted-foreground">
                  For: {selectedAssignment.service?.title || 'No Position'} - {selectedAssignment.event.title}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeAlreadyInvited}
                  onChange={(e) => setIncludeAlreadyInvited(e.target.checked)}
                  className="rounded border-input"
                />
                Include already invited {staffTerm.lowerPlural}
              </label>

              {selectedStaffIds.length > 0 && (
                <Button
                  onClick={handleSendInvitations}
                  disabled={sendInvitations.isPending}
                >
                  <SendIcon className="h-4 w-4 mr-2" />
                  Send {selectedStaffIds.length} Offer{selectedStaffIds.length > 1 ? 's' : ''}
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <StaffSearchTable
                staff={staffData?.data || []}
                selectedIds={selectedStaffIds}
                onSelectionChange={setSelectedStaffIds}
                isLoading={isLoadingStaff}
              />
            </div>

            {staffData && staffData.meta.totalPages > 1 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing {staffData.data.length} of {staffData.meta.total} {staffTerm.lowerPlural}
              </p>
            )}
          </>
        ) : (
          <Card className="p-8 text-center border-dashed">
            <AlertIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">Select an assignment</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click on an open assignment from the list to search for available {staffTerm.lowerPlural}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
