'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/client/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeftIcon, UserIcon, BuildingIcon, PhoneIcon, MailIcon, MapPinIcon, PencilIcon, XIcon, SaveIcon } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

const businessInfoSchema = z.object({
    businessName: z.string().min(1, 'Business name is required').max(200),
    details: z.string().max(5000).optional(),
});

const addressSchema = z.object({
    businessAddress: z.string().max(300).optional(),
    city: z.string().min(1, 'City is required').max(100),
    state: z.string().min(1, 'State is required').max(50),
    zipCode: z.string().min(1, 'ZIP code is required').max(20),
});

type BusinessInfoValues = z.infer<typeof businessInfoSchema>;
type AddressValues = z.infer<typeof addressSchema>;

export default function ClientPortalMyProfile() {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const [editingBusiness, setEditingBusiness] = useState(false);
    const [editingAddress, setEditingAddress] = useState(false);

    const { data: profile, isLoading: profileLoading } = trpc.profile.getMyProfile.useQuery();
    const { data: clientProfile, isLoading: clientLoading } = trpc.profile.getMyClientProfile.useQuery(
        undefined,
        { enabled: !profileLoading && !!profile }
    );

    const updateClientProfile = trpc.profile.updateMyClientProfile.useMutation({
        onSuccess: () => {
            utils.profile.getMyClientProfile.invalidate();
            toast({ title: 'Profile updated', description: 'Your information has been saved.' });
        },
        onError: (err) => {
            toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
        },
    });

    const businessForm = useForm<BusinessInfoValues>({
        resolver: zodResolver(businessInfoSchema),
        defaultValues: { businessName: '', details: '' },
    });

    const addressForm = useForm<AddressValues>({
        resolver: zodResolver(addressSchema),
        defaultValues: { businessAddress: '', city: '', state: '', zipCode: '' },
    });

    const startEditBusiness = () => {
        businessForm.reset({
            businessName: clientProfile?.businessName ?? '',
            details: clientProfile?.details ?? '',
        });
        setEditingBusiness(true);
    };

    const startEditAddress = () => {
        addressForm.reset({
            businessAddress: clientProfile?.businessAddress ?? '',
            city: clientProfile?.city ?? '',
            state: clientProfile?.state ?? '',
            zipCode: clientProfile?.zipCode ?? '',
        });
        setEditingAddress(true);
    };

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
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <BuildingIcon className="h-5 w-5 text-primary" />
                                    Business Information
                                </CardTitle>
                                {!editingBusiness && (
                                    <Button variant="ghost" size="sm" onClick={startEditBusiness} className="gap-1">
                                        <PencilIcon className="h-4 w-4" />
                                        Edit
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {editingBusiness ? (
                                <form
                                    onSubmit={businessForm.handleSubmit((values) =>
                                        updateClientProfile.mutate(values, {
                                            onSuccess: () => setEditingBusiness(false),
                                        })
                                    )}
                                    className="space-y-4"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label>Business Name</Label>
                                            <Input {...businessForm.register('businessName')} />
                                            {businessForm.formState.errors.businessName && (
                                                <p className="text-sm text-destructive">{businessForm.formState.errors.businessName.message}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label>Client ID</Label>
                                            <Input value={clientProfile.clientId} disabled className="bg-muted" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Details</Label>
                                        <Textarea {...businessForm.register('details')} rows={3} />
                                        {businessForm.formState.errors.details && (
                                            <p className="text-sm text-destructive">{businessForm.formState.errors.details.message}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingBusiness(false)}
                                            className="gap-1"
                                        >
                                            <XIcon className="h-4 w-4" />
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={updateClientProfile.isPending}
                                            className="gap-1"
                                        >
                                            <SaveIcon className="h-4 w-4" />
                                            {updateClientProfile.isPending ? 'Saving...' : 'Save'}
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
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
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <MapPinIcon className="h-5 w-5 text-primary" />
                                    Business Address
                                </CardTitle>
                                {!editingAddress && (
                                    <Button variant="ghost" size="sm" onClick={startEditAddress} className="gap-1">
                                        <PencilIcon className="h-4 w-4" />
                                        Edit
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {editingAddress ? (
                                <form
                                    onSubmit={addressForm.handleSubmit((values) =>
                                        updateClientProfile.mutate(values, {
                                            onSuccess: () => setEditingAddress(false),
                                        })
                                    )}
                                    className="space-y-4"
                                >
                                    <div className="space-y-1">
                                        <Label>Street Address</Label>
                                        <Input {...addressForm.register('businessAddress')} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <Label>City</Label>
                                            <Input {...addressForm.register('city')} />
                                            {addressForm.formState.errors.city && (
                                                <p className="text-sm text-destructive">{addressForm.formState.errors.city.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <Label>State</Label>
                                            <Input {...addressForm.register('state')} />
                                            {addressForm.formState.errors.state && (
                                                <p className="text-sm text-destructive">{addressForm.formState.errors.state.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <Label>ZIP Code</Label>
                                            <Input {...addressForm.register('zipCode')} />
                                            {addressForm.formState.errors.zipCode && (
                                                <p className="text-sm text-destructive">{addressForm.formState.errors.zipCode.message}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingAddress(false)}
                                            className="gap-1"
                                        >
                                            <XIcon className="h-4 w-4" />
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={updateClientProfile.isPending}
                                            className="gap-1"
                                        >
                                            <SaveIcon className="h-4 w-4" />
                                            {updateClientProfile.isPending ? 'Saving...' : 'Save'}
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-1">
                                    {clientProfile.businessAddress && (
                                        <p className="font-medium">{clientProfile.businessAddress}</p>
                                    )}
                                    <p className="text-muted-foreground">
                                        {clientProfile.city}, {clientProfile.state} {clientProfile.zipCode}
                                    </p>
                                </div>
                            )}
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
