'use client';

import { useState } from 'react';
import { trpc } from '@/lib/client/trpc';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, PlusIcon, PencilIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { EventRequestFormModal, type EventRequestData } from '@/components/events/event-request-form-modal';
import { MapPinIcon, UserIcon, PhoneIcon, MailIcon, FileTextIcon, EyeIcon } from 'lucide-react';
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

function formatDateShort(date: Date | string | null | undefined): string {
    if (!date) return 'UBD';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (d.getFullYear() === 1970) return 'UBD';
    return format(d, 'EEE, MMM d');
}

function getEventStatusBadgeVariant(status: string): 'success' | 'warning' | 'info' | 'destructive' | 'secondary' {
    switch (status) {
        case 'PUBLISHED':
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
    const hasVenueDetails = event.address || event.city || event.state;
    const hasPoc = event.onsitePocName || event.onsitePocPhone || event.onsitePocEmail;

    return (
        <div className="p-4 bg-muted/10 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Description & Requirements */}
                {(event.description || event.requirements) && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <FileTextIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            Details
                        </h4>
                        {event.description && (
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                                <p className="text-sm text-foreground">{event.description}</p>
                            </div>
                        )}
                        {event.requirements && (
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Requirements</p>
                                <p className="text-sm text-foreground">{event.requirements}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Venue & Meeting Point */}
                {(hasVenueDetails || event.meetingPoint) && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            Venue
                        </h4>
                        {hasVenueDetails && (
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Address</p>
                                <p className="text-sm text-foreground">
                                    {[event.address, event.city, event.state, event.zipCode].filter(Boolean).join(', ')}
                                </p>
                            </div>
                        )}
                        {event.meetingPoint && (
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Meeting Point</p>
                                <p className="text-sm text-foreground">{event.meetingPoint}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Onsite POC */}
                {hasPoc && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            Onsite Contact
                        </h4>
                        {event.onsitePocName && (
                            <p className="text-sm text-foreground font-medium">{event.onsitePocName}</p>
                        )}
                        {event.onsitePocPhone && (
                            <div className="flex items-center gap-1.5">
                                <PhoneIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <p className="text-sm text-foreground">{event.onsitePocPhone}</p>
                            </div>
                        )}
                        {event.onsitePocEmail && (
                            <div className="flex items-center gap-1.5">
                                <MailIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <p className="text-sm text-foreground">{event.onsitePocEmail}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Pre-Event Instructions */}
                {event.preEventInstructions && (
                    <div className="space-y-3 md:col-span-2 lg:col-span-3">
                        <h4 className="text-sm font-semibold text-foreground">Pre-Event Instructions</h4>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{event.preEventInstructions}</p>
                    </div>
                )}
            </div>

            {/* View Full Details link */}
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border">
                <Link href={`/client-portal/my-events/${event.id}`}>
                    <Button variant="outline" size="sm">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Full Details
                    </Button>
                </Link>
            </div>
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
                    {item.endTime ? ` - ${formatTime(item.endTime)}` : ''}
                </span>
            ),
        },
        {
            key: 'event',
            label: 'Task',
            sortable: true,
            render: (item) => (
                <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.eventId}</p>
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
            key: 'callTimes',
            label: 'Assignments',
            render: (item) => (
                <span className="text-muted-foreground">
                    {item._count?.callTimes ?? 0} shift{(item._count?.callTimes ?? 0) !== 1 ? 's' : ''}
                </span>
            ),
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
        <div className="p-6 space-y-6">
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
            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'events' | 'requests')}
                className="space-y-4"
            >
                <TabsList>
                    <TabsTrigger value="events" className="flex items-center gap-2">
                        My Events
                        <Badge variant="secondary" className="ml-1 text-xs">
                            {events.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="flex items-center gap-2">
                        My Requests
                        {requests.length > 0 && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {requests.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="events">
                    <Card className="p-4">
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
                    </Card>
                </TabsContent>

                <TabsContent value="requests">
                    <Card className="p-4">
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
                    </Card>
                </TabsContent>
            </Tabs>

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
