'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CallTimeInvitationStatus } from '@prisma/client';

interface InvitationData {
    id: string;
    status: CallTimeInvitationStatus;
    isConfirmed: boolean;
    staff: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

interface ServiceGroup {
    serviceName: string;
    required: number;
    invitations: InvitationData[];
}

interface InvitationSummaryModalProps {
    open: boolean;
    onClose: () => void;
    eventTitle: string;
    serviceGroups: ServiceGroup[];
}

const STATUS_CONFIG: Record<CallTimeInvitationStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' | 'info' }> = {
    ACCEPTED: { label: 'Accepted', variant: 'success' },
    PENDING: { label: 'Pending', variant: 'warning' },
    DECLINED: { label: 'Declined', variant: 'danger' },
    CANCELLED: { label: 'Cancelled', variant: 'default' },
    WAITLISTED: { label: 'Waitlisted', variant: 'info' },
};

export function InvitationSummaryModal({
    open,
    onClose,
    eventTitle,
    serviceGroups,
}: InvitationSummaryModalProps) {
    // Flatten all invitations across services
    const allInvitations = serviceGroups.flatMap((g) => g.invitations);
    const totalRequired = serviceGroups.reduce((sum, g) => sum + g.required, 0);

    // Group by status
    const byStatus = allInvitations.reduce((acc, inv) => {
        const key = inv.status;
        if (!acc[key]) acc[key] = [];
        acc[key]!.push(inv);
        return acc;
    }, {} as Record<string, InvitationData[]>);

    const statusOrder: CallTimeInvitationStatus[] = ['ACCEPTED', 'PENDING', 'DECLINED', 'CANCELLED', 'WAITLISTED'];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            className="mx-4 flex h-[min(94vh,1000px)] w-full max-h-[min(94vh,1000px)] max-w-[1400px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-card p-0 shadow-xl"
        >
            <DialogContent className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-0">
                <DialogHeader>
                    <DialogTitle className="text-lg">Invitation Summary</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">{eventTitle}</p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* Overall stats */}
                    <div className="flex flex-wrap gap-2 pb-3 border-b border-border">
                        <Badge variant="default" size="sm">{totalRequired} Required</Badge>
                        <Badge variant="info" size="sm">{allInvitations.length} Sent</Badge>
                        {statusOrder.map((status) => {
                            const count = byStatus[status]?.length ?? 0;
                            if (count === 0) return null;
                            const config = STATUS_CONFIG[status];
                            return (
                                <Badge key={status} variant={config.variant} size="sm">
                                    {count} {config.label}
                                </Badge>
                            );
                        })}
                    </div>

                    {/* Breakdown by status */}
                    <div className="space-y-4 mt-2">
                        {statusOrder.map((status) => {
                            const invitations = byStatus[status];
                            if (!invitations || invitations.length === 0) return null;
                            const config = STATUS_CONFIG[status];

                            return (
                                <div key={status}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant={config.variant} size="sm">{config.label}</Badge>
                                        <span className="text-xs text-muted-foreground">({invitations.length})</span>
                                    </div>
                                    <div className="space-y-1 pl-2">
                                        {invitations.map((inv) => (
                                            <div
                                                key={inv.id}
                                                className="flex items-center gap-2 text-sm py-1 px-2 rounded-md hover:bg-accent/50 transition-colors"
                                            >
                                                <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
                                                    {inv.staff.firstName?.[0]}{inv.staff.lastName?.[0]}
                                                </div>
                                                <span>{inv.staff.firstName} {inv.staff.lastName}</span>
                                                {inv.isConfirmed && (
                                                    <Badge variant="success" size="sm" className="ml-auto">Confirmed</Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {allInvitations.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No invitations sent yet
                            </p>
                        )}
                    </div>

                    {/* Per-service breakdown if multiple services */}
                    {serviceGroups.length > 1 && (
                        <div className="mt-4 pt-3 border-t border-border">
                            <h4 className="text-sm font-medium mb-3">By Service</h4>
                            <div className="space-y-3">
                                {serviceGroups.map((group, idx) => {
                                    const accepted = group.invitations.filter((i) => i.status === 'ACCEPTED').length;
                                    const pending = group.invitations.filter((i) => i.status === 'PENDING').length;
                                    const declined = group.invitations.filter((i) => i.status === 'DECLINED').length;

                                    return (
                                        <div key={idx} className="p-2 bg-accent/30 rounded-md">
                                            <div className="font-medium text-sm mb-1">{group.serviceName}</div>
                                            <div className="flex flex-wrap gap-1.5 text-xs">
                                                <span>{group.required} needed</span>
                                                <span>·</span>
                                                <span>{group.invitations.length} sent</span>
                                                {accepted > 0 && <><span>·</span><span className="text-green-600 dark:text-green-400">{accepted} accepted</span></>}
                                                {pending > 0 && <><span>·</span><span className="text-yellow-600 dark:text-yellow-400">{pending} pending</span></>}
                                                {declined > 0 && <><span>·</span><span className="text-red-600 dark:text-red-400">{declined} declined</span></>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
