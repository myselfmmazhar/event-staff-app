'use client';

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTerminology } from '@/lib/hooks/use-terminology';
import type { StaffWithRelations } from '@/components/staff/staff-table';

interface DeleteStaffModalProps {
    staff: Pick<StaffWithRelations, 'firstName' | 'lastName' | 'staffType'> | null;
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

export function DeleteStaffModal({
    staff,
    open,
    onClose,
    onConfirm,
    isDeleting,
}: DeleteStaffModalProps) {
    const { terminology } = useTerminology();
    if (!staff) return null;

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogHeader>
                <DialogTitle>Delete {terminology.staff.singular}</DialogTitle>
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
                    {isDeleting ? 'Deleting...' : `Delete ${terminology.staff.singular}`}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
