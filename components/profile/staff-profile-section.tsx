'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { AvailabilityStatus, SkillLevel, AccountStatus, StaffType } from '@prisma/client';
import { useTerminology } from '@/lib/hooks/use-terminology';
import {
    CalendarIcon,
    ClockIcon,
    UserXIcon,
    UserIcon,
    MapPinIcon,
    MailIcon,
    PhoneIcon,
    BadgeIcon,
} from 'lucide-react';
import { signOut } from '@/lib/client/auth';

const AVAILABILITY_OPTIONS = [
    { value: AvailabilityStatus.OPEN_TO_OFFERS, label: 'Open to Offers', description: 'Available for event assignments' },
    { value: AvailabilityStatus.BUSY, label: 'Busy', description: 'Currently occupied but may be available' },
    { value: AvailabilityStatus.TIME_OFF, label: 'Time Off', description: 'Not available for assignments' },
];

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
    [SkillLevel.BEGINNER]: 'Beginner',
    [SkillLevel.INTERMEDIATE]: 'Intermediate',
    [SkillLevel.ADVANCED]: 'Advanced',
};

const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
    [AccountStatus.ACTIVE]: 'Active',
    [AccountStatus.DISABLED]: 'Disabled',
    [AccountStatus.PENDING]: 'Pending',
};

const STAFF_TYPE_LABELS: Record<StaffType, string> = {
    [StaffType.COMPANY]: 'Company',
    [StaffType.EMPLOYEE]: 'Employee',
    [StaffType.CONTRACTOR]: 'Contractor',
};

export function StaffProfileSection() {
    const { terminology } = useTerminology();
    const { toast } = useToast();
    const router = useRouter();
    const utils = trpc.useUtils();

    // Fetch staff profile
    const { data: staffProfile, isLoading } = trpc.staff.getMyProfile.useQuery();

    // Local state for form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [streetAddress, setStreetAddress] = useState('');
    const [aptSuiteUnit, setAptSuiteUnit] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [country, setCountry] = useState('');
    const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>(AvailabilityStatus.OPEN_TO_OFFERS);
    const [timeOffStart, setTimeOffStart] = useState('');
    const [timeOffEnd, setTimeOffEnd] = useState('');
    const [deactivateReason, setDeactivateReason] = useState('');
    const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);

    const formatDateInputValue = (value?: Date | string | null): string => {
        if (!value) {
            return '';
        }
        const [datePart = ''] = new Date(value).toISOString().split('T');
        return datePart;
    };

    // Initialize form when data loads
    useEffect(() => {
        if (staffProfile) {
            setFirstName(staffProfile.firstName || '');
            setLastName(staffProfile.lastName || '');
            setPhone(staffProfile.phone || '');
            setDateOfBirth(formatDateInputValue(staffProfile.dateOfBirth));
            setStreetAddress(staffProfile.streetAddress || '');
            setAptSuiteUnit(staffProfile.aptSuiteUnit || '');
            setCity(staffProfile.city || '');
            setState(staffProfile.state || '');
            setZipCode(staffProfile.zipCode || '');
            setCountry(staffProfile.country || '');
            setAvailabilityStatus(staffProfile.availabilityStatus);
            setTimeOffStart(formatDateInputValue(staffProfile.timeOffStart));
            setTimeOffEnd(formatDateInputValue(staffProfile.timeOffEnd));
        }
    }, [staffProfile]);

    // Update mutation
    const updateMutation = trpc.staff.updateMyProfile.useMutation({
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Profile updated successfully',
            });
            utils.staff.getMyProfile.invalidate();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update profile',
                variant: 'error',
            });
        },
    });

    // Deactivate mutation
    const deactivateMutation = trpc.staff.deactivateMyProfile.useMutation({
        onSuccess: async () => {
            toast({
                title: 'Profile Deactivated',
                description: 'Your profile has been deactivated. You will be logged out.',
            });
            setIsDeactivateConfirmOpen(false);
            // Sign out the user
            await signOut();
            router.push('/login');
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to deactivate profile',
                variant: 'error',
            });
        },
    });

    const handleSavePersonalInfo = () => {
        updateMutation.mutate({
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            phone: phone || undefined,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        });
    };

    const handleSaveAddress = () => {
        updateMutation.mutate({
            streetAddress: streetAddress || undefined,
            aptSuiteUnit: aptSuiteUnit || undefined,
            city: city || undefined,
            state: state || undefined,
            zipCode: zipCode || undefined,
            country: country || undefined,
        });
    };

    const handleSaveAvailability = () => {
        updateMutation.mutate({
            availabilityStatus: availabilityStatus || undefined,
            timeOffStart: timeOffStart ? new Date(timeOffStart) : null,
            timeOffEnd: timeOffEnd ? new Date(timeOffEnd) : null,
        });
    };

    const handleDeactivateConfirm = () => {
        deactivateMutation.mutate({ reason: deactivateReason || undefined });
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

    if (!staffProfile) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Read-Only Account Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BadgeIcon className="h-5 w-5" />
                        Account Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label className="text-muted-foreground text-sm">{terminology.staff.singular} ID</Label>
                            <p className="font-medium">{staffProfile.staffId}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-sm">Account Status</Label>
                            <div className="mt-1">
                                <Badge
                                    variant={
                                        staffProfile.accountStatus === AccountStatus.ACTIVE
                                            ? 'default'
                                            : staffProfile.accountStatus === AccountStatus.PENDING
                                                ? 'warning'
                                                : 'secondary'
                                    }
                                >
                                    {ACCOUNT_STATUS_LABELS[staffProfile.accountStatus as AccountStatus]}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-sm">{terminology.staff.singular} Type</Label>
                            <p className="font-medium">{STAFF_TYPE_LABELS[staffProfile.staffType as StaffType]}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-sm flex items-center gap-1">
                                <MailIcon className="h-3 w-3" />
                                Email
                            </Label>
                            <p className="font-medium">{staffProfile.email}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-sm">Experience Level</Label>
                            <p className="font-medium">{SKILL_LEVEL_LABELS[staffProfile.skillLevel as SkillLevel]}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-sm">Services</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {(staffProfile as any).services && (staffProfile as any).services.length > 0 ? (
                                    (staffProfile as any).services.map((sa: { service: { id: string; title: string } }) => (
                                        <Badge key={sa.service.id} variant="secondary">
                                            {sa.service.title}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-muted-foreground text-sm">No services assigned</span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Editable Personal Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5" />
                        Personal Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                disabled={updateMutation.isPending}
                                placeholder="Enter first name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                disabled={updateMutation.isPending}
                                placeholder="Enter last name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="phone" className="flex items-center gap-1">
                                <PhoneIcon className="h-3 w-3" />
                                Phone Number
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={updateMutation.isPending}
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div>
                            <Label htmlFor="dateOfBirth" className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                Date of Birth
                            </Label>
                            <Input
                                id="dateOfBirth"
                                type="date"
                                value={dateOfBirth}
                                onChange={(e) => setDateOfBirth(e.target.value)}
                                disabled={updateMutation.isPending}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSavePersonalInfo}
                            disabled={updateMutation.isPending}
                            isLoading={updateMutation.isPending}
                        >
                            Save Personal Info
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Editable Address Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPinIcon className="h-5 w-5" />
                        Address
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Label htmlFor="streetAddress">Street Address</Label>
                            <Input
                                id="streetAddress"
                                value={streetAddress}
                                onChange={(e) => setStreetAddress(e.target.value)}
                                disabled={updateMutation.isPending}
                                placeholder="Enter street address"
                            />
                        </div>
                        <div>
                            <Label htmlFor="aptSuiteUnit">Apt / Suite / Unit</Label>
                            <Input
                                id="aptSuiteUnit"
                                value={aptSuiteUnit}
                                onChange={(e) => setAptSuiteUnit(e.target.value)}
                                disabled={updateMutation.isPending}
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                disabled={updateMutation.isPending}
                                placeholder="Enter city"
                            />
                        </div>
                        <div>
                            <Label htmlFor="state">State / Province</Label>
                            <Input
                                id="state"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                disabled={updateMutation.isPending}
                                placeholder="Enter state"
                            />
                        </div>
                        <div>
                            <Label htmlFor="zipCode">ZIP / Postal Code</Label>
                            <Input
                                id="zipCode"
                                value={zipCode}
                                onChange={(e) => setZipCode(e.target.value)}
                                disabled={updateMutation.isPending}
                                placeholder="Enter ZIP code"
                            />
                        </div>
                        <div>
                            <Label htmlFor="country">Country</Label>
                            <Input
                                id="country"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                disabled={updateMutation.isPending}
                                placeholder="Enter country"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSaveAddress}
                            disabled={updateMutation.isPending}
                            isLoading={updateMutation.isPending}
                        >
                            Save Address
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Availability Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClockIcon className="h-5 w-5" />
                        {terminology.staff.singular} Availability
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="availabilityStatus">Availability Status</Label>
                        <Select
                            value={availabilityStatus}
                            onValueChange={(value) => setAvailabilityStatus(value as AvailabilityStatus)}
                            disabled={updateMutation.isPending}
                        >
                            <SelectTrigger id="availabilityStatus">
                                <SelectValue placeholder="Select availability..." />
                            </SelectTrigger>
                            <SelectContent>
                                {AVAILABILITY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground mt-1">
                            {AVAILABILITY_OPTIONS.find((o) => o.value === availabilityStatus)?.description}
                        </p>
                    </div>

                    {availabilityStatus === AvailabilityStatus.TIME_OFF && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                            <div>
                                <Label htmlFor="timeOffStart" className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    Time Off Start
                                </Label>
                                <Input
                                    id="timeOffStart"
                                    type="date"
                                    value={timeOffStart}
                                    onChange={(e) => setTimeOffStart(e.target.value)}
                                    disabled={updateMutation.isPending}
                                />
                            </div>
                            <div>
                                <Label htmlFor="timeOffEnd" className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    Time Off End
                                </Label>
                                <Input
                                    id="timeOffEnd"
                                    type="date"
                                    value={timeOffEnd}
                                    onChange={(e) => setTimeOffEnd(e.target.value)}
                                    disabled={updateMutation.isPending}
                                    min={timeOffStart}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button
                            onClick={handleSaveAvailability}
                            disabled={updateMutation.isPending}
                            isLoading={updateMutation.isPending}
                        >
                            Save Availability
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Deactivate Account */}
            <Card className="border-destructive/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <UserXIcon className="h-5 w-5" />
                        Deactivate Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Deactivating your profile will prevent you from being assigned to events and log you out.
                        Contact an administrator if you need to reactivate your account.
                    </p>
                    <Button
                        variant="danger"
                        onClick={() => setIsDeactivateConfirmOpen(true)}
                    >
                        Deactivate My Profile
                    </Button>
                </CardContent>
            </Card>

            {/* Deactivate Confirmation Modal */}
            <ConfirmModal
                open={isDeactivateConfirmOpen}
                onClose={() => {
                    setIsDeactivateConfirmOpen(false);
                    setDeactivateReason('');
                }}
                onConfirm={handleDeactivateConfirm}
                isLoading={deactivateMutation.isPending}
                title="Deactivate Your Profile"
                description="Are you sure you want to deactivate your profile? You will be logged out and will not be able to access your account until an administrator reactivates it."
                confirmText="Deactivate"
                variant="danger"
            >
                <div className="space-y-3">
                    <Label htmlFor="deactivateReason">Reason (Optional)</Label>
                    <Textarea
                        id="deactivateReason"
                        value={deactivateReason}
                        onChange={(e) => setDeactivateReason(e.target.value)}
                        placeholder="Let us know why you're deactivating your profile..."
                        rows={3}
                    />
                </div>
            </ConfirmModal>
        </div>
    );
}
