'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertIcon } from '@/components/ui/icons';
import { format } from 'date-fns';
import type { AssignmentData } from './assignment-table';
import { isDateNullOrUBD } from '@/lib/utils/date-formatter';

interface BulkDeleteModalProps {
  assignments: AssignmentData[];
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function BulkDeleteModal({
  assignments,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: BulkDeleteModalProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Delete Assignments?</DialogTitle>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-4">
          {/* Warning Message */}
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertIcon className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                You are about to delete {assignments.length} assignment{assignments.length === 1 ? '' : 's'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This action cannot be undone. All staff invitations and confirmations
                for these assignments will also be removed.
              </p>
            </div>
          </div>

          {/* Assignment List */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">
              Assignments to delete:
            </p>
            <div className="max-h-60 overflow-y-auto space-y-2 border border-border rounded-lg p-3">
              {assignments.map((assignment) => {
                const dateIsUBD = isDateNullOrUBD(assignment.startDate);
                const startDate = dateIsUBD ? null : (typeof assignment.startDate === 'string'
                  ? new Date(assignment.startDate)
                  : assignment.startDate);
                return (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {assignment.service?.title || 'No Position'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.event.title} - {dateIsUBD ? 'UBD' : format(startDate!, 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono ml-2">
                      {assignment.callTimeId}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : `Delete ${assignments.length} Assignment${assignments.length === 1 ? '' : 's'}`}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
