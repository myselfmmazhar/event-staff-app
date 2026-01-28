'use client';

import { ConfirmModal } from '@/components/common/confirm-modal';
import type { ServiceDeleteInfo } from '@/lib/types/service';

interface DeleteServiceModalProps {
  service: ServiceDeleteInfo | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteServiceModal({
  service,
  open,
  onClose,
  onConfirm,
  isLoading,
}: DeleteServiceModalProps) {
  if (!service) return null;

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      title="Delete Service"
      description="This action cannot be undone"
      confirmText={isLoading ? 'Deleting...' : 'Delete Service'}
      variant="danger"
      warningMessage="This will permanently delete the service."
    >
      <p className="text-sm">
        Are you sure you want to delete <strong>{service.title}</strong> ({service.serviceId})?
      </p>
    </ConfirmModal>
  );
}

