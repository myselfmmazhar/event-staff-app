'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { StaffSchema } from '@/lib/schemas/staff.schema';
import { Loader2 } from 'lucide-react';

// Form schema based on acceptInvitation schema but without token
const formSchema = z.object({
    password: StaffSchema.acceptInvitation.shape.password,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    phone: StaffSchema.acceptInvitation.shape.phone,
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    streetAddress: StaffSchema.acceptInvitation.shape.streetAddress,
    aptSuiteUnit: StaffSchema.acceptInvitation.shape.aptSuiteUnit,
    city: StaffSchema.acceptInvitation.shape.city,
    state: StaffSchema.acceptInvitation.shape.state,
    zipCode: StaffSchema.acceptInvitation.shape.zipCode,
    country: StaffSchema.acceptInvitation.shape.country,
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type FormData = z.infer<typeof formSchema>;

function AcceptStaffInvitationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Fetch invitation info
    const { data: invitationInfo, isLoading: isLoadingInfo, error: infoError } = trpc.staff.getInvitationInfo.useQuery(
        { token: token || '' },
        { enabled: !!token }
    );

    const acceptMutation = trpc.staff.acceptInvitation.useMutation({
        onSuccess: () => {
            toast({
                message: 'Your account has been created successfully! You can now log in.',
                type: 'success',
            });
            router.push('/login');
        },
        onError: (error) => {
            // Extract user-friendly message from tRPC/Zod errors
            let errorMessage = 'Failed to accept invitation';

            // Check for field-level errors from Zod validation
            const data = error.data as Record<string, unknown> | undefined;
            const fieldErrors = data?.fieldErrors as Array<{ message: string }> | undefined;
            const zodError = data?.zodError as { fieldErrors?: Record<string, string[]> } | undefined;

            if (fieldErrors && Array.isArray(fieldErrors) && fieldErrors.length > 0) {
                errorMessage = fieldErrors.map((e) => e.message).join(', ');
            } else if (zodError?.fieldErrors) {
                // Alternative: extract from zodError.fieldErrors object
                const messages = Object.values(zodError.fieldErrors).flat();
                if (messages.length > 0) {
                    errorMessage = messages.join(', ');
                }
            } else if (error.message && !error.message.startsWith('[')) {
                // Use error.message only if it's not a raw JSON array
                errorMessage = error.message;
            }

            toast({
                message: errorMessage,
                type: 'error',
            });
        },
    });

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
            phone: '',
            dateOfBirth: '',
            streetAddress: '',
            aptSuiteUnit: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'USA',
        },
    });

    const onSubmit = (data: FormData) => {
        if (!token) return;

        acceptMutation.mutate({
            token,
            password: data.password,
            phone: data.phone,
            dateOfBirth: new Date(data.dateOfBirth),
            streetAddress: data.streetAddress,
            aptSuiteUnit: data.aptSuiteUnit || undefined,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            country: data.country,
        });
    };

    // Handle missing token
    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Invalid Link</CardTitle>
                        <CardDescription>
                            No invitation token was provided. Please use the link from your invitation email.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button onClick={() => router.push('/login')} className="w-full">
                            Go to Login
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Loading state
    if (isLoadingInfo) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Verifying invitation...</p>
                </div>
            </div>
        );
    }

    // Error or expired invitation
    if (infoError || invitationInfo?.isExpired) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">
                            {invitationInfo?.isExpired ? 'Invitation Expired' : 'Invalid Invitation'}
                        </CardTitle>
                        <CardDescription>
                            {invitationInfo?.isExpired
                                ? 'This invitation link has expired. Please contact your administrator to request a new invitation.'
                                : 'This invitation link is invalid or has already been used.'}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button onClick={() => router.push('/login')} className="w-full">
                            Go to Login
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
            <div className="w-full max-w-2xl">
                {/* Logo/Brand Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg mb-4">
                        <svg
                            className="h-8 w-8 text-primary-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">
                        Welcome, {invitationInfo?.firstName}!
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Complete your profile to finish setting up your account
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Complete Your Profile</CardTitle>
                        <CardDescription>
                            You've been invited to join as {invitationInfo?.staffType?.toLowerCase()}.
                            Please fill out the information below to create your account.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Password Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium border-b pb-2">Create Password</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="password" requiredMark>
                                            Password
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Min 8 characters"
                                                invalid={!!form.formState.errors.password}
                                                disabled={form.formState.isSubmitting || acceptMutation.isPending}
                                                {...form.register('password')}
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? (
                                                    <EyeOffIcon className="h-5 w-5" />
                                                ) : (
                                                    <EyeIcon className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>
                                        {form.formState.errors.password && (
                                            <p className="text-sm text-destructive mt-1">
                                                {String(form.formState.errors.password.message)}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="confirmPassword" requiredMark>
                                            Confirm Password
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="confirmPassword"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                placeholder="Confirm your password"
                                                invalid={!!form.formState.errors.confirmPassword}
                                                disabled={form.formState.isSubmitting || acceptMutation.isPending}
                                                {...form.register('confirmPassword')}
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                tabIndex={-1}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOffIcon className="h-5 w-5" />
                                                ) : (
                                                    <EyeIcon className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>
                                        {form.formState.errors.confirmPassword && (
                                            <p className="text-sm text-destructive mt-1">
                                                {String(form.formState.errors.confirmPassword.message)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
                                </p>
                            </div>

                            {/* Personal Info Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium border-b pb-2">Personal Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="phone" requiredMark>
                                            Phone Number
                                        </Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="(555) 555-5555"
                                            invalid={!!form.formState.errors.phone}
                                            disabled={form.formState.isSubmitting || acceptMutation.isPending}
                                            {...form.register('phone')}
                                        />
                                        {form.formState.errors.phone && (
                                            <p className="text-sm text-destructive mt-1">
                                                {String(form.formState.errors.phone.message)}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="dateOfBirth" requiredMark>
                                            Date of Birth
                                        </Label>
                                        <Input
                                            id="dateOfBirth"
                                            type="date"
                                            invalid={!!form.formState.errors.dateOfBirth}
                                            disabled={form.formState.isSubmitting || acceptMutation.isPending}
                                            {...form.register('dateOfBirth')}
                                        />
                                        {form.formState.errors.dateOfBirth && (
                                            <p className="text-sm text-destructive mt-1">
                                                {String(form.formState.errors.dateOfBirth.message)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Address Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium border-b pb-2">Address</h3>
                                <div>
                                    <Label htmlFor="streetAddress" requiredMark>
                                        Street Address
                                    </Label>
                                    <Input
                                        id="streetAddress"
                                        placeholder="123 Main St"
                                        invalid={!!form.formState.errors.streetAddress}
                                        disabled={form.formState.isSubmitting || acceptMutation.isPending}
                                        {...form.register('streetAddress')}
                                    />
                                    {form.formState.errors.streetAddress && (
                                        <p className="text-sm text-destructive mt-1">
                                            {String(form.formState.errors.streetAddress.message)}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="aptSuiteUnit">
                                        Apt/Suite/Unit
                                    </Label>
                                    <Input
                                        id="aptSuiteUnit"
                                        placeholder="Apt 4B (optional)"
                                        disabled={form.formState.isSubmitting || acceptMutation.isPending}
                                        {...form.register('aptSuiteUnit')}
                                    />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <Label htmlFor="city" requiredMark>
                                            City
                                        </Label>
                                        <Input
                                            id="city"
                                            placeholder="New York"
                                            invalid={!!form.formState.errors.city}
                                            disabled={form.formState.isSubmitting || acceptMutation.isPending}
                                            {...form.register('city')}
                                        />
                                        {form.formState.errors.city && (
                                            <p className="text-sm text-destructive mt-1">
                                                {String(form.formState.errors.city.message)}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="state" requiredMark>
                                            State
                                        </Label>
                                        <Input
                                            id="state"
                                            placeholder="NY"
                                            invalid={!!form.formState.errors.state}
                                            disabled={form.formState.isSubmitting || acceptMutation.isPending}
                                            {...form.register('state')}
                                        />
                                        {form.formState.errors.state && (
                                            <p className="text-sm text-destructive mt-1">
                                                {String(form.formState.errors.state.message)}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="zipCode" requiredMark>
                                            ZIP Code
                                        </Label>
                                        <Input
                                            id="zipCode"
                                            placeholder="10001"
                                            invalid={!!form.formState.errors.zipCode}
                                            disabled={form.formState.isSubmitting || acceptMutation.isPending}
                                            {...form.register('zipCode')}
                                        />
                                        {form.formState.errors.zipCode && (
                                            <p className="text-sm text-destructive mt-1">
                                                {String(form.formState.errors.zipCode.message)}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="country" requiredMark>
                                            Country
                                        </Label>
                                        <Input
                                            id="country"
                                            placeholder="USA"
                                            invalid={!!form.formState.errors.country}
                                            disabled={form.formState.isSubmitting || acceptMutation.isPending}
                                            {...form.register('country')}
                                        />
                                        {form.formState.errors.country && (
                                            <p className="text-sm text-destructive mt-1">
                                                {String(form.formState.errors.country.message)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="default"
                                size="lg"
                                isLoading={form.formState.isSubmitting || acceptMutation.isPending}
                                className="w-full"
                            >
                                {form.formState.isSubmitting || acceptMutation.isPending
                                    ? 'Creating Account...'
                                    : 'Create Account'}
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter>
                        <p className="text-center text-sm text-muted-foreground w-full">
                            Already have an account?{' '}
                            <button
                                type="button"
                                onClick={() => router.push('/login')}
                                className="text-primary hover:text-primary/80 font-medium"
                            >
                                Sign in
                            </button>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

export default function AcceptStaffInvitationPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        }>
            <AcceptStaffInvitationContent />
        </Suspense>
    );
}
