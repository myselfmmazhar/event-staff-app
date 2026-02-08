'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { PasswordStrength } from '@/components/ui/password-strength';

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function PasswordForm() {
    const { toast } = useToast();

    const form = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const newPassword = form.watch('newPassword');

    const changePassword = trpc.profile.changePassword.useMutation({
        onSuccess: () => {
            toast({
                title: 'Password updated',
                description: 'Your password has been changed successfully.',
                variant: 'success',
            });
            form.reset();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to change password.',
                variant: 'error',
            });
        },
    });

    const onSubmit = (data: PasswordFormValues) => {
        changePassword.mutate({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                    Ensure your account is using a long, random password to stay secure.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            {...form.register('currentPassword')}
                            disabled={changePassword.isPending}
                        />
                        {form.formState.errors.currentPassword && (
                            <p className="text-xs text-destructive">
                                {form.formState.errors.currentPassword.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            {...form.register('newPassword')}
                            disabled={changePassword.isPending}
                        />
                        {form.formState.errors.newPassword && (
                            <p className="text-xs text-destructive">
                                {form.formState.errors.newPassword.message}
                            </p>
                        )}
                        {newPassword && (
                            <div className="mt-2">
                                <PasswordStrength password={newPassword} />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            {...form.register('confirmPassword')}
                            disabled={changePassword.isPending}
                        />
                        {form.formState.errors.confirmPassword && (
                            <p className="text-xs text-destructive">
                                {form.formState.errors.confirmPassword.message}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={changePassword.isPending}>
                            {changePassword.isPending && <Spinner className="mr-2 h-4 w-4" />}
                            Change Password
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
