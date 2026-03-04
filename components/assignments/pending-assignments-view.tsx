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
    });

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
    }

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
        </div>
    );
}
