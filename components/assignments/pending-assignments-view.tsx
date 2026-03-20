'use client';

import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EyeIcon, ClockIcon, CalendarIcon } from '@/components/ui/icons';
import { Pagination } from '@/components/common/pagination';
import { useAssignmentsFilters } from '@/store/assignments-filters.store';
import { trpc } from '@/lib/client/trpc';
import { formatRate } from '@/lib/utils/currency-formatter';
import { format } from 'date-fns';
import type { RateType } from '@prisma/client';
import { isDateNullOrUBD } from '@/lib/utils/date-formatter';
import { useToast } from '@/components/ui/use-toast';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { CheckCircleIcon, XCircleIcon, XIcon } from '@/components/ui/icons';
import { useState } from 'react';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';

interface PendingStaffRow {
    id: string; // invitation id
    staffId: string;
    firstName: string;
    lastName: string;
    phone: string;
    position: string;
    assignmentDate: Date | string | null;
    startTime: string | null;
    endTime: string | null;
    eventTitle: string;
    eventId: string;
    payRate: number | string | { toNumber?: () => number };
    payRateType: RateType;
    callTimeId: string;
    sentAt: Date | null;
}

interface PendingAssignmentsViewProps {
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

function getPayRateValue(payRate: PendingStaffRow['payRate']): number {
    if (typeof payRate === 'number') return payRate;
    if (typeof payRate === 'string') return parseFloat(payRate);
    if (payRate && typeof payRate === 'object' && 'toNumber' in payRate && payRate.toNumber) {
        return payRate.toNumber();
    }
    return 0;
}

export function PendingAssignmentsView({ onViewAssignment }: PendingAssignmentsViewProps) {
    const { toast } = useToast();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [pendingBatchAction, setPendingBatchAction] = useState<'ACCEPT' | 'CANCEL' | null>(null);
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
        staffingStatus: 'pending',
        eventStatuses: selectedEventStatuses as any[],
    });

    const batchAcceptMutation = trpc.callTime.batchAccept.useMutation({
        onSuccess: (data) => {
            toast({
                title: 'Assignments Accepted',
                description: `Successfully accepted ${data.count} assignment(s) on behalf of staff.`,
            });
            setSelectedIds(new Set());
            setPendingBatchAction(null);
            utils.callTime.getAll.invalidate();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'error',
            });
            setPendingBatchAction(null);
        },
    });

    const batchCancelMutation = trpc.callTime.batchCancel.useMutation({
        onSuccess: (data) => {
            toast({
                title: 'Invitations Cancelled',
                description: `Successfully cancelled ${data.count} invitation(s).`,
            });
            setSelectedIds(new Set());
            setPendingBatchAction(null);
            utils.callTime.getAll.invalidate();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'error',
            });
            setPendingBatchAction(null);
        },
    });

    const handleBatchAction = () => {
        const invitationIds = Array.from(selectedIds);
        if (pendingBatchAction === 'ACCEPT') {
            batchAcceptMutation.mutate({ invitationIds });
        } else if (pendingBatchAction === 'CANCEL') {
            batchCancelMutation.mutate({ invitationIds });
        }
    };

    const handleClearSelection = () => {
        setSelectedIds(new Set());
    };

    // Flatten the data to show one row per pending invitation
    const pendingStaffRows: PendingStaffRow[] = [];

    if (data?.data) {
        for (const assignment of data.data) {
            const pendingInvitations = assignment.invitations.filter(
                (inv) => inv.status === 'PENDING'
            );

            for (const invitation of pendingInvitations) {
                pendingStaffRows.push({
                    id: invitation.id,
                    staffId: invitation.staff.id,
                    firstName: invitation.staff.firstName,
                    lastName: invitation.staff.lastName,
                    phone: (invitation as any).staff.phone || '',
                    position: assignment.service?.title || 'No Position',
                    assignmentDate: assignment.startDate,
                    startTime: assignment.startTime,
                    endTime: assignment.endTime,
                    eventTitle: assignment.event.title,
                    eventId: assignment.event.eventId,
                    payRate: assignment.payRate,
                    payRateType: assignment.payRateType,
                    callTimeId: assignment.id,
                    sentAt: (invitation as any).createdAt || null,
                });
            }
        }
    };

    const allSelected = pendingStaffRows.length > 0 && pendingStaffRows.every((item) => selectedIds.has(item.id));
    const someSelected = pendingStaffRows.some((item) => selectedIds.has(item.id)) && !allSelected;

    const handleSelectAll = () => {
        if (allSelected) {
            const newSet = new Set(selectedIds);
            pendingStaffRows.forEach((item) => newSet.delete(item.id));
            setSelectedIds(newSet);
        } else {
            const newSet = new Set(selectedIds);
            pendingStaffRows.forEach((item) => newSet.add(item.id));
            setSelectedIds(newSet);
        }
    };

    const handleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleSortBy = (field: string) => {
        if (field === 'startDate' || field === 'position' || field === 'event' ||
            field === 'firstName' || field === 'lastName') {
            if (field === 'firstName' || field === 'lastName') {
                setSortBy('startDate');
            } else {
                setSortBy(field as 'startDate' | 'position' | 'event');
            }
        }
    };

    const columns: ColumnDef<PendingStaffRow>[] = [
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
            render: (item: PendingStaffRow) => (
                <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => handleSelectOne(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            headerClassName: 'text-left py-3 px-4 w-10',
            className: 'w-10 py-3 px-2',
            render: (item: PendingStaffRow) => {
                const actions: ActionItem[] = [
                    {
                        label: 'View Assignment',
                        icon: <EyeIcon className="h-3.5 w-3.5" />,
                        onClick: () => onViewAssignment?.(item.callTimeId),
                    }
                ];
                return <ActionDropdown actions={actions} />;
            },
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
            key: 'payRate',
            label: 'Pay Rate',
            render: (item) => (
                <span className="text-foreground font-medium">
                    {formatRate(getPayRateValue(item.payRate), item.payRateType)}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: () => (
                <Badge variant="warning">Pending</Badge>
            ),
        },
    ];

    const mobileCard = (item: PendingStaffRow) => {
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
                    <Badge variant="warning">Pending</Badge>
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

    if (pendingStaffRows.length === 0 && !isLoading) {
        return (
            <div className="text-center py-12">
                <ClockIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground text-lg">No pending invitations</p>
                <p className="text-muted-foreground text-sm mt-2">
                    Staff will appear here when they have pending assignment offers
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {selectedIds.size > 0 && (
                <Card className="p-3 bg-primary/5 border-primary/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-foreground">
                                {selectedIds.size} invitation{selectedIds.size > 1 ? 's' : ''} selected
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
                                variant="default"
                                size="sm"
                                onClick={() => setPendingBatchAction('ACCEPT')}
                            >
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                Accept Selected
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setPendingBatchAction('CANCEL')}
                            >
                                <XCircleIcon className="h-4 w-4 mr-1" />
                                Reject Selected
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            <DataTable
                data={pendingStaffRows}
                columns={columns}
                isLoading={isLoading}
                sortBy={sortBy}
                sortOrder={sortOrder}
                setSortBy={handleSortBy}
                setSortOrder={setSortOrder}
                emptyMessage="No pending invitations found"
                emptyDescription="Staff will appear here when they have pending assignment offers"
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

            <ConfirmModal
                open={pendingBatchAction !== null}
                onClose={() => setPendingBatchAction(null)}
                onConfirm={handleBatchAction}
                title={pendingBatchAction === 'ACCEPT' ? 'Accept Invitations?' : 'Reject Invitations?'}
                description={`You are about to ${pendingBatchAction === 'ACCEPT' ? 'accept' : 'reject'} ${selectedIds.size} invitation(s).`}
                warningMessage={pendingBatchAction === 'ACCEPT'
                    ? 'Do you want to accept all selected invitations on behalf of staff?'
                    : 'Do you want to reject all selected invitations? This will cancel the offers.'}
                confirmText={pendingBatchAction === 'ACCEPT' ? 'Yes, Accept All' : 'Yes, Reject All'}
                variant={pendingBatchAction === 'CANCEL' ? 'danger' : 'default'}
                isLoading={batchAcceptMutation.isPending || batchCancelMutation.isPending}
            />
        </div>
    );
}
