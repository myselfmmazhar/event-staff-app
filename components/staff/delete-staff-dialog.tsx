'use client';

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Staff } from '@prisma/client';

interface DeleteStaffDialogProps {
    staff: Staff | null;
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

export function DeleteStaffDialog({
    staff,
    open,
    onClose,
    onConfirm,
    isDeleting,
}: DeleteStaffDialogProps) {
    if (!staff) return null;

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogHeader>
                <DialogTitle>Delete Staff Member</DialogTitle>
            </DialogHeader>

            <DialogContent>
                <p className="text-sm">
                    Are you sure you want to delete{' '}
                    <span className="font-semibold">
                        {staff.firstName} {staff.lastName}
                    </span>
                    ? This action cannot be undone.
                </p>

                {staff.staffType === 'CONTRACTOR' && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-sm text-amber-900">
                            ⚠️ This is a contractor. Make sure they have no employees assigned before deleting.
                        </p>
                    </div>
                )}
            </DialogContent>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isDeleting}>
                    Cancel
                </Button>
                <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete Staff'}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
