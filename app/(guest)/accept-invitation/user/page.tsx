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
import { UserSchema } from '@/lib/schemas/user.schema';
import { Loader2 } from 'lucide-react';

// Form schema based on acceptInvitation schema but without token
const formSchema = z.object({
    password: UserSchema.acceptInvitation.shape.password,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type FormData = z.infer<typeof formSchema>;

function AcceptUserInvitationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Fetch invitation info
    const { data: invitationInfo, isLoading: isLoadingInfo, error: infoError } = trpc.user.getInvitationInfo.useQuery(
        { token: token || '' },
        { enabled: !!token }
    );

    const acceptMutation = trpc.user.acceptInvitation.useMutation({
        onSuccess: () => {
            toast({
                message: 'Your account has been activated successfully! You can now log in.',
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
            <div className="w-full max-w-md">
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
                        Set your password to activate your account
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Create Your Password</CardTitle>
                        <CardDescription>
                            You've been invited to join as a <strong>{invitationInfo?.role}</strong>.
                            Please create a secure password to complete your account setup.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                        {form.formState.errors.password.message}
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
                                        {form.formState.errors.confirmPassword.message}
                                    </p>
                                )}
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
                            </p>

                            <Button
                                type="submit"
                                variant="default"
                                size="lg"
                                isLoading={form.formState.isSubmitting || acceptMutation.isPending}
                                className="w-full"
                            >
                                {form.formState.isSubmitting || acceptMutation.isPending
                                    ? 'Activating Account...'
                                    : 'Activate Account'}
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

export default function AcceptUserInvitationPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        }>
            <AcceptUserInvitationContent />
        </Suspense>
    );
}
