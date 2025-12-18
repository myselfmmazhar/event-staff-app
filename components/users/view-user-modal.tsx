'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckIcon, XIcon, EditIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { UserRole } from '@prisma/client';
import { format } from 'date-fns';
import { useRoleTerm } from '@/lib/hooks/use-terminology';

interface ViewUserModalProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (user: any) => void;
}

const ROLE_COLORS: Record<UserRole, 'purple' | 'primary' | 'info' | 'default'> = {
  SUPER_ADMIN: 'purple',
  ADMIN: 'primary',
  MANAGER: 'info',
  STAFF: 'default',
  CLIENT: 'default',
};

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
  CLIENT: 'Client',
};

export function ViewUserModal({
  userId,
  open,
  onClose,
  onEdit,
}: ViewUserModalProps) {
  const roleTerm = useRoleTerm();
  const { data: user, isLoading, error } = trpc.user.getById.useQuery(
    { id: userId || '' },
    { enabled: !!userId && open }
  );

  const handleEdit = () => {
    if (user && onEdit) {
      onEdit(user);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>User Details</DialogTitle>
      </DialogHeader>

      <DialogContent className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive">Failed to load user details</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </div>
        ) : user ? (
          <div className="space-y-5">
            {/* Header: User Status + Role */}
            <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Badge variant={user.isActive ? 'success' : 'danger'} pulse={user.isActive} asSpan>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant={ROLE_COLORS[user.role]} asSpan>
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {user.emailVerified ? (
                  <div className="flex items-center gap-1 text-success">
                    <CheckIcon className="h-4 w-4" />
                    <span className="text-xs">Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <XIcon className="h-4 w-4" />
                    <span className="text-xs">Unverified</span>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
              <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Personal Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Full Name</p>
                  <p className="text-sm font-medium text-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                  <p className="text-sm text-foreground">{user.email}</p>
                </div>

                {user.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                    <p className="text-sm text-foreground">{user.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Account Information Section */}
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
              <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Account Information</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-mono text-xs text-foreground">{user.id}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground">{roleTerm.singular}:</span>
                  <span className="font-medium text-foreground">{ROLE_LABELS[user.role]}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium text-foreground">
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground">Email Verified:</span>
                  <span className="font-medium text-foreground">
                    {user.emailVerified ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata Section */}
            <div className="bg-muted/20 border border-border/30 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Metadata</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground mb-1">Created</p>
                  <p className="text-foreground font-medium">
                    {format(new Date(user.createdAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Last Updated</p>
                  <p className="text-foreground font-medium">
                    {format(new Date(user.updatedAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {user && onEdit && (
          <Button onClick={handleEdit}>
            <EditIcon className="h-4 w-4 mr-2" />
            Edit User
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
