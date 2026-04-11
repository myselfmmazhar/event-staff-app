'use client';

import { useState, Suspense } from 'react';
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
import { ClientSchema } from '@/lib/schemas/client.schema';
import { Loader2 } from 'lucide-react';

// Form schema - clients only need to set their password
const formSchema = z.object({
    password: ClientSchema.acceptInvitation.shape.password,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type FormData = z.infer<typeof formSchema>;

function AcceptClientInvitationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Fetch invitation info
    const { data: invitationInfo, isLoading: isLoadingInfo, error: infoError } = trpc.clients.getInvitationInfo.useQuery(
        { token: token || '' },
        { enabled: !!token }
    );

    const acceptMutation = trpc.clients.acceptInvitation.useMutation({
        onSuccess: () => {
            toast({
                message: 'Your account has been created successfully! You can now log in.',
                type: 'success',
            });
            router.push('/login');
        },
        onError: (error) => {
            toast({
                message: error.message || 'Failed to accept invitation',
                type: 'error',
            });
        },
    });

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = (data: FormData) => {
        if (!token) return;

        acceptMutation.mutate({
            token,
            password: data.password,
        });
    };

    // Handle missing token
    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-500/5 via-background to-teal-500/5 p-4">
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
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-500/5 via-background to-teal-500/5 p-4">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
                    <p className="text-muted-foreground">Verifying invitation...</p>
                </div>
            </div>
        );
    }

    // Error or expired invitation
    if (infoError || invitationInfo?.isExpired) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-500/5 via-background to-teal-500/5 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">
                            {invitationInfo?.isExpired ? 'Invitation Expired' : 'Invalid Invitation'}
                        </CardTitle>
                        <CardDescription>
                            {invitationInfo?.isExpired
                                ? 'This invitation link has expired. Please contact your account manager to request a new invitation.'
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
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-500/5 via-background to-teal-500/5 p-4">
            <div className="w-full max-w-md">
                {/* Logo/Brand Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg mb-4">
                        <svg
                            className="h-8 w-8 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">
                        Welcome, {invitationInfo?.firstName}!
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Set up your password to access the Client Portal
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Create Your Password</CardTitle>
                        <CardDescription>
                            You've been invited to access the Client Portal for <strong>{invitationInfo?.businessName}</strong>.
                            Create a password to complete your account setup.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Email (read-only) */}
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={invitationInfo?.email || ''}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    This will be your login email
                                </p>
                            </div>

                            {/* Password Section */}
                            <div className="space-y-4">
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

                                <p className="text-xs text-muted-foreground">
                                    Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                variant="default"
                                size="lg"
                                isLoading={form.formState.isSubmitting || acceptMutation.isPending}
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
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
                                className="text-emerald-600 hover:text-emerald-700 font-medium"
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

export default function AcceptClientInvitationPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-500/5 via-background to-teal-500/5 p-4">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        }>
            <AcceptClientInvitationContent />
        </Suspense>
    );
}
