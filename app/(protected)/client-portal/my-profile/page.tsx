'use client';

import { trpc } from '@/lib/client/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, UserIcon, BuildingIcon, PhoneIcon, MailIcon, MapPinIcon } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Client Portal - My Profile Page
 * Shows the client's business and contact information
 */
export default function ClientPortalMyProfile() {
    const { data: profile, isLoading: profileLoading } = trpc.profile.getMyProfile.useQuery();

    // Get the client profile linked to this user
    const { data: clientProfile, isLoading: clientLoading } = trpc.profile.getMyClientProfile.useQuery(
        undefined,
        { enabled: !profileLoading && !!profile }
    );

    const isLoading = profileLoading || clientLoading;

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
                    <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
                    <p className="text-muted-foreground">Your business and contact information</p>
                </div>
            </div>

            {isLoading ? (
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                </Card>
            ) : clientProfile ? (
                <>
                    {/* Business Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <BuildingIcon className="h-5 w-5 text-primary" />
                                Business Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Business Name</p>
                                    <p className="font-medium">{clientProfile.businessName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Client ID</p>
                                    <p className="font-medium font-mono">{clientProfile.clientId}</p>
                                </div>
                            </div>
                            {clientProfile.details && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Details</p>
                                    <p className="text-foreground">{clientProfile.details}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <UserIcon className="h-5 w-5 text-primary" />
                                Contact Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Contact Name</p>
                                <p className="font-medium">{clientProfile.firstName} {clientProfile.lastName}</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <MailIcon className="h-4 w-4 text-muted-foreground mt-1" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="font-medium">{clientProfile.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <PhoneIcon className="h-4 w-4 text-muted-foreground mt-1" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Cell Phone</p>
                                    <p className="font-medium">{clientProfile.cellPhone}</p>
                                </div>
                            </div>
                            {clientProfile.businessPhone && (
                                <div className="flex items-start gap-2">
                                    <PhoneIcon className="h-4 w-4 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Business Phone</p>
                                        <p className="font-medium">{clientProfile.businessPhone}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Business Address */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <MapPinIcon className="h-5 w-5 text-primary" />
                                Business Address
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                {clientProfile.businessAddress && (
                                    <p className="font-medium">{clientProfile.businessAddress}</p>
                                )}
                                <p className="text-muted-foreground">
                                    {clientProfile.city}, {clientProfile.state} {clientProfile.zipCode}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Saved Locations (if available) */}
                    {clientProfile.locations && clientProfile.locations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <BuildingIcon className="h-5 w-5 text-primary" />
                                    Saved Locations
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {clientProfile.locations.map((location) => (
                                    <div key={location.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                                        <p className="font-medium">{location.venueName}</p>
                                        {location.meetingPoint && (
                                            <p className="text-sm text-muted-foreground">Meeting Point: {location.meetingPoint}</p>
                                        )}
                                        <p className="text-muted-foreground">{location.venueAddress}</p>
                                        <p className="text-muted-foreground">
                                            {location.city}, {location.state} {location.zipCode}
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : (
                <Card>
                    <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">
                            Unable to load profile information. Please try again later.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
