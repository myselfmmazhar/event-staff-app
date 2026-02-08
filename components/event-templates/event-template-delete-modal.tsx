'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertIcon, CloseIcon } from '@/components/ui/icons';
import { useTerminology } from '@/lib/hooks/use-terminology';

interface EventTemplateDeleteModalProps {
  templateName: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function EventTemplateDeleteModal({
  templateName,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: EventTemplateDeleteModalProps) {
  const { terminology } = useTerminology();

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>Delete {terminology.event.singular} Template</DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </DialogHeader>

      <DialogContent>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertIcon className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-foreground">
              Are you sure you want to delete the template{' '}
              <span className="font-semibold">&quot;{templateName}&quot;</span>?
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              This action cannot be undone. Existing {terminology.event.plural.toLowerCase()} created
              from this template will not be affected.
            </p>
          </div>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete Template'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
