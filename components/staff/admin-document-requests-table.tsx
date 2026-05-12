'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { FileText, Download, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { REQ_TEMPLATE_CARDS } from '@/lib/requirement-templates';

interface AdminDocumentRequestsTableProps {
    staffId: string;
}

function getRequirementTitle(id: string): string {
    return REQ_TEMPLATE_CARDS.find((c) => c.id === id)?.title ?? id;
}

function toDateInputValue(value: Date | string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
}

function oneWeekFromNowDateInputValue(): string {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
}

export function AdminDocumentRequestsTable({ staffId }: AdminDocumentRequestsTableProps) {
    const utils = trpc.useUtils();
    const { data: pending = [], isLoading } = trpc.staffDocument.getPendingForStaff.useQuery(
        { staffId },
    );

    const [approveFor, setApproveFor] = useState<string | null>(null);
    const [approveExpiresAt, setApproveExpiresAt] = useState('');
    const [rejectFor, setRejectFor] = useState<string | null>(null);
    const [reason, setReason] = useState('');

    // Default the approve modal's expiry to the doc's pre-filled value
    // (set to upload + 7 days at submission time) or fall back to one week from now.
    useEffect(() => {
        if (approveFor === null) return;
        const doc = pending.find((p) => p.id === approveFor);
        const fromDoc = toDateInputValue(doc?.expiresAt);
        setApproveExpiresAt(fromDoc || oneWeekFromNowDateInputValue());
    }, [approveFor, pending]);

    const invalidateAll = () => {
        utils.staffDocument.getPendingForStaff.invalidate({ staffId });
        utils.staffDocument.getHistoryForStaff.invalidate({ staffId });
    };

    const approveMutation = trpc.staffDocument.approve.useMutation({
        onSuccess: () => {
            toast({ message: 'Document approved', type: 'success' });
            setApproveFor(null);
            setApproveExpiresAt('');
            invalidateAll();
        },
        onError: (error) => {
            toast({ message: error.message || 'Failed to approve', type: 'error' });
        },
    });

    const rejectMutation = trpc.staffDocument.reject.useMutation({
        onSuccess: () => {
            toast({ message: 'Document rejected', type: 'success' });
            setRejectFor(null);
            setReason('');
            invalidateAll();
        },
        onError: (error) => {
            toast({ message: error.message || 'Failed to reject', type: 'error' });
        },
    });

    if (isLoading) {
        return <p className="text-sm text-muted-foreground">Loading pending requests…</p>;
    }

    if (pending.length === 0) {
        return (
            <p className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                No pending document update requests for this talent.
            </p>
        );
    }

    return (
        <>
            <div className="space-y-3">
                {pending.map((doc) => (
                    <div
                        key={doc.id}
                        className="flex flex-wrap items-start gap-3 rounded-lg border border-border p-4"
                    >
                        <FileText className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">
                                    {getRequirementTitle(doc.requirementTemplateId)}
                                </p>
                                <Badge variant="warning">Pending</Badge>
                                <span className="text-xs text-muted-foreground">
                                    v{doc.version}
                                </span>
                            </div>
                            <p className="mt-1 text-sm truncate">{doc.name}</p>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                <span>Submitted {format(new Date(doc.createdAt), 'PP p')}</span>
                                {doc.expiresAt && (
                                    <span>
                                        Proposed expiry{' '}
                                        {format(new Date(doc.expiresAt), 'PP')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(doc.url, '_blank')}
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setApproveFor(doc.id)}
                            >
                                <Check className="mr-1 h-4 w-4" />
                                Approve
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setRejectFor(doc.id);
                                    setReason('');
                                }}
                            >
                                <X className="mr-1 h-4 w-4" />
                                Reject
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Approve modal — admin sets the expiry date */}
            <Dialog
                open={approveFor !== null}
                onClose={() => {
                    if (!approveMutation.isPending) {
                        setApproveFor(null);
                        setApproveExpiresAt('');
                    }
                }}
                className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-0"
            >
                <DialogContent className="p-6">
                    <DialogHeader>
                        <DialogTitle>Approve Document</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Set the expiry date for this document. The talent will be reminded
                            within 5 days of this date.
                        </p>
                        <div>
                            <label className="text-sm font-medium">Expiry Date</label>
                            <Input
                                type="date"
                                value={approveExpiresAt}
                                onChange={(e) => setApproveExpiresAt(e.target.value)}
                                disabled={approveMutation.isPending}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Pre-filled from the talent profile when available, otherwise
                                tomorrow. Leave blank for no expiry.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="mt-6 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setApproveFor(null);
                                setApproveExpiresAt('');
                            }}
                            disabled={approveMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                if (!approveFor) return;
                                approveMutation.mutate({
                                    documentId: approveFor,
                                    expiresAt: approveExpiresAt || null,
                                });
                            }}
                            disabled={approveMutation.isPending}
                            isLoading={approveMutation.isPending}
                        >
                            <Check className="mr-1 h-4 w-4" />
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject modal */}
            <Dialog
                open={rejectFor !== null}
                onClose={() => {
                    if (!rejectMutation.isPending) {
                        setRejectFor(null);
                        setReason('');
                    }
                }}
                className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-0"
            >
                <DialogContent className="p-6">
                    <DialogHeader>
                        <DialogTitle>Reject Document Update</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        <label className="text-sm font-medium">Reason</label>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Tell the talent why this update was rejected"
                            disabled={rejectMutation.isPending}
                            rows={4}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            This message is sent to the talent.
                        </p>
                    </div>
                    <DialogFooter className="mt-6 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setRejectFor(null);
                                setReason('');
                            }}
                            disabled={rejectMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={() => {
                                if (!rejectFor || !reason.trim()) return;
                                rejectMutation.mutate({
                                    documentId: rejectFor,
                                    reason: reason.trim(),
                                });
                            }}
                            disabled={!reason.trim() || rejectMutation.isPending}
                            isLoading={rejectMutation.isPending}
                        >
                            Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
