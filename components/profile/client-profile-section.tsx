'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import {
    BuildingIcon,
    MapPinIcon,
    PhoneIcon,
    MailIcon,
    PencilIcon,
    XIcon,
    SaveIcon,
} from 'lucide-react';

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

export function ClientProfileSection() {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const [editingBusiness, setEditingBusiness] = useState(false);
    const [editingAddress, setEditingAddress] = useState(false);

    const { data: clientProfile, isLoading } = trpc.profile.getMyClientProfile.useQuery();

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

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-6 bg-muted rounded w-1/4" />
                        <div className="h-10 bg-muted rounded w-full" />
                        <div className="h-10 bg-muted rounded w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!clientProfile) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                        No client profile found. Please contact support.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
            {/* Business Details */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <BuildingIcon className="h-5 w-5" />
                            Business Details
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-sm">Client ID</Label>
                                    <Input value={clientProfile.clientId} disabled className="bg-muted font-mono" />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <Label className="text-muted-foreground text-sm">Business Name</Label>
                                    <Input {...businessForm.register('businessName')} />
                                    {businessForm.formState.errors.businessName && (
                                        <p className="text-sm text-destructive">{businessForm.formState.errors.businessName.message}</p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm flex items-center gap-1">
                                        <MailIcon className="h-3 w-3" />
                                        Email
                                    </Label>
                                    <p className="font-medium">{clientProfile.email}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm flex items-center gap-1">
                                        <PhoneIcon className="h-3 w-3" />
                                        Cell Phone
                                    </Label>
                                    <p className="font-medium">{clientProfile.cellPhone}</p>
                                </div>
                                {clientProfile.businessPhone && (
                                    <div>
                                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                                            <PhoneIcon className="h-3 w-3" />
                                            Business Phone
                                        </Label>
                                        <p className="font-medium">{clientProfile.businessPhone}</p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-sm">Details</Label>
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
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-muted-foreground text-sm">Client ID</Label>
                                    <p className="font-medium font-mono">{clientProfile.clientId}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="text-muted-foreground text-sm">Business Name</Label>
                                    <p className="font-medium">{clientProfile.businessName}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm flex items-center gap-1">
                                        <MailIcon className="h-3 w-3" />
                                        Email
                                    </Label>
                                    <p className="font-medium">{clientProfile.email}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm flex items-center gap-1">
                                        <PhoneIcon className="h-3 w-3" />
                                        Cell Phone
                                    </Label>
                                    <p className="font-medium">{clientProfile.cellPhone}</p>
                                </div>
                                {clientProfile.businessPhone && (
                                    <div>
                                        <Label className="text-muted-foreground text-sm flex items-center gap-1">
                                            <PhoneIcon className="h-3 w-3" />
                                            Business Phone
                                        </Label>
                                        <p className="font-medium">{clientProfile.businessPhone}</p>
                                    </div>
                                )}
                            </div>
                            {clientProfile.details && (
                                <div className="mt-4">
                                    <Label className="text-muted-foreground text-sm">Details</Label>
                                    <p className="text-foreground">{clientProfile.details}</p>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Address */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <MapPinIcon className="h-5 w-5" />
                            Address
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
                                <Label className="text-muted-foreground text-sm">Business Address</Label>
                                <Input {...addressForm.register('businessAddress')} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-sm">City</Label>
                                    <Input {...addressForm.register('city')} />
                                    {addressForm.formState.errors.city && (
                                        <p className="text-sm text-destructive">{addressForm.formState.errors.city.message}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-sm">State</Label>
                                    <Input {...addressForm.register('state')} />
                                    {addressForm.formState.errors.state && (
                                        <p className="text-sm text-destructive">{addressForm.formState.errors.state.message}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-sm">ZIP Code</Label>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {clientProfile.businessAddress && (
                                <div className="md:col-span-2">
                                    <Label className="text-muted-foreground text-sm">Business Address</Label>
                                    <p className="font-medium">{clientProfile.businessAddress}</p>
                                </div>
                            )}
                            <div>
                                <Label className="text-muted-foreground text-sm">City</Label>
                                <p className="font-medium">{clientProfile.city}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-sm">State</Label>
                                <p className="font-medium">{clientProfile.state}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-sm">ZIP Code</Label>
                                <p className="font-medium">{clientProfile.zipCode}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            </div>

            {/* Saved Locations */}
            {clientProfile.locations && clientProfile.locations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BuildingIcon className="h-5 w-5" />
                            Saved Locations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {clientProfile.locations.map((location) => (
                                <div key={location.id} className="border rounded-lg p-4">
                                    <h4 className="font-semibold mb-2">{location.venueName}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <Label className="text-muted-foreground text-xs">Address</Label>
                                            <p>{location.venueAddress}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground text-xs">City</Label>
                                            <p>{location.city}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground text-xs">State</Label>
                                            <p>{location.state}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground text-xs">ZIP Code</Label>
                                            <p>{location.zipCode}</p>
                                        </div>
                                        {location.meetingPoint && (
                                            <div className="md:col-span-2">
                                                <Label className="text-muted-foreground text-xs">Meeting Point</Label>
                                                <p>{location.meetingPoint}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
