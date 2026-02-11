'use client';

import { ConfirmModal } from '@/components/common/confirm-modal';

interface ActionEstimate {
    id: string;
    estimateNo: string;
    clientName: string;
}

interface EstimateActionModalProps {
    estimate: ActionEstimate | null;
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    actionType: 'archive' | 'restore' | 'delete';
}

export function EstimateActionModal({
    estimate,
    open,
    onClose,
    onConfirm,
    isLoading,
    actionType,
}: EstimateActionModalProps) {
    if (!estimate) return null;

    const actionConfig = {
        archive: {
            title: 'Archive Estimate',
            subtitle: 'This estimate will be moved to the archive list.',
            description: 'Are you sure you want to archive this estimate?',
            warning: 'Archived estimates can be restored later from the archive view.',
            confirmText: 'Archive Estimate',
            variant: 'default' as const,
        },
        restore: {
            title: 'Restore Estimate',
            subtitle: 'This estimate will be restored to your main list.',
            description: 'Are you sure you want to restore this estimate?',
            warning: 'Restored estimates will appear in your active Estimates list.',
            confirmText: 'Restore Estimate',
            variant: 'default' as const,
        },
        delete: {
            title: 'Delete Estimate',
            subtitle: 'This estimate will be permanently removed.',
            description: 'Are you sure you want to PERMANENTLY delete this estimate?',
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
                                {estimate.clientName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                ID: {estimate.estimateNo}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </ConfirmModal>
    );
}
