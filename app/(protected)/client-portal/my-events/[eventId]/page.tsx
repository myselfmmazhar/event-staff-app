'use client';

import { trpc } from '@/lib/client/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ArrowLeftIcon,
    CalendarIcon,
    ClockIcon,
    MapPinIcon,
    UsersIcon,
    BuildingIcon,
    InfoIcon,
    ClipboardListIcon,
    UserIcon,
    PhoneIcon,
    MailIcon,
    FileTextIcon,
    DownloadIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/routers/_app';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ClientEventDetail = RouterOutputs['profile']['getMyClientEventDetail'];
type ClientCallTime = NonNullable<NonNullable<ClientEventDetail>['callTimes']>[number];
type ClientCallTimeInvitation = ClientCallTime['invitations'][number];

/**
 * Client Portal - Event Detail Page
 * Shows event details with call times and limited staff info
 * Staff contact details (phone, email) are NOT displayed to clients
 */
export default function ClientEventDetailPage() {
    const params = useParams();
    const eventId = params.eventId as string;

    // Fetch the event details
    const { data: event, isLoading, error } = trpc.profile.getMyClientEventDetail.useQuery(
        { eventId },
        { enabled: !!eventId }
    );

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'CONFIRMED':
                return 'success';
            case 'PENDING':
                return 'warning';
            case 'DRAFT':
                return 'secondary';
            case 'CANCELLED':
                return 'destructive';
            case 'COMPLETED':
                return 'default';
            default:
                return 'secondary';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-60 w-full" />
                </div>
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Link href="/client-portal/my-events">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeftIcon className="h-4 w-4" />
                            Back to My Events
                        </Button>
                    </Link>
                    <Card>
                        <CardContent className="p-12 text-center">
                            <InfoIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">Event Not Found</h3>
                            <p className="text-muted-foreground">
                                This event could not be found or you don't have access to view it.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/client-portal/my-events">
                        <Button variant="ghost" size="sm" className="rounded-full w-9 h-9 p-0">
                            <ArrowLeftIcon className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
                            <Badge variant={getStatusBadgeVariant(event.status)}>
                                {event.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mt-1">Event ID: {event.eventId}</p>
                    </div>
                </div>

                {/* Event Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-primary" />
                            Event Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {event.description && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Description</p>
                                <p className="text-foreground">{event.description}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Date</p>
                                    <p className="font-medium">
                                        {format(new Date(event.startDate), 'EEEE, MMMM d, yyyy')}
                                        {event.endDate && event.endDate !== event.startDate && (
                                            <> – {format(new Date(event.endDate), 'MMMM d, yyyy')}</>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {event.startTime && (
                                <div className="flex items-start gap-3">
                                    <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Time</p>
                                        <p className="font-medium">
                                            {event.startTime}
                                            {event.endTime && <> – {event.endTime}</>}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {(event.venueName || event.address) && (
                            <div className="flex items-start gap-3">
                                <MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Location</p>
                                    {event.venueName && <p className="font-medium">{event.venueName}</p>}
                                    {event.address && <p className="text-foreground">{event.address}</p>}
                                    {(event.city || event.state || event.zipCode) && (
                                        <p className="text-foreground">
                                            {[event.city, event.state, event.zipCode].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {event.meetingPoint && (
                            <div className="flex items-start gap-3">
                                <MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Meeting Point</p>
                                    <p className="font-medium">{event.meetingPoint}</p>
                                </div>
                            </div>
                        )}

                        {event.requirements && (
                            <div className="flex items-start gap-3">
                                <ClipboardListIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Requirements</p>
                                    <p className="font-medium whitespace-pre-wrap">{event.requirements}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Onsite Contact */}
                {(event.onsitePocName || event.onsitePocPhone || event.onsitePocEmail) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserIcon className="h-5 w-5 text-primary" />
                                Onsite Contact
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {event.onsitePocName && (
                                <div className="flex items-center gap-3">
                                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{event.onsitePocName}</span>
                                </div>
                            )}
                            {event.onsitePocPhone && (
                                <div className="flex items-center gap-3">
                                    <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                                    <a href={`tel:${event.onsitePocPhone}`} className="text-primary hover:underline">
                                        {event.onsitePocPhone}
                                    </a>
                                </div>
                            )}
                            {event.onsitePocEmail && (
                                <div className="flex items-center gap-3">
                                    <MailIcon className="h-4 w-4 text-muted-foreground" />
                                    <a href={`mailto:${event.onsitePocEmail}`} className="text-primary hover:underline">
                                        {event.onsitePocEmail}
                                    </a>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Pre-Event Instructions */}
                {event.preEventInstructions && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardListIcon className="h-5 w-5 text-primary" />
                                Pre-Event Instructions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-foreground whitespace-pre-wrap">{event.preEventInstructions}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Event Documents */}
                {event.eventDocuments && Array.isArray(event.eventDocuments) && event.eventDocuments.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileTextIcon className="h-5 w-5 text-primary" />
                                Event Documents
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {(event.eventDocuments as Array<{ name: string; url: string; type?: string; size?: number }>).map((doc, index) => (
                                    <a
                                        key={index}
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                    >
                                        <FileTextIcon className="h-5 w-5 text-muted-foreground" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{doc.name}</p>
                                            {doc.size && (
                                                <p className="text-xs text-muted-foreground">
                                                    {(doc.size / 1024).toFixed(1)} KB
                                                </p>
                                            )}
                                        </div>
                                        <DownloadIcon className="h-4 w-4 text-muted-foreground" />
                                    </a>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Call Times & Staff */}
                {event.callTimes && event.callTimes.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UsersIcon className="h-5 w-5 text-primary" />
                                Call Times & Staff
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {event.callTimes.map((callTime: ClientCallTime) => (
                                <div key={callTime.id} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-lg">
                                                {callTime.service?.title || 'Service'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {callTime.startTime || 'TBD'} – {callTime.endTime || 'TBD'}
                                            </p>
                                        </div>
                                    </div>

                                    {callTime.notes && (
                                        <p className="text-sm text-muted-foreground">{callTime.notes}</p>
                                    )}

                                    {/* Staff List - Limited info only (no contact details) */}
                                    {callTime.invitations && callTime.invitations.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-sm font-medium mb-2">Confirmed Staff</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {callTime.invitations.map((invitation: ClientCallTimeInvitation) => (
                                                    <div
                                                        key={invitation.id}
                                                        className="flex items-center gap-2 p-2 bg-muted/50 rounded"
                                                    >
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                                                            {invitation.staff.firstName?.[0]}
                                                            {invitation.staff.lastName?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {invitation.staff.firstName} {invitation.staff.lastName}
                                                            </p>
                                                            {callTime.service && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {callTime.service.title}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
