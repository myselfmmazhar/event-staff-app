'use client';

import { ConfirmModal } from '@/components/common/confirm-modal';
import type { ProductDeleteInfo } from '@/lib/types/product';

interface DeleteProductModalProps {
  product: ProductDeleteInfo | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteProductModal({
  product,
  open,
  onClose,
  onConfirm,
  isLoading,
}: DeleteProductModalProps) {
  if (!product) return null;

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      title="Delete Product"
      description="This action cannot be undone"
      confirmText={isLoading ? 'Deleting...' : 'Delete Product'}
      variant="danger"
      warningMessage="This will permanently delete the product."
    >
      <p className="text-sm">
        Are you sure you want to delete <strong>{product.title}</strong> ({product.productId})?
      </p>
    </ConfirmModal>
  );
}

