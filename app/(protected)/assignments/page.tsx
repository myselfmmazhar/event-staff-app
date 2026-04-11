'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardListIcon, PlusIcon, TrashIcon, XIcon } from '@/components/ui/icons';
import { useAssignmentsFilters } from '@/store/assignments-filters.store';
import {
  AssignmentManagerTabs,
  AssignmentFilters,
  CreateAssignmentModal,
  DuplicateAssignmentModal,
  AssignmentExportDropdown,
  BulkDeleteModal,
  SendReminderModal,
} from '@/components/assignments';
import { CallTimeDetailModal } from '@/components/call-times/call-time-detail-modal';
import { FindTalentModal } from '@/components/assignments/find-talent-modal';
import { DeleteCallTimeModal } from '@/components/call-times/delete-call-time-modal';
import type { AssignmentData } from '@/components/assignments/assignment-table';
import { trpc } from '@/lib/client/trpc';
import { useTerminology, useStaffTerm } from '@/lib/hooks/use-terminology';

export default function AssignmentManagerPage() {
  const searchParams = useSearchParams();
  const { terminology } = useTerminology();
  const staffTerm = useStaffTerm();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [managingAssignmentId, setManagingAssignmentId] = useState<string | null>(null);
  const [findTalentAssignmentId, setFindTalentAssignmentId] = useState<string | null>(null);
  const [bulkFindTalentIds, setBulkFindTalentIds] = useState<string[]>([]);
  const [deletingAssignment, setDeletingAssignment] = useState<AssignmentData | null>(null);
  const [duplicatingAssignment, setDuplicatingAssignment] = useState<AssignmentData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [reminderAssignment, setReminderAssignment] = useState<AssignmentData | null>(null);

  const utils = trpc.useUtils();
  const deleteCallTimeMutation = trpc.callTime.delete.useMutation({
    onSuccess: () => {
      utils.callTime.getAll.invalidate();
      setDeletingAssignment(null);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = trpc.callTime.delete.useMutation({
    onSuccess: () => {
      utils.callTime.getAll.invalidate();
    },
  });

  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    for (const id of idsToDelete) {
      await bulkDeleteMutation.mutateAsync({ id });
    }
    setSelectedIds(new Set());
    setIsBulkDeleteModalOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Fetch all assignments for export (without pagination)
  const { data: allAssignmentsData } = trpc.callTime.getAllForExport.useQuery();

  const allAssignments = (allAssignmentsData || []).map((item) => ({
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

  const selectedAssignments = allAssignments.filter(a => selectedIds.has(a.id));

  // Apply eventId and serviceIds from URL params on mount / URL change
  useEffect(() => {
    const eventId = searchParams.get('eventId');
    const serviceIdsRaw = searchParams.get('serviceIds'); // comma-separated e.g. "id1,id2"
    const serviceIds = serviceIdsRaw
      ? serviceIdsRaw.split(',').filter(Boolean)
      : [];

    // Always reset event/service selection first, then apply URL values
    useAssignmentsFilters.getState().setSelectedEventIds(eventId ? [eventId] : []);
    useAssignmentsFilters.getState().setSelectedServiceIds(serviceIds);

    // Preselect tab from URL (supports both `tab=` and legacy `status=`)
    const tabParam = searchParams.get('tab');
    const statusParam = searchParams.get('status');
    const raw = (tabParam ?? statusParam ?? '').toLowerCase();
    const tab =
      raw === 'open' || raw === 'pending' || raw === 'accepted' || raw === 'all'
        ? (raw as any)
        : null;
    if (tab) {
      useAssignmentsFilters.getState().setActiveTab(tab);
    }
  }, [searchParams]);

  const handleManageAssignment = (assignment: AssignmentData) => {
    setManagingAssignmentId(assignment.id);
  };

  const handleFindTalent = (assignment: AssignmentData) => {
    setFindTalentAssignmentId(assignment.id);
  };

  const handleDeleteAssignment = (assignment: AssignmentData) => {
    setDeletingAssignment(assignment);
  };

  const handleConfirmDelete = () => {
    if (deletingAssignment) {
      deleteCallTimeMutation.mutate({ id: deletingAssignment.id });
    }
  };

  const handleDuplicateAssignment = (assignment: AssignmentData) => {
    setDuplicatingAssignment(assignment);
  };

  const handleDuplicateSuccess = () => {
    setDuplicatingAssignment(null);
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
  };

  const handleSendReminder = (assignment: AssignmentData) => {
    setReminderAssignment(assignment);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardListIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assignment Manager</h1>
            <p className="text-sm text-muted-foreground">
              Manage {staffTerm.lower} assignments and scheduling across all {terminology.event.lowerPlural}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AssignmentExportDropdown
            assignments={allAssignments}
            selectedAssignments={selectedAssignments}
            selectedCount={selectedIds.size}
            disabled={false}
          />
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        </div>
      </div>


      {/* Filters */}
      <Card className="p-4">
        <AssignmentFilters />
      </Card>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} assignment{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="text-muted-foreground"
              >
                <XIcon className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setManagingAssignmentId(null);
                  setFindTalentAssignmentId(null);
                  setBulkFindTalentIds(Array.from(selectedIds));
                }}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Find Talent
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs with Views */}
      <AssignmentManagerTabs
        onManageAssignment={handleManageAssignment}
        onFindTalent={handleFindTalent}
        onDeleteAssignment={handleDeleteAssignment}
        onDuplicateAssignment={handleDuplicateAssignment}
        onSendReminder={handleSendReminder}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Create Assignment Modal */}
      <CreateAssignmentModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Manage Assignment Modal */}
      <CallTimeDetailModal
        callTimeId={managingAssignmentId}
        open={managingAssignmentId !== null}
        onClose={() => setManagingAssignmentId(null)}
      />

      {/* Find Talent Modal */}
      <FindTalentModal
        callTimeId={findTalentAssignmentId}
        callTimeIds={bulkFindTalentIds}
        open={findTalentAssignmentId !== null || bulkFindTalentIds.length > 0}
        onClose={() => {
          setFindTalentAssignmentId(null);
          setBulkFindTalentIds([]);
        }}
      />

      {/* Delete Assignment Modal */}
      <DeleteCallTimeModal
        callTime={deletingAssignment ? {
          id: deletingAssignment.id,
          callTimeId: deletingAssignment.callTimeId,
          service: deletingAssignment.service,
        } : null}
        open={deletingAssignment !== null}
        onClose={() => setDeletingAssignment(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteCallTimeMutation.isPending}
      />

      {/* Duplicate Assignment Modal */}
      <DuplicateAssignmentModal
        open={duplicatingAssignment !== null}
        onClose={() => setDuplicatingAssignment(null)}
        onSuccess={handleDuplicateSuccess}
        sourceAssignment={duplicatingAssignment}
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        assignments={selectedAssignments}
        open={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        isDeleting={bulkDeleteMutation.isPending}
      />

      {/* Send Reminder Modal */}
      <SendReminderModal
        assignment={reminderAssignment}
        open={reminderAssignment !== null}
        onClose={() => setReminderAssignment(null)}
      />
    </div>
  );
}
