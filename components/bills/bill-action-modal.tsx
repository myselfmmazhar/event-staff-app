'use client';

import { ConfirmModal } from '@/components/common/confirm-modal';
import { Badge } from '@/components/ui/badge';

interface ActionBill {
    id: string;
    billNo: string;
    talentName: string;
}

interface BillActionModalProps {
    bill: ActionBill | null;
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    actionType: 'archive' | 'restore' | 'delete';
}

export function BillActionModal({
    bill,
    open,
    onClose,
    onConfirm,
    isLoading,
    actionType,
}: BillActionModalProps) {
    if (!bill) return null;

    const actionConfig = {
        archive: {
            title: 'Archive Bill',
            subtitle: 'This bill will be moved to the archive list.',
            description: 'Are you sure you want to archive this bill?',
            warning: 'Archived bills can be restored later from the archive view.',
            confirmText: 'Archive Bill',
            variant: 'default' as const,
        },
        restore: {
            title: 'Restore Bill',
            subtitle: 'This bill will be restored to your main list.',
            description: 'Are you sure you want to restore this bill?',
            warning: 'Restored bills will appear in your active Bills list.',
            confirmText: 'Restore Bill',
            variant: 'default' as const,
        },
        delete: {
            title: 'Delete Bill',
            subtitle: 'This bill will be permanently removed.',
            description: 'Are you sure you want to PERMANENTLY delete this bill?',
            warning: 'This action cannot be undone. Data will be lost forever.',
            confirmText: 'Permanently Delete',
            variant: 'danger' as const,
        },
    };

    const config = actionConfig[actionType];

    return (
        <ConfirmModal
            open={open}
            onClose={onClose}
            onConfirm={onConfirm}
            isLoading={isLoading}
            title={config.title}
            description={config.subtitle}
            confirmText={isLoading ? 'Processing...' : config.confirmText}
            variant={config.variant}
            warningMessage={config.warning}
        >
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    {config.description}
                </p>

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {bill.talentName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                ID: {bill.billNo}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </ConfirmModal>
    );
}
