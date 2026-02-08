'use client';

import { ConfirmModal } from '@/components/common/confirm-modal';
import type { ClientDeleteInfo } from '@/lib/types/client';

interface DeleteClientModalProps {
  client: ClientDeleteInfo | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteClientModal({
  client,
  open,
  onClose,
  onConfirm,
  isLoading,
}: DeleteClientModalProps) {
  if (!client) return null;

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      title="Delete Client"
      description="This action cannot be undone"
      confirmText={isLoading ? 'Deleting...' : 'Delete Client'}
      variant="danger"
      warningMessage={
        client.hasLoginAccess
          ? 'This client has portal access enabled. Deleting them will also deactivate their login access.'
          : 'This will permanently delete the client and all associated data.'
      }
    >
      <p className="text-sm">
        Are you sure you want to delete <strong>{client.businessName}</strong> ({client.firstName} {client.lastName})?
      </p>
    </ConfirmModal>
  );
}
