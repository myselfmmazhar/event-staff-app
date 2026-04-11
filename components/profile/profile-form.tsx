'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { SessionUser } from '@/lib/types/auth.types';
import { Spinner } from '@/components/ui/spinner';
import { useActionLabels } from '@/lib/hooks/use-labels';

const profileSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z.string().optional(),
    profilePhoto: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
    user: SessionUser;
}

export function ProfileForm({ user }: ProfileFormProps) {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const actionLabels = useActionLabels();

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || '',
            profilePhoto: user.profilePhoto || '',
        },
    });

    const updateProfile = trpc.profile.updateMyProfile.useMutation({
        onSuccess: () => {
            toast({
                title: 'Profile updated',
                description: 'Your profile information has been updated successfully.',
                variant: 'success',
            });
            utils.profile.getMyProfile.invalidate();
            // Also invalidate session to update header info if needed, though session update might need a refresh
            // For now, we rely on the page re-fetching data or the session being updated eventually
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update profile.',
                variant: 'error',
            });
        },
    });

    const onSubmit = (data: ProfileFormValues) => {
        updateProfile.mutate(data);
    };

    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);

        try {
            // Always use API route for uploads (server-side handles Supabase auth)
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();
            form.setValue('profilePhoto', data.url);

            toast({
                title: 'Photo uploaded',
                description: 'Your profile photo has been uploaded. Click Save Changes to apply.',
                variant: 'success',
            });
        } catch (error: any) {
            console.error('Upload error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to upload photo.',
                variant: 'error',
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                    Update your personal details and contact information.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="profilePhoto">Profile Photo</Label>
                        <div className="flex items-center gap-4">
                            {form.watch('profilePhoto') && (
                                <div className="relative h-16 w-16 overflow-hidden rounded-full border">
                                    <img
                                        src={form.watch('profilePhoto') || ''}
                                        alt="Profile"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            )}
                            <Input
                                id="profilePhoto"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={uploading || updateProfile.isPending}
                                className="max-w-xs"
                            />
                            {uploading && <Spinner className="h-4 w-4" />}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                {...form.register('firstName')}
                                disabled={updateProfile.isPending}
                            />
                            {form.formState.errors.firstName && (
                                <p className="text-xs text-error">
                                    {form.formState.errors.firstName.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                {...form.register('lastName')}
                                disabled={updateProfile.isPending}
                            />
                            {form.formState.errors.lastName && (
                                <p className="text-xs text-error">
                                    {form.formState.errors.lastName.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            {...form.register('phone')}
                            disabled={updateProfile.isPending}
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={updateProfile.isPending || uploading}>
                            {updateProfile.isPending && <Spinner className="mr-2 h-4 w-4" />}
                            {actionLabels.save}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
