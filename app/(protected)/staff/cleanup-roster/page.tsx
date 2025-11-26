'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StaffSearch } from '@/components/staff/staff-search';
import { Pagination } from '@/components/common/pagination';
import { SelectableStaffTable } from '@/components/staff/selectable-staff-table';
import { BulkActionBar } from '@/components/staff/bulk-action-bar';
import { BulkDisableDialog } from '@/components/staff/bulk-disable-dialog';
import { trpc as api } from '@/lib/client/trpc';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

export default function CleanupRosterPage() {
    const { toast } = useToast();

    // State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // tRPC query - fetch all staff, filter ACTIVE/PENDING on client side
    const { data, isLoading, refetch } = api.staff.getAll.useQuery({
        page,
        limit,
        search: search || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });

    // Filter to show only ACTIVE and PENDING staff
    const displayStaff = (data?.data || []).filter(
        (staff) => staff.accountStatus === 'ACTIVE' || staff.accountStatus === 'PENDING'
    );

    // Get selected staff details for dialog
    const selectedStaff = displayStaff.filter((s) => selectedIds.has(s.id));

    // Bulk disable mutation
    const bulkDisableMutation = api.staff.bulkDisable.useMutation({
        onSuccess: (result) => {
            const { success, failed } = result;

            // Show success toast
            if (success > 0) {
                toast({
                    title: 'Success',
                    description: failed.length > 0
                        ? `Disabled ${success} staff member(s). ${failed.length} failed.`
                        : `Successfully disabled ${success} staff member(s)`,
                });
            }

            // Show failures if any
            if (failed.length > 0) {
                const failureDetails = failed.map(f => `${f.staffId}: ${f.reason}`).join(', ');
                toast({
                    title: 'Some staff members could not be disabled',
                    description: failureDetails,
                    variant: 'warning',
                });
            }

            // Clear selection and close dialog
            setSelectedIds(new Set());
            setShowConfirmDialog(false);
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to disable staff members',
                variant: 'error',
            });
            setShowConfirmDialog(false);
        },
    });

    // Clear selection when page/limit/search changes
    useEffect(() => {
        setSelectedIds(new Set());
    }, [page, limit, search]);

    // Handlers
    const handleDisableSelected = () => {
        if (selectedIds.size === 0) return;
        setShowConfirmDialog(true);
    };

    const handleConfirmDisable = () => {
        bulkDisableMutation.mutate({
            staffIds: Array.from(selectedIds),
        });
    };

    const totalPages = data ? Math.ceil(data.meta.total / limit) : 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Clean Up Roster</h1>
                <p className="text-muted-foreground mt-1">
                    Select and disable staff members who are no longer active
                </p>
            </div>

            {/* Search */}
            <Card className="p-6">
                <StaffSearch value={search} onChange={setSearch} />
            </Card>

            {/* Bulk Action Bar */}
            <BulkActionBar
                selectedCount={selectedIds.size}
                onClearSelection={() => setSelectedIds(new Set())}
                onDisableSelected={handleDisableSelected}
                isDisabling={bulkDisableMutation.isPending}
            />

            {/* Table */}
            <Card className="p-6">
                <div className="relative z-10">
                    <SelectableStaffTable
                        staff={displayStaff}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                        isLoading={isLoading}
                    />

                    {/* Pagination */}
                    {data && data.meta.total > 0 && (
                        <div className="mt-6">
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                totalItems={data.meta.total}
                                itemsPerPage={limit}
                                onPageChange={setPage}
                                onItemsPerPageChange={setLimit}
                            />
                        </div>
                    )}
                </div>
            </Card>

            {/* Confirmation Dialog */}
            <BulkDisableDialog
                staff={selectedStaff}
                open={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                onConfirm={handleConfirmDisable}
                isDisabling={bulkDisableMutation.isPending}
            />
        </div>
    );
}
