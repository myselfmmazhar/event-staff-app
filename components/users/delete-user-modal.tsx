'use client';

import { ConfirmModal } from '@/components/common/confirm-modal';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface DeleteUserModalProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => void;
  isDeleting: boolean;
}

export function DeleteUserModal({
  user,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteUserModalProps) {
  if (!user) return null;

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={() => onConfirm(user.id)}
      isLoading={isDeleting}
      title="Delete User"
      description="This action cannot be undone"
      confirmText={isDeleting ? 'Deleting...' : 'Delete User'}
      variant="danger"
      warningMessage="This will permanently delete the user and all associated data."
    >
      <p className="text-foreground">
        Are you sure you want to delete{' '}
        <span className="font-semibold text-foreground">
          {user.firstName} {user.lastName}
        </span>
        ?
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        Email: {user.email}
      </p>
    </ConfirmModal>
  );
}
