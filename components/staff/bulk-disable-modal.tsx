'use client';

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangleIcon } from 'lucide-react';
import type { StaffWithRelations } from './selectable-staff-table';
import { useTerminology } from '@/lib/hooks/use-terminology';

interface BulkDisableModalProps {
    staff: StaffWithRelations[];
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDisabling: boolean;
}

export function BulkDisableModal({
    staff,
    open,
    onClose,
    onConfirm,
    isDisabling,
}: BulkDisableModalProps) {
    const { terminology } = useTerminology();
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogHeader>
                <DialogTitle>Disable {terminology.staff.plural}?</DialogTitle>
            </DialogHeader>

            <DialogContent>
                <div className="space-y-4">
                    {/* Warning Message */}
                    <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning rounded-lg">
                        <AlertTriangleIcon className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                You are about to disable {staff.length} {staff.length === 1 ? terminology.staff.lower : terminology.staff.lowerPlural}{' '}
                                {staff.length === 1 ? 'member' : 'members'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Disabled {terminology.staff.lower} members will not be available for new assignments.
                                They can be re-enabled later from the main {terminology.staff.singular} page.
                            </p>
                        </div>
                    </div>

                    {/* Staff List */}
                    <div>
                        <p className="text-sm font-medium text-foreground mb-3">
                            {terminology.staff.plural} to disable:
                        </p>
                        <div className="max-h-60 overflow-y-auto space-y-2 border border-border rounded-lg p-3">
                            {staff.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/70 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {member.firstName} {member.lastName}
                                        </p>
                                        <p className="text-xs text-muted-foreground font-mono">
                                            {member.staffId}
                                        </p>
                                    </div>
                                    <Badge
                                        variant={member.staffType === 'CONTRACTOR' ? 'default' : 'secondary'}
                                        size="sm"
                                    >
                                        {member.staffType === 'CONTRACTOR' ? 'Contractor' : 'Employee'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isDisabling}>
                    Cancel
                </Button>
                <Button variant="danger" onClick={onConfirm} disabled={isDisabling}>
                    {isDisabling ? 'Disabling...' : `Disable ${staff.length} ${terminology.staff.singular}`}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
