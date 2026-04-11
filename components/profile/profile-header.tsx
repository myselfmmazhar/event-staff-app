'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SessionUser } from '@/lib/types/auth.types';

interface ProfileHeaderProps {
    user: SessionUser;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return 'purple';
            case 'ADMIN':
                return 'primary';
            case 'MANAGER':
                return 'info';
            case 'STAFF':
                return 'secondary';
            default:
                return 'default';
        }
    };

    return (
        <Card className="mb-6 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-primary/20 to-secondary/20" />
            <CardContent className="relative pt-0">
                <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
                    <div className="-mt-12 mb-4 sm:mb-0">
                        <div className="relative h-24 w-24 rounded-full border-4 border-card bg-gradient-to-br from-primary to-secondary shadow-lg overflow-hidden">
                            {user.profilePhoto ? (
                                <img
                                    src={user.profilePhoto}
                                    alt={`${user.firstName} ${user.lastName}`}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary-foreground">
                                    {user.firstName?.[0]}
                                    {user.lastName?.[0]}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left sm:pb-2">
                        <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">
                                    {user.firstName} {user.lastName}
                                </h1>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                            <Badge variant={getRoleBadgeVariant(user.role)} className="mt-2 sm:mt-0">
                                {user.role?.replace('_', ' ')}
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
