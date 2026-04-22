'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, UserIcon, BriefcaseIcon, ClockIcon, MapPinIcon, FileTextIcon } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function ClientPortalDashboard() {
    const { data: profile, isLoading: profileLoading } = trpc.profile.getMyProfile.useQuery();
    const { data: stats, isLoading: statsLoading } = trpc.profile.getMyClientStats.useQuery();
    const { data: events, isLoading: eventsLoading } = trpc.profile.getMyClientEvents.useQuery();

    const upcomingEvents = events
        ?.filter(e => {
            if (!e.startDate) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const eventDate = new Date(e.startDate);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= today && !['CANCELLED', 'COMPLETED'].includes(e.status);
        })
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
        ASSIGNED: 'border-green-400 text-green-700',
        COMPLETED: 'border-muted-foreground/30 text-muted-foreground',
        CANCELLED: 'border-red-400 text-red-600',
        DRAFT: 'border-amber-400 text-amber-600',
    };

    return (
        <div className="min-h-screen bg-muted/30">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Upcoming Events', value: stats?.upcoming ?? 0, icon: CalendarIcon },
                        { label: 'Completed Events', value: stats?.completed ?? 0, icon: BriefcaseIcon },
                        { label: 'Total Events', value: stats?.total ?? 0, icon: ClockIcon },
                        { label: 'Total Requests', value: stats?.requests ?? 0, icon: FileTextIcon },
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
                                    <div key={i} className="px-6 py-4 grid grid-cols-[140px_1fr_140px_140px_100px] gap-4 items-center">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-6 w-20 rounded-md" />
                                    </div>
                                ))}
                            </div>
                        ) : upcomingEvents.length === 0 ? (
                            <div className="py-12 text-center border-t border-border">
                                <p className="text-sm text-muted-foreground">No upcoming events.</p>
                                <Link href="/client-portal/my-events">
                                    <Button variant="outline" size="sm" className="mt-3 text-xs">View All Events</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <div className="min-w-[800px]">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-[150px_1fr_160px_150px_110px] gap-4 px-6 py-3 border-b border-border bg-muted/20">
                                        {["Date", "Task", "Venue", "Assignment Progress", "Status"].map((h) => (
                                            <span key={h} className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                                {h}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Rows */}
                                    <div className="divide-y divide-border">
                                        {upcomingEvents.map((event: any) => {
                                            const totalRequired = event.callTimes?.reduce((sum: number, ct: any) => sum + (ct.numberOfStaffRequired || 0), 0) || 0;
                                            const totalFilled = event.callTimes?.reduce((sum: number, ct: any) => sum + (ct.invitations?.length || 0), 0) || 0;
                                            const open = Math.max(0, totalRequired - totalFilled);

                                            const isNeedsTalent = event.status === 'PUBLISHED';
                                            const badgeLabel = isNeedsTalent ? "Needs Talent" : (event.status.charAt(0) + event.status.slice(1).toLowerCase());
                                            const badgeClass = isNeedsTalent
                                                ? "border-amber-400 text-amber-700 bg-amber-50/50"
                                                : (statusColor[event.status] || "border-muted-foreground/30 text-muted-foreground");

                                            return (
                                                <Link key={event.id} href={`/client-portal/my-events/${event.id}`}>
                                                    <div className="grid grid-cols-[150px_1fr_160px_150px_110px] gap-4 px-6 py-4 hover:bg-muted/30 cursor-pointer transition-colors items-center">
                                                        {/* Date / Time */}
                                                        <div>
                                                            <p className="text-sm font-semibold text-foreground leading-snug">
                                                                {event.startDate ? format(new Date(event.startDate), "MMM d, yyyy") : "Date TBD"}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                {event.startTime || "TBD"}{event.endTime ? ` – ${event.endTime}` : ''}
                                                            </p>
                                                        </div>

                                                        {/* Task (Title / ID) */}
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-foreground leading-snug truncate">
                                                                {event.title}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono uppercase tracking-tight">
                                                                {event.eventId}
                                                            </p>
                                                        </div>

                                                        {/* Venue */}
                                                        <div className="flex items-center min-w-0">
                                                            <span className="text-sm text-muted-foreground truncate">
                                                                {event.venueName || "TBD"}
                                                            </span>
                                                        </div>

                                                        {/* Assignment Progress */}
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">
                                                                {totalFilled} / {totalRequired} filled
                                                            </p>
                                                            {open > 0 && (
                                                                <p className="text-[11px] text-amber-600 font-medium mt-0.5">{open} open</p>
                                                            )}
                                                        </div>

                                                        {/* Status Badge */}
                                                        <div className="flex items-center">
                                                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold border ${badgeClass}`}>
                                                                {badgeLabel}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
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
                                    { label: 'My Profile', href: '/profile' },
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
