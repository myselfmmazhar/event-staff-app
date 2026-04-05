'use client';

import { ConfirmModal } from '@/components/common/confirm-modal';
import type { CategoryDeleteInfo } from '@/lib/types/category';

interface DeleteCategoryModalProps {
  category: CategoryDeleteInfo | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteCategoryModal({
  category,
  open,
  onClose,
  onConfirm,
  isLoading,
}: DeleteCategoryModalProps) {
  if (!category) return null;

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      title="Delete Category"
      description="This action cannot be undone"
      confirmText={isLoading ? 'Deleting...' : 'Delete Category'}
      variant="danger"
      warningMessage="This will permanently delete the category. Services associated with this category will lose their category assignment."
    >
      <p className="text-sm">
        Are you sure you want to delete <strong>{category.name}</strong> ({category.categoryId})?
      </p>
    </ConfirmModal>
  );
}
