'use client';

import { useState } from 'react';
import { trpc } from '@/lib/client/trpc';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeftIcon, PlusIcon, PencilIcon, ChevronRightIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { formatDateShort } from '@/lib/utils/date-formatter';

import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { EventRequestFormModal, type EventRequestData } from '@/components/events/event-request-form-modal';
import { MapPinIcon, FileTextIcon, EyeIcon } from 'lucide-react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/routers/_app';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ClientEventListItem = RouterOutputs['profile']['getMyClientEvents'][number];
type EventRequestItem = RouterOutputs['eventRequest']['getMyRequests']['data'][number];

function formatTime(time: string | null | undefined): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return '';
    const hour = parseInt(parts[0] ?? '0', 10);
    if (isNaN(hour)) return '';
    const minutes = parts[1] ?? '00';
    const ampm = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes}${ampm}`;
}

function formatDateTime(date: Date | string | null | undefined, time: string | null | undefined): string {
    if (!date) return 'TBD';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (d.getFullYear() === 1970) return 'TBD';
    const dateStr = format(d, 'MMM d, yyyy');
    if (!time) return dateStr;
    const parts = time.split(':');
    const hour = parseInt(parts[0] ?? '0', 10);
    if (isNaN(hour)) return dateStr;
    const minutes = parts[1] ?? '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${dateStr} ${hour12}:${minutes} ${ampm}`;
}

function getAssignmentStats(callTimes: Array<{ numberOfStaffRequired: number; invitations: Array<{ status: string; isConfirmed: boolean; staff: { firstName: string; lastName: string } }> }>) {
    const totalRequired = callTimes.reduce((sum, ct) => sum + ct.numberOfStaffRequired, 0);
    const totalSent = callTimes.reduce((sum, ct) => sum + ct.invitations.length, 0);
    const acceptedInvitations = callTimes.flatMap(ct => ct.invitations.filter(i => i.isConfirmed || i.status === 'ACCEPTED'));
    const totalAccepted = acceptedInvitations.length;
    const totalPending = callTimes.reduce((sum, ct) => sum + ct.invitations.filter(i => i.status === 'PENDING').length, 0);
    const totalOpen = Math.max(0, totalRequired - totalAccepted);
    const acceptedStaffNames = acceptedInvitations.map(i => `${i.staff.firstName} ${i.staff.lastName}`);
    return { totalRequired, totalSent, totalAccepted, totalPending, totalOpen, acceptedStaffNames };
}

function getEventStatusBadgeVariant(status: string): 'success' | 'warning' | 'info' | 'destructive' | 'secondary' {
    switch (status) {
        case 'PUBLISHED':
            return 'success';
        case 'ASSIGNED':
            return 'info';
        case 'IN_PROGRESS':
            return 'warning';
        case 'COMPLETED':
            return 'success';
        case 'CANCELLED':
            return 'destructive';
        default:
            return 'secondary';
    }
}

function getRequestStatusBadgeVariant(status: string): 'warning' | 'success' | 'destructive' | 'secondary' {
    switch (status) {
        case 'PENDING':
            return 'warning';
        case 'APPROVED':
            return 'success';
        case 'REJECTED':
            return 'destructive';
        default:
            return 'secondary';
    }
}

// ---------------------------------------------------------------------------
// Expanded row: My Events
// ---------------------------------------------------------------------------
function EventExpandedRow({ event }: { event: ClientEventListItem }) {
    const { totalRequired, totalSent, totalAccepted, totalPending, totalOpen, acceptedStaffNames } = getAssignmentStats(event.callTimes);
    const [staffDialogOpen, setStaffDialogOpen] = useState(false);

    return (
        <div className="px-6 py-4 bg-muted/20 border-t border-border/50">
            {/* Assignment Summary header */}
            <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assignment Summary</span>
                <span className="bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full text-xs font-medium">
                    {totalRequired} Required
                </span>
                <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-xs font-medium">
                    {totalSent} Sent
                </span>
            </div>

            {/* 3 cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Open Positions */}
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center shrink-0">
                        <span className="text-red-600 font-bold text-base">{totalOpen}</span>
                    </div>
                    <div>
                        <p className="font-semibold text-red-700 text-sm">Open Positions</p>
                        <p className="text-[10px] text-red-500 uppercase tracking-wide font-medium">Needs Staffing</p>
                    </div>
                </div>

                {/* Pending */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center shrink-0">
                        <span className="text-amber-600 font-bold text-base">{totalPending}</span>
                    </div>
                    <div>
                        <p className="font-semibold text-amber-700 text-sm">Pending</p>
                        <p className="text-[10px] text-amber-500 uppercase tracking-wide font-medium">Awaiting Confirmation</p>
                    </div>
                </div>

                {/* Accepted — clickable, opens staff list popup */}
                <button
                    onClick={() => setStaffDialogOpen(true)}
                    className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-green-100 transition-colors text-left w-full"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center shrink-0">
                            <span className="text-green-600 font-bold text-base">{totalAccepted}</span>
                        </div>
                        <div>
                            <p className="font-semibold text-green-700 text-sm">Accepted</p>
                            <p className="text-[10px] text-green-500 uppercase tracking-wide font-medium">{totalAccepted} Confirmed</p>
                        </div>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-green-400 shrink-0" />
                </button>
            </div>

            {/* View Full Details */}
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border/50">
                <Link href={`/client-portal/my-events/${event.id}`}>
                    <Button variant="outline" size="sm">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Full Details
                    </Button>
                </Link>
            </div>

            {/* Accepted Staff Dialog */}
            <Dialog open={staffDialogOpen} onClose={() => setStaffDialogOpen(false)}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UsersIcon className="h-5 w-5 text-green-600" />
                        Accepted Staff
                    </DialogTitle>
                </DialogHeader>
                <div className="px-6 py-4">
                    {acceptedStaffNames.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No staff have accepted yet.</p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {acceptedStaffNames.map((name, i) => (
                                <li key={i} className="py-2.5 text-sm font-medium">
                                    {name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Dialog>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Expanded row: My Requests
// ---------------------------------------------------------------------------
function RequestExpandedRow({
    request,
    onEdit,
}: {
    request: EventRequestItem;
    onEdit: (req: EventRequestItem) => void;
}) {
    return (
        <div className="p-4 bg-muted/10 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Description */}
                {request.description && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <FileTextIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            Description
                        </h4>
                        <p className="text-sm text-foreground">{request.description}</p>
                    </div>
                )}

                {/* Location */}
                {(request.venueName || request.city || request.state) && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            Location
                        </h4>
                        {request.venueName && (
                            <p className="text-sm font-medium text-foreground">{request.venueName}</p>
                        )}
                        {(request.city || request.state) && (
                            <p className="text-sm text-muted-foreground">
                                {[request.city, request.state].filter(Boolean).join(', ')}
                            </p>
                        )}
                    </div>
                )}

                {/* Linked Event (if approved) */}
                {request.createdEvent && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Linked Event</h4>
                        <p className="text-sm font-medium text-foreground">{request.createdEvent.title}</p>
                        <p className="text-sm text-muted-foreground">{request.createdEvent.eventId}</p>
                    </div>
                )}

                {/* Rejection Reason */}
                {request.status === 'REJECTED' && (request as any).rejectionReason && (
                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                        <h4 className="text-sm font-semibold text-destructive">Rejection Reason</h4>
                        <p className="text-sm text-foreground">{(request as any).rejectionReason}</p>
                    </div>
                )}

                {/* Submitted date */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Submitted</p>
                    <p className="text-sm text-foreground">
                        {format(new Date(request.createdAt), 'MMM d, yyyy')}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border">
                {request.status === 'PENDING' && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(request)}
                    >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Edit Request
                    </Button>
                )}
                {request.createdEvent && (
                    <Link href={`/client-portal/my-events/${request.createdEvent.id}`}>
                        <Button variant="outline" size="sm">
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View Event
                        </Button>
                    </Link>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ClientPortalMyEvents() {
    const [activeTab, setActiveTab] = useState<'events' | 'requests'>('events');
    const [isEventRequestModalOpen, setIsEventRequestModalOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<EventRequestData | undefined>(undefined);

    const [expandedEventKeys, setExpandedEventKeys] = useState<Set<string>>(new Set());
    const [expandedRequestKeys, setExpandedRequestKeys] = useState<Set<string>>(new Set());

    const { data: eventsData, isLoading: eventsLoading } = trpc.profile.getMyClientEvents.useQuery();
    const { data: requestsData, isLoading: requestsLoading } = trpc.eventRequest.getMyRequests.useQuery({
        limit: 100,
    });

    const events = (eventsData || []) as ClientEventListItem[];
    const requests = (requestsData?.data || []) as EventRequestItem[];

    function toggleExpand(set: Set<string>, setFn: (s: Set<string>) => void, key: string) {
        const next = new Set(set);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setFn(next);
    }

    const handleEditRequest = (req: EventRequestItem) => {
        setEditingRequest(req as EventRequestData);
        setIsEventRequestModalOpen(true);
    };

    // -------------------------------------------------------------------------
    // Event table columns
    // -------------------------------------------------------------------------
    const eventColumns: ColumnDef<ClientEventListItem>[] = [
        {
            key: 'status',
            label: 'Status',
            render: (item) => (
                <Badge variant={getEventStatusBadgeVariant(item.status)}>
                    {item.status.replace(/_/g, ' ')}
                </Badge>
            ),
        },
        {
            key: 'startDate',
            label: 'Date',
            sortable: true,
            render: (item) => (
                <div className="text-sm font-medium text-foreground whitespace-nowrap">
                    <div>{formatDateTime(item.startDate, item.startTime)}</div>
                    {(item.endDate || item.endTime) && (
                        <div className="text-muted-foreground">- {formatDateTime(item.endDate, item.endTime)}</div>
                    )}
                </div>
            ),
        },
        {
            key: 'title',
            label: 'Title',
            sortable: true,
            render: (item) => (
                <p className="font-bold text-foreground">{item.title}</p>
            ),
        },
        {
            key: 'client',
            label: 'Client',
            render: (item) => (
                <span className="text-sm text-muted-foreground truncate max-w-[160px] block">
                    {item.client?.businessName ?? [item.client?.firstName, item.client?.lastName].filter(Boolean).join(' ') ?? '-'}
                </span>
            ),
        },
        {
            key: 'location',
            label: 'Location',
            sortable: true,
            render: (item) => (
                <div className="text-sm">
                    <p className="text-foreground">{item.venueName || '-'}</p>
                    {(item.city || item.state) && (
                        <p className="text-muted-foreground">
                            {[item.city, item.state].filter(Boolean).join(', ')}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'assignmentProgress',
            label: 'Assignment Progress',
            render: (item) => {
                const { totalRequired, totalAccepted, totalPending, totalOpen } = getAssignmentStats(item.callTimes);
                return (
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16">Open:</span>
                            <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                                {totalOpen} of {totalRequired}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16">Pending:</span>
                            <span className="bg-gray-900 text-white px-1.5 py-0.5 rounded font-medium">
                                {totalPending} of {totalRequired}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16">Accepted:</span>
                            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                                {totalAccepted} of {totalRequired}
                            </span>
                        </div>
                    </div>
                );
            },
        },
    ];

    // -------------------------------------------------------------------------
    // Request table columns
    // -------------------------------------------------------------------------
    const requestColumns: ColumnDef<EventRequestItem>[] = [
        {
            key: 'status',
            label: 'Status',
            render: (item) => (
                <Badge variant={getRequestStatusBadgeVariant(item.status)}>
                    {item.status}
                </Badge>
            ),
        },
        {
            key: 'startDate',
            label: 'Date',
            sortable: true,
            render: (item) => (
                <span className="font-medium text-foreground">
                    {formatDateShort(item.startDate)}
                </span>
            ),
        },
        {
            key: 'time',
            label: 'Time',
            render: (item) => (
                <span className="text-muted-foreground">
                    {item.startTime ? formatTime(item.startTime) : '-'}
                </span>
            ),
        },
        {
            key: 'request',
            label: 'Task',
            sortable: true,
            render: (item) => (
                <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.eventRequestId}</p>
                </div>
            ),
        },
        {
            key: 'location',
            label: 'Location',
            render: (item) => (
                <div className="text-sm">
                    <p className="text-foreground">{item.venueName || '-'}</p>
                    {(item.city || item.state) && (
                        <p className="text-muted-foreground">
                            {[item.city, item.state].filter(Boolean).join(', ')}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'linkedEvent',
            label: 'Linked Event',
            render: (item) => (
                item.createdEvent ? (
                    <div className="text-sm">
                        <p className="text-foreground">{item.createdEvent.title}</p>
                        <p className="text-muted-foreground">{item.createdEvent.eventId}</p>
                    </div>
                ) : (
                    <span className="text-muted-foreground">-</span>
                )
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/client-portal">
                        <Button variant="ghost" size="sm" className="rounded-full w-9 h-9 p-0">
                            <ArrowLeftIcon className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">My Events</h1>
                        <p className="text-muted-foreground">All events associated with your account</p>
                    </div>
                </div>
                <Button
                    onClick={() => {
                        setEditingRequest(undefined);
                        setIsEventRequestModalOpen(true);
                    }}
                    className="gap-2"
                >
                    <PlusIcon className="h-4 w-4" />
                    Request Event
                </Button>
            </div>

            {/* Tabs */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="border-b border-border px-6 flex items-center gap-7">
                    {([
                        { id: 'events', label: 'My Events', count: events.length },
                        { id: 'requests', label: 'My Requests', count: requests.length },
                    ] as const).map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-4 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 ${
                                activeTab === tab.id
                                    ? "text-[#196496] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#196496] after:rounded-full"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                                    activeTab === tab.id
                                        ? 'bg-[#196496]/10 text-[#196496]'
                                        : 'bg-muted text-muted-foreground'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-4">
                    {activeTab === 'events' && (
                        <DataTable
                            tableId="client-my-events"
                            data={events}
                            columns={eventColumns}
                            isLoading={eventsLoading}
                            getRowKey={(item) => item.id}
                            emptyMessage="No Events Yet"
                            emptyDescription="You don't have any events associated with your account yet."
                            minWidth="900px"
                            expandableContent={(item) => <EventExpandedRow event={item} />}
                            expandedKeys={expandedEventKeys}
                            onToggleExpand={(key) =>
                                toggleExpand(expandedEventKeys, setExpandedEventKeys, key)
                            }
                        />
                    )}

                    {activeTab === 'requests' && (
                        <DataTable
                            tableId="client-my-requests"
                            data={requests}
                            columns={requestColumns}
                            isLoading={requestsLoading}
                            getRowKey={(item) => item.id}
                            emptyMessage="No Requests Yet"
                            emptyDescription="Submit a request and we'll get back to you shortly."
                            minWidth="900px"
                            expandableContent={(item) => (
                                <RequestExpandedRow
                                    request={item}
                                    onEdit={handleEditRequest}
                                />
                            )}
                            expandedKeys={expandedRequestKeys}
                            onToggleExpand={(key) =>
                                toggleExpand(expandedRequestKeys, setExpandedRequestKeys, key)
                            }
                        />
                    )}
                </div>
            </div>

            <EventRequestFormModal
                open={isEventRequestModalOpen}
                onClose={() => {
                    setIsEventRequestModalOpen(false);
                    setEditingRequest(undefined);
                }}
                onSuccess={() => {}}
                request={editingRequest}
            />
        </div>
    );
}
