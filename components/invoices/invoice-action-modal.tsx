'use client';

import { ConfirmModal } from '@/components/common/confirm-modal';
import { Badge } from '@/components/ui/badge';

interface ActionInvoice {
    id: string;
    invoiceNo: string;
    clientName: string;
}

interface InvoiceActionModalProps {
    invoice: ActionInvoice | null;
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    actionType: 'archive' | 'restore' | 'delete';
}

export function InvoiceActionModal({
    invoice,
    open,
    onClose,
    onConfirm,
    isLoading,
    actionType,
}: InvoiceActionModalProps) {
    if (!invoice) return null;

    const actionConfig = {
        archive: {
            title: 'Archive Invoice',
            subtitle: 'This invoice will be moved to the archive list.',
            description: 'Are you sure you want to archive this invoice?',
            warning: 'Archived invoices can be restored later from the archive view.',
            confirmText: 'Archive Invoice',
            variant: 'default' as const,
        },
        restore: {
            title: 'Restore Invoice',
            subtitle: 'This invoice will be restored to your main list.',
            description: 'Are you sure you want to restore this invoice?',
            warning: 'Restored invoices will appear in your active Invoices list.',
            confirmText: 'Restore Invoice',
            variant: 'default' as const,
        },
        delete: {
            title: 'Delete Invoice',
            subtitle: 'This invoice will be permanently removed.',
            description: 'Are you sure you want to PERMANENTLY delete this invoice?',
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
                                {invoice.clientName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                ID: {invoice.invoiceNo}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </ConfirmModal>
    );
}
