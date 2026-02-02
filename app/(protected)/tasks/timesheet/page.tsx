'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, UsersIcon, ClockIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { ViewEventModal } from '@/components/events/view-event-modal';

// Type for call time data from API
type CallTimeData = {
    id: string;
    startDate: Date | string;
    startTime: string | null;
    endDate: Date | string;
    endTime: string | null;
    numberOfStaffRequired: number;
    event: {
        id: string;
        title: string;
        venueName: string;
    };
    service: {
        title: string;
    };
    invitations: Array<{
        id: string;
        status: string;
        staff: {
            firstName: string;
            lastName: string;
        };
    }>;
};

// Grouped call times result type
interface GroupedCallTimes {
    today: CallTimeData[];
    tomorrow: CallTimeData[];
    thisWeek: CallTimeData[];
    upcoming: CallTimeData[];
}

// Group call times by date category
function groupByDateCategory(callTimes: CallTimeData[]): GroupedCallTimes {
    const groups: GroupedCallTimes = {
        today: [],
        tomorrow: [],
        thisWeek: [],
        upcoming: [],
    };

    callTimes.forEach((item) => {
        const date = typeof item.startDate === 'string' ? parseISO(item.startDate) : item.startDate;
        if (isToday(date)) {
            groups.today.push(item);
        } else if (isTomorrow(date)) {
            groups.tomorrow.push(item);
        } else if (isThisWeek(date)) {
            groups.thisWeek.push(item);
        } else {
            groups.upcoming.push(item);
        }
    });

    return groups;
}

export default function TimesheetPage() {
    const { terminology } = useTerminology();
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    // Fetch upcoming call times with event and position details
    const { data: callTimesData, isLoading } = trpc.callTime.getUpcoming.useQuery({
        limit: 50,
    });

    const callTimes = (callTimesData?.data || []) as CallTimeData[];
    const groupedCallTimes = groupByDateCategory(callTimes);

    const handleCardClick = (eventId: string) => {
        setSelectedEventId(eventId);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Time Sheet</h1>
                        <p className="text-sm text-muted-foreground">
                            Timeline view of upcoming {terminology.event.plural.toLowerCase()} and schedules
                        </p>
                    </div>
                </div>
            </div>

            {/* Timeline Content */}
            {isLoading ? (
                <Card className="p-8">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </Card>
            ) : callTimes.length === 0 ? (
                <Card className="p-8 text-center">
                    <div className="mx-auto max-w-md space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground">No Upcoming Schedules</h2>
                        <p className="text-muted-foreground">
                            There are no upcoming call times or schedules. Create an {terminology.event.singular.toLowerCase()} with call times to see them here.
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* Today */}
                    {groupedCallTimes.today.length > 0 && (
                        <TimelineSection
                            title="Today"
                            callTimes={groupedCallTimes.today}
                            variant="primary"
                            onCardClick={handleCardClick}
                        />
                    )}

                    {/* Tomorrow */}
                    {groupedCallTimes.tomorrow.length > 0 && (
                        <TimelineSection
                            title="Tomorrow"
                            callTimes={groupedCallTimes.tomorrow}
                            onCardClick={handleCardClick}
                        />
                    )}

                    {/* This Week */}
                    {groupedCallTimes.thisWeek.length > 0 && (
                        <TimelineSection
                            title="This Week"
                            callTimes={groupedCallTimes.thisWeek}
                            onCardClick={handleCardClick}
                        />
                    )}

                    {/* Upcoming */}
                    {groupedCallTimes.upcoming.length > 0 && (
                        <TimelineSection
                            title="Upcoming"
                            callTimes={groupedCallTimes.upcoming}
                            onCardClick={handleCardClick}
                        />
                    )}
                </div>
            )}

            {/* Event Details Modal */}
            <ViewEventModal
                eventId={selectedEventId}
                open={!!selectedEventId}
                onClose={() => setSelectedEventId(null)}
            />
        </div>
    );
}

interface TimelineSectionProps {
    title: string;
    callTimes: CallTimeData[];
    variant?: 'primary' | 'default';
    onCardClick: (eventId: string) => void;
}

function TimelineSection({ title, callTimes, variant = 'default', onCardClick }: TimelineSectionProps) {
    return (
        <div className="space-y-3">
            <h3 className={`text-sm font-semibold uppercase tracking-wide ${variant === 'primary' ? 'text-primary' : 'text-muted-foreground'
                }`}>
                {title} ({callTimes.length})
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {callTimes.map((callTime) => (
                    <TimelineCard
                        key={callTime.id}
                        callTime={callTime}
                        isToday={variant === 'primary'}
                        onClick={() => onCardClick(callTime.event.id)}
                    />
                ))}
            </div>
        </div>
    );
}

interface TimelineCardProps {
    callTime: CallTimeData;
    isToday?: boolean;
    onClick: () => void;
}

function TimelineCard({ callTime, isToday, onClick }: TimelineCardProps) {
    const date = typeof callTime.startDate === 'string'
        ? parseISO(callTime.startDate)
        : callTime.startDate;

    const acceptedStaff = callTime.invitations.filter(inv => inv.status === 'ACCEPTED');
    const pendingCount = callTime.invitations.filter(inv => inv.status === 'PENDING').length;
    const staffNeeded = callTime.numberOfStaffRequired - acceptedStaff.length;

    return (
        <Card
            className={`p-4 transition-all hover:shadow-md cursor-pointer ${isToday ? 'border-primary/50 bg-primary/5' : ''}`}
            onClick={onClick}
        >
            {/* Event Title & Position */}
            <div className="mb-3">
                <h4 className="font-semibold text-foreground line-clamp-1">
                    {callTime.event.title}
                </h4>
                <Badge variant="secondary" className="mt-1">
                    {callTime.service.title}
                </Badge>
            </div>

            {/* Time & Location */}
            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="h-4 w-4 shrink-0" />
                    <span>{format(date, 'EEE, MMM d')}</span>
                </div>

                {callTime.startTime && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <ClockIcon className="h-4 w-4 shrink-0" />
                        <span>
                            {callTime.startTime}
                            {callTime.endTime && ` - ${callTime.endTime}`}
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs">📍</span>
                    <span className="line-clamp-1">{callTime.event.venueName}</span>
                </div>
            </div>

            {/* Staff Status */}
            <div className="mt-4 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                            {acceptedStaff.length}/{callTime.numberOfStaffRequired} confirmed
                        </span>
                    </div>
                    {staffNeeded > 0 && (
                        <Badge variant="warning" size="sm">
                            Need {staffNeeded}
                        </Badge>
                    )}
                    {staffNeeded <= 0 && (
                        <Badge variant="success" size="sm">
                            Full
                        </Badge>
                    )}
                </div>

                {/* Assigned Staff Names */}
                {acceptedStaff.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {acceptedStaff.slice(0, 3).map((inv) => (
                            <Badge key={inv.id} variant="outline" size="sm">
                                {inv.staff.firstName} {inv.staff.lastName.charAt(0)}.
                            </Badge>
                        ))}
                        {acceptedStaff.length > 3 && (
                            <Badge variant="outline" size="sm">
                                +{acceptedStaff.length - 3} more
                            </Badge>
                        )}
                    </div>
                )}

                {pendingCount > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        {pendingCount} pending response{pendingCount > 1 ? 's' : ''}
                    </p>
                )}
            </div>
        </Card>
    );
}
