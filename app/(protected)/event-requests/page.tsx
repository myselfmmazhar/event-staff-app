'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { ClipboardListIcon, SearchIcon, CheckIcon, XIcon, MapPinIcon, CalendarIcon, UserIcon, FileTextIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { format, parseISO } from 'date-fns';
import type { EventRequestStatus } from '@prisma/client';

type RequestData = {
    id: string;
    eventRequestId: string;
    title: string;
    description: string | null;
    requirements: string | null;
    status: EventRequestStatus;
    createdAt: string | Date;
    startDate: string | Date | null;
    startTime: string | null;
    endDate: string | Date | null;
    endTime: string | null;
    venueName: string | null;
    city: string | null;
    state: string | null;
    address: string | null;
    timezone: string | null;
    requestorName: string | null;
    requestorPhone: string | null;
    requestorEmail: string | null;
    onsitePocName: string | null;
    onsitePocPhone: string | null;
    poNumber: string | null;
    preEventInstructions: string | null;
    rejectionReason: string | null;
    client: {
        id: string;
        businessName: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
    };
};

type StatusFilter = EventRequestStatus | 'ALL';

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'All', value: 'ALL' },
];

const STATUS_BADGE: Record<EventRequestStatus, { label: string; variant: 'warning' | 'success' | 'destructive' }> = {
    PENDING: { label: 'Pending', variant: 'warning' },
    APPROVED: { label: 'Approved', variant: 'success' },
    REJECTED: { label: 'Rejected', variant: 'destructive' },
};

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
        <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
            <p className="text-sm text-foreground">{value}</p>
        </div>
    );
}

function ExpandedRow({
    r,
    onApprove,
    onReject,
}: {
    r: RequestData;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}) {
    const formatDate = (date: Date | string | null) => {
        if (!date) return null;
        const d = typeof date === 'string' ? parseISO(date) : date;
        return format(d, 'MMM d, yyyy');
    };

    const dateRange = [formatDate(r.startDate), formatDate(r.endDate)].filter(Boolean).join(' → ');
    const timeRange = [r.startTime, r.endTime].filter(Boolean).join(' – ');
    const location = [r.venueName, r.address, r.city, r.state].filter(Boolean).join(', ');

    return (
        <div className="px-6 py-5 bg-muted/10 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Event Details */}
                <div className="space-y-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Details</span>
                    </div>
                    <DetailField label="Title" value={r.title} />
                    {dateRange && <DetailField label="Dates" value={dateRange} />}
                    {timeRange && <DetailField label="Time" value={timeRange} />}
                    {r.timezone && <DetailField label="Timezone" value={r.timezone} />}
                    {r.description && <DetailField label="Description" value={r.description} />}
                    {r.requirements && <DetailField label="Requirements" value={r.requirements} />}
                    {r.preEventInstructions && <DetailField label="Pre-event Instructions" value={r.preEventInstructions} />}
                </div>

                {/* Location & Contact */}
                <div className="space-y-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location & Contact</span>
                    </div>
                    {location && <DetailField label="Venue" value={location} />}
                    {r.onsitePocName && <DetailField label="On-site POC" value={r.onsitePocName} />}
                    {r.onsitePocPhone && <DetailField label="POC Phone" value={r.onsitePocPhone} />}
                    {r.requestorName && <DetailField label="Requestor" value={r.requestorName} />}
                    {r.requestorPhone && <DetailField label="Requestor Phone" value={r.requestorPhone} />}
                    {r.requestorEmail && <DetailField label="Requestor Email" value={r.requestorEmail} />}
                    {r.poNumber && <DetailField label="PO Number" value={r.poNumber} />}
                </div>

                {/* Client & Status */}
                <div className="space-y-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client</span>
                    </div>
                    {r.client.businessName && <DetailField label="Business" value={r.client.businessName} />}
                    {(r.client.firstName || r.client.lastName) && (
                        <DetailField label="Contact" value={[r.client.firstName, r.client.lastName].filter(Boolean).join(' ')} />
                    )}
                    {r.client.email && <DetailField label="Email" value={r.client.email} />}
                    {r.rejectionReason && (
                        <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-destructive mb-0.5">Rejection Reason</p>
                            <p className="text-sm text-destructive">{r.rejectionReason}</p>
                        </div>
                    )}

                    {/* Actions — only for PENDING */}
                    {r.status === 'PENDING' && (
                        <div className="flex gap-2 pt-3 mt-3 border-t border-border">
                            <Button
                                size="sm"
                                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => onApprove(r.id)}
                            >
                                <CheckIcon className="h-3.5 w-3.5" />
                                Approve
                            </Button>
                            <Button
                                size="sm"
                                variant="danger"
                                className="gap-1.5"
                                onClick={() => onReject(r.id)}
                            >
                                <XIcon className="h-3.5 w-3.5" />
                                Reject
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function EventRequestsPage() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
    const [page, setPage] = useState(1);
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [approveId, setApproveId] = useState<string | null>(null);
    const [approveNotes, setApproveNotes] = useState('');

    const utils = trpc.useUtils();

    const { data: counts } = trpc.eventRequest.getCounts.useQuery();

    const { data, isLoading } = trpc.eventRequest.getAll.useQuery({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });

    const approveMutation = trpc.eventRequest.approve.useMutation({
        onSuccess: () => {
            utils.eventRequest.getAll.invalidate();
            utils.eventRequest.getCounts.invalidate();
            setApproveId(null);
            setApproveNotes('');
        },
    });

    const rejectMutation = trpc.eventRequest.reject.useMutation({
        onSuccess: () => {
            utils.eventRequest.getAll.invalidate();
            utils.eventRequest.getCounts.invalidate();
            setRejectId(null);
            setRejectReason('');
        },
    });

    const requests = (data?.data || []) as RequestData[];
    const meta = data?.meta;

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleStatusTab = (value: StatusFilter) => {
        setStatusFilter(value);
        setPage(1);
        setExpandedKeys(new Set());
    };

    const handleToggleExpand = (key: string) => {
        setExpandedKeys((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const formatDate = (date: Date | string | null) => {
        if (!date) return 'TBD';
        const d = typeof date === 'string' ? parseISO(date) : date;
        return format(d, 'MMM d, yyyy');
    };

    const getClientName = (client: RequestData['client']) =>
        client.businessName || [client.firstName, client.lastName].filter(Boolean).join(' ') || client.email || 'Unknown';

    const columns: ColumnDef<RequestData>[] = [
        {
            key: 'eventRequestId',
            label: 'Request ID',
            render: (r) => (
                <span className="font-mono text-xs uppercase tracking-tight text-muted-foreground">
                    {r.eventRequestId}
                </span>
            ),
        },
        {
            key: 'client',
            label: 'Client',
            render: (r) => (
                <div>
                    <p className="font-medium text-sm">{getClientName(r.client)}</p>
                    {r.client.email && (
                        <p className="text-xs text-muted-foreground">{r.client.email}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'title',
            label: 'Title',
            render: (r) => (
                <p className="font-medium text-sm">{r.title}</p>
            ),
        },
        {
            key: 'venue',
            label: 'Venue',
            render: (r) => (
                <div className="flex items-start gap-1.5">
                    <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm">{r.venueName || 'TBD'}</p>
                        {(r.city || r.state) && (
                            <p className="text-xs text-muted-foreground">
                                {[r.city, r.state].filter(Boolean).join(', ')}
                            </p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'date',
            label: 'Event Date',
            sortable: true,
            render: (r) => (
                <div>
                    <p className="text-sm">{formatDate(r.startDate)}</p>
                    {r.startTime && (
                        <p className="text-xs text-muted-foreground">
                            {r.startTime}{r.endTime ? ` – ${r.endTime}` : ''}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'createdAt',
            label: 'Submitted',
            sortable: true,
            render: (r) => (
                <span className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</span>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (r) => {
                const s = STATUS_BADGE[r.status];
                return <Badge variant={s.variant}>{s.label}</Badge>;
            },
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <ClipboardListIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Pending Requests</h1>
                        <p className="text-sm text-muted-foreground">Review and manage client event requests</p>
                    </div>
                </div>
            </div>

            {/* Status Tabs + Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    {STATUS_TABS.map((tab) => {
                        const count = counts
                            ? tab.value === 'ALL'
                                ? counts.total
                                : counts[tab.value as keyof typeof counts]
                            : null;
                        return (
                            <button
                                key={tab.value}
                                onClick={() => handleStatusTab(tab.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                    statusFilter === tab.value
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tab.label}
                                {count != null && (
                                    <span className={`text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none ${
                                        statusFilter === tab.value
                                            ? 'bg-muted text-foreground'
                                            : 'bg-muted-foreground/15 text-muted-foreground'
                                    }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="relative flex-1 max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search by title, client, or request ID..."
                        value={search}
                        onChange={handleSearch}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="p-4">
                <DataTable
                    tableId="event-requests"
                    data={requests}
                    columns={columns}
                    isLoading={isLoading}
                    getRowKey={(r) => r.id}
                    emptyMessage="No Requests Found"
                    emptyDescription={
                        search
                            ? `No requests match "${search}".`
                            : statusFilter === 'PENDING'
                            ? 'No pending requests at this time.'
                            : `No ${statusFilter.toLowerCase()} requests found.`
                    }
                    expandableContent={(r) => (
                        <ExpandedRow
                            r={r}
                            onApprove={(id) => setApproveId(id)}
                            onReject={(id) => setRejectId(id)}
                        />
                    )}
                    expandedKeys={expandedKeys}
                    onToggleExpand={handleToggleExpand}
                />

                {meta && Math.ceil(meta.total / meta.limit) > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t mt-4">
                        <p className="text-sm text-muted-foreground">
                            Page {meta.page} of {Math.ceil(meta.total / meta.limit)} ({meta.total} total)
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
                                disabled={page >= Math.ceil(meta.total / meta.limit)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Approve Dialog */}
            {approveId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-lg font-semibold mb-1">Approve Request</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            This will approve the request and create a new event in Published status.
                        </p>
                        <label className="text-sm font-medium text-foreground block mb-1">
                            Admin Notes (optional)
                        </label>
                        <textarea
                            className="w-full border border-border rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
                            rows={3}
                            placeholder="Add optional notes for the client..."
                            value={approveNotes}
                            onChange={(e) => setApproveNotes(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setApproveId(null); setApproveNotes(''); }}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => approveMutation.mutate({ id: approveId, notes: approveNotes || undefined })}
                                disabled={approveMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {approveMutation.isPending ? 'Approving…' : 'Approve'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Dialog */}
            {rejectId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-lg font-semibold mb-1">Reject Request</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Please provide a reason for rejection. This will be visible to the client.
                        </p>
                        <label className="text-sm font-medium text-foreground block mb-1">
                            Rejection Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="w-full border border-border rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
                            rows={3}
                            placeholder="Explain why this request is being rejected..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(''); }}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => rejectMutation.mutate({ id: rejectId, rejectionReason: rejectReason })}
                                disabled={rejectMutation.isPending || !rejectReason.trim()}
                                variant="danger"
                            >
                                {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
