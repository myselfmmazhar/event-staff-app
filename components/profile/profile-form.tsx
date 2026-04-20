'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { SessionUser } from '@/lib/types/auth.types';
import { Spinner } from '@/components/ui/spinner';
import { useActionLabels } from '@/lib/hooks/use-labels';
import { UploadIcon, UserIcon } from '@/components/ui/icons';
import { PencilIcon, XIcon, SaveIcon } from 'lucide-react';

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

    const [isEditing, setIsEditing] = useState(false);
    const [uploading, setUploading] = useState(false);

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
            setIsEditing(false);
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update profile.',
                variant: 'error',
            });
        },
    });

    const handleEdit = () => {
        form.reset({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || '',
            profilePhoto: user.profilePhoto || '',
        });
        setIsEditing(true);
    };

    const handleCancel = () => {
        form.reset();
        setIsEditing(false);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);

        try {
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
                description: 'Your profile photo has been uploaded. Click Save to apply.',
                variant: 'success',
            });
        } catch (error: any) {
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
                <div className="flex items-center justify-between">
                    <CardTitle>Personal Information</CardTitle>
                    {!isEditing && (
                        <Button variant="ghost" size="sm" onClick={handleEdit} className="gap-1">
                            <PencilIcon className="h-4 w-4" />
                            Edit
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isEditing ? (
                    <form onSubmit={form.handleSubmit((data) => updateProfile.mutate(data))} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Profile Photo</Label>
                            <div className="flex items-center gap-4">
                                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted">
                                    {form.watch('profilePhoto') ? (
                                        <img
                                            src={form.watch('profilePhoto') || ''}
                                            alt="Profile preview"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                            <UserIcon className="h-8 w-8" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label
                                        htmlFor="profilePhotoUpload"
                                        className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${uploading || updateProfile.isPending ? 'pointer-events-none opacity-50' : ''}`}
                                    >
                                        {uploading ? <Spinner className="h-4 w-4" /> : <UploadIcon className="h-4 w-4" />}
                                        {uploading ? 'Uploading...' : 'Choose Photo'}
                                        <input
                                            id="profilePhotoUpload"
                                            type="file"
                                            accept="image/*"
                                            className="sr-only"
                                            onChange={handleFileChange}
                                            disabled={uploading || updateProfile.isPending}
                                        />
                                    </label>
                                    <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 5MB.</p>
                                    {form.watch('profilePhoto') && (
                                        <button
                                            type="button"
                                            onClick={() => form.setValue('profilePhoto', null)}
                                            className="text-left text-xs text-destructive hover:underline"
                                            disabled={uploading || updateProfile.isPending}
                                        >
                                            Remove photo
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input id="firstName" {...form.register('firstName')} disabled={updateProfile.isPending} />
                                {form.formState.errors.firstName && (
                                    <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input id="lastName" {...form.register('lastName')} disabled={updateProfile.isPending} />
                                {form.formState.errors.lastName && (
                                    <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
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

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={handleCancel} className="gap-1">
                                <XIcon className="h-4 w-4" />
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateProfile.isPending || uploading} className="gap-1">
                                {updateProfile.isPending && <Spinner className="mr-2 h-4 w-4" />}
                                {updateProfile.isPending ? 'Saving...' : actionLabels.save}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-muted-foreground/30 bg-muted">
                                {user.profilePhoto ? (
                                    <img src={user.profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                        <UserIcon className="h-8 w-8" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-sm">First Name</Label>
                                <p className="font-medium">{user.firstName || '—'}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-sm">Last Name</Label>
                                <p className="font-medium">{user.lastName || '—'}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-sm">Phone Number</Label>
                            <p className="font-medium">{user.phone || '—'}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
