'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { CalendarIcon, SearchIcon, UsersIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { format, parseISO } from 'date-fns';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { ViewEventModal } from '@/components/events/view-event-modal';
import { RATE_TYPE_LABELS } from '@/lib/schemas/call-time.schema';

// Type for shift data from API
type ShiftData = {
    id: string;
    startDate: Date | string;
    startTime: string | null;
    endDate: Date | string;
    endTime: string | null;
    numberOfStaffRequired: number;
    payRate: any; // Decimal from Prisma
    payRateType: string;
    confirmedCount: number;
    needsStaff: boolean;
    event: {
        id: string;
        eventId: string;
        title: string;
        venueName: string;
    };
    service: {
        id: string;
        title: string;
    };
};

export default function ShiftPage() {
    const { terminology } = useTerminology();
    const [search, setSearch] = useState('');
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    // Fetch all call times
    const { data: callTimesData, isLoading } = trpc.callTime.getAll.useQuery({
        page,
        limit: 20,
        search: search || undefined,
    });

    const shifts = (callTimesData?.data || []) as ShiftData[];
    const meta = callTimesData?.meta;

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1); // Reset to first page on search
    };

    const formatDate = (date: Date | string) => {
        const d = typeof date === 'string' ? parseISO(date) : date;
        return format(d, 'MMM d, yyyy');
    };

    const formatPayRate = (rate: any, rateType: string) => {
        const amount = typeof rate === 'object' ? parseFloat(rate.toString()) : parseFloat(rate);
        const label = RATE_TYPE_LABELS[rateType as keyof typeof RATE_TYPE_LABELS] || rateType;
        return `$${amount.toFixed(2)} ${label}`;
    };

    // Define columns for DataTable
    const columns: ColumnDef<ShiftData>[] = [
        {
            key: 'event',
            label: terminology.event.singular,
            render: (shift) => (
                <div
                    className="cursor-pointer"
                    onClick={() => setSelectedEventId(shift.event.id)}
                >
                    <p className="font-medium text-primary hover:underline">{shift.event.title}</p>
                    <p className="text-xs text-muted-foreground">{shift.event.venueName}</p>
                </div>
            ),
        },
        {
            key: 'service',
            label: 'Service',
            render: (shift) => (
                <Badge variant="secondary">{shift.service.title}</Badge>
            ),
        },
        {
            key: 'date',
            label: 'Date',
            sortable: true,
            render: (shift) => formatDate(shift.startDate),
        },
        {
            key: 'time',
            label: 'Time',
            render: (shift) => (
                <span>
                    {shift.startTime || 'TBD'}
                    {shift.endTime && ` - ${shift.endTime}`}
                </span>
            ),
        },
        {
            key: 'staff',
            label: 'Staff',
            render: (shift) => (
                <div className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    <span>
                        {shift.confirmedCount}/{shift.numberOfStaffRequired}
                    </span>
                </div>
            ),
        },
        {
            key: 'payRate',
            label: 'Pay Rate',
            render: (shift) => formatPayRate(shift.payRate, shift.payRateType),
        },
        {
            key: 'status',
            label: 'Status',
            render: (shift) => {
                const staffNeeded = shift.numberOfStaffRequired - shift.confirmedCount;
                return staffNeeded > 0 ? (
                    <Badge variant="warning">Need Talents</Badge>
                ) : (
                    <Badge variant="success">Full</Badge>
                );
            },
        },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Shifts</h1>
                        <p className="text-sm text-muted-foreground">
                            All call times across your {terminology.event.plural.toLowerCase()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder={`Search ${terminology.event.plural.toLowerCase()} or assignments...`}
                        value={search}
                        onChange={handleSearch}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="p-4">
                <DataTable
                    tableId="tasks-shift"
                    data={shifts}
                    columns={columns}
                    isLoading={isLoading}
                    getRowKey={(shift) => shift.id}
                    emptyMessage="No Shifts Found"
                    emptyDescription={
                        search
                            ? `No shifts match "${search}". Try a different search term.`
                            : `Create an ${terminology.event.singular.toLowerCase()} with call times to see shifts here.`
                    }
                />

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t mt-4">
                        <p className="text-sm text-muted-foreground">
                            Page {meta.page} of {meta.totalPages} ({meta.total} total)
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={page >= meta.totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Event Details Modal */}
            <ViewEventModal
                eventId={selectedEventId}
                open={!!selectedEventId}
                onClose={() => setSelectedEventId(null)}
            />
        </div>
    );
}
