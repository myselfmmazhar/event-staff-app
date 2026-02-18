'use client';

import { trpc } from '@/lib/client/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, MapPinIcon, UsersIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { isDateNullOrUBD } from '@/lib/utils/date-formatter';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/routers/_app';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ClientEventListItem = RouterOutputs['profile']['getMyClientEvents'][number];

/**
 * Client Portal - My Events Page  
 * Shows all events associated with the client
 */
export default function ClientPortalMyEvents() {
    const { data: profile, isLoading: profileLoading } = trpc.profile.getMyProfile.useQuery();

    // Get the client profile first to get the client ID
    const { data: clientProfile, isLoading: clientLoading } = trpc.profile.getMyClientProfile.useQuery(
        undefined,
        { enabled: !profileLoading && !!profile }
    );

    // Get events for this client
    const { data: eventsData, isLoading: eventsLoading } = trpc.profile.getMyClientEvents.useQuery(
        undefined,
        { enabled: !!clientProfile }
    );

    const isLoading = profileLoading || clientLoading || eventsLoading;
    const events = (eventsData || []) as ClientEventListItem[];

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'ASSIGNED':
                return 'info';
            case 'IN_PROGRESS':
                return 'warning';
            case 'DRAFT':
                return 'secondary';
            case 'CANCELLED':
                return 'destructive';
            case 'COMPLETED':
                return 'success';
            default:
                return 'secondary';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
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

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="space-y-3">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : events.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Events Yet</h3>
                        <p className="text-muted-foreground">
                            You don't have any events associated with your account yet.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {events.map((event: ClientEventListItem) => (
                        <Card key={event.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold">{event.title}</h3>
                                            <Badge variant={getStatusBadgeVariant(event.status)}>
                                                {event.status}
                                            </Badge>
                                        </div>

                                        {event.description && (
                                            <p className="text-muted-foreground text-sm line-clamp-2">
                                                {event.description}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <CalendarIcon className="h-4 w-4" />
                                                <span>
                                                    {isDateNullOrUBD(event.startDate) ? 'UBD' : format(new Date(event.startDate!), 'MMM d, yyyy')}
                                                    {event.endDate && !isDateNullOrUBD(event.endDate) && event.endDate !== event.startDate && (
                                                        <> - {format(new Date(event.endDate), 'MMM d, yyyy')}</>
                                                    )}
                                                </span>
                                            </div>

                                            {event.startTime && (
                                                <div className="flex items-center gap-1.5">
                                                    <ClockIcon className="h-4 w-4" />
                                                    <span>{event.startTime}{event.endTime && ` - ${event.endTime}`}</span>
                                                </div>
                                            )}

                                            {(event.venueName || event.address) && (
                                                <div className="flex items-center gap-1.5">
                                                    <MapPinIcon className="h-4 w-4" />
                                                    <span>{event.venueName || event.address}</span>
                                                </div>
                                            )}

                                            {event._count?.callTimes > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <UsersIcon className="h-4 w-4" />
                                                    <span>{event._count.callTimes} call time{event._count.callTimes !== 1 ? 's' : ''}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Link href={`/client-portal/my-events/${event.id}`}>
                                        <Button variant="ghost" size="sm" className="ml-4 w-9 h-9 p-0">
                                            <ChevronRightIcon className="h-5 w-5" />
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
