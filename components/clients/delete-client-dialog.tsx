'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ClientDeleteInfo } from '@/lib/types/client';

interface DeleteClientDialogProps {
  client: ClientDeleteInfo | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteClientDialog({
  client,
  open,
  onClose,
  onConfirm,
  isLoading,
}: DeleteClientDialogProps) {
  if (!client) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Delete Client</DialogTitle>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-4">
          <p className="text-sm">
            Are you sure you want to delete <strong>{client.businessName}</strong> ({client.firstName} {client.lastName})?
          </p>

          {client.hasLoginAccess && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
              <p className="text-sm text-yellow-900">
                ⚠️ This client has portal access enabled. Deleting them will also deactivate their login access.
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Deleting...' : 'Delete Client'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
