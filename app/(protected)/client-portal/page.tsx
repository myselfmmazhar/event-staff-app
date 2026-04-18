'use client';

import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, UserIcon, BriefcaseIcon, ClockIcon, MapPinIcon } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientPortalDashboard() {
    const { data: profile, isLoading: profileLoading } = trpc.profile.getMyProfile.useQuery();
    const { data: stats, isLoading: statsLoading } = trpc.profile.getMyClientStats.useQuery();
    const { data: events, isLoading: eventsLoading } = trpc.profile.getMyClientEvents.useQuery();

    const upcomingEvents = events
        ?.filter(e => e.startDate && new Date(e.startDate) >= new Date())
        .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())
        .slice(0, 6) ?? [];

    const formatDate = () =>
        new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const statusColor: Record<string, string> = {
        PUBLISHED: 'border-blue-400 text-blue-600',
        ASSIGNED:  'border-green-400 text-green-700',
        COMPLETED: 'border-muted-foreground/30 text-muted-foreground',
        CANCELLED: 'border-red-400 text-red-600',
        DRAFT:     'border-amber-400 text-amber-600',
    };

    return (
        <div className="min-h-screen bg-muted/30 px-6 py-6">
            <div className="space-y-6">

                {/* Welcome */}
                <div className="bg-card border border-border rounded-xl px-6 py-5">
                    {profileLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-5 w-40" />
                        </div>
                    ) : (
                        <>
                            <h1 className="text-3xl font-bold text-foreground mb-2">
                                {getGreeting()}, {profile?.firstName || 'Client'}!
                            </h1>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap mb-3">
                                <span>{formatDate()}</span>
                                <span>•</span>
                                <Badge variant="outline" className="text-[11px] font-semibold uppercase tracking-widest border-foreground/25 text-foreground px-2 py-0">
                                    Client
                                </Badge>
                                <span className="text-muted-foreground/40">·</span>
                                <span>Client Portal</span>
                            </div>
                            <div className="flex gap-2">
                                <Link href="/profile">
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                                        <UserIcon className="h-3.5 w-3.5" />
                                        My Profile
                                    </Button>
                                </Link>
                                <Link href="/client-portal/my-events">
                                    <Button size="sm" className="gap-1.5 text-xs">
                                        <CalendarIcon className="h-3.5 w-3.5" />
                                        My Events
                                    </Button>
                                </Link>
                            </div>
                        </>
                    )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: 'Upcoming Events', value: stats?.upcoming ?? 0, icon: CalendarIcon },
                        { label: 'Completed Events', value: stats?.completed ?? 0, icon: BriefcaseIcon },
                        { label: 'Total Events',     value: stats?.total ?? 0,     icon: ClockIcon },
                    ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="bg-card border border-border rounded-xl p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{label}</p>
                                    {statsLoading ? (
                                        <Skeleton className="h-8 w-12 mt-1" />
                                    ) : (
                                        <p className="text-3xl font-bold text-foreground mt-0.5">{value}</p>
                                    )}
                                </div>
                                <Icon className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Two-column content */}
                <div className="flex gap-6 items-start">

                    {/* Left — upcoming events list */}
                    <div className="flex-1 min-w-0 bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-6 pt-5 pb-2 flex items-center justify-between border-b border-border">
                            <div>
                                <h2 className="text-sm font-semibold text-foreground">Upcoming Events</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Your next scheduled events</p>
                            </div>
                            <Link href="/client-portal/my-events">
                                <Button variant="outline" size="sm" className="text-xs">View All</Button>
                            </Link>
                        </div>

                        {eventsLoading ? (
                            <div className="divide-y divide-border">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="px-6 py-4 flex items-center gap-4">
                                        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <Skeleton className="h-4 w-48" />
                                            <Skeleton className="h-3 w-32" />
                                        </div>
                                        <Skeleton className="h-5 w-20" />
                                    </div>
                                ))}
                            </div>
                        ) : upcomingEvents.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-sm text-muted-foreground">No upcoming events.</p>
                                <Link href="/client-portal/my-events">
                                    <Button variant="outline" size="sm" className="mt-3 text-xs">View All Events</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {upcomingEvents.map(event => (
                                    <Link key={event.id} href={`/client-portal/my-events/${event.id}`}>
                                        <div className="px-6 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer">
                                            <div className="h-10 w-10 shrink-0 bg-muted rounded-lg flex flex-col items-center justify-center">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase leading-none">
                                                    {new Date(event.startDate!).toLocaleDateString('en-US', { month: 'short' })}
                                                </span>
                                                <span className="text-base font-bold text-foreground leading-none">
                                                    {new Date(event.startDate!).getDate()}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    {event.venueName && (
                                                        <>
                                                            <MapPinIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                                            <p className="text-xs text-muted-foreground truncate">{event.venueName}</p>
                                                        </>
                                                    )}
                                                    {event.startTime && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {event.venueName ? ' · ' : ''}{event.startTime}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-md border shrink-0 ${statusColor[event.status] ?? 'border-muted-foreground/30 text-muted-foreground'}`}>
                                                {event.status}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right — sidebar */}
                    <div className="w-72 shrink-0 space-y-5">
                        <div className="bg-card border border-border rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-foreground mb-0.5">Quick links</h3>
                            <p className="text-xs text-muted-foreground mb-4">Navigate to key areas</p>
                            <div className="space-y-2.5">
                                {[
                                    { label: 'All My Events', href: '/client-portal/my-events' },
                                    { label: 'My Profile',    href: '/profile' },
                                ].map(link => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="block text-sm text-foreground hover:text-primary transition-colors py-0.5"
                                    >
                                        {link.label} →
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
