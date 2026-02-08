'use client';

import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useActionLabels } from '@/lib/hooks/use-labels';

interface CrudFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  isSubmitting?: boolean;
  mode?: 'create' | 'edit';
  children: ReactNode;
  submitText?: string;
  cancelText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function CrudFormModal({
  open,
  onClose,
  onSubmit,
  title,
  isSubmitting = false,
  mode = 'create',
  children,
  submitText,
  cancelText,
  size = 'lg',
}: CrudFormModalProps) {
  const actionLabels = useActionLabels();
  const defaultCancelText = cancelText ?? actionLabels.cancel;
  const defaultSubmitText = mode === 'create' ? actionLabels.create : actionLabels.save;

  return (
    <Dialog open={open} onClose={onClose} className={sizeClasses[size]}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-4"
        >
          {children}
        </form>
      </DialogContent>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          {defaultCancelText}
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          isLoading={isSubmitting}
        >
          {submitText || defaultSubmitText}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
