'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertIcon } from '@/components/ui/icons';
import { ReactNode } from 'react';
import { useActionLabels } from '@/lib/hooks/use-labels';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
  warningMessage?: string;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  title,
  description,
  children,
  confirmText = 'Confirm',
  cancelText,
  variant = 'danger',
  warningMessage,
}: ConfirmModalProps) {
  const actionLabels = useActionLabels();
  // Use provided cancelText or fallback to global label
  const cancelLabel = cancelText ?? actionLabels.cancel;
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-destructive/10' : 'bg-primary/10'
            }`}>
            <AlertIcon className={`h-6 w-6 ${variant === 'danger' ? 'text-destructive' : 'text-primary'
              }`} />
          </div>
          <div>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </div>
        </div>
      </DialogHeader>

      <DialogContent>
        {children}
        {warningMessage && (
          <div className={`mt-4 p-3 border rounded-lg ${variant === 'danger'
            ? 'bg-destructive/10 border-destructive/30'
            : 'bg-primary/10 border-primary/30'
            }`}>
            <p className={`text-sm ${variant === 'danger' ? 'text-destructive' : 'text-primary'
              }`}>
              {warningMessage}
            </p>
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
