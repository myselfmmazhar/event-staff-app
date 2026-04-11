'use client';

import { trpc } from '@/lib/client/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon, UserIcon, MailIcon, BriefcaseIcon } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Client Portal Dashboard
 * Shows welcome message, upcoming events preview, and quick links
 */
export default function ClientPortalDashboard() {
    const { data: profile, isLoading: profileLoading } = trpc.profile.getMyProfile.useQuery();
    const { data: stats, isLoading: statsLoading } = trpc.profile.getMyClientStats.useQuery();

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Welcome Section */}
                <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    {profileLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-5 w-40" />
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold text-foreground">
                                Welcome back, {profile?.firstName || 'Client'}!
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Client Portal Dashboard
                            </p>
                        </>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Upcoming Events</p>
                                    {statsLoading ? (
                                        <Skeleton className="h-8 w-12 mt-1" />
                                    ) : (
                                        <p className="text-2xl font-bold text-primary">{stats?.upcoming ?? 0}</p>
                                    )}
                                </div>
                                <CalendarIcon className="h-10 w-10 text-primary/50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Completed Events</p>
                                    {statsLoading ? (
                                        <Skeleton className="h-8 w-12 mt-1" />
                                    ) : (
                                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats?.completed ?? 0}</p>
                                    )}
                                </div>
                                <BriefcaseIcon className="h-10 w-10 text-blue-500/50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Events</p>
                                    {statsLoading ? (
                                        <Skeleton className="h-8 w-12 mt-1" />
                                    ) : (
                                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats?.total ?? 0}</p>
                                    )}
                                </div>
                                <CalendarIcon className="h-10 w-10 text-purple-500/50" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Portal Features */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <BriefcaseIcon className="h-6 w-6 text-primary" />
                            Client Portal Features
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            Welcome to your Client Portal! Here you can:
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <CalendarIcon className="h-5 w-5 text-primary mt-0.5" />
                                <span className="text-foreground">View all your events and their details</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <UserIcon className="h-5 w-5 text-primary mt-0.5" />
                                <span className="text-foreground">See assigned staff for each event</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <MailIcon className="h-5 w-5 text-primary mt-0.5" />
                                <span className="text-foreground">Update your profile information</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="font-semibold mb-2">My Events</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                View all events associated with your account.
                            </p>
                            <Link href="/client-portal/my-events">
                                <Button variant="outline" className="w-full">
                                    View My Events
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="font-semibold mb-2">My Profile</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Update your contact information and business details.
                            </p>
                            <Link href="/profile">
                                <Button variant="outline" className="w-full">
                                    View Profile
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
