'use client';

import { trpc } from '@/lib/client/trpc';
import { ProfileHeader } from '@/components/profile/profile-header';
import { ProfileForm } from '@/components/profile/profile-form';
import { PasswordForm } from '@/components/profile/password-form';
import { StaffProfileSection } from '@/components/profile/staff-profile-section';
import { ClientProfileSection } from '@/components/profile/client-profile-section';
import { Spinner } from '@/components/ui/spinner';
import { SessionUser } from '@/lib/types/auth.types';
import { UserRole } from '@prisma/client';

export default function ProfilePage() {
    const { data: user, isLoading, error } = trpc.profile.getMyProfile.useQuery();

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Spinner className="h-8 w-8 text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-destructive">
                Error loading profile: {error.message}
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
                User not found
            </div>
        );
    }

    // Create a user object with the name property for compatibility with SessionUser
    const userWithName = {
        ...user,
        name: `${user.firstName} ${user.lastName}`,
    } as SessionUser;

    const isStaff = user.role === UserRole.STAFF;
    const isClient = user.role === UserRole.CLIENT;

    return (
        <div className="container mx-auto max-w-5xl py-8">
            <ProfileHeader user={userWithName} />

            <div className="grid gap-6 lg:grid-cols-2">
                <div>
                    <ProfileForm user={userWithName} />
                </div>
                <div>
                    <PasswordForm />
                </div>
            </div>

            {/* Staff-specific settings */}
            {isStaff && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Staff Settings</h2>
                    <StaffProfileSection />
                </div>
            )}

            {/* Client-specific settings */}
            {isClient && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Business Information</h2>
                    <ClientProfileSection />
                </div>
            )}
        </div>
    );
}

