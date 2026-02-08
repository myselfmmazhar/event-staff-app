'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAssignmentsFilters, type AssignmentTab } from '@/store/assignments-filters.store';
import { trpc } from '@/lib/client/trpc';
import { AllAssignmentsView } from './all-assignments-view';
import { AcceptedAssignmentsView } from './accepted-assignments-view';
import { OpenAssignmentsView } from './open-assignments-view';
import type { AssignmentData } from './assignment-table';

interface AssignmentManagerTabsProps {
  onViewAssignment?: (assignment: AssignmentData) => void;
  onDeleteAssignment?: (assignment: AssignmentData) => void;
  onDuplicateAssignment?: (assignment: AssignmentData) => void;
  onSendReminder?: (assignment: AssignmentData) => void;
  // Selection support
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function AssignmentManagerTabs({
  onViewAssignment,
  onDeleteAssignment,
  onDuplicateAssignment,
  onSendReminder,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
}: AssignmentManagerTabsProps) {
  const { activeTab, setActiveTab, search, selectedEventIds, selectedServiceIds, dateFrom, dateTo } = useAssignmentsFilters();

  // Fetch data to calculate accurate counts
  // Use limit: 100 (API max) to get accurate counts for all tabs
  const { data: fullData } = trpc.callTime.getAll.useQuery({
    page: 1,
    limit: 100,
    search: search || undefined,
    eventId: selectedEventIds.length === 1 ? selectedEventIds[0] : undefined,
    serviceId: selectedServiceIds.length === 1 ? selectedServiceIds[0] : undefined,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    staffingStatus: 'all',
  });

  // Calculate counts from the fetched data
  const totalCount = fullData?.meta.total || 0;

  // Count open assignments (where needsStaff is true)
  // Use the actual data since API staffingStatus filter may differ from client-side needsStaff
  const openCount = fullData?.data.filter((assignment) => assignment.needsStaff).length || 0;

  // Count accepted staff members (confirmed invitations)
  const acceptedCount = fullData?.data.reduce((acc, assignment) => {
    return acc + assignment.invitations.filter(
      (inv) => inv.status === 'ACCEPTED' && inv.isConfirmed
    ).length;
  }, 0) || 0;

  const handleViewAssignment = (assignmentId: string) => {
    const assignment = fullData?.data.find((a) => a.id === assignmentId);
    if (assignment) {
      onViewAssignment?.(assignment as unknown as AssignmentData);
    }
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as AssignmentTab)}
      className="space-y-4"
    >
      <TabsList>
        <TabsTrigger value="all" className="flex items-center gap-2">
          All
          <Badge variant="secondary" className="ml-1 text-xs">
            {totalCount}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="accepted" className="flex items-center gap-2">
          Accepted
          <Badge variant="secondary" className="ml-1 text-xs">
            {acceptedCount}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="open" className="flex items-center gap-2">
          Open
          {openCount > 0 && (
            <Badge variant="info" className="ml-1 text-xs">
              {openCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <AllAssignmentsView
          onView={onViewAssignment}
          onDelete={onDeleteAssignment}
          onDuplicate={onDuplicateAssignment}
          onSendReminder={onSendReminder}
          selectable={selectable}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      </TabsContent>

      <TabsContent value="accepted">
        <AcceptedAssignmentsView
          onViewAssignment={handleViewAssignment}
        />
      </TabsContent>

      <TabsContent value="open">
        <OpenAssignmentsView />
      </TabsContent>
    </Tabs>
  );
}
